import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Sparkles,
  ShoppingCart,
  Users,
  RotateCcw,
  Crown,
  X,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Coins,
  Flame,
  FileText,
  Trophy,
  History,
  Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import dragonHeroImg from '../assets/images/dragon_hero_1787165953085.jpg';
import tigerHeroImg from '../assets/images/tiger_hero_1787165970837.jpg';
import tableBgImg from '../assets/images/dragon_tiger_bg_1787165935622.jpg';
import {
  getSynchronizedDragonTigerRound,
  getGameRealtimeChannel,
  broadcastPlayerBet,
  broadcastPlayerCashout,
  recordGameResultToSupabase,
  fetchActiveGameFromSupabase,
  subscribeToActiveGameSync,
  syncActiveGameToSupabase,
  getSupabaseServerNow,
} from '../services/gameSync';

/* =========================================================================
   TYPES & CONSTANTS
   ========================================================================= */
export type Suit = '♠' | '♥' | '♦' | '♣';
export type BetType = 'dragon' | 'tiger' | 'tie';
export type Outcome = 'dragon' | 'tiger' | 'tie';
export type RoundPhase = 'betting' | 'deal' | 'showdown';

export interface Card {
  rank: number; // 1 (Ace) to 13 (King)
  suit: Suit;
  color: 'red' | 'black';
}

export interface RoundResult {
  id: number;
  outcome: Outcome;
  dragonCard: Card;
  tigerCard: Card;
  timestamp: number;
  dragonTotal: number;
  tigerTotal: number;
  tieTotal: number;
}

export interface PlayerSeat {
  id: string;
  name: string;
  chips: number;
  tag?: 'WINNER' | 'LUCKY' | 'VIP' | 'TOP';
  avatar: string;
}

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
export const RANK_NAMES: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export const CHIP_VALUES = [10, 50, 100, 500, 1000];

export function isRedSuit(suit: Suit): boolean {
  return suit === '♥' || suit === '♦';
}

export function getRankLabel(rank: number): string {
  return RANK_NAMES[rank] || String(rank);
}

export function drawCard(customRank?: number, customSuit?: Suit): Card {
  const rank = customRank ?? (Math.floor(Math.random() * 13) + 1);
  const suit = customSuit ?? SUITS[Math.floor(Math.random() * SUITS.length)];
  return {
    rank,
    suit,
    color: isRedSuit(suit) ? 'red' : 'black',
  };
}

export function resolveOutcome(dragon: Card, tiger: Card): Outcome {
  if (dragon.rank > tiger.rank) return 'dragon';
  if (tiger.rank > dragon.rank) return 'tiger';
  return 'tie';
}

export function settleBets(
  bets: { dragon: number; tiger: number; tie: number },
  outcome: Outcome
): { credited: number; profit: number; note: string } {
  const totalStaked = bets.dragon + bets.tiger + bets.tie;
  if (totalStaked === 0) return { credited: 0, profit: 0, note: 'No bet placed' };

  let credited = 0;

  if (outcome === 'tie') {
    if (bets.tie > 0) credited += bets.tie * 9;
    if (bets.dragon > 0) credited += Math.floor(bets.dragon * 0.5);
    if (bets.tiger > 0) credited += Math.floor(bets.tiger * 0.5);
  } else if (outcome === 'dragon') {
    if (bets.dragon > 0) credited += bets.dragon * 2;
  } else if (outcome === 'tiger') {
    if (bets.tiger > 0) credited += bets.tiger * 2;
  }

  const profit = credited - totalStaked;
  let note = '';
  if (profit > 0) {
    note = `Won Rs ${profit.toLocaleString('en-PK')}`;
  } else if (profit === 0 && credited > 0) {
    note = 'Push / Stake Returned';
  } else if (totalStaked > 0) {
    note = `Lost Rs ${totalStaked.toLocaleString('en-PK')}`;
  }

  return { credited, profit, note };
}

export function formatChips(amount: number): string {
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return amount.toLocaleString('en-PK');
}

export function trendSplit(results: RoundResult[], count = 20): { dragon: number; tiger: number; tie: number } {
  const slice = results.slice(-count);
  if (!slice.length) return { dragon: 48, tiger: 48, tie: 4 };

  const counts = { dragon: 0, tiger: 0, tie: 0 };
  slice.forEach((r) => counts[r.outcome]++);

  const total = slice.length;
  return {
    dragon: Math.round((counts.dragon / total) * 100),
    tiger: Math.round((counts.tiger / total) * 100),
    tie: Math.round((counts.tie / total) * 100),
  };
}

export function generateInitialHistory(count = 25): RoundResult[] {
  const out: RoundResult[] = [];
  const baseRound = 2026081700;

  const samplePairs: [number, number, Suit, Suit][] = [
    [13, 8, '♠', '♥'],
    [4, 11, '♦', '♣'],
    [10, 10, '♥', '♦'],
    [7, 3, '♣', '♠'],
    [1, 9, '♦', '♥'],
    [12, 6, '♠', '♣'],
    [8, 13, '♥', '♦'],
    [5, 5, '♣', '♠'],
    [11, 2, '♦', '♥'],
    [9, 12, '♠', '♣'],
    [3, 8, '♥', '♦'],
    [13, 1, '♣', '♠'],
    [6, 6, '♦', '♥'],
    [9, 9, '♦', '♣'],
    [12, 10, '♥', '♠'],
    [2, 7, '♣', '♦'],
    [13, 3, '♠', '♥'],
    [5, 11, '♦', '♣'],
    [8, 2, '♥', '♠'],
    [4, 4, '♣', '♦'],
  ];

  samplePairs.forEach((pair, idx) => {
    const dragonCard: Card = { rank: pair[0], suit: pair[2], color: isRedSuit(pair[2]) ? 'red' : 'black' };
    const tigerCard: Card = { rank: pair[1], suit: pair[3], color: isRedSuit(pair[3]) ? 'red' : 'black' };
    const outcome = resolveOutcome(dragonCard, tigerCard);

    out.push({
      id: baseRound + idx,
      outcome,
      dragonCard,
      tigerCard,
      timestamp: Date.now() - (samplePairs.length - idx) * 20000,
      dragonTotal: 4000 + Math.floor(Math.random() * 8000),
      tigerTotal: 6000 + Math.floor(Math.random() * 10000),
      tieTotal: 200 + Math.floor(Math.random() * 600),
    });
  });

  return out;
}

const FIRST_NAMES = ['Ali', 'Hamza', 'Usman', 'Bilal', 'Zaid', 'Fahad', 'Saad', 'Hassan', 'Farhan', 'Ahmed', 'Tariq', 'Shahid', 'Imran', 'Babar', 'Ayesha', 'Fatima', 'Zainab', 'Sana'];
const LAST_NAMES = ['Khan', 'Malik', 'Chaudhry', 'Sheikh', 'Dar', 'Bhatti', 'Raja', 'Qureshi', 'Shah', 'Mirza', 'Jutt', 'Rana', 'VIP', 'Winner'];

export function generatePlayers(): PlayerSeat[] {
  const players: PlayerSeat[] = [];
  for (let i = 0; i < 40; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 3 + 5) % LAST_NAMES.length];
    const isSpecial = i % 4 === 0 ? 'WINNER' : i % 6 === 0 ? 'LUCKY' : undefined;
    const baseChips = [1250, 3850, 5200, 8400, 15900, 24500, 48000, 95000][i % 8] + ((i * 47) % 500);

    players.push({
      id: `p_${i + 1}`,
      name: `${fn} ${ln}`,
      chips: baseChips,
      tag: isSpecial,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=dt_${i}`,
    });
  }
  return players;
}

interface DragonTigerGameSectionProps {
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  showToast: (msg: string) => void;
  currentUser?: {
    id?: string;
    full_name?: string;
    email?: string;
  } | null;
  onNavigateToDeposit?: () => void;
  onBack?: () => void;
  onBetPlaced?: (amount: number) => void;
  addTransactionRecord?: (type: 'Profit' | 'Deposit', amount: number, note: string) => void;
  soundFX?: {
    playClick?: () => void;
    playSuccess?: () => void;
  };
}

export const DragonTigerGameSection: React.FC<DragonTigerGameSectionProps> = ({
  balance,
  setBalance,
  showToast,
  currentUser,
  onNavigateToDeposit,
  onBack,
  onBetPlaced,
  addTransactionRecord,
  soundFX
}) => {
  const initialSync = getSynchronizedDragonTigerRound();
  const [currentRoundId, setCurrentRoundId] = useState<string>(initialSync.roundId);
  const [phase, setPhase] = useState<RoundPhase>(initialSync.phase);
  const [countdown, setCountdown] = useState<number>(initialSync.countdownSec);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [liveConnectedCount, setLiveConnectedCount] = useState<number>(() => Math.floor(Math.random() * 20) + 45);
  const [isSupabaseSynced, setIsSupabaseSynced] = useState<boolean>(false);
  const [roundStartTime, setRoundStartTime] = useState<string>(initialSync.startTime || '');

  // Screen orientation and landscape mode support
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > window.innerHeight;
    }
    return true;
  });
  const [isForcedRotate, setIsForcedRotate] = useState<boolean>(false);

  useEffect(() => {
    // Attempt auto-orientation lock if supported on mobile device
    try {
      const orientation = screen?.orientation as unknown as { lock?: (mode: string) => Promise<void>; unlock?: () => void } | undefined;
      if (orientation && typeof orientation.lock === 'function') {
        orientation.lock('landscape').catch(() => {});
      }
    } catch {}

    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      try {
        const orientation = screen?.orientation as unknown as { lock?: (mode: string) => Promise<void>; unlock?: () => void } | undefined;
        if (orientation && typeof orientation.unlock === 'function') {
          orientation.unlock();
        }
      } catch {}
    };
  }, []);

  const toggleRotateMode = async () => {
    try {
      const orientation = screen?.orientation as unknown as { lock?: (mode: string) => Promise<void>; unlock?: () => void } | undefined;
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('landscape');
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        if (orientation && typeof orientation.unlock === 'function') {
          orientation.unlock();
        }
      }
    } catch {}
    setIsForcedRotate(prev => !prev);
  };

  const [userBets, setUserBets] = useState<{ dragon: number; tiger: number; tie: number }>({
    dragon: 0,
    tiger: 0,
    tie: 0,
  });
  const [lastBets, setLastBets] = useState<{ dragon: number; tiger: number; tie: number }>({
    dragon: 0,
    tiger: 0,
    tie: 0,
  });

  const [dragonCard, setDragonCard] = useState<Card | null>(initialSync.dragonCard);
  const [tigerCard, setTigerCard] = useState<Card | null>(initialSync.tigerCard);
  const [revealed, setRevealed] = useState<boolean>(initialSync.revealed);
  const [outcome, setOutcome] = useState<Outcome | null>(initialSync.phase === 'showdown' ? initialSync.outcome : null);
  const [results, setResults] = useState<RoundResult[]>(() => generateInitialHistory());
  const [bannerWinAmount, setBannerWinAmount] = useState<number | null>(null);

  const [showTrend, setShowTrend] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);

  const [botPot, setBotPot] = useState<{ dragon: number; tiger: number; tie: number }>({
    dragon: 4500,
    tiger: 6200,
    tie: 350,
  });

  const [playersList] = useState<PlayerSeat[]>(() => generatePlayers());

  const userBetsRef = useRef(userBets);
  userBetsRef.current = userBets;
  const balanceRef = useRef(balance);
  balanceRef.current = balance;
  const lastProcessedRoundRef = useRef<string>(initialSync.roundId);
  const settledRoundRef = useRef<string>('');

  // Audio Context for sound effects
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Realtime Supabase Channel for multiplayer chip bets across devices
  useEffect(() => {
    const channel = getGameRealtimeChannel('dragon_tiger');
    const onPlayerBet = (evt: any) => {
      if (evt?.payload?.target && typeof evt.payload.bet === 'number') {
        const target = evt.payload.target as 'dragon' | 'tiger' | 'tie';
        setBotPot(prev => ({
          ...prev,
          [target]: prev[target] + evt.payload.bet
        }));
      }
    };

    channel.on('broadcast', { event: 'player_bet' }, onPlayerBet);

    const presenceInterval = setInterval(() => {
      setLiveConnectedCount(prev => Math.max(30, prev + (Math.floor(Math.random() * 3) - 1)));
    }, 7000);

    return () => {
      clearInterval(presenceInterval);
    };
  }, []);

  // Fetch current game start time / active round from Supabase (active_games or game_history)
  useEffect(() => {
    let isMounted = true;

    fetchActiveGameFromSupabase('dragon_tiger')
      .then((active) => {
        if (!isMounted) return;
        setIsSupabaseSynced(true);
        if (active.start_time) {
          setRoundStartTime(active.start_time);
        }
        if (active.round_id && active.round_id !== currentRoundId) {
          setCurrentRoundId(active.round_id);
        }
      })
      .catch(() => {});

    const unsubscribeActive = subscribeToActiveGameSync('dragon_tiger', (active) => {
      if (!isMounted) return;
      setIsSupabaseSynced(true);
      if (active.start_time) {
        setRoundStartTime(active.start_time);
      }
      if (active.round_id && active.round_id !== lastProcessedRoundRef.current && active.phase === 'betting') {
        setCurrentRoundId(active.round_id);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeActive();
    };
  }, []);
  const playSound = (type: 'chip' | 'card' | 'tick' | 'win' | 'gong') => {
    if (soundMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      if (type === 'chip') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'win') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const st = now + idx * 0.08;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, st);
          gain.gain.setValueAtTime(0.2, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(st);
          osc.stop(st + 0.25);
        });
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'gong') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 1.0);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.0);
      }
    } catch {}
  };

  // SYNCHRONIZED REAL-TIME ENGINE FOR DRAGON TIGER
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const sync = getSynchronizedDragonTigerRound();

      // Check if new round started across all devices
      if (sync.roundId !== lastProcessedRoundRef.current) {
        lastProcessedRoundRef.current = sync.roundId;
        setCurrentRoundId(sync.roundId);
        settledRoundRef.current = '';
        setRoundStartTime(sync.startTime);

        // Sync active round to Supabase
        syncActiveGameToSupabase('dragon_tiger', {
          round_id: sync.roundId,
          start_time: sync.startTime,
          phase: sync.phase,
          countdown_sec: sync.countdownSec,
          elapsed_ms: sync.elapsedMs,
        });

        if (userBetsRef.current.dragon + userBetsRef.current.tiger + userBetsRef.current.tie > 0) {
          setLastBets({ ...userBetsRef.current });
        }
        setUserBets({ dragon: 0, tiger: 0, tie: 0 });
        setDragonCard(null);
        setTigerCard(null);
        setRevealed(false);
        setOutcome(null);
        setBannerWinAmount(null);
        setBotPot({
          dragon: 3500 + Math.floor(Math.random() * 3000),
          tiger: 4800 + Math.floor(Math.random() * 4000),
          tie: 300 + Math.floor(Math.random() * 300),
        });
      }

      setPhase(sync.phase);
      setCountdown(sync.countdownSec);

      if (sync.phase === 'betting') {
        setDragonCard(null);
        setTigerCard(null);
        setRevealed(false);
        setOutcome(null);
      } else if (sync.phase === 'deal') {
        setDragonCard(sync.dragonCard);
        setTigerCard(sync.tigerCard);
        setRevealed(false);
        setOutcome(null);
      } else if (sync.phase === 'showdown') {
        setDragonCard(sync.dragonCard);
        setTigerCard(sync.tigerCard);
        setRevealed(true);
        setOutcome(sync.outcome);

        // Execute Settlement once per round
        if (settledRoundRef.current !== sync.roundId) {
          settledRoundRef.current = sync.roundId;
          const currentBets = userBetsRef.current;
          const totalStaked = currentBets.dragon + currentBets.tiger + currentBets.tie;

          if (totalStaked > 0) {
            const settlement = settleBets(currentBets, sync.outcome);

            if (settlement.credited > 0) {
              setBalance((b) => b + settlement.credited);
              if (settlement.profit > 0) {
                addTransactionRecord?.('Profit', settlement.profit, `Dragon Tiger Win (${sync.outcome.toUpperCase()})`);
              }
            }

            const isWon = settlement.profit > 0;
            const mult = isWon ? Number(((totalStaked + settlement.profit) / totalStaked).toFixed(2)) : 1.0;

            if (isWon) {
              setBannerWinAmount(settlement.profit);
              playSound('win');
              confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#facc15', '#38bdf8', '#ef4444'],
              });
              showToast(`🎉 You Won Rs ${settlement.profit.toLocaleString('en-PK')} on ${sync.outcome.toUpperCase()}!`);

              broadcastPlayerCashout('dragon_tiger', {
                user_id: currentUser?.id || 'player',
                name: currentUser?.full_name || 'You',
                multiplier: mult,
                win_amount: settlement.profit,
                game_name: 'dragon_tiger',
              });
            } else {
              setBannerWinAmount(null);
              playSound('gong');
              showToast(`Round Result: ${sync.outcome.toUpperCase()}`);
            }

            // Record into Supabase public.game_history & profiles balance
            recordGameResultToSupabase({
              gameName: 'dragon_tiger',
              betAmount: totalStaked,
              multiplier: mult,
              winAmount: settlement.profit,
              status: isWon ? 'won' : 'lost',
              userId: currentUser?.id,
              email: currentUser?.email,
              playerName: currentUser?.full_name,
            });
          }

          setResults((prev) => [
            ...prev,
            {
              id: Date.now(),
              outcome: sync.outcome,
              dragonCard: sync.dragonCard,
              tigerCard: sync.tigerCard,
              timestamp: Date.now(),
              dragonTotal: botPot.dragon + currentBets.dragon,
              tigerTotal: botPot.tiger + currentBets.tiger,
              tieTotal: botPot.tie + currentBets.tie,
            },
          ]);
        }
      }
    }, 100);

    return () => clearInterval(syncInterval);
  }, [currentUser]);

  // Handle Bet placement
  const handlePlaceBet = useCallback(
    (side: BetType) => {
      if (phase !== 'betting') return;
      if (balanceRef.current < selectedChip) {
        showToast('Insufficient balance! Please add deposit.');
        onNavigateToDeposit?.();
        return;
      }

      playSound('chip');
      setBalance((b) => b - selectedChip);
      onBetPlaced?.(selectedChip);
      setUserBets((prev) => ({
        ...prev,
        [side]: prev[side] + selectedChip,
      }));

      // Broadcast bet in real-time to all other devices
      broadcastPlayerBet('dragon_tiger', {
        id: `dt_${Date.now()}_${Math.random()}`,
        user_id: currentUser?.id || 'guest',
        name: currentUser?.full_name || 'You',
        game_name: 'dragon_tiger',
        bet: selectedChip,
        round_id: currentRoundId,
        timestamp: Date.now(),
        target: side,
        is_real_user: true,
      });
    },
    [phase, selectedChip, onBetPlaced, currentRoundId, currentUser]
  );

  const handleReBet = () => {
    if (phase !== 'betting') return;
    const totalLast = lastBets.dragon + lastBets.tiger + lastBets.tie;
    if (totalLast === 0 || balanceRef.current < totalLast) {
      showToast('No previous bet or insufficient balance for ReBet');
      return;
    }
    playSound('chip');
    setBalance((b) => b - totalLast);
    onBetPlaced?.(totalLast);
    setUserBets((b) => ({
      dragon: b.dragon + lastBets.dragon,
      tiger: b.tiger + lastBets.tiger,
      tie: b.tie + lastBets.tie,
    }));
  };

  const zoneTotals = useMemo(
    () => ({
      dragon: botPot.dragon + userBets.dragon,
      tiger: botPot.tiger + userBets.tiger,
      tie: botPot.tie + userBets.tie,
    }),
    [botPot, userBets]
  );

  const { dragon: dragonPct, tiger: tigerPct } = useMemo(() => trendSplit(results, 20), [results]);

  const isDragonWinner = phase === 'showdown' && outcome === 'dragon';
  const isTigerWinner = phase === 'showdown' && outcome === 'tiger';
  const isTieWinner = phase === 'showdown' && outcome === 'tie';

  const progressPct = phase === 'betting' ? (countdown / 15) * 100 : (countdown / 6) * 100;
  const phaseLabel = phase === 'betting' ? 'BETTING' : phase === 'deal' ? 'DEALING' : 'SHOWDOWN';

  const isVirtualRotateActive = isForcedRotate && !isLandscape;

  const mainGameContent = (
    <div className="space-y-3 w-full max-w-5xl mx-auto pb-8 select-none font-sans relative">
      
      {/* =========================================================================
          TOP CASINO HEADER BAR: Matching Theme with Wallet, Timer, Sound & Navigation
          ========================================================================= */}
      <div className="bg-gradient-to-b from-[#1a0f0a] via-[#24130d] to-[#140805] px-3 py-2 rounded-2xl border-2 border-[#5c2428] shadow-2xl flex flex-wrap items-center justify-between gap-2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/30 pointer-events-none" />

        {/* Left: Back Button & User Info */}
        <div className="flex items-center gap-2 relative z-10">
          <button
            type="button"
            onClick={() => {
              playSound('chip');
              onBack?.();
            }}
            className="w-8 h-8 rounded-xl bg-[#180c05] hover:bg-[#2e1509] border border-[#5c2428] flex items-center justify-center text-amber-200 cursor-pointer active:scale-95 transition font-black text-sm"
            title="Back to Games Lobby"
          >
            &lt;
          </button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-b from-yellow-400 to-amber-600 p-0.5 shadow">
              <div className="w-full h-full rounded-full bg-[#200b0d] overflow-hidden flex items-center justify-center">
                <span className="text-sm">🧝‍♀️</span>
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-black text-amber-100 truncate max-w-[80px]">
                {currentUser?.full_name || 'mozi'}
              </span>
              <span className="text-[8px] font-mono text-amber-400/80">
                ID:{currentUser?.id?.substring(0, 7) || '9834144'}
              </span>
            </div>
          </div>

          {/* Balance Chip */}
          <div className="flex items-center bg-[#150507] border border-[#6b252a] rounded-full pl-1.5 pr-2.5 py-0.5 shadow-inner ml-1">
            <span className="text-xs mr-1">🪙</span>
            <span className="text-xs font-black text-amber-300 font-mono">
              Rs {balance.toFixed(2)}
            </span>
          </div>

          {/* Real-time Synced Room Badge */}
          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold ml-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>#{currentRoundId}</span>
            <span className="text-emerald-500/40">•</span>
            <span className="text-slate-300">👥 {liveConnectedCount}</span>
          </div>

          <div 
            className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[8px] font-mono ml-1"
            title={roundStartTime ? `Server Start Time: ${new Date(roundStartTime).toLocaleTimeString()}` : 'Supabase Server Synced'}
          >
            <Radio className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
            <span>Live Synced</span>
          </div>
        </div>

        {/* Center: Top Hero Display + Round Timer */}
        <div className="flex items-center gap-2 relative z-10 mx-auto">
          {/* Dragon Hero Box */}
          <div className="hidden sm:flex items-center gap-1 bg-sky-950/80 px-2 py-1 rounded-xl border border-sky-500/60 shadow">
            <img src={dragonHeroImg} alt="Dragon" className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-[10px] font-black text-sky-300">DRAGON</span>
          </div>

          {/* Playing Cards Display */}
          <div className="flex items-center gap-2 bg-black/60 px-2.5 py-1 rounded-2xl border border-amber-500/30">
            {/* Dragon Card */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-14 sm:w-12 sm:h-16 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${
                revealed && dragonCard
                  ? isDragonWinner
                    ? 'border-yellow-400 bg-white ring-2 ring-yellow-400 shadow-[0_0_15px_#facc15]'
                    : 'border-slate-300 bg-white'
                  : 'border-sky-400 bg-gradient-to-br from-sky-800 to-sky-950 shadow'
              }`}>
                {revealed && dragonCard ? (
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span className={`text-sm sm:text-base font-black ${isRedSuit(dragonCard.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                      {getRankLabel(dragonCard.rank)}
                    </span>
                    <span className={`text-xs ${isRedSuit(dragonCard.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                      {dragonCard.suit}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-black text-sky-200">🐉</span>
                )}
              </div>
              <span className="text-[8px] font-black text-sky-300 uppercase mt-0.5">
                {revealed && dragonCard ? `${dragonCard.rank} PTS` : 'DRAGON'}
              </span>
            </div>

            {/* Countdown Ring */}
            <div className="flex flex-col items-center justify-center px-1">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center relative shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                style={{
                  background: `conic-gradient(#facc15 ${progressPct}%, rgba(30, 10, 10, 0.7) ${progressPct}%)`,
                }}
              >
                <div className="w-7 h-7 rounded-full bg-stone-950 border border-yellow-500/60 flex items-center justify-center shadow-inner">
                  <span className={`text-xs font-black tabular-nums ${
                    countdown <= 3 && phase === 'betting' ? 'text-red-400 animate-ping' : 'text-yellow-300'
                  }`}>
                    {countdown}
                  </span>
                </div>
              </div>
              <span className="text-[7px] font-black text-yellow-200 uppercase mt-0.5 tracking-tight bg-black/60 px-1 rounded">
                {phaseLabel}
              </span>
            </div>

            {/* Tiger Card */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-14 sm:w-12 sm:h-16 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${
                revealed && tigerCard
                  ? isTigerWinner
                    ? 'border-yellow-400 bg-white ring-2 ring-yellow-400 shadow-[0_0_15px_#facc15]'
                    : 'border-slate-300 bg-white'
                  : 'border-red-400 bg-gradient-to-br from-red-800 to-red-950 shadow'
              }`}>
                {revealed && tigerCard ? (
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span className={`text-sm sm:text-base font-black ${isRedSuit(tigerCard.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                      {getRankLabel(tigerCard.rank)}
                    </span>
                    <span className={`text-xs ${isRedSuit(tigerCard.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                      {tigerCard.suit}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-black text-red-200">🐯</span>
                )}
              </div>
              <span className="text-[8px] font-black text-red-300 uppercase mt-0.5">
                {revealed && tigerCard ? `${tigerCard.rank} PTS` : 'TIGER'}
              </span>
            </div>
          </div>

          {/* Tiger Hero Box */}
          <div className="hidden sm:flex items-center gap-1 bg-red-950/80 px-2 py-1 rounded-xl border border-red-500/60 shadow">
            <img src={tigerHeroImg} alt="Tiger" className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-[10px] font-black text-red-300">TIGER</span>
          </div>
        </div>

        {/* Right: Actions (Add Cash, Trends, Rotate, Sound) */}
        <div className="flex items-center gap-1.5 relative z-10">
          <button
            type="button"
            onClick={() => setShowTrend(!showTrend)}
            className="flex items-center gap-1 bg-[#1e0e11] hover:bg-[#35181e] border border-[#5c2428] px-2 py-1 rounded-xl text-amber-300 text-[10px] font-black cursor-pointer active:scale-95 transition"
            title="View Trends & Roadmaps"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TRENDS</span>
          </button>

          {/* Rotate Screen / Landscape Button */}
          <button
            type="button"
            onClick={toggleRotateMode}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-[10px] font-black transition cursor-pointer active:scale-95 ${
              isLandscape || isForcedRotate
                ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20'
                : 'bg-[#1e0e11] border-[#5c2428] text-amber-300 hover:text-white'
            }`}
            title="Rotate Screen / Landscape Mode"
          >
            <Smartphone className="w-3.5 h-3.5 rotate-90 text-amber-400" />
            <span className="hidden sm:inline">ROTATE</span>
          </button>

          {onNavigateToDeposit && (
            <button
              type="button"
              onClick={() => {
                playSound('chip');
                onNavigateToDeposit();
              }}
              className="flex items-center gap-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-xl shadow-[0_0_10px_rgba(245,158,11,0.5)] active:scale-95 transition cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>ADD CASH</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSoundMuted(!soundMuted)}
            className="p-1 rounded-lg text-amber-200 hover:text-white transition cursor-pointer"
            title="Sound Settings"
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* PORTRAIT HELPER BANNER FOR MOBILE */}
      {!isLandscape && !isForcedRotate && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#24130d] via-[#351016] to-[#24130d] border border-amber-500/40 px-3 py-1.5 rounded-xl flex items-center justify-between text-amber-200 text-xs shadow-md"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-400 rotate-90 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold">Rotate phone sideways for full Dragon Tiger casino table view</span>
          </div>
          <button
            type="button"
            onClick={toggleRotateMode}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-lg active:scale-95 transition shadow cursor-pointer shrink-0"
          >
            Rotate
          </button>
        </motion.div>
      )}

      {/* =========================================================================
          MAIN GAME ARENA: LUXURY ASIAN CASINO TABLE BACKGROUND & 3 BETTING ZONES
          ========================================================================= */}
      <div
        className="relative w-full rounded-3xl border-4 border-[#b45309] p-3 sm:p-5 overflow-hidden shadow-2xl flex flex-col justify-between"
        style={{
          backgroundImage: `url(${tableBgImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '380px'
        }}
      >
        {/* Dark Table Tint Overlay */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />

        {/* Top Bead Road Bar */}
        <div className="relative z-10 mb-3 bg-black/70 backdrop-blur-sm p-1.5 rounded-2xl border border-amber-500/30 flex items-center justify-between overflow-x-auto gap-1">
          <div className="flex items-center gap-1 overflow-x-auto">
            {results.slice(-14).map((r, i) => (
              <div
                key={`dt-top-bead-${r.id}-${i}`}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow border ${
                  r.outcome === 'dragon'
                    ? 'bg-sky-600 border-sky-300'
                    : r.outcome === 'tiger'
                    ? 'bg-red-600 border-red-300'
                    : 'bg-emerald-600 border-emerald-300'
                }`}
              >
                {r.outcome === 'dragon' ? 'D' : r.outcome === 'tiger' ? 'T' : '='}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pl-2">
            <span className="text-[10px] font-bold text-sky-400">D: {dragonPct}%</span>
            <span className="text-[10px] font-bold text-red-400">T: {tigerPct}%</span>
          </div>
        </div>

        {/* The 3 Betting Boxes: Dragon (2x), Tie (9x), Tiger (2x) */}
        <div className="relative z-10 grid grid-cols-3 gap-2.5 sm:gap-4 flex-1 items-stretch my-auto">
          
          {/* 1. DRAGON ZONE */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePlaceBet('dragon')}
            disabled={phase !== 'betting'}
            className={`relative rounded-2xl overflow-hidden border-2 transition-all p-3 flex flex-col justify-between text-left cursor-pointer disabled:cursor-default min-h-[190px] sm:min-h-[220px] ${
              isDragonWinner
                ? 'border-yellow-300 bg-sky-950/90 shadow-[0_0_30px_rgba(56,189,248,0.9)] ring-4 ring-yellow-400/80 scale-[1.02]'
                : 'border-sky-500/70 bg-gradient-to-b from-sky-950/90 via-[#0b192e]/90 to-black/90 hover:border-sky-300 shadow-xl'
            }`}
          >
            {/* Dragon Hero Image Inside Box */}
            <div className="absolute inset-0 opacity-30 pointer-events-none flex items-center justify-center overflow-hidden">
              <img src={dragonHeroImg} alt="" className="w-full h-full object-cover mix-blend-screen scale-110" />
            </div>

            {/* Total Pool */}
            <div className="relative z-10 flex flex-col">
              <span className="text-[9px] font-bold text-sky-300 uppercase">Dragon Pool</span>
              <span className="text-xs sm:text-sm font-black text-white font-mono">
                Rs {formatChips(zoneTotals.dragon)}
              </span>
            </div>

            {/* User Bet Tag */}
            {userBets.dragon > 0 && (
              <div className="relative z-20 self-start bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow border border-white">
                YOU: Rs {userBets.dragon}
              </div>
            )}

            {/* Winner Badge on Box */}
            {isDragonWinner && (
              <div className="absolute top-2 right-2 z-30 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg border border-white flex items-center gap-1 animate-bounce">
                <Crown className="w-3 h-3 fill-current" />
                <span>WINNER</span>
              </div>
            )}

            {/* Simple Win Amount */}
            {isDragonWinner && bannerWinAmount && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <div className="bg-black/90 px-3 py-1.5 rounded-xl border border-emerald-400 text-center animate-pulse shadow-2xl">
                  <span className="text-[9px] font-bold text-emerald-300 block">YOU WON</span>
                  <span className="text-sm sm:text-base font-black text-emerald-400">+ Rs {bannerWinAmount}</span>
                </div>
              </div>
            )}

            {/* Title & Multiplier */}
            <div className="relative z-10 mt-auto text-center">
              <h3 className="text-lg sm:text-2xl font-black text-sky-300 tracking-wider drop-shadow">
                DRAGON
              </h3>
              <span className="text-xs sm:text-sm font-black text-white/70">1:1 (X2)</span>
            </div>
          </motion.button>

          {/* 2. TIE ZONE */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePlaceBet('tie')}
            disabled={phase !== 'betting'}
            className={`relative rounded-2xl overflow-hidden border-2 transition-all p-3 flex flex-col justify-between text-left cursor-pointer disabled:cursor-default min-h-[190px] sm:min-h-[220px] ${
              isTieWinner
                ? 'border-yellow-300 bg-emerald-950/90 shadow-[0_0_30px_rgba(52,211,153,0.9)] ring-4 ring-yellow-400/80 scale-[1.02]'
                : 'border-emerald-500/70 bg-gradient-to-b from-emerald-950/90 via-[#072417]/90 to-black/90 hover:border-emerald-300 shadow-xl'
            }`}
          >
            {/* Total Pool */}
            <div className="relative z-10 flex flex-col">
              <span className="text-[9px] font-bold text-emerald-300 uppercase">Tie Pool</span>
              <span className="text-xs sm:text-sm font-black text-white font-mono">
                Rs {formatChips(zoneTotals.tie)}
              </span>
            </div>

            {/* User Bet Tag */}
            {userBets.tie > 0 && (
              <div className="relative z-20 self-start bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow border border-white">
                YOU: Rs {userBets.tie}
              </div>
            )}

            {/* Winner Badge */}
            {isTieWinner && (
              <div className="absolute top-2 right-2 z-30 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg border border-white flex items-center gap-1 animate-bounce">
                <Crown className="w-3 h-3 fill-current" />
                <span>WINNER</span>
              </div>
            )}

            {/* Title & Multiplier */}
            <div className="relative z-10 mt-auto text-center">
              <h3 className="text-lg sm:text-2xl font-black text-emerald-300 tracking-wider drop-shadow">
                TIE
              </h3>
              <span className="text-xs sm:text-sm font-black text-yellow-300">1:8 (X9)</span>
            </div>
          </motion.button>

          {/* 3. TIGER ZONE */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePlaceBet('tiger')}
            disabled={phase !== 'betting'}
            className={`relative rounded-2xl overflow-hidden border-2 transition-all p-3 flex flex-col justify-between text-left cursor-pointer disabled:cursor-default min-h-[190px] sm:min-h-[220px] ${
              isTigerWinner
                ? 'border-yellow-300 bg-red-950/90 shadow-[0_0_30px_rgba(239,68,68,0.9)] ring-4 ring-yellow-400/80 scale-[1.02]'
                : 'border-red-500/70 bg-gradient-to-b from-red-950/90 via-[#2e0b0e]/90 to-black/90 hover:border-red-300 shadow-xl'
            }`}
          >
            {/* Tiger Hero Image Inside Box */}
            <div className="absolute inset-0 opacity-30 pointer-events-none flex items-center justify-center overflow-hidden">
              <img src={tigerHeroImg} alt="" className="w-full h-full object-cover mix-blend-screen scale-110" />
            </div>

            {/* Total Pool */}
            <div className="relative z-10 flex flex-col">
              <span className="text-[9px] font-bold text-red-300 uppercase">Tiger Pool</span>
              <span className="text-xs sm:text-sm font-black text-white font-mono">
                Rs {formatChips(zoneTotals.tiger)}
              </span>
            </div>

            {/* User Bet Tag */}
            {userBets.tiger > 0 && (
              <div className="relative z-20 self-start bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow border border-white">
                YOU: Rs {userBets.tiger}
              </div>
            )}

            {/* Winner Badge */}
            {isTigerWinner && (
              <div className="absolute top-2 right-2 z-30 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg border border-white flex items-center gap-1 animate-bounce">
                <Crown className="w-3 h-3 fill-current" />
                <span>WINNER</span>
              </div>
            )}

            {/* Simple Win Amount */}
            {isTigerWinner && bannerWinAmount && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <div className="bg-black/90 px-3 py-1.5 rounded-xl border border-emerald-400 text-center animate-pulse shadow-2xl">
                  <span className="text-[9px] font-bold text-emerald-300 block">YOU WON</span>
                  <span className="text-sm sm:text-base font-black text-emerald-400">+ Rs {bannerWinAmount}</span>
                </div>
              </div>
            )}

            {/* Title & Multiplier */}
            <div className="relative z-10 mt-auto text-center">
              <h3 className="text-lg sm:text-2xl font-black text-red-300 tracking-wider drop-shadow">
                TIGER
              </h3>
              <span className="text-xs sm:text-sm font-black text-white/70">1:1 (X2)</span>
            </div>
          </motion.button>

        </div>

        {/* Bottom Trend Percentage Bar */}
        <div className="relative z-10 mt-3 pt-2 border-t border-amber-900/40 flex items-center justify-between">
          <div className="w-full max-w-sm mx-auto flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-black text-amber-200">
              <span className="text-sky-400">Dragon {dragonPct}%</span>
              <span>Last 20 Rounds</span>
              <span className="text-red-400">Tiger {tigerPct}%</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden border border-white/20 bg-black/60">
              <div style={{ width: `${dragonPct}%` }} className="bg-sky-500" />
              <div style={{ width: `${100 - dragonPct - tigerPct}%` }} className="bg-amber-400" />
              <div style={{ width: `${tigerPct}%` }} className="bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM CHIP SELECTOR TRAY & REBET ACTION
          ========================================================================= */}
      <div className="bg-[#180a0d] p-2 sm:p-3 rounded-2xl border-2 border-[#5c2428] shadow-xl flex items-center justify-between gap-2">
        {/* Chip Selectors */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none py-1">
          {CHIP_VALUES.map((val) => {
            const isSelected = selectedChip === val;
            return (
              <motion.button
                key={val}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedChip(val);
                  playSound('chip');
                }}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-xs cursor-pointer shadow-lg transition-all relative ${
                  isSelected ? '-translate-y-1 ring-4 ring-yellow-400 scale-110 shadow-yellow-500/50' : 'hover:-translate-y-0.5'
                }`}
                style={{
                  background:
                    val === 10
                      ? 'radial-gradient(circle at 35% 30%, #4ade80 0%, #16a34a 60%, #14532d 100%)'
                      : val === 50
                      ? 'radial-gradient(circle at 35% 30%, #60a5fa 0%, #2563eb 60%, #1e3a8a 100%)'
                      : val === 100
                      ? 'radial-gradient(circle at 35% 30%, #f87171 0%, #dc2626 60%, #7f1d1d 100%)'
                      : val === 500
                      ? 'radial-gradient(circle at 35% 30%, #c084fc 0%, #7c3aed 60%, #4c1d95 100%)'
                      : 'radial-gradient(circle at 35% 30%, #fde047 0%, #d97706 60%, #78350f 100%)',
                  border: isSelected ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.4)',
                }}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 flex items-center justify-center text-white border border-white/40">
                  {val >= 1000 ? `${val / 1000}K` : val}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ReBet Action Button */}
        <button
          type="button"
          onClick={handleReBet}
          disabled={phase !== 'betting'}
          className="bg-gradient-to-b from-stone-200 to-stone-400 hover:from-white hover:to-stone-300 text-stone-900 font-black text-xs px-4 py-2.5 rounded-xl border border-yellow-300 shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
        >
          ReBet
        </button>
      </div>

      {/* =========================================================================
          TRENDS / ROADMAP MODAL
          ========================================================================= */}
      {showTrend && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 select-none"
          onClick={() => setShowTrend(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl p-4 shadow-2xl border-2 bg-gradient-to-b from-[#2a0e12] to-[#160608] border-amber-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-amber-900/50">
              <h3 className="text-base font-black text-yellow-300 uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>DRAGON TIGER ROADMAP & TRENDS</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTrend(false)}
                className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center text-stone-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dragon vs Tiger Percentage Bar */}
            <div className="my-3 flex h-7 rounded-full overflow-hidden border border-yellow-500/40 text-xs font-black text-white">
              <div className="flex items-center gap-1 bg-sky-600 px-3" style={{ width: `${Math.max(dragonPct, 15)}%` }}>
                <span>Dragon</span>
                <span className="ml-auto">{dragonPct}%</span>
              </div>
              <div className="flex flex-1 items-center gap-1 bg-red-600 px-3">
                <span className="ml-auto">{tigerPct}%</span>
                <span>Tiger</span>
              </div>
            </div>

            {/* Bead History Grid */}
            <div className="bg-black/60 p-2 rounded-xl border border-amber-900/40 mb-3 overflow-x-auto">
              <div className="flex gap-1.5 min-w-max">
                {results.slice(-20).map((r, idx) => (
                  <div key={`dt-trend-round-${r.id}-${idx}`} className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shadow border ${
                        r.outcome === 'dragon'
                          ? 'bg-sky-600 border-sky-300'
                          : r.outcome === 'tiger'
                          ? 'bg-red-600 border-red-300'
                          : 'bg-emerald-600 border-emerald-300'
                      }`}
                    >
                      {r.outcome === 'dragon' ? 'D' : r.outcome === 'tiger' ? 'T' : '='}
                    </div>
                    <div className="text-[8px] font-mono text-stone-400 mt-0.5">
                      {getRankLabel(r.dragonCard.rank)}v{getRankLabel(r.tigerCard.rank)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-black text-amber-200">
              <span>Total Tracked: {results.length} Rounds</span>
              <span className="text-emerald-400">Tie Ratio: {100 - dragonPct - tigerPct}%</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  if (isVirtualRotateActive) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
        <div 
          className="w-[100vh] h-[100vw] overflow-y-auto overflow-x-hidden p-2 flex flex-col justify-center"
          style={{
            transform: 'rotate(90deg)',
            transformOrigin: 'center center',
          }}
        >
          {mainGameContent}
        </div>
      </div>
    );
  }

  return mainGameContent;
};
