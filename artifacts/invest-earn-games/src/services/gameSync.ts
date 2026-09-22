import { createClient, SupabaseClient } from '@supabase/supabase-js';

/* ==========================================================================
   SUPABASE CLIENT INITIALIZATION & CONFIGURATION
   ========================================================================== */
export const SUPABASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  "https://rmprouugsnemwkbjgvvs.supabase.co";

export const SUPABASE_ANON_KEY = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcHJvdXVnc25lbXdrYmpndnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTYyMDEsImV4cCI6MjA5NzM3MjIwMX0.2d976jNh5ncgT1T9fJpPcjeb5SIO-vZHyk8pQBxYhPs";

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 20
    }
  }
});

/* ==========================================================================
   SUPABASE SERVER TIME SYNCHRONIZATION ENGINE
   Fetches Supabase HTTP Date headers to guarantee that all devices (regardless
   of local clock skew, timezone, or phone drift) are locked to the exact same
   Supabase server millisecond.
   ========================================================================== */
let supabaseServerOffsetMs = 0;
let isServerTimeSynced = false;
let lastServerSyncTimestamp = 0;

export async function syncWithSupabaseServerTime(): Promise<number> {
  try {
    const t0 = performance.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/game_history?limit=1`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Accept: 'application/json'
      }
    });
    const t1 = performance.now();
    const roundTrip = t1 - t0;
    const serverDateHeader = res.headers.get('date');
    if (serverDateHeader) {
      const serverMs = new Date(serverDateHeader).getTime();
      const localNow = Date.now();
      const estimatedServerNow = serverMs + Math.round(roundTrip / 2);
      supabaseServerOffsetMs = estimatedServerNow - localNow;
      isServerTimeSynced = true;
      lastServerSyncTimestamp = localNow;
    }
  } catch (err) {
    console.warn('Could not sync with Supabase server time:', err);
  }
  return supabaseServerOffsetMs;
}

export function getSupabaseServerNow(): number {
  return Date.now() + supabaseServerOffsetMs;
}

export function isSupabaseTimeSynced(): boolean {
  return isServerTimeSynced;
}

// Initial sync on boot & background refresh every 35 seconds
if (typeof window !== 'undefined') {
  syncWithSupabaseServerTime();
  setInterval(() => {
    syncWithSupabaseServerTime();
  }, 35000);
}

/* ==========================================================================
   ACTIVE GAMES ROW & CACHE
   ========================================================================== */
export interface ActiveGameRow {
  game_name: string;
  round_id: string;
  start_time: string;          // ISO string from Supabase
  start_time_ms: number;       // epoch ms
  phase: 'WAITING' | 'RUNNING' | 'CRASHED' | 'betting' | 'deal' | 'showdown';
  crash_point: number;
  countdown_sec: number;
  elapsed_ms: number;
  source: 'supabase_active_games' | 'supabase_game_history' | 'supabase_server_clock';
  updated_at?: string;
}

export const activeGamesCache: Record<string, ActiveGameRow> = {};

/* ==========================================================================
   FETCH ACTIVE GAME FROM SUPABASE (active_games OR game_history)
   ========================================================================== */
export async function fetchActiveGameFromSupabase(gameName: string): Promise<ActiveGameRow> {
  const serverNow = getSupabaseServerNow();

  // 1. Check public.active_games table in Supabase
  try {
    const { data, error } = await supabase
      .from('active_games')
      .select('*')
      .eq('game_name', gameName)
      .maybeSingle();

    if (!error && data && data.round_id && data.start_time) {
      const startMs = new Date(data.start_time).getTime();
      const elapsedMs = Math.max(0, serverNow - startMs);

      const activeRow: ActiveGameRow = {
        game_name: data.game_name,
        round_id: data.round_id,
        start_time: data.start_time,
        start_time_ms: startMs,
        phase: data.phase || (elapsedMs < CRASH_COUNTDOWN_MS ? 'WAITING' : 'RUNNING'),
        crash_point: Number(data.crash_point || 2.0),
        countdown_sec: Math.max(0, Math.ceil((CRASH_COUNTDOWN_MS - elapsedMs) / 1000)),
        elapsed_ms: elapsedMs,
        source: 'supabase_active_games',
        updated_at: data.updated_at
      };
      activeGamesCache[gameName] = activeRow;
      return activeRow;
    }
  } catch (err) {
    // If active_games table does not exist or has RLS, gracefully fall back
  }

  // 2. Fallback to game_history table in Supabase to anchor current cycle
  try {
    const { data: histData, error: histErr } = await supabase
      .from('game_history')
      .select('created_at, multiplier, game_name')
      .eq('game_name', gameName)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!histErr && histData && histData.length > 0 && histData[0].created_at) {
      const lastRoundCreatedAt = new Date(histData[0].created_at).getTime();
      const timeSinceLastRecord = Math.max(0, serverNow - lastRoundCreatedAt);
      if (timeSinceLastRecord < CRASH_CYCLE_MS * 3) {
        const cycleProgress = timeSinceLastRecord % CRASH_CYCLE_MS;
        const roundStartMs = serverNow - cycleProgress;
        const syncCalc = getSynchronizedCrashRound(supabaseServerOffsetMs);
        const activeRow: ActiveGameRow = {
          game_name: gameName,
          round_id: syncCalc.roundId,
          start_time: new Date(roundStartMs).toISOString(),
          start_time_ms: roundStartMs,
          phase: syncCalc.phase,
          crash_point: syncCalc.crashPoint,
          countdown_sec: syncCalc.countdownSec,
          elapsed_ms: syncCalc.elapsedMs,
          source: 'supabase_game_history'
        };
        activeGamesCache[gameName] = activeRow;
        return activeRow;
      }
    }
  } catch {}

  // 3. Fallback to Supabase server-calibrated clock
  const sync = gameName === 'dragon_tiger' 
    ? getSynchronizedDragonTigerRound(supabaseServerOffsetMs) 
    : getSynchronizedCrashRound(supabaseServerOffsetMs);

  const roundStartMs = serverNow - sync.elapsedMs;
  const fallbackRow: ActiveGameRow = {
    game_name: gameName,
    round_id: sync.roundId as string,
    start_time: new Date(roundStartMs).toISOString(),
    start_time_ms: roundStartMs,
    phase: sync.phase as any,
    crash_point: (sync as any).crashPoint || 2.0,
    countdown_sec: sync.countdownSec,
    elapsed_ms: sync.elapsedMs,
    source: 'supabase_server_clock'
  };
  activeGamesCache[gameName] = fallbackRow;
  return fallbackRow;
}

/* ==========================================================================
   SYNC ACTIVE GAME TO SUPABASE & BROADCAST REALTIME
   ========================================================================== */
export async function syncActiveGameToSupabase(gameName: string, roundData: {
  round_id: string;
  start_time?: string;
  phase: 'WAITING' | 'RUNNING' | 'CRASHED' | 'betting' | 'deal' | 'showdown';
  crash_point: number;
  countdown_sec: number;
  elapsed_ms: number;
}) {
  const startIso = roundData.start_time || new Date(getSupabaseServerNow() - roundData.elapsed_ms).toISOString();

  const payload: ActiveGameRow = {
    game_name: gameName,
    round_id: roundData.round_id,
    start_time: startIso,
    start_time_ms: new Date(startIso).getTime(),
    phase: roundData.phase,
    crash_point: roundData.crash_point,
    countdown_sec: roundData.countdown_sec,
    elapsed_ms: roundData.elapsed_ms,
    source: 'supabase_active_games',
    updated_at: new Date(getSupabaseServerNow()).toISOString()
  };

  activeGamesCache[gameName] = payload;

  // 1. Broadcast over Supabase Realtime Channel
  try {
    const channel = getGameRealtimeChannel(gameName);
    channel.send({
      type: 'broadcast',
      event: 'active_game_sync',
      payload
    });
  } catch {}

  // 2. Upsert into Supabase active_games table (if table exists)
  try {
    await supabase.from('active_games').upsert({
      game_name: gameName,
      round_id: roundData.round_id,
      start_time: startIso,
      phase: roundData.phase,
      crash_point: roundData.crash_point,
      countdown_sec: roundData.countdown_sec,
      elapsed_ms: roundData.elapsed_ms,
      updated_at: payload.updated_at
    }, { onConflict: 'game_name' });
  } catch {}
}

/* ==========================================================================
   REALTIME LISTENER FOR ACTIVE GAMES
   ========================================================================== */
export function subscribeToActiveGameSync(gameName: string, onUpdate: (row: ActiveGameRow) => void) {
  // Listen on Supabase Realtime Broadcast channel
  const channel = getGameRealtimeChannel(gameName);
  channel.on('broadcast', { event: 'active_game_sync' }, (evt) => {
    if (evt.payload && evt.payload.game_name === gameName) {
      const row = evt.payload as ActiveGameRow;
      activeGamesCache[gameName] = row;
      onUpdate(row);
    }
  });

  // Also listen on Supabase Postgres Changes if active_games table exists
  const pgChannel = supabase
    .channel(`active_games_pg_${gameName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'active_games', filter: `game_name=eq.${gameName}` },
      (payload) => {
        if (payload.new) {
          const d = payload.new as any;
          const startMs = new Date(d.start_time).getTime();
          const elapsedMs = Math.max(0, getSupabaseServerNow() - startMs);
          const row: ActiveGameRow = {
            game_name: d.game_name,
            round_id: d.round_id,
            start_time: d.start_time,
            start_time_ms: startMs,
            phase: d.phase,
            crash_point: Number(d.crash_point),
            countdown_sec: d.countdown_sec,
            elapsed_ms: elapsedMs,
            source: 'supabase_active_games',
            updated_at: d.updated_at
          };
          activeGamesCache[gameName] = row;
          onUpdate(row);
        }
      }
    )
    .subscribe();

  return () => {
    pgChannel.unsubscribe();
  };
}

/* ==========================================================================
   TYPES
   ========================================================================== */
export type GameName = 'crash' | 'double_crash' | 'dragon_tiger' | 'mines' | 'roulette' | 'wingo';

export interface GameHistoryRecord {
  id?: string;
  user_id: string;
  game_name: string;
  bet_amount: number;
  multiplier: number;
  win_amount: number;
  status: 'won' | 'lost' | 'pending';
  created_at?: string;
  email?: string;
  player_name?: string;
}

export interface LivePlayerBet {
  id: string;
  user_id: string;
  name: string;
  game_name: string;
  bet: number;
  target?: number;
  choice?: string;
  round_id: string;
  cashed_out_at?: number | null;
  win_amount?: number;
  timestamp: number;
  is_real_user?: boolean;
}

/* ==========================================================================
   DETERMINISTIC SEEDABLE PSEUDORANDOM GENERATOR
   Ensures that every device in the world generates the exact same round results
   at the exact same millisecond based on UTC epoch time.
   ========================================================================== */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getRngForRound(game: string, roundId: string | number): () => number {
  const seedGen = xmur3(`${game}_sync_v2_${roundId}`);
  return mulberry32(seedGen());
}

/* ==========================================================================
   CLOUD CRASH PREDICTIONS SYNCHRONIZATION ENGINE
   Guarantees that admin predictions saved in the Admin Panel are broadcast
   and strictly executed across all users' devices synchronously.
   ========================================================================== */
export interface CloudCrashConfig {
  baseRoundIndex: number;
  predictions: number[];
  updatedAt: number;
}

let cachedCloudCrashConfig: CloudCrashConfig = {
  baseRoundIndex: 0,
  predictions: [2.10, 1.45, 5.20, 1.85, 3.42, 1.12, 12.50, 2.05, 10.00, 4.20],
  updatedAt: Date.now()
};

export function getCachedCloudCrashConfig(): CloudCrashConfig {
  return cachedCloudCrashConfig;
}

export function getCrashMultiplierForRound(rIdx: number, cfg: CloudCrashConfig | null): number {
  if (cfg && Array.isArray(cfg.predictions) && cfg.predictions.length > 0) {
    if (cfg.baseRoundIndex > 0) {
      if (rIdx >= cfg.baseRoundIndex) {
        const offset = rIdx - cfg.baseRoundIndex;
        if (offset < cfg.predictions.length) {
          return Number(cfg.predictions[offset].toFixed(2));
        }
        // After configured list completes, cycle through the predictions
        return Number(cfg.predictions[offset % cfg.predictions.length].toFixed(2));
      }
    } else {
      // baseRoundIndex is 0 (global cyclic pattern)
      const offset = Math.abs(rIdx) % cfg.predictions.length;
      return Number(cfg.predictions[offset].toFixed(2));
    }
  }

  // Fallback deterministic seedable RNG
  const rng = getRngForRound('crash', `CR-${rIdx}`);
  const rand = rng();
  if (rand < 0.25) {
    return parseFloat((rng() * (1.40 - 1.05) + 1.05).toFixed(2));
  } else if (rand < 0.70) {
    return parseFloat((rng() * (2.10 - 1.41) + 1.41).toFixed(2));
  } else if (rand < 0.90) {
    return parseFloat((rng() * (7.50 - 2.11) + 2.11).toFixed(2));
  } else {
    return parseFloat((rng() * (30.00 - 7.51) + 7.51).toFixed(2));
  }
}

export async function fetchCloudCrashConfig(): Promise<CloudCrashConfig> {
  try {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('planName', 'SYS_CRASH_CONFIG')
      .order('id', { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0].trx) {
      const parsed = JSON.parse(data[0].trx);
      if (Array.isArray(parsed)) {
        cachedCloudCrashConfig = {
          baseRoundIndex: 0,
          predictions: parsed.map(Number),
          updatedAt: Date.now()
        };
      } else if (parsed && Array.isArray(parsed.predictions)) {
        cachedCloudCrashConfig = {
          baseRoundIndex: Number(parsed.baseRoundIndex) || 0,
          predictions: parsed.predictions.map(Number),
          updatedAt: Number(parsed.updatedAt) || Date.now()
        };
      }
    }
  } catch (err) {
    console.warn('Could not fetch cloud crash config:', err);
  }
  return cachedCloudCrashConfig;
}

export async function saveCloudCrashConfig(config: CloudCrashConfig): Promise<boolean> {
  try {
    cachedCloudCrashConfig = {
      baseRoundIndex: Number(config.baseRoundIndex) || 0,
      predictions: config.predictions.map(p => Number(parseFloat(String(p)).toFixed(2))),
      updatedAt: Date.now()
    };
    const jsonStr = JSON.stringify(cachedCloudCrashConfig);

    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('planName', 'SYS_CRASH_CONFIG')
      .order('id', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('transactions')
        .update({
          trx: jsonStr,
          status: 'Approved'
        })
        .eq('id', existing[0].id);

      if (!error) return true;
    }

    const { error: insErr } = await supabase
      .from('transactions')
      .insert([{
        amount: config.predictions.length,
        type: 'Deposit',
        status: 'Approved',
        dailyProfit: 0,
        planName: 'SYS_CRASH_CONFIG',
        user_id: '31f29e15-2962-4e54-bf84-00099f70fae7',
        trx: jsonStr
      }]);

    return !insErr;
  } catch (err) {
    console.error('Failed to save cloud crash config:', err);
    return false;
  }
}

// Background poll & realtime channel for crash predictions
if (typeof window !== 'undefined') {
  fetchCloudCrashConfig();
  setInterval(() => {
    fetchCloudCrashConfig();
  }, 4000);

  try {
    supabase
      .channel('public:transactions:crash_config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        const row = payload.new as any;
        if (row && row.planName === 'SYS_CRASH_CONFIG' && row.trx) {
          try {
            const parsed = JSON.parse(row.trx);
            if (parsed && Array.isArray(parsed.predictions)) {
              cachedCloudCrashConfig = {
                baseRoundIndex: Number(parsed.baseRoundIndex) || 0,
                predictions: parsed.predictions.map(Number),
                updatedAt: Number(parsed.updatedAt) || Date.now()
              };
            }
          } catch (e) {}
        }
      })
      .subscribe();
  } catch (channelErr) {
    console.warn('Realtime channel subscribe failed, relying on interval polling', channelErr);
  }
}

/* ==========================================================================
   SYNCHRONIZED CRASH ENGINE CALCULATIONS
   ========================================================================== */
export const CRASH_COUNTDOWN_MS = 5000;   // 5s waiting/betting countdown
export const CRASH_POST_CRASH_MS = 2000;  // 2s post-crash delay before new match starts (user requested)
export const CRASH_CYCLE_MS = 15000;      // Approximate average cycle duration for fallbacks

export function getCrashFlightDurationMs(crashPoint: number): number {
  if (crashPoint <= 2.00) {
    return ((crashPoint - 1.00) / 0.20) * 1000;
  } else if (crashPoint <= 3.00) {
    return (5.0 + (crashPoint - 2.00) / 0.25) * 1000;
  } else {
    // Inverse quadratic approx
    const extra = crashPoint - 3.00;
    const dt = (-0.35 + Math.sqrt(0.35 * 0.35 + 4 * 0.08 * extra)) / (2 * 0.08);
    return (9.0 + Math.max(0, dt)) * 1000;
  }
}

export function getSynchronizedCrashRound(offsetMs: number = 0) {
  const now = getSupabaseServerNow() + offsetMs;

  // Anchor to 10-minute blocks for deterministic global multi-client sync
  const ANCHOR_BLOCK_MS = 600000;
  const anchorTime = Math.floor(now / ANCHOR_BLOCK_MS) * ANCHOR_BLOCK_MS;
  const baseRoundIndex = Math.floor(anchorTime / 1000) * 10;

  let t = anchorTime;
  let rIdx = baseRoundIndex;
  let roundCrashPoint = 2.00;
  let roundFlightMs = 5000;
  let roundTotalDurationMs = CRASH_COUNTDOWN_MS + roundFlightMs + CRASH_POST_CRASH_MS;

  // Deterministically find the active round covering `now`
  while (true) {
    roundCrashPoint = getCrashMultiplierForRound(rIdx, cachedCloudCrashConfig);
    roundFlightMs = getCrashFlightDurationMs(roundCrashPoint);
    roundTotalDurationMs = CRASH_COUNTDOWN_MS + roundFlightMs + CRASH_POST_CRASH_MS;

    if (t + roundTotalDurationMs > now) {
      break;
    }
    t += roundTotalDurationMs;
    rIdx++;
  }

  const roundId = `CR-${rIdx}`;
  const roundStartTime = new Date(t).toISOString();
  const elapsedMs = Math.max(0, now - t);
  const flightThresholdMs = CRASH_COUNTDOWN_MS + roundFlightMs;

  let phase: 'WAITING' | 'RUNNING' | 'CRASHED';
  let currentMultiplier = 1.00;
  let countdownSec = 0;
  let postCrashCountdownSec = 0;

  if (elapsedMs < CRASH_COUNTDOWN_MS) {
    phase = 'WAITING';
    countdownSec = Math.max(1, Math.ceil((CRASH_COUNTDOWN_MS - elapsedMs) / 1000));
    currentMultiplier = 1.00;
  } else if (elapsedMs < flightThresholdMs) {
    phase = 'RUNNING';
    const flightElapsedSec = (elapsedMs - CRASH_COUNTDOWN_MS) / 1000;
    if (flightElapsedSec <= 5.0) {
      currentMultiplier = 1.00 + flightElapsedSec * 0.20;
    } else if (flightElapsedSec <= 9.0) {
      currentMultiplier = 2.00 + (flightElapsedSec - 5.0) * 0.25;
    } else {
      const dt = flightElapsedSec - 9.0;
      currentMultiplier = 3.00 + dt * 0.35 + dt * dt * 0.08;
    }
    currentMultiplier = Math.min(roundCrashPoint, parseFloat(currentMultiplier.toFixed(2)));
    countdownSec = 0;
  } else {
    phase = 'CRASHED';
    currentMultiplier = roundCrashPoint;
    countdownSec = 0;
    // Post-crash wait of exactly 2 seconds
    postCrashCountdownSec = Math.max(1, Math.ceil((roundTotalDurationMs - elapsedMs) / 1000));
  }

  return {
    roundIndex: rIdx,
    roundId,
    phase,
    countdownSec,
    postCrashCountdownSec,
    currentMultiplier,
    crashPoint: roundCrashPoint,
    elapsedMs,
    flightDurationMs: roundFlightMs,
    cycleMs: roundTotalDurationMs,
    postCrashMs: CRASH_POST_CRASH_MS,
    startTime: roundStartTime,
    startTimeMs: t,
  };
}

/* ==========================================================================
   SYNCHRONIZED DOUBLE CRASH ENGINE
   ========================================================================== */
export function getSynchronizedDoubleCrashRound(offsetMs: number = 0) {
  const base = getSynchronizedCrashRound(offsetMs);
  const rng = getRngForRound('double_crash_r2', base.roundId);
  const rand = rng();
  let crashPoint2: number;
  if (rand < 0.30) {
    crashPoint2 = parseFloat((rng() * (1.38 - 1.05) + 1.05).toFixed(2));
  } else if (rand < 0.75) {
    crashPoint2 = parseFloat((rng() * (2.25 - 1.39) + 1.39).toFixed(2));
  } else {
    crashPoint2 = parseFloat((rng() * (22.00 - 2.26) + 2.26).toFixed(2));
  }

  return {
    ...base,
    crashPoint1: base.crashPoint,
    crashPoint2,
  };
}

/* ==========================================================================
   SYNCHRONIZED DRAGON TIGER ENGINE
   Cycle: 24s (15s betting + 4s card deal + 5s showdown)
   ========================================================================== */
export const DT_CYCLE_MS = 24000;
export const DT_BETTING_MS = 15000;
export const DT_DEAL_MS = 4000;

export function getSynchronizedDragonTigerRound(offsetMs: number = 0) {
  const now = getSupabaseServerNow() + offsetMs;
  const roundIndex = Math.floor(now / DT_CYCLE_MS);
  
  let elapsedMs = now % DT_CYCLE_MS;
  const cached = activeGamesCache['dragon_tiger'];
  if (cached && cached.start_time_ms > 0) {
    elapsedMs = Math.max(0, now - cached.start_time_ms) % DT_CYCLE_MS;
  }

  const roundId = 202609200000 + roundIndex;
  const roundStartTime = new Date(now - elapsedMs).toISOString();

  const rng = getRngForRound('dragon_tiger', roundId);
  const suits = ['♠', '♥', '♦', '♣'] as const;
  
  const dRank = Math.floor(rng() * 13) + 1;
  const dSuit = suits[Math.floor(rng() * 4)];
  const tRank = Math.floor(rng() * 13) + 1;
  const tSuit = suits[Math.floor(rng() * 4)];

  const outcome: 'dragon' | 'tiger' | 'tie' =
    dRank > tRank ? 'dragon' : tRank > dRank ? 'tiger' : 'tie';

  let phase: 'betting' | 'deal' | 'showdown';
  let countdownSec: number;

  if (elapsedMs < DT_BETTING_MS) {
    phase = 'betting';
    countdownSec = Math.max(1, Math.ceil((DT_BETTING_MS - elapsedMs) / 1000));
  } else if (elapsedMs < DT_BETTING_MS + DT_DEAL_MS) {
    phase = 'deal';
    countdownSec = Math.max(1, Math.ceil((DT_BETTING_MS + DT_DEAL_MS - elapsedMs) / 1000));
  } else {
    phase = 'showdown';
    countdownSec = Math.max(1, Math.ceil((DT_CYCLE_MS - elapsedMs) / 1000));
  }

  return {
    roundIndex,
    roundId,
    phase,
    countdownSec,
    outcome,
    dragonCard: { rank: dRank, suit: dSuit, color: dSuit === '♥' || dSuit === '♦' ? 'red' : 'black' },
    tigerCard: { rank: tRank, suit: tSuit, color: tSuit === '♥' || tSuit === '♦' ? 'red' : 'black' },
    elapsedMs,
    cycleMs: DT_CYCLE_MS,
    startTime: roundStartTime,
    startTimeMs: now - elapsedMs,
  };
}

/* ==========================================================================
   SYNCHRONIZED ROULETTE ENGINE
   Cycle: 28s (15s betting + 8s physics spin + 5s result payout)
   ========================================================================== */
export const ROULETTE_CYCLE_MS = 28000;
export const ROULETTE_BETTING_MS = 15000;
export const ROULETTE_SPIN_MS = 8000;

export function getSynchronizedRouletteRound(offsetMs: number = 0) {
  const now = getSupabaseServerNow() + offsetMs;
  const roundIndex = Math.floor(now / ROULETTE_CYCLE_MS);
  const elapsedMs = now % ROULETTE_CYCLE_MS;
  const roundId = `ROU-${roundIndex}`;

  const rng = getRngForRound('roulette', roundId);
  const winningNumber = Math.floor(rng() * 37); // 0 to 36

  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const color = winningNumber === 0 ? 'green' : redNumbers.includes(winningNumber) ? 'red' : 'black';

  let phase: 'BETTING' | 'SPINNING' | 'RESULT';
  let countdownSec: number;

  if (elapsedMs < ROULETTE_BETTING_MS) {
    phase = 'BETTING';
    countdownSec = Math.max(1, Math.ceil((ROULETTE_BETTING_MS - elapsedMs) / 1000));
  } else if (elapsedMs < ROULETTE_BETTING_MS + ROULETTE_SPIN_MS) {
    phase = 'SPINNING';
    countdownSec = Math.max(1, Math.ceil((ROULETTE_BETTING_MS + ROULETTE_SPIN_MS - elapsedMs) / 1000));
  } else {
    phase = 'RESULT';
    countdownSec = Math.max(1, Math.ceil((ROULETTE_CYCLE_MS - elapsedMs) / 1000));
  }

  return {
    roundIndex,
    roundId,
    phase,
    countdownSec,
    winningNumber,
    color,
    elapsedMs,
    spinElapsedMs: Math.max(0, elapsedMs - ROULETTE_BETTING_MS),
  };
}

/* ==========================================================================
   SYNCHRONIZED WINGO ENGINE
   Cycle: 30s (20s betting + 6s machine draw + 4s result)
   ========================================================================== */
export const WINGO_CYCLE_MS = 30000;
export const WINGO_BETTING_MS = 20000;
export const WINGO_DRAW_MS = 6000;

export function getSynchronizedWinGoRound(offsetMs: number = 0) {
  const now = getSupabaseServerNow() + offsetMs;
  const roundIndex = Math.floor(now / WINGO_CYCLE_MS);
  const elapsedMs = now % WINGO_CYCLE_MS;
  const roundId = `WG-${roundIndex}`;

  const rng = getRngForRound('wingo', roundId);
  const winningBall = Math.floor(rng() * 10); // 0 to 9

  let category: 'green' | 'red' | 'violet';
  if (winningBall === 0 || winningBall === 5) {
    category = 'violet';
  } else if ([1, 3, 7, 9].includes(winningBall)) {
    category = 'green';
  } else {
    category = 'red';
  }

  let phase: 'BETTING' | 'MACHINE' | 'RESULT';
  let countdownSec: number;

  if (elapsedMs < WINGO_BETTING_MS) {
    phase = 'BETTING';
    countdownSec = Math.max(1, Math.ceil((WINGO_BETTING_MS - elapsedMs) / 1000));
  } else if (elapsedMs < WINGO_BETTING_MS + WINGO_DRAW_MS) {
    phase = 'MACHINE';
    countdownSec = Math.max(1, Math.ceil((WINGO_BETTING_MS + WINGO_DRAW_MS - elapsedMs) / 1000));
  } else {
    phase = 'RESULT';
    countdownSec = Math.max(1, Math.ceil((WINGO_CYCLE_MS - elapsedMs) / 1000));
  }

  return {
    roundIndex,
    roundId,
    phase,
    countdownSec,
    winningBall,
    category,
    elapsedMs,
  };
}

/* ==========================================================================
   REALTIME BROADCAST CHANNELS & PRESENCE
   ========================================================================== */
const activeChannels: Record<string, ReturnType<typeof supabase.channel>> = {};

export function getGameRealtimeChannel(gameName: string) {
  const channelName = `game_room_${gameName}`;
  if (!activeChannels[channelName]) {
    activeChannels[channelName] = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: localStorage.getItem('user_id') || `guest_${Math.random().toString(36).slice(2, 7)}` }
      }
    });
    activeChannels[channelName].subscribe();
  }
  return activeChannels[channelName];
}

export function broadcastPlayerBet(gameName: string, betData: LivePlayerBet) {
  try {
    const channel = getGameRealtimeChannel(gameName);
    channel.send({
      type: 'broadcast',
      event: 'player_bet',
      payload: betData
    });

    // Also broadcast to global ticker
    const globalChannel = getGameRealtimeChannel('global_ticker');
    globalChannel.send({
      type: 'broadcast',
      event: 'ticker_bet',
      payload: betData
    });
  } catch (err) {
    console.warn('Realtime broadcast error:', err);
  }
}

export function broadcastPlayerCashout(gameName: string, cashoutData: {
  user_id: string;
  name: string;
  multiplier: number;
  win_amount: number;
  game_name: string;
}) {
  try {
    const channel = getGameRealtimeChannel(gameName);
    channel.send({
      type: 'broadcast',
      event: 'player_cashout',
      payload: cashoutData
    });

    const globalChannel = getGameRealtimeChannel('global_ticker');
    globalChannel.send({
      type: 'broadcast',
      event: 'ticker_win',
      payload: cashoutData
    });
  } catch (err) {
    console.warn('Realtime cashout broadcast error:', err);
  }
}

/* ==========================================================================
   DATABASE INTEGRATION (public.game_history & public.profiles)
   Linked to the user's Supabase tables & record_game_result stored procedure
   ========================================================================== */
export async function recordGameResultToSupabase(params: {
  gameName: GameName;
  betAmount: number;
  multiplier: number;
  winAmount: number;
  status: 'won' | 'lost' | 'pending';
  userId?: string;
  email?: string;
  playerName?: string;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const uid = params.userId || localStorage.getItem('user_id') || 'demo';
  const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  try {
    // 1. Try invoking the user's stored procedure record_game_result
    const rpcRes = await supabase.rpc('record_game_result', {
      p_game_name: params.gameName,
      p_bet_amount: params.betAmount,
      p_multiplier: params.multiplier,
      p_win_amount: params.winAmount,
      p_status: params.status
    });

    if (rpcRes.data && rpcRes.data.success) {
      // Broadcast to live ticker
      broadcastPlayerCashout(params.gameName, {
        user_id: uid,
        name: params.playerName || 'Player',
        multiplier: params.multiplier,
        win_amount: params.winAmount,
        game_name: params.gameName
      });
      return { success: true, newBalance: Number(rpcRes.data.new_balance) };
    }
  } catch (rpcErr) {
    // Expected if user is not logged in through Supabase Auth (e.g. auth.uid() is null in RLS)
  }

  // 2. Direct table insert fallback to public.game_history & public.profiles
  try {
    if (isUuid(uid)) {
      await supabase.from('game_history').insert([
        {
          user_id: uid,
          game_name: params.gameName,
          bet_amount: params.betAmount,
          multiplier: params.multiplier,
          win_amount: params.winAmount,
          status: params.status
        }
      ]);

      // Update profile balance directly if exists
      const { data: prof } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', uid)
        .maybeSingle();

      if (prof && prof.balance !== undefined && prof.balance !== null) {
        const currentBal = Number(prof.balance);
        const updatedBal = Math.max(0, currentBal - params.betAmount + params.winAmount);
        await supabase
          .from('profiles')
          .update({ balance: updatedBal })
          .eq('id', uid);

        return { success: true, newBalance: updatedBal };
      }
    }
  } catch (tableErr) {
    console.warn('Direct game_history table insert error:', tableErr);
  }

  // Also broadcast live win/bet event for real-time multiplayer feeds
  broadcastPlayerCashout(params.gameName, {
    user_id: uid,
    name: params.playerName || 'Player',
    multiplier: params.multiplier,
    win_amount: params.winAmount,
    game_name: params.gameName
  });

  return { success: true };
}

/* ==========================================================================
   FETCH GLOBAL GAME HISTORY & REAL-TIME LISTENER
   ========================================================================== */
export async function fetchRecentGameHistory(limit: number = 20): Promise<GameHistoryRecord[]> {
  try {
    const { data, error } = await supabase
      .from('game_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as GameHistoryRecord[];
    }
  } catch {}

  // Fallback to recent local history
  const localHistoryStr = localStorage.getItem('global_game_history');
  if (localHistoryStr) {
    try {
      return JSON.parse(localHistoryStr);
    } catch {}
  }
  return [];
}

export function subscribeToGameHistory(callback: (record: GameHistoryRecord) => void) {
  const channel = supabase
    .channel('public_game_history_feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'game_history' },
      (payload) => {
        if (payload.new) {
          callback(payload.new as GameHistoryRecord);
        }
      }
    )
    .subscribe();

  // Also listen on broadcast channel so live games across tabs sync instantly even without postgres replication enabled
  const broadcastChannel = getGameRealtimeChannel('global_ticker');
  broadcastChannel.on('broadcast', { event: 'ticker_win' }, (evt) => {
    if (evt.payload) {
      callback({
        user_id: evt.payload.user_id,
        game_name: evt.payload.game_name,
        bet_amount: evt.payload.bet || 100,
        multiplier: evt.payload.multiplier,
        win_amount: evt.payload.win_amount,
        status: evt.payload.win_amount > 0 ? 'won' : 'lost',
        player_name: evt.payload.name,
        created_at: new Date().toISOString()
      });
    }
  });

  return () => {
    channel.unsubscribe();
  };
}
