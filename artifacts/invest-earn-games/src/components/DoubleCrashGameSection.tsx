import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  ShieldCheck,
  Zap,
  TrendingUp,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Smartphone,
  Flame,
  Award,
  Users,
  ChevronDown,
  ChevronUp,
  Radio
} from 'lucide-react';
import {
  getSynchronizedCrashRound,
  getGameRealtimeChannel,
  broadcastPlayerBet,
  broadcastPlayerCashout,
  recordGameResultToSupabase,
  fetchActiveGameFromSupabase,
  subscribeToActiveGameSync,
  syncActiveGameToSupabase,
  getSupabaseServerNow,
} from '../services/gameSync';

interface DoubleCrashGameSectionProps {
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  showToast: (msg: string) => void;
  crashPredictions: number[];
  setCrashPredictions: React.Dispatch<React.SetStateAction<number[]>>;
  onBack?: () => void;
  onNavigateToDeposit?: () => void;
  onBetPlaced?: (amount: number) => void;
  addTransactionRecord?: (type: 'Profit' | 'Deposit', amount: number, note: string) => void;
  currentUser?: {
    id?: string;
    full_name?: string;
    email?: string;
  } | null;
  soundFX?: {
    playClick?: () => void;
    playSuccess?: () => void;
  };
}

// 100 Diverse Trader Names Pool (Pakistani Local + International Foreign Names)
const TRADER_NAMES_POOL = [
  // Local (Pakistani) Traders
  'Zain_Aali', 'Ali_Raza', 'Hamza_Khan', 'Sara_Amjad', 'Bilal_Hussain',
  'Ayesha_M', 'Omer_Pro', 'Usman_Trader', 'Faisal_Invest', 'Sana_Khan',
  'Tariq_Crypto', 'Rehan_X', 'Asad_Pro', 'Mina_Shah', 'Kashif_R',
  'Hassan_Raza', 'Mariam_A', 'Saad_King', 'Farhan_B', 'Noman_J',
  'Shahid_786', 'Waqas_A', 'Zubair_B', 'Imran_K', 'Rashid_M',
  'Atif_M', 'Daniyal_S', 'Haris_R', 'Fatima_Z', 'Anum_K',
  'Babar_Azam', 'Shaheen_A', 'Rizwan_M', 'Fakhar_Z', 'Shadab_K',
  'Naseem_S', 'Iftikhar_A', 'Saim_A', 'Azam_K', 'Haris_Rauf',
  'Yasir_S', 'Arshad_N', 'Tayyab_M', 'Sohail_T', 'Javeria_K',
  'Bushra_A', 'Kiran_S', 'Aamna_F', 'Sidra_T', 'Mahnoor_X',
  // International Traders
  'Alex_Crypto', 'John_Trader', 'Elena_R', 'Carlos_M', 'Dmitry_K',
  'Sven_Stock', 'Chloe_V', 'Hiroshi_T', 'Mateo_G', 'Liam_N',
  'Sophia_W', 'Lucas_Silva', 'Emma_W', 'Noah_Pro', 'Jackson_X',
  'Aiden_R', 'Oliver_B', 'Mia_Rose', 'Isabella_K', 'Mason_D',
  'Ethan_Hunt', 'Viktor_V', 'Igor_S', 'Sergei_P', 'Marco_Polo',
  'Luca_M', 'Antoine_G', 'Pierre_F', 'Hans_Muller', 'Lars_E',
  'Freja_N', 'Astrid_K', 'Yuki_Tanaka', 'Kenji_S', 'Mei_Ling',
  'Wei_Zhang', 'Rajesh_Kumar', 'Priya_Sharma', 'Arjun_Kapoor', 'Rohan_Mehta',
  'Kavya_N', 'Aarav_Singh', 'Tariq_AlMansoor', 'Omar_Dubai', 'Fatima_AlZahra',
  'Youssef_M', 'Zayd_K', 'Khalid_R', 'David_Miller', 'Sophie_Martin'
];

// Helper to pick and shuffle random active traders for each round
const getRandomLivePlayers = () => {
  const shuffled = [...TRADER_NAMES_POOL].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * 8) + 18; // 18-25 players each round
  const betValues = [50, 100, 200, 300, 500, 800, 1000, 2000, 5000];

  return shuffled.slice(0, count).map(name => {
    const rand = Math.random();
    let target = 1.25;
    if (rand < 0.35) target = parseFloat((Math.random() * 0.6 + 1.12).toFixed(2));
    else if (rand < 0.70) target = parseFloat((Math.random() * 1.5 + 1.72).toFixed(2));
    else if (rand < 0.90) target = parseFloat((Math.random() * 3.5 + 3.20).toFixed(2));
    else target = parseFloat((Math.random() * 8.0 + 6.70).toFixed(2));

    return {
      name,
      bet: betValues[Math.floor(Math.random() * betValues.length)],
      target,
      cashedOutAt: null
    };
  });
};

export const DoubleCrashGameSection: React.FC<DoubleCrashGameSectionProps> = ({
  balance,
  setBalance,
  showToast,
  crashPredictions,
  setCrashPredictions,
  onBack,
  onNavigateToDeposit,
  onBetPlaced,
  addTransactionRecord,
  currentUser,
  soundFX
}) => {
  // Screen Orientation & Fullscreen State (matching Mines rotation)
  const [isLandscape, setIsLandscape] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeBetTab, setActiveBetTab] = useState<'bet1' | 'bet2' | 'both'>('both');

  useEffect(() => {
    // Attempt auto-orientation lock if supported
    try {
      const orientation = screen?.orientation as unknown as { lock?: (mode: string) => Promise<void>; unlock?: () => void } | undefined;
      if (orientation && typeof orientation.lock === 'function') {
        orientation.lock('landscape').catch(() => {});
      }
    } catch {}

    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight || window.innerWidth >= 600);
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
    soundFX?.playClick?.();
    try {
      const orientation = screen?.orientation as unknown as { lock?: (mode: string) => Promise<void>; unlock?: () => void } | undefined;
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('landscape');
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
        if (orientation && typeof orientation.unlock === 'function') {
          orientation.unlock();
        }
      }
    } catch {
      setIsLandscape(prev => !prev);
    }
  };

  const initialSync = getSynchronizedCrashRound();

  // Game state
  const [currentRoundId, setCurrentRoundId] = useState<string>(initialSync.roundId);
  const [gameState, setGameState] = useState<'WAITING' | 'RUNNING' | 'CRASHED'>(initialSync.phase);
  const [countdown, setCountdown] = useState<number>(initialSync.countdownSec);
  const [multiplier, setMultiplier] = useState<number>(initialSync.currentMultiplier);
  const [isSupabaseSynced, setIsSupabaseSynced] = useState<boolean>(false);
  const [roundStartTime, setRoundStartTime] = useState<string>(initialSync.startTime || '');

  // -------------------------------------------------------------
  // DUAL BET PANEL 1 STATE
  // -------------------------------------------------------------
  const [bet1Amount, setBet1Amount] = useState<number>(100);
  const [bet1Input, setBet1Input] = useState<string>('100');
  const [bet1AutoCashout, setBet1AutoCashout] = useState<string>('');
  const [bet1HasPlaced, setBet1HasPlaced] = useState<boolean>(false);
  const [bet1CashedOut, setBet1CashedOut] = useState<boolean>(false);
  const [bet1CashedOutAt, setBet1CashedOutAt] = useState<number | null>(null);
  const [bet1Queued, setBet1Queued] = useState<boolean>(false);

  // -------------------------------------------------------------
  // DUAL BET PANEL 2 STATE
  // -------------------------------------------------------------
  const [bet2Amount, setBet2Amount] = useState<number>(100);
  const [bet2Input, setBet2Input] = useState<string>('100');
  const [bet2AutoCashout, setBet2AutoCashout] = useState<string>('');
  const [bet2HasPlaced, setBet2HasPlaced] = useState<boolean>(false);
  const [bet2CashedOut, setBet2CashedOut] = useState<boolean>(false);
  const [bet2CashedOutAt, setBet2CashedOutAt] = useState<number | null>(null);
  const [bet2Queued, setBet2Queued] = useState<boolean>(false);

  const [currentCrashPoint, setCurrentCrashPoint] = useState<number>(initialSync.crashPoint);
  const [historyList, setHistoryList] = useState<number[]>([1.85, 3.42, 1.12, 12.50, 2.05, 1.45, 5.20]);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [isMembersOpen, setIsMembersOpen] = useState<boolean>(false);

  // Live Players state initialized dynamically from 100-name pool
  const [livePlayers, setLivePlayers] = useState<{
    name: string;
    bet: number;
    target: number;
    cashedOutAt: number | null;
  }[]>(getRandomLivePlayers);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Synchronized Mutable Refs for 60FPS Canvas Engine
  const gameStateRef = useRef<'WAITING' | 'RUNNING' | 'CRASHED'>(initialSync.phase);
  const multiplierRef = useRef<number>(initialSync.currentMultiplier);
  const currentCrashPointRef = useRef<number>(initialSync.crashPoint);
  const startTimeRef = useRef<number>(0);
  const crashPredictionsRef = useRef<number[]>(crashPredictions);
  const lastProcessedRoundRef = useRef<string>(initialSync.roundId);
  const lossRecordedRoundRef = useRef<string>('');

  // Bet 1 Refs
  const bet1HasPlacedRef = useRef<boolean>(false);
  const bet1CashedOutRef = useRef<boolean>(false);
  const bet1AmountRef = useRef<number>(100);
  const bet1AutoCashoutRef = useRef<string>('');

  // Bet 2 Refs
  const bet2HasPlacedRef = useRef<boolean>(false);
  const bet2CashedOutRef = useRef<boolean>(false);
  const bet2AmountRef = useRef<number>(100);
  const bet2AutoCashoutRef = useRef<string>('');

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { multiplierRef.current = multiplier; }, [multiplier]);
  useEffect(() => { currentCrashPointRef.current = currentCrashPoint; }, [currentCrashPoint]);
  useEffect(() => { crashPredictionsRef.current = crashPredictions; }, [crashPredictions]);

  useEffect(() => {
    bet1HasPlacedRef.current = bet1HasPlaced;
    bet1CashedOutRef.current = bet1CashedOut;
    bet1AmountRef.current = bet1Amount;
    bet1AutoCashoutRef.current = bet1AutoCashout;
  }, [bet1HasPlaced, bet1CashedOut, bet1Amount, bet1AutoCashout]);

  useEffect(() => {
    bet2HasPlacedRef.current = bet2HasPlaced;
    bet2CashedOutRef.current = bet2CashedOut;
    bet2AmountRef.current = bet2Amount;
    bet2AutoCashoutRef.current = bet2AutoCashout;
  }, [bet2HasPlaced, bet2CashedOut, bet2Amount, bet2AutoCashout]);

  // Fetch current game start time / active round from Supabase (active_games or game_history)
  useEffect(() => {
    let isMounted = true;

    fetchActiveGameFromSupabase('double_crash')
      .then((active) => {
        if (!isMounted) return;
        setIsSupabaseSynced(true);
        if (active.start_time) {
          setRoundStartTime(active.start_time);
        }
        if (active.round_id && active.round_id !== currentRoundId) {
          setCurrentRoundId(active.round_id);
          setCurrentCrashPoint(active.crash_point);
          currentCrashPointRef.current = active.crash_point;
        }
      })
      .catch(() => {});

    const unsubscribeActive = subscribeToActiveGameSync('double_crash', (active) => {
      if (!isMounted) return;
      setIsSupabaseSynced(true);
      if (active.start_time) {
        setRoundStartTime(active.start_time);
      }
      if (active.round_id && active.round_id !== lastProcessedRoundRef.current && active.phase === 'WAITING') {
        setCurrentRoundId(active.round_id);
        setCurrentCrashPoint(active.crash_point);
        currentCrashPointRef.current = active.crash_point;
      }
    });

    return () => {
      isMounted = false;
      unsubscribeActive();
    };
  }, []);

  // Audio helper
  const playBeep = (type: 'tick' | 'cashout' | 'crash') => {
    if (soundMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'cashout') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.4);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {}
  };

  const getRandomCrash = (): number => {
    const rand = Math.random();
    if (rand < 0.25) {
      return parseFloat((Math.random() * (1.40 - 1.05) + 1.05).toFixed(2));
    } else if (rand < 0.70) {
      return parseFloat((Math.random() * (2.10 - 1.41) + 1.41).toFixed(2));
    } else if (rand < 0.90) {
      return parseFloat((Math.random() * (8.00 - 2.11) + 2.11).toFixed(2));
    } else {
      return parseFloat((Math.random() * (35.00 - 8.01) + 8.01).toFixed(2));
    }
  };

  // Helper to trigger crash
  const triggerCrash = (crashValue: number) => {
    if (gameStateRef.current === 'CRASHED') return;
    setGameState('CRASHED');
    gameStateRef.current = 'CRASHED';
    playBeep('crash');

    // Add to history
    setHistoryList(prev => [crashValue, ...prev.slice(0, 9)]);
  };

  // Cashout Bet 1
  const handleCashoutBet1 = (atMultiplier?: number) => {
    if (gameStateRef.current !== 'RUNNING' || !bet1HasPlacedRef.current || bet1CashedOutRef.current) return;

    const winMult = atMultiplier || multiplierRef.current;
    setBet1CashedOut(true);
    bet1CashedOutRef.current = true;
    setBet1CashedOutAt(winMult);

    const profit = Math.round(bet1AmountRef.current * winMult);
    setBalance(prev => prev + profit);
    playBeep('cashout');
    soundFX?.playSuccess?.();

    showToast(`🎉 BET 1 CASHED OUT AT ${winMult.toFixed(2)}x! Won Rs ${profit.toLocaleString()}`);

    if (addTransactionRecord) {
      addTransactionRecord('Profit', profit, `Double Crash Bet 1 Win at ${winMult.toFixed(2)}x`);
    }

    recordGameResultToSupabase({
      gameName: 'double_crash',
      betAmount: bet1AmountRef.current,
      multiplier: winMult,
      winAmount: profit,
      status: 'won',
      userId: currentUser?.id,
      email: currentUser?.email,
      playerName: currentUser?.full_name
    });

    broadcastPlayerCashout('double_crash', {
      user_id: currentUser?.id || 'player',
      name: currentUser?.full_name || 'You',
      multiplier: winMult,
      win_amount: profit,
      game_name: 'double_crash'
    });
  };

  // Cashout Bet 2
  const handleCashoutBet2 = (atMultiplier?: number) => {
    if (gameStateRef.current !== 'RUNNING' || !bet2HasPlacedRef.current || bet2CashedOutRef.current) return;

    const winMult = atMultiplier || multiplierRef.current;
    setBet2CashedOut(true);
    bet2CashedOutRef.current = true;
    setBet2CashedOutAt(winMult);

    const profit = Math.round(bet2AmountRef.current * winMult);
    setBalance(prev => prev + profit);
    playBeep('cashout');
    soundFX?.playSuccess?.();

    showToast(`🎉 BET 2 CASHED OUT AT ${winMult.toFixed(2)}x! Won Rs ${profit.toLocaleString()}`);

    if (addTransactionRecord) {
      addTransactionRecord('Profit', profit, `Double Crash Bet 2 Win at ${winMult.toFixed(2)}x`);
    }

    recordGameResultToSupabase({
      gameName: 'double_crash',
      betAmount: bet2AmountRef.current,
      multiplier: winMult,
      winAmount: profit,
      status: 'won',
      userId: currentUser?.id,
      email: currentUser?.email,
      playerName: currentUser?.full_name
    });

    broadcastPlayerCashout('double_crash', {
      user_id: currentUser?.id || 'player',
      name: currentUser?.full_name || 'You',
      multiplier: winMult,
      win_amount: profit,
      game_name: 'double_crash'
    });
  };

  // Place Bet 1
  const handlePlaceBet1 = () => {
    soundFX?.playClick?.();
    const amount = parseFloat(bet1Input);

    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount for Bet 1!');
      return;
    }

    if (amount > balance) {
      showToast('Insufficient Game Chips balance!');
      return;
    }

    if (gameState === 'WAITING') {
      if (bet1HasPlaced) return;
      setBet1Amount(amount);
      bet1AmountRef.current = amount;
      setBalance(prev => prev - amount);
      setBet1HasPlaced(true);
      bet1HasPlacedRef.current = true;
      showToast(`Bet 1 of Rs ${amount} placed for takeoff! 🚀`);
      broadcastPlayerBet('double_crash', {
        id: `dc_${Date.now()}_1`,
        user_id: currentUser?.id || 'guest',
        name: currentUser?.full_name || 'You',
        game_name: 'double_crash',
        bet: amount,
        round_id: `DC-${Math.floor(Date.now() / 25000)}`,
        timestamp: Date.now(),
        is_real_user: true
      });
    } else {
      if (bet1Queued) return;
      setBalance(prev => prev - amount);
      setBet1Amount(amount);
      bet1AmountRef.current = amount;
      setBet1Queued(true);
      showToast(`Bet 1 of Rs ${amount} queued for NEXT round! ⏳`);
    }
  };

  // Cancel Bet 1
  const handleCancelBet1 = () => {
    soundFX?.playClick?.();
    if (gameState === 'WAITING' && bet1HasPlaced) {
      setBalance(prev => prev + bet1Amount);
      setBet1HasPlaced(false);
      bet1HasPlacedRef.current = false;
      showToast(`Bet 1 of Rs ${bet1Amount} cancelled & refunded!`);
    } else if (bet1Queued) {
      setBalance(prev => prev + bet1Amount);
      setBet1Queued(false);
      showToast(`Queued Bet 1 of Rs ${bet1Amount} cancelled & refunded!`);
    }
  };

  // Place Bet 2
  const handlePlaceBet2 = () => {
    soundFX?.playClick?.();
    const amount = parseFloat(bet2Input);

    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount for Bet 2!');
      return;
    }

    if (amount > balance) {
      showToast('Insufficient Game Chips balance!');
      return;
    }

    if (gameState === 'WAITING') {
      if (bet2HasPlaced) return;
      setBet2Amount(amount);
      bet2AmountRef.current = amount;
      setBalance(prev => prev - amount);
      setBet2HasPlaced(true);
      bet2HasPlacedRef.current = true;
      showToast(`Bet 2 of Rs ${amount} placed for takeoff! 🚀`);
      broadcastPlayerBet('double_crash', {
        id: `dc_${Date.now()}_2`,
        user_id: currentUser?.id || 'guest',
        name: currentUser?.full_name || 'You',
        game_name: 'double_crash',
        bet: amount,
        round_id: `DC-${Math.floor(Date.now() / 25000)}`,
        timestamp: Date.now(),
        is_real_user: true
      });
    } else {
      if (bet2Queued) return;
      setBalance(prev => prev - amount);
      setBet2Amount(amount);
      bet2AmountRef.current = amount;
      setBet2Queued(true);
      showToast(`Bet 2 of Rs ${amount} queued for NEXT round! ⏳`);
    }
  };

  // Cancel Bet 2
  const handleCancelBet2 = () => {
    soundFX?.playClick?.();
    if (gameState === 'WAITING' && bet2HasPlaced) {
      setBalance(prev => prev + bet2Amount);
      setBet2HasPlaced(false);
      bet2HasPlacedRef.current = false;
      showToast(`Bet 2 of Rs ${bet2Amount} cancelled & refunded!`);
    } else if (bet2Queued) {
      setBalance(prev => prev + bet2Amount);
      setBet2Queued(false);
      showToast(`Queued Bet 2 of Rs ${bet2Amount} cancelled & refunded!`);
    }
  };

  // SYNCHRONIZED REAL-TIME CLOCK ENGINE FOR ALL CONNECTED USERS
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const sync = getSynchronizedCrashRound();

      // Check if new round started across the network
      if (sync.roundId !== lastProcessedRoundRef.current) {
        lastProcessedRoundRef.current = sync.roundId;
        setCurrentRoundId(sync.roundId);
        setCurrentCrashPoint(sync.crashPoint);
        currentCrashPointRef.current = sync.crashPoint;
        setRoundStartTime(sync.startTime);

        // Sync active round to Supabase
        syncActiveGameToSupabase('double_crash', {
          round_id: sync.roundId,
          start_time: sync.startTime,
          phase: sync.phase,
          crash_point: sync.crashPoint,
          countdown_sec: sync.countdownSec,
          elapsed_ms: sync.elapsedMs,
        });

        setBet1CashedOut(false);
        bet1CashedOutRef.current = false;
        setBet1CashedOutAt(null);

        setBet2CashedOut(false);
        bet2CashedOutRef.current = false;
        setBet2CashedOutAt(null);

        lossRecordedRoundRef.current = '';

        if (bet1Queued) {
          setBet1HasPlaced(true);
          bet1HasPlacedRef.current = true;
          setBet1Queued(false);
          broadcastPlayerBet('double_crash', {
            id: `dc_${Date.now()}_1`,
            user_id: currentUser?.id || 'guest',
            name: currentUser?.full_name || 'You',
            game_name: 'double_crash',
            bet: bet1AmountRef.current,
            round_id: sync.roundId,
            timestamp: Date.now(),
            is_real_user: true
          });
        } else {
          setBet1HasPlaced(false);
          bet1HasPlacedRef.current = false;
        }

        if (bet2Queued) {
          setBet2HasPlaced(true);
          bet2HasPlacedRef.current = true;
          setBet2Queued(false);
          broadcastPlayerBet('double_crash', {
            id: `dc_${Date.now()}_2`,
            user_id: currentUser?.id || 'guest',
            name: currentUser?.full_name || 'You',
            game_name: 'double_crash',
            bet: bet2AmountRef.current,
            round_id: sync.roundId,
            timestamp: Date.now(),
            is_real_user: true
          });
        } else {
          setBet2HasPlaced(false);
          bet2HasPlacedRef.current = false;
        }

        setLivePlayers(getRandomLivePlayers());
      }

      // Phase execution in lockstep
      if (sync.phase === 'WAITING') {
        if (gameStateRef.current !== 'WAITING') {
          setGameState('WAITING');
          gameStateRef.current = 'WAITING';
        }
        setCountdown(sync.countdownSec);
        setMultiplier(1.00);
        multiplierRef.current = 1.00;
      } else if (sync.phase === 'RUNNING') {
        if (gameStateRef.current !== 'RUNNING') {
          setGameState('RUNNING');
          gameStateRef.current = 'RUNNING';
          if (bet1HasPlacedRef.current) {
            onBetPlaced?.(bet1AmountRef.current);
          }
          if (bet2HasPlacedRef.current) {
            onBetPlaced?.(bet2AmountRef.current);
          }
        }
        setMultiplier(sync.currentMultiplier);
        multiplierRef.current = sync.currentMultiplier;

        // Auto cashout check for Bet 1
        const auto1 = parseFloat(bet1AutoCashoutRef.current);
        if (
          bet1HasPlacedRef.current &&
          !bet1CashedOutRef.current &&
          !isNaN(auto1) &&
          auto1 > 1.01 &&
          sync.currentMultiplier >= auto1
        ) {
          handleCashoutBet1(auto1);
        }

        // Auto cashout check for Bet 2
        const auto2 = parseFloat(bet2AutoCashoutRef.current);
        if (
          bet2HasPlacedRef.current &&
          !bet2CashedOutRef.current &&
          !isNaN(auto2) &&
          auto2 > 1.01 &&
          sync.currentMultiplier >= auto2
        ) {
          handleCashoutBet2(auto2);
        }

        // Live players cashout simulation
        setLivePlayers(players =>
          players.map(p => {
            if (!p.cashedOutAt && sync.currentMultiplier >= p.target) {
              return { ...p, cashedOutAt: parseFloat(sync.currentMultiplier.toFixed(2)) };
            }
            return p;
          })
        );
      } else if (sync.phase === 'CRASHED') {
        if (gameStateRef.current === 'RUNNING') {
          setGameState('CRASHED');
          gameStateRef.current = 'CRASHED';
          setMultiplier(sync.crashPoint);
          multiplierRef.current = sync.crashPoint;
          playBeep('crash');
          setHistoryList(prev => [sync.crashPoint, ...prev.slice(0, 9)]);

          // Record losses if user bets were placed and not cashed out
          if (lossRecordedRoundRef.current !== sync.roundId) {
            lossRecordedRoundRef.current = sync.roundId;

            if (bet1HasPlacedRef.current && !bet1CashedOutRef.current) {
              recordGameResultToSupabase({
                gameName: 'double_crash',
                betAmount: bet1AmountRef.current,
                multiplier: 1.0,
                winAmount: 0,
                status: 'lost',
                userId: currentUser?.id,
                email: currentUser?.email,
                playerName: currentUser?.full_name
              });
            }
            if (bet2HasPlacedRef.current && !bet2CashedOutRef.current) {
              recordGameResultToSupabase({
                gameName: 'double_crash',
                betAmount: bet2AmountRef.current,
                multiplier: 1.0,
                winAmount: 0,
                status: 'lost',
                userId: currentUser?.id,
                email: currentUser?.email,
                playerName: currentUser?.full_name
              });
            }
          }
        }
      }
    }, 45);

    return () => clearInterval(syncInterval);
  }, [bet1Queued, bet2Queued, currentUser]);

  // CANVAS 60 FPS ANIMATION ENGINE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 360);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 260);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      const pW = canvas.parentElement.clientWidth;
      const pH = canvas.parentElement.clientHeight;
      if (pW > 0 && pH > 0) {
        width = canvas.width = pW;
        height = canvas.height = pH;
      }
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // High-octane explosion particle system
    interface ExplosionSpark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
    }

    interface DebrisPiece {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rot: number;
      vRot: number;
      size: number;
      color: string;
    }

    let explosionInitialized = false;
    let explosionStartTime = 0;
    let explosionX = 0;
    let explosionY = 0;
    let sparks: ExplosionSpark[] = [];
    let debris: DebrisPiece[] = [];

    const render = () => {
      if (canvas.parentElement) {
        const pW = canvas.parentElement.clientWidth;
        const pH = canvas.parentElement.clientHeight;
        if (pW > 0 && pH > 0 && (width !== pW || height !== pH)) {
          width = canvas.width = pW;
          height = canvas.height = pH;
        }
      }

      if (width <= 0 || height <= 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Grid background
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const startX = 45;
      const startY = height - 45;
      const currentGS = gameStateRef.current;

      // 1. CALCULATE MULTIPLIER & TRAJECTORY PROGRESS
      let curMult = 1.00;
      if (currentGS === 'RUNNING') {
        curMult = multiplierRef.current;
      } else if (currentGS === 'CRASHED') {
        curMult = currentCrashPointRef.current;
      } else {
        curMult = 1.00;
      }

      // 2. RENDER FLIGHT CURVE & LAUNCHPAD
      const maxDisplay = Math.max(2.0, curMult * 1.2);
      const progress = Math.min((curMult - 1.00) / (maxDisplay - 1.00), 1.0);

      const targetX = startX + (width - 85) * progress;
      const targetY = startY - (height - 85) * Math.pow(progress, 0.85);

      const isCrashed = currentGS === 'CRASHED';
      const colorPrimary = isCrashed ? '#ef4444' : '#10b981';

      // Launchpad base line at origin
      ctx.beginPath();
      ctx.arc(startX, startY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Flight Gradient Area under curve (if launched)
      if (progress > 0) {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, isCrashed ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (targetX - startX) * 0.5, startY, targetX, targetY);
        ctx.lineTo(targetX, height - 40);
        ctx.lineTo(startX, height - 40);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Flight Curve Stroke
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (targetX - startX) * 0.5, startY, targetX, targetY);
        ctx.strokeStyle = colorPrimary;
        ctx.lineWidth = 4;
        ctx.shadowColor = colorPrimary;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 3. DRAW VECTOR ROCKET (Ground / Flight / Crash)
      if (!isCrashed) {
        explosionInitialized = false;
        sparks = [];
        debris = [];

        // Calculate tangent angle for smooth rotation
        let flightAngle = -Math.PI / 4;
        if (progress > 0.01) {
          const prevProg = Math.max(0, progress - 0.02);
          const prevX = startX + (width - 85) * prevProg;
          const prevY = startY - (height - 85) * Math.pow(prevProg, 0.85);
          flightAngle = Math.atan2(targetY - prevY, targetX - prevX);
        }

        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.rotate(flightAngle);
        ctx.scale(1.15, 1.15);

        // Thruster flame
        const isRunning = currentGS === 'RUNNING';
        const flameLen = isRunning ? Math.random() * 16 + 18 : Math.random() * 6 + 8;
        const flameGrad = ctx.createLinearGradient(-15, 0, -15 - flameLen, 0);
        flameGrad.addColorStop(0, '#f59e0b');
        flameGrad.addColorStop(0.5, '#ef4444');
        flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-12 - flameLen, 0);
        ctx.lineTo(-12, 4);
        ctx.closePath();
        ctx.fillStyle = flameGrad;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = isRunning ? 14 : 6;
        ctx.fill();

        // White-hot inner core
        ctx.beginPath();
        ctx.moveTo(-12, -2);
        ctx.lineTo(-12 - flameLen * 0.55, 0);
        ctx.lineTo(-12, 2);
        ctx.closePath();
        ctx.fillStyle = '#fef08a';
        ctx.fill();

        // Rocket Side Fins
        ctx.fillStyle = '#0284c7';
        // Top Fin
        ctx.beginPath();
        ctx.moveTo(-8, -5);
        ctx.lineTo(-16, -14);
        ctx.lineTo(-2, -5);
        ctx.closePath();
        ctx.fill();
        // Bottom Fin
        ctx.beginPath();
        ctx.moveTo(-8, 5);
        ctx.lineTo(-16, 14);
        ctx.lineTo(-2, 5);
        ctx.closePath();
        ctx.fill();

        // Rocket Fuselage
        const bodyGrad = ctx.createLinearGradient(-14, -7, 18, 7);
        bodyGrad.addColorStop(0, '#0f172a');
        bodyGrad.addColorStop(0.3, '#1e293b');
        bodyGrad.addColorStop(0.7, '#f8fafc');
        bodyGrad.addColorStop(1, '#38bdf8');

        ctx.beginPath();
        ctx.moveTo(-14, -6);
        ctx.lineTo(4, -6);
        ctx.quadraticCurveTo(18, -6, 22, 0);
        ctx.quadraticCurveTo(18, 6, 4, 6);
        ctx.lineTo(-14, 6);
        ctx.closePath();
        ctx.fillStyle = bodyGrad;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Nose Cone Accent
        ctx.beginPath();
        ctx.moveTo(10, -4.5);
        ctx.quadraticCurveTo(18, -4.5, 22, 0);
        ctx.quadraticCurveTo(18, 4.5, 10, 4.5);
        ctx.closePath();
        ctx.fillStyle = isRunning ? '#10b981' : '#f59e0b';
        ctx.fill();

        // Cockpit Porthole Window
        ctx.beginPath();
        ctx.arc(2, 0, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();

        // Smoke particles behind rocket
        if (isRunning) {
          ctx.fillStyle = '#10b981';
          for (let i = 0; i < 5; i++) {
            const px = targetX - (Math.random() * 25 + 10);
            const py = targetY + (Math.random() * 14 - 7);
            ctx.beginPath();
            ctx.arc(px, py, Math.random() * 2.5 + 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // High-octane cinematic explosion animation (2-second lifecycle)
        if (!explosionInitialized) {
          explosionInitialized = true;
          explosionStartTime = performance.now();
          explosionX = targetX;
          explosionY = targetY;

          sparks = [];
          const sparkColors = ['#ffffff', '#fef08a', '#fde047', '#f59e0b', '#fb923c', '#ef4444'];
          for (let i = 0; i < 48; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 7 + 2.5;
            sparks.push({
              x: explosionX,
              y: explosionY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - Math.random() * 2,
              size: Math.random() * 3 + 1.5,
              color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
              alpha: 1,
              decay: Math.random() * 0.015 + 0.008,
            });
          }

          debris = [];
          const debrisColors = ['#0284c7', '#38bdf8', '#0f172a', '#cbd5e1', '#ef4444'];
          for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5.5 + 2;
            debris.push({
              x: explosionX,
              y: explosionY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - Math.random() * 2.5,
              rot: Math.random() * Math.PI * 2,
              vRot: (Math.random() - 0.5) * 0.3,
              size: Math.random() * 7 + 4,
              color: debrisColors[Math.floor(Math.random() * debrisColors.length)],
            });
          }
        }

        const expAge = performance.now() - explosionStartTime;
        const eProgress = Math.min(1, expAge / 2000);

        ctx.save();

        // 1. Camera Shake on Impact (first 280ms)
        if (expAge < 280) {
          const shakeFactor = (1 - expAge / 280);
          const shakeX = (Math.sin(expAge * 0.14) * 6 + Math.cos(expAge * 0.22) * 3) * shakeFactor;
          const shakeY = (Math.cos(expAge * 0.16) * 5 + Math.sin(expAge * 0.28) * 3) * shakeFactor;
          ctx.translate(shakeX, shakeY);
        }

        // 2. Initial Detonation Flash (0-140ms)
        if (expAge < 140) {
          const flashAlpha = 0.35 * (1 - expAge / 140);
          const flashGrad = ctx.createRadialGradient(explosionX, explosionY, 5, explosionX, explosionY, 180);
          flashGrad.addColorStop(0, `rgba(255, 240, 200, ${flashAlpha * 1.5})`);
          flashGrad.addColorStop(0.4, `rgba(239, 68, 68, ${flashAlpha})`);
          flashGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = flashGrad;
          ctx.fillRect(0, 0, width, height);
        }

        // 3. Expanding Shockwave Rings
        // Shockwave 1: Razor-thin high-speed shock ring
        if (expAge < 850) {
          const wave1R = (expAge / 850) * 160;
          const wave1Alpha = Math.max(0, 1 - expAge / 850);
          ctx.beginPath();
          ctx.arc(explosionX, explosionY, wave1R, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${wave1Alpha * 0.8})`;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Shockwave 2: Fiery orange blast ring
        if (expAge < 1200) {
          const wave2R = (expAge / 1200) * 110;
          const wave2Alpha = Math.max(0, 1 - expAge / 1200);
          ctx.beginPath();
          ctx.arc(explosionX, explosionY, wave2R, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(249, 115, 22, ${wave2Alpha * 0.9})`;
          ctx.lineWidth = 4;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // 4. Volumetric Multi-Lobe Fireball Clouds
        const fireAlpha = Math.max(0, 1 - eProgress * 1.2);
        if (fireAlpha > 0) {
          const baseRadius = Math.min(48, 12 + (expAge / 400) * 36);
          for (let f = 0; f < 7; f++) {
            const fAngle = (Math.PI * 2 / 7) * f + (expAge * 0.002);
            const dist = (baseRadius * 0.45) * Math.min(1, expAge / 350);
            const fx = explosionX + Math.cos(fAngle) * dist;
            const fy = explosionY + Math.sin(fAngle) * dist - (expAge * 0.015);
            const fSize = Math.max(8, baseRadius * (0.65 + 0.25 * Math.sin(f * 2)));

            const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fSize);
            fGrad.addColorStop(0, `rgba(255, 255, 220, ${fireAlpha})`);
            fGrad.addColorStop(0.25, `rgba(254, 240, 138, ${fireAlpha * 0.95})`);
            fGrad.addColorStop(0.55, `rgba(249, 115, 22, ${fireAlpha * 0.85})`);
            fGrad.addColorStop(0.85, `rgba(220, 38, 38, ${fireAlpha * 0.6})`);
            fGrad.addColorStop(1, 'rgba(30, 20, 20, 0)');

            ctx.beginPath();
            ctx.arc(fx, fy, fSize, 0, Math.PI * 2);
            ctx.fillStyle = fGrad;
            ctx.fill();
          }

          // Hot White-Gold Inner Core (First 450ms)
          if (expAge < 450) {
            const coreAlpha = (1 - expAge / 450);
            const coreR = Math.min(24, 6 + (expAge / 450) * 18);
            const coreGrad = ctx.createRadialGradient(explosionX, explosionY, 0, explosionX, explosionY, coreR);
            coreGrad.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha})`);
            coreGrad.addColorStop(0.6, `rgba(254, 240, 138, ${coreAlpha * 0.8})`);
            coreGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
            ctx.beginPath();
            ctx.arc(explosionX, explosionY, coreR, 0, Math.PI * 2);
            ctx.fillStyle = coreGrad;
            ctx.fill();
          }
        }

        // 5. Rocket Hull Debris Shrapnel
        debris.forEach(d => {
          d.x += d.vx;
          d.y += d.vy;
          d.vy += 0.12;
          d.vx *= 0.985;
          d.rot += d.vRot;

          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.rotate(d.rot);
          ctx.fillStyle = d.color;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(-d.size * 0.6, -d.size * 0.4);
          ctx.lineTo(d.size * 0.8, 0);
          ctx.lineTo(-d.size * 0.3, d.size * 0.6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });

        // 6. Flying Sparks & Glowing Embers
        sparks.forEach(s => {
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 0.08;
          s.vx *= 0.98;
          s.alpha = Math.max(0, s.alpha - s.decay);

          if (s.alpha > 0) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * s.alpha, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.globalAlpha = s.alpha;
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
          }
        });

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="space-y-3 w-full mx-auto pb-6 select-none font-sans">
      {/* Header Banner with Back, Rotate & Sound Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 p-2.5 sm:p-3 rounded-2xl border border-indigo-500/30 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2 sm:gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                soundFX?.playClick?.();
                onBack();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center font-black cursor-pointer active:scale-95 transition"
              title="Back to Games Lobby"
            >
              <span className="text-sm font-black">&lt;</span>
            </button>
          )}

          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center font-black shadow-lg shadow-purple-500/20">
            <Rocket className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-extrabold text-white">DOUBLE CRASH</h2>
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/30">
                2X BETS
              </span>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>#{currentRoundId}</span>
              </div>
              <div 
                className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[8px] font-mono"
                title={roundStartTime ? `Server Start Time: ${new Date(roundStartTime).toLocaleTimeString()}` : 'Supabase Server Synced'}
              >
                <Radio className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                <span>Supabase Live</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Chips Balance */}
          <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-800 shadow-inner">
            <span className="text-xs">🎯</span>
            <div className="flex flex-col leading-none">
              <span className="text-[7px] font-bold text-slate-400 uppercase">CHIPS</span>
              <span className="text-[11px] sm:text-xs font-mono font-black text-purple-300">
                Rs {balance.toLocaleString()}
              </span>
            </div>
          </div>

          {onNavigateToDeposit && (
            <button
              type="button"
              onClick={() => {
                soundFX?.playClick?.();
                onNavigateToDeposit();
              }}
              className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white px-2.5 py-1 rounded-xl font-black text-[11px] sm:text-xs shadow cursor-pointer active:scale-95 transition"
            >
              <span>+ ADD</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundMuted(!soundMuted)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white transition cursor-pointer"
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* ADAPTIVE COCKPIT GRID (Side-by-Side on Landscape / Wide screens like Mines) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
        {/* LEFT COLUMN: HISTORY RIBBON + RADAR STAGE */}
        <div className="sm:col-span-7 space-y-2.5 flex flex-col">
          {/* RECENT CRASH HISTORY STRIP */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-slate-950/60 p-1.5 sm:p-2 rounded-2xl border border-slate-800/80">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> History:
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {historyList.map((h, i) => (
                <span
                  key={`crash-hist-${i}-${h}`}
                  className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md border ${
                    h >= 2.0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {h.toFixed(2)}x
                </span>
              ))}
            </div>
          </div>

          <div className="relative w-full h-64 sm:h-[300px] md:h-[340px] bg-slate-950 border-2 border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-3.5">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.08),transparent_70%)] pointer-events-none" />

            {/* STAGE OVERLAY HUD */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    gameState === 'RUNNING'
                      ? 'bg-emerald-400 animate-ping'
                      : gameState === 'CRASHED'
                      ? 'bg-rose-500'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-slate-300">
                  {gameState === 'RUNNING' ? 'IN FLIGHT' : gameState === 'CRASHED' ? 'CRASHED' : 'TAKEOFF READY'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {bet1HasPlaced && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span className="text-[9px] font-mono font-extrabold text-emerald-300">
                      B1: Rs {bet1Amount}
                    </span>
                  </div>
                )}
                {bet2HasPlaced && (
                  <div className="bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-400" />
                    <span className="text-[9px] font-mono font-extrabold text-purple-300">
                      B2: Rs {bet2Amount}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* CENTER MULTIPLIER / CRASH / COUNTDOWN DISPLAY */}
            <div className="relative z-10 text-center my-auto">
              {gameState === 'WAITING' && (
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-3.5 py-1.5 rounded-full shadow-lg">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      TAKEOFF IN <span className="font-mono text-amber-400 font-extrabold">{countdown}s</span>
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400">Place Bet 1 & Bet 2 before the plane launches!</p>
                </div>
              )}

              {gameState === 'RUNNING' && (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="space-y-0.5"
                >
                  <div className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 drop-shadow-md">
                    {multiplier.toFixed(2)}x
                  </div>
                  <p className="text-[9px] font-extrabold tracking-widest text-emerald-400 uppercase">
                    CURRENT YIELD
                  </p>
                </motion.div>
              )}

              {gameState === 'CRASHED' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-1.5 flex flex-col items-center"
                >
                  <div className="inline-flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/50 px-3 py-0.5 rounded-full shadow-lg shadow-rose-900/40">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-[10px] font-black tracking-widest text-rose-300 uppercase">
                      ROCKET FLEW AWAY
                    </span>
                  </div>
                  <div className="text-4xl sm:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-500 to-rose-400 tracking-tight drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                    {multiplier.toFixed(2)}x
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-300 bg-slate-900/90 border border-amber-500/40 px-2.5 py-0.5 rounded-full animate-pulse shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Next round starting in 2s...</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* CANVAS GRAPH ENGINE */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />
          </div>
        </div>

        {/* RIGHT COLUMN: COMPACT DUAL BET CONTROLS */}
        <div className="sm:col-span-5 flex flex-col justify-between space-y-2">
          {/* TAB SELECTOR FOR BET 1 / BET 2 / BOTH */}
          <div className="flex items-center justify-between bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveBetTab('both')}
              className={`flex-1 py-1 text-[10px] font-black rounded-lg transition cursor-pointer ${
                activeBetTab === 'both'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DUAL BETS
            </button>
            <button
              type="button"
              onClick={() => setActiveBetTab('bet1')}
              className={`flex-1 py-1 text-[10px] font-black rounded-lg transition cursor-pointer ${
                activeBetTab === 'bet1'
                  ? 'bg-emerald-600/50 text-emerald-200 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              BET 1 {bet1HasPlaced && '✔️'}
            </button>
            <button
              type="button"
              onClick={() => setActiveBetTab('bet2')}
              className={`flex-1 py-1 text-[10px] font-black rounded-lg transition cursor-pointer ${
                activeBetTab === 'bet2'
                  ? 'bg-purple-600/50 text-purple-200 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              BET 2 {bet2HasPlaced && '✔️'}
            </button>
          </div>

          {/* =========================================================================
              COMPACT DUAL BETTING CONTROLS SECTION: BET 1 & BET 2 PANELS
              ========================================================================= */}
          <div className="space-y-2">
            {/* =========================================================
                BET PANEL 1
                ========================================================= */}
            {(activeBetTab === 'both' || activeBetTab === 'bet1') && (
              <div className={`bg-slate-900 border ${bet1HasPlaced ? 'border-emerald-500/60 shadow-emerald-500/10' : 'border-slate-800/90'} rounded-2xl p-2.5 sm:p-3 space-y-1.5 shadow-xl transition-all`}>
                {/* Panel Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300">BET OPTION 1</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Rs {balance.toLocaleString()}
                  </span>
                </div>

                {/* Bet Amount Input & Shortcuts */}
                <div className="space-y-1">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                      Rs
                    </span>
                    <input
                      type="number"
                      value={bet1Input}
                      onChange={(e) => setBet1Input(e.target.value)}
                      disabled={bet1HasPlaced || bet1Queued}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-1.5 pl-8 pr-20 text-xs font-mono font-bold text-white outline-none transition disabled:opacity-50"
                      placeholder="Enter bet"
                    />

                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        disabled={bet1HasPlaced || bet1Queued}
                        onClick={() => {
                          const val = parseFloat(bet1Input) || 0;
                          setBet1Input(Math.max(10, Math.floor(val / 2)).toString());
                        }}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[9px] font-mono text-slate-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        1/2
                      </button>
                      <button
                        type="button"
                        disabled={bet1HasPlaced || bet1Queued}
                        onClick={() => {
                          const val = parseFloat(bet1Input) || 0;
                          setBet1Input(Math.min(balance, val * 2).toString());
                        }}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[9px] font-mono text-slate-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        2x
                      </button>
                    </div>
                  </div>

                  {/* Quick Amounts */}
                  <div className="grid grid-cols-6 gap-1">
                    {[10, 20, 50, 100, 500, 1000].map((amt) => (
                  <button
                    key={`b1-${amt}`}
                    type="button"
                    disabled={bet1HasPlaced || bet1Queued}
                    onClick={() => setBet1Input(amt.toString())}
                    className={`py-1 rounded text-[9px] font-mono font-semibold border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      bet1Input === amt.toString()
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Cashout Field */}
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-bold text-slate-400 shrink-0">AUTO CASHOUT:</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  value={bet1AutoCashout}
                  onChange={(e) => setBet1AutoCashout(e.target.value)}
                  disabled={bet1HasPlaced || bet1Queued}
                  placeholder="Disabled"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg py-1 px-2 text-[10px] font-mono text-white outline-none disabled:opacity-50"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[9px] font-mono">x</span>
              </div>
            </div>

            {/* Action Button 1 */}
            {gameState === 'WAITING' && (
              <div className="flex gap-1.5">
                {bet1HasPlaced ? (
                  <>
                    <button
                      type="button"
                      disabled
                      className="flex-1 py-2 rounded-xl font-black text-xs bg-emerald-600/90 text-white border border-emerald-400/40 flex flex-col items-center justify-center shadow-lg"
                    >
                      <span>BET 1 ACTIVE (Rs {bet1Amount}) ✔️</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelBet1}
                      className="px-2.5 py-2 bg-red-600/30 hover:bg-red-600 text-red-200 border border-red-500/50 rounded-xl font-bold text-[10px] transition cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handlePlaceBet1}
                    className="w-full py-2 rounded-xl font-black text-xs transition shadow-lg cursor-pointer flex flex-col items-center justify-center bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 text-slate-950 shadow-emerald-500/25 hover:brightness-105 active:scale-98"
                  >
                    <span>PLACE BET 1</span>
                  </button>
                )}
              </div>
            )}

            {gameState === 'RUNNING' && (
              <>
                {bet1HasPlaced && !bet1CashedOut ? (
                  <button
                    type="button"
                    onClick={() => handleCashoutBet1()}
                    className="w-full py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/30 hover:brightness-105 cursor-pointer active:scale-95 animate-pulse flex flex-col items-center justify-center"
                  >
                    <span>CASH OUT BET 1</span>
                    <span className="text-[10px] font-mono font-bold">
                      Rs {Math.round(bet1Amount * multiplier).toLocaleString()} ({multiplier.toFixed(2)}x)
                    </span>
                  </button>
                ) : bet1CashedOut ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2 rounded-xl font-bold text-[10px] bg-slate-800 text-emerald-400 border border-emerald-500/30 cursor-not-allowed"
                  >
                    BET 1 WON AT {bet1CashedOutAt?.toFixed(2)}x ✔️
                  </button>
                ) : bet1Queued ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled
                      className="flex-1 py-2 rounded-xl font-bold text-[10px] bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 cursor-not-allowed"
                    >
                      BET 1 QUEUED (Rs {bet1Amount}) ⏳
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelBet1}
                      className="px-2.5 py-2 bg-red-600/30 hover:bg-red-600 text-red-200 border border-red-500/50 rounded-xl font-bold text-[10px] transition cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePlaceBet1}
                    className="w-full py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white border border-teal-400/30 transition shadow-lg cursor-pointer flex flex-col items-center justify-center"
                  >
                    <span>BET 1 FOR NEXT ROUND</span>
                  </button>
                )}
              </>
            )}

            {gameState === 'CRASHED' && (
              <div>
                {bet1Queued ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled
                      className="flex-1 py-2 rounded-xl font-bold text-[10px] bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 cursor-not-allowed"
                    >
                      BET 1 QUEUED (Rs {bet1Amount}) ⏳
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelBet1}
                      className="px-2.5 py-2 bg-red-600/30 hover:bg-red-600 text-red-200 border border-red-500/50 rounded-xl font-bold text-[10px] transition cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePlaceBet1}
                    className="w-full py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-500/30 transition cursor-pointer flex flex-col items-center justify-center"
                  >
                    <span>BET 1 FOR NEXT ROUND</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            BET PANEL 2
            ========================================================= */}
        {(activeBetTab === 'both' || activeBetTab === 'bet2') && (
          <div className={`bg-slate-900 border ${bet2HasPlaced ? 'border-purple-500/60 shadow-purple-500/10' : 'border-slate-800/90'} rounded-2xl p-2.5 sm:p-3 space-y-1.5 shadow-xl transition-all`}>
            {/* Panel Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="text-[9px] font-black uppercase tracking-wider text-purple-300">BET OPTION 2</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Rs {balance.toLocaleString()}
              </span>
            </div>

            {/* Bet Amount Input & Shortcuts */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                  Rs
                </span>
                <input
                  type="number"
                  value={bet2Input}
                  onChange={(e) => setBet2Input(e.target.value)}
                  disabled={bet2HasPlaced || bet2Queued}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl py-1.5 pl-8 pr-20 text-xs font-mono font-bold text-white outline-none transition disabled:opacity-50"
                  placeholder="Enter bet"
                />

                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    disabled={bet2HasPlaced || bet2Queued}
                    onClick={() => {
                      const val = parseFloat(bet2Input) || 0;
                      setBet2Input(Math.max(10, Math.floor(val / 2)).toString());
                    }}
                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[9px] font-mono text-slate-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    1/2
                  </button>
                  <button
                    type="button"
                    disabled={bet2HasPlaced || bet2Queued}
                    onClick={() => {
                      const val = parseFloat(bet2Input) || 0;
                      setBet2Input(Math.min(balance, val * 2).toString());
                    }}
                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[9px] font-mono text-slate-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    2x
                  </button>
                </div>
              </div>

              {/* Quick Amounts */}
              <div className="grid grid-cols-6 gap-1">
                {[10, 20, 50, 100, 500, 1000].map((amt) => (
                  <button
                    key={`b2-${amt}`}
                    type="button"
                    disabled={bet2HasPlaced || bet2Queued}
                    onClick={() => setBet2Input(amt.toString())}
                    className={`py-1 rounded text-[9px] font-mono font-semibold border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      bet2Input === amt.toString()
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Cashout Field */}
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-bold text-slate-400 shrink-0">AUTO CASHOUT:</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  value={bet2AutoCashout}
                  onChange={(e) => setBet2AutoCashout(e.target.value)}
                  disabled={bet2HasPlaced || bet2Queued}
                  placeholder="Disabled"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg py-1 px-2 text-[10px] font-mono text-white outline-none disabled:opacity-50"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[9px] font-mono">x</span>
              </div>
            </div>

            {/* Action Button 2 */}
            {gameState === 'WAITING' && (
              <div className="flex gap-1.5">
                {bet2HasPlaced ? (
                  <>
                    <button
                      type="button"
                      disabled
                      className="flex-1 py-2 rounded-xl font-black text-xs bg-purple-600/90 text-white border border-purple-400/40 flex flex-col items-center justify-center shadow-lg"
                    >
                      <span>BET 2 ACTIVE (Rs {bet2Amount}) ✔️</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelBet2}
                      className="px-2.5 py-2 bg-red-600/30 hover:bg-red-600 text-red-200 border border-red-500/50 rounded-xl font-bold text-[10px] transition cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handlePlaceBet2}
                    className="w-full py-2 rounded-xl font-black text-xs transition shadow-lg cursor-pointer flex flex-col items-center justify-center bg-gradient-to-r from-purple-500 via-pink-500 to-purple-400 text-white shadow-purple-500/25 hover:brightness-105 active:scale-98"
                  >
                    <span>PLACE BET 2</span>
                  </button>
                )}
              </div>
            )}

            {gameState === 'RUNNING' && (
              <>
                {bet2HasPlaced && !bet2CashedOut ? (
                  <button
                    type="button"
                    onClick={() => handleCashoutBet2()}
                    className="w-full py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/30 hover:brightness-105 cursor-pointer active:scale-95 animate-pulse flex flex-col items-center justify-center"
                  >
                    <span>CASH OUT BET 2</span>
                    <span className="text-[10px] font-mono font-bold">
                      Rs {Math.round(bet2Amount * multiplier).toLocaleString()} ({multiplier.toFixed(2)}x)
                    </span>
                  </button>
                ) : bet2CashedOut ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2 rounded-xl font-bold text-[10px] bg-slate-800 text-purple-400 border border-purple-500/30 cursor-not-allowed"
                  >
                    BET 2 WON AT {bet2CashedOutAt?.toFixed(2)}x ✔️
                  </button>
                ) : bet2Queued ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled
                      className="flex-1 py-2 rounded-xl font-bold text-[10px] bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 cursor-not-allowed"
                    >
                      BET 2 QUEUED (Rs {bet2Amount}) ⏳
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelBet2}
                      className="px-2.5 py-2 bg-red-600/30 hover:bg-red-600 text-red-200 border border-red-500/50 rounded-xl font-bold text-[10px] transition cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePlaceBet2}
                    className="w-full py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border border-purple-400/30 transition shadow-lg cursor-pointer flex flex-col items-center justify-center"
                  >
                    <span>BET 2 FOR NEXT ROUND</span>
                  </button>
                )}
              </>
            )}

            {gameState === 'CRASHED' && (
              <div>
                {bet2Queued ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled
                      className="flex-1 py-2 rounded-xl font-bold text-[10px] bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 cursor-not-allowed"
                    >
                      BET 2 QUEUED (Rs {bet2Amount}) ⏳
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelBet2}
                      className="px-2.5 py-2 bg-red-600/30 hover:bg-red-600 text-red-200 border border-red-500/50 rounded-xl font-bold text-[10px] transition cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePlaceBet2}
                    className="w-full py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-purple-500/30 transition cursor-pointer flex flex-col items-center justify-center"
                  >
                    <span>BET 2 FOR NEXT ROUND</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>

  {/* =========================================================================
      MINIMIZED & SIMPLE LIVE MEMBERS LIST (CLEAN & COMPACT)
      ========================================================================= */}
  <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2.5 sm:p-3 shadow-lg transition-all">
    {/* Minimized Header with Toggle */}
    <button
      type="button"
      onClick={() => setIsMembersOpen(!isMembersOpen)}
      className="w-full flex items-center justify-between text-left cursor-pointer group"
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
          <Users className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold text-slate-200 group-hover:text-white transition">
          Live Members ({livePlayers.length})
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
      </div>

      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono group-hover:text-slate-300">
        <span>{isMembersOpen ? 'Hide' : 'Show'}</span>
        {isMembersOpen ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </div>
    </button>

    {/* Compact Simple Members Grid (When expanded) */}
    {isMembersOpen && (
      <div className="mt-2.5 pt-2 border-t border-slate-800/60 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
          {livePlayers.map((player, idx) => (
            <div
              key={`trader-simple-${idx}-${player.name}`}
              className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-[11px]"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-300 shrink-0">
                  {player.name.charAt(0)}
                </div>
                <span className="font-medium text-slate-300 font-mono truncate text-[10px]">
                  {player.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-purple-400 font-bold shrink-0 ml-1">
                Rs {player.bet}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</div>
  );
};
