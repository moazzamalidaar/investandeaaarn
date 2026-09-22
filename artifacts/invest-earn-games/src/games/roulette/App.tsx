/**
 * European Roulette Web Game
 * 2D Canvas Animated Physics Wheel, European Betting Board, Web Audio Synthesizer,
 * Payout Engine, Real-time Statistics, and Full Landscape Casino UI.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Coins, RefreshCw, Volume2, VolumeX, ShieldCheck, Trophy, Plus, ChevronLeft, Award, Star, Smartphone } from 'lucide-react';
import { GamePhase, Bet, BetType, SpinResult, GameStats } from './types';
import { EUROPEAN_WHEEL_NUMBERS, getNumberColor } from './constants/roulette';
import { evaluateBets, createSpinResult } from './utils/payouts';
import { sounds } from './utils/audio';
import { RouletteWheel } from './components/RouletteWheel';
import { BettingBoard } from './components/BettingBoard';
import { ChipSelector } from './components/ChipSelector';
import { GameControls } from './components/GameControls';
import { VerticalHistoryBar } from './components/VerticalHistoryBar';
import { TrendModal } from './components/TrendModal';
import { PaytableModal } from './components/PaytableModal';
import { RoundOutcomeFloat } from './components/RoundOutcomeFloat';

const INITIAL_BALANCE = 0;
const ROULETTE_BALANCE_KEY = 'roulette_balance_pkr';
const BETTING_TIME_SECONDS = 15;
const SPIN_DURATION_MS = 8000; // Realistic 8.0-second spin duration with smooth continuous flow

// Initial history so trends and history bar are populated
const createInitialStats = (): GameStats => {
  const seedNumbers = [28, 7, 23, 11, 11, 13, 10, 23, 6, 24, 15, 22, 35, 32];
  const numberFrequencies: Record<number, number> = {};
  for (let i = 0; i <= 36; i++) numberFrequencies[i] = 0;

  let redCount = 0;
  let blackCount = 0;
  let greenCount = 0;
  let evenCount = 0;
  let oddCount = 0;
  let lowCount = 0;
  let highCount = 0;
  let dozen1Count = 0;
  let dozen2Count = 0;
  let dozen3Count = 0;
  let col1Count = 0;
  let col2Count = 0;
  let col3Count = 0;

  const history: SpinResult[] = seedNumbers.map((num, idx) => {
    numberFrequencies[num] = (numberFrequencies[num] || 0) + 1;
    const color = getNumberColor(num);
    if (color === 'red') redCount++;
    else if (color === 'black') blackCount++;
    else greenCount++;

    if (num !== 0) {
      if (num % 2 === 0) evenCount++;
      else oddCount++;

      if (num <= 18) lowCount++;
      else highCount++;

      if (num <= 12) dozen1Count++;
      else if (num <= 24) dozen2Count++;
      else dozen3Count++;

      if (num % 3 === 1) col1Count++;
      else if (num % 3 === 2) col2Count++;
      else col3Count++;
    }

    return {
      winningNumber: num,
      color,
      totalBet: 0,
      totalWon: 0,
      netProfit: 0,
      winningBets: [],
      timestamp: Date.now() - (seedNumbers.length - idx) * 60000,
    };
  });

  return {
    totalSpins: seedNumbers.length,
    redCount,
    blackCount,
    greenCount,
    evenCount,
    oddCount,
    lowCount,
    highCount,
    dozen1Count,
    dozen2Count,
    dozen3Count,
    col1Count,
    col2Count,
    col3Count,
    numberFrequencies,
    history,
  };
};

interface RouletteAppProps {
  onBack?: () => void;
}

export default function App({ onBack }: RouletteAppProps) {
  // Game State
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem(ROULETTE_BALANCE_KEY);
    const parsed = saved ? Number(saved) : INITIAL_BALANCE;
    return isNaN(parsed) || parsed < 0 ? INITIAL_BALANCE : parsed;
  });

  const [phase, setPhase] = useState<GamePhase>('betting');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(BETTING_TIME_SECONDS);
  const [selectedChipAmount, setSelectedChipAmount] = useState<number>(100);
  const [currentBets, setCurrentBets] = useState<Bet[]>([]);
  const [previousBets, setPreviousBets] = useState<Bet[]>([]);
  
  // Wheel state
  const [isWheelSpinning, setIsWheelSpinning] = useState<boolean>(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(28);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number>(0);

  // Settings & Modals
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isTrendsOpen, setIsTrendsOpen] = useState<boolean>(false);
  const [isPaytableOpen, setIsPaytableOpen] = useState<boolean>(false);
  const [autoLoop, setAutoLoop] = useState<boolean>(true);

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

  // Statistics
  const [stats, setStats] = useState<GameStats>(() => {
    const saved = localStorage.getItem('roulette_stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return createInitialStats();
  });

  // Keep bet history for undo stack
  const betHistoryRef = useRef<Bet[][]>([]);
  const currentBetsRef = useRef<Bet[]>(currentBets);
  currentBetsRef.current = currentBets;
  const phaseRef = useRef<GamePhase>(phase);
  phaseRef.current = phase;
  const winningNumberRef = useRef<number | null>(winningNumber);
  winningNumberRef.current = winningNumber;

  // Persist balance
  useEffect(() => {
    localStorage.setItem(ROULETTE_BALANCE_KEY, balance.toString());
  }, [balance]);

  // Persist stats
  useEffect(() => {
    localStorage.setItem('roulette_stats', JSON.stringify(stats));
  }, [stats]);

  // Calculate current total bet amount
  const totalBet = currentBets.reduce((sum, b) => sum + b.amount, 0);

  // Sound toggle
  const handleToggleMute = useCallback(() => {
    const nextMuted = sounds.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  // START A NEW ROUND / SPIN (Rotates continuously whether bets are placed or not)
  const startSpin = useCallback(() => {
    if (phaseRef.current !== 'betting') return;
    const activeBets = currentBetsRef.current;

    // Pick random European Roulette winning number (0 to 36)
    const randomIndex = Math.floor(Math.random() * EUROPEAN_WHEEL_NUMBERS.length);
    const chosenNumber = EUROPEAN_WHEEL_NUMBERS[randomIndex];

    // Transition phase to drawing
    setPhase('drawing');
    setWinningNumber(chosenNumber);
    setIsWheelSpinning(true);
    setPreviousBets([...activeBets]);
    sounds.playSpinSound();
  }, []);

  // SPIN COMPLETION HANDLER (Called when wheel stops on ball)
  const handleSpinComplete = useCallback(() => {
    const chosen = winningNumberRef.current;
    if (chosen === null) return;

    setIsWheelSpinning(false);
    setPhase('result');

    const activeBets = currentBetsRef.current;
    const currentTotalBet = activeBets.reduce((sum, b) => sum + b.amount, 0);

    // Evaluate payouts
    const evaluation = evaluateBets(activeBets, chosen);
    const totalWon = evaluation.totalWon;

    const result = createSpinResult(chosen, activeBets);
    setLastResult(result);
    setLastWinAmount(totalWon);

    // Update balance
    if (totalWon > 0) {
      setBalance((prev) => prev + totalWon);
      sounds.playWinSound(totalWon > currentTotalBet * 5);
    } else if (currentTotalBet > 0) {
      sounds.playLossSound();
    }

    // Update Game Statistics
    setStats((prev) => {
      const color = getNumberColor(chosen);
      const newFreq = { ...prev.numberFrequencies };
      newFreq[chosen] = (newFreq[chosen] || 0) + 1;

      return {
        totalSpins: prev.totalSpins + 1,
        redCount: color === 'red' ? prev.redCount + 1 : prev.redCount,
        blackCount: color === 'black' ? prev.blackCount + 1 : prev.blackCount,
        greenCount: color === 'green' ? prev.greenCount + 1 : prev.greenCount,
        evenCount: chosen !== 0 && chosen % 2 === 0 ? prev.evenCount + 1 : prev.evenCount,
        oddCount: chosen !== 0 && chosen % 2 !== 0 ? prev.oddCount + 1 : prev.oddCount,
        lowCount: chosen >= 1 && chosen <= 18 ? prev.lowCount + 1 : prev.lowCount,
        highCount: chosen >= 19 && chosen <= 36 ? prev.highCount + 1 : prev.highCount,
        dozen1Count: chosen >= 1 && chosen <= 12 ? prev.dozen1Count + 1 : prev.dozen1Count,
        dozen2Count: chosen >= 13 && chosen <= 24 ? prev.dozen2Count + 1 : prev.dozen2Count,
        dozen3Count: chosen >= 25 && chosen <= 36 ? prev.dozen3Count + 1 : prev.dozen3Count,
        col1Count: chosen !== 0 && chosen % 3 === 1 ? prev.col1Count + 1 : prev.col1Count,
        col2Count: chosen !== 0 && chosen % 3 === 2 ? prev.col2Count + 1 : prev.col2Count,
        col3Count: chosen !== 0 && chosen % 3 === 0 ? prev.col3Count + 1 : prev.col3Count,
        numberFrequencies: newFreq,
        history: [result, ...prev.history].slice(0, 50),
      };
    });

    // Schedule next betting phase after 3.5 seconds
    setTimeout(() => {
      setCurrentBets([]);
      betHistoryRef.current = [];
      setCountdownSeconds(BETTING_TIME_SECONDS);
      setPhase('betting');
    }, 3500);
  }, []);

  // BETTING TIMER COUNTDOWN (Unstoppable continuous live casino rotation loop)
  useEffect(() => {
    if (phase !== 'betting') return undefined;

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          startSpin();
          return BETTING_TIME_SECONDS;
        }

        if (prev <= 5 && prev > 1) {
          sounds.playCountdownTick();
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, startSpin]);

  // Fallback safety timer for drawing phase to avoid any frozen state
  useEffect(() => {
    if (phase === 'drawing') {
      const fallbackTimer = setTimeout(() => {
        if (phaseRef.current === 'drawing') {
          handleSpinComplete();
        }
      }, SPIN_DURATION_MS + 1000);
      return () => clearTimeout(fallbackTimer);
    }
    return undefined;
  }, [phase, handleSpinComplete]);

  // PLACE A BET ON THE FELT
  const handlePlaceBet = (betType: BetType, numbers: number[], label: string, key: string) => {
    if (phase !== 'betting') return;

    if (balance < selectedChipAmount) {
      sounds.playErrorSound();
      return;
    }

    sounds.playChipSound();

    // Deduct chip amount from balance
    setBalance((prev) => prev - selectedChipAmount);

    // Save previous state for undo
    betHistoryRef.current.push([...currentBets]);

    // Update bets
    setCurrentBets((prev) => {
      const existingIdx = prev.findIndex((b) => b.key === key);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          amount: updated[existingIdx].amount + selectedChipAmount,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: `${key}-${Date.now()}`,
            type: betType,
            numbers,
            amount: selectedChipAmount,
            label,
            key,
          },
        ];
      }
    });
  };

  // REMOVE / DECREMENT A SPECIFIC BET
  const handleRemoveBet = (key: string) => {
    if (phase !== 'betting') return;
    const bet = currentBets.find((b) => b.key === key);
    if (!bet) return;

    sounds.playChipSound();
    setBalance((prev) => prev + bet.amount);
    betHistoryRef.current.push([...currentBets]);
    setCurrentBets((prev) => prev.filter((b) => b.key !== key));
  };

  // UNDO LAST BET
  const handleUndo = () => {
    if (phase !== 'betting' || betHistoryRef.current.length === 0) return;
    const lastState = betHistoryRef.current.pop();
    if (lastState !== undefined) {
      const currentSum = currentBets.reduce((s, b) => s + b.amount, 0);
      const prevSum = lastState.reduce((s, b) => s + b.amount, 0);
      const diff = currentSum - prevSum;
      setBalance((prev) => prev + diff);
      setCurrentBets(lastState);
      sounds.playChipSound();
    }
  };

  // CLEAR ALL BETS
  const handleClear = () => {
    if (phase !== 'betting' || currentBets.length === 0) return;
    const totalToRefund = currentBets.reduce((s, b) => s + b.amount, 0);
    setBalance((prev) => prev + totalToRefund);
    betHistoryRef.current.push([...currentBets]);
    setCurrentBets([]);
    sounds.playChipSound();
  };

  // DOUBLE ALL CURRENT BETS (2X)
  const handleDouble = () => {
    if (phase !== 'betting' || currentBets.length === 0) return;
    const requiredAmount = currentBets.reduce((s, b) => s + b.amount, 0);
    if (balance < requiredAmount) {
      sounds.playErrorSound();
      return;
    }

    sounds.playChipSound();
    setBalance((prev) => prev - requiredAmount);
    betHistoryRef.current.push([...currentBets]);
    setCurrentBets((prev) =>
      prev.map((b) => ({
        ...b,
        amount: b.amount * 2,
      }))
    );
  };

  // REBET PREVIOUS ROUND BETS
  const handleRebet = () => {
    if (phase !== 'betting' || previousBets.length === 0 || currentBets.length > 0) return;
    const requiredAmount = previousBets.reduce((s, b) => s + b.amount, 0);
    if (balance < requiredAmount) {
      sounds.playErrorSound();
      return;
    }

    sounds.playChipSound();
    setBalance((prev) => prev - requiredAmount);
    betHistoryRef.current.push([]);
    setCurrentBets([...previousBets]);
  };

  // RESET / RELOAD BANKROLL (+ Rs. 25,000)
  const handleAddBalance = () => {
    setBalance((prev) => prev + INITIAL_BALANCE);
    sounds.playWinSound(false);
  };

  // Clear trend stats
  const handleClearHistory = () => {
    const reset = createInitialStats();
    setStats(reset);
    localStorage.removeItem('roulette_stats');
  };

  const isVirtualRotateActive = isForcedRotate && !isLandscape;

  const mainContent = (
    <div className="h-screen max-h-screen w-screen max-w-screen bg-[#061e14] text-[#e0d8cf] flex flex-col justify-between select-none overflow-hidden font-sans">
      
      {/* 1. TOP CASINO BAR (Matching real mobile casino UI) */}
      <header className="w-full h-11 xs:h-12 sm:h-14 px-2 xs:px-3 sm:px-5 bg-gradient-to-r from-black/80 via-[#072418]/90 to-black/80 border-b border-[#1b6b47]/60 flex items-center justify-between gap-1 xs:gap-2 sm:gap-4 flex-shrink-0 z-30 shadow-md">
        
        {/* Left: Back Arrow + Win Chips Badge */}
        <div className="flex items-center gap-1.5 xs:gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="w-7 h-7 xs:w-8 xs:h-8 rounded-full bg-black/40 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            aria-label="Back to games lobby"
            title="Back to games lobby"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Win Chips Badge */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#a71d2a] border border-yellow-300/40 shadow-xs">
            <span className="text-[8px] xs:text-[9px] font-bold text-white uppercase tracking-tighter">
              Win Chips Rs 15
            </span>
          </div>
        </div>

        {/* Center: Live Timer Badge + Other Players Avatars */}
        <div className="flex items-center gap-2 xs:gap-3 sm:gap-4">
          {/* Drawing / Betting Timer Ring */}
          <div className="flex items-center gap-1.5">
            <div className="relative w-8 h-8 xs:w-9 xs:h-9 rounded-full bg-black/70 border-2 border-yellow-400 flex flex-col items-center justify-center shadow-[0_0_8px_rgba(255,215,0,0.4)]">
              <span className="text-xs xs:text-sm font-black text-yellow-300 font-mono-num leading-none">
                {phase === 'betting' ? countdownSeconds : phase === 'drawing' ? '●' : '✓'}
              </span>
              <span className="text-[6px] text-yellow-100 font-medium uppercase leading-none tracking-tighter">
                {phase === 'betting' ? 'Drawing' : phase === 'drawing' ? 'Spin' : 'Done'}
              </span>
            </div>
          </div>

          {/* Online Players Avatars (Winner, Lucky, etc.) */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Winner */}
            <div className="flex flex-col items-center">
              <div className="relative w-7 h-7 rounded-full bg-amber-500 border border-yellow-200 flex items-center justify-center text-[9px] font-bold text-black shadow">
                <Trophy className="w-3.5 h-3.5 text-amber-950" />
                <span className="absolute -top-1.5 bg-yellow-400 text-black text-[6px] font-extrabold px-1 rounded-full uppercase">WINNER</span>
              </div>
              <span className="text-[8px] text-yellow-300 font-mono font-bold mt-0.5">Rs. 35,635</span>
            </div>

            {/* Player 2 */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-emerald-600 border border-emerald-300 flex items-center justify-center text-[10px] font-bold text-white shadow">
                CR
              </div>
              <span className="text-[8px] text-emerald-200 font-mono font-bold mt-0.5">Rs. 5,843</span>
            </div>

            {/* Lucky */}
            <div className="flex flex-col items-center">
              <div className="relative w-7 h-7 rounded-full bg-purple-600 border border-purple-300 flex items-center justify-center text-[10px] font-bold text-white shadow">
                <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                <span className="absolute -top-1.5 bg-yellow-400 text-black text-[6px] font-extrabold px-1 rounded-full uppercase">LUCKY</span>
              </div>
              <span className="text-[8px] text-yellow-300 font-mono font-bold mt-0.5">Rs. 16,021</span>
            </div>
          </div>
        </div>

        {/* Right: + ADD Gold Button & Settings */}
        <div className="flex items-center gap-1.5 xs:gap-2">
          {/* User Balance */}
          <div className="flex flex-col items-end mr-1">
            <span className="text-[8px] uppercase tracking-wider text-emerald-300/70 font-semibold">My Balance</span>
            <span className="text-xs xs:text-sm sm:text-base font-black text-yellow-300 font-mono-num drop-shadow">
              Rs. {balance.toLocaleString()}
            </span>
          </div>

          {/* + ADD Button */}
          <button
            type="button"
            onClick={handleAddBalance}
            className="px-2 xs:px-3 py-1 rounded-lg bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-black font-black text-[10px] xs:text-xs uppercase tracking-wider shadow-[0_0_10px_rgba(234,179,8,0.5)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-0.5"
            title="Reload + Rs. 25,000"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>ADD</span>
          </button>

          {/* Settings & Rules */}
          <button
            type="button"
            onClick={toggleRotateMode}
            className={`p-1 rounded-md border text-[10px] px-1.5 flex items-center gap-1 transition-colors cursor-pointer ${
              isLandscape || isForcedRotate
                ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300'
                : 'bg-black/40 border-slate-700/60 text-slate-300 hover:text-white'
            }`}
            title="Rotate Screen / Landscape Mode"
          >
            <Smartphone className="w-3.5 h-3.5 rotate-90 text-yellow-400" />
            <span className="hidden sm:inline">Rotate</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPaytableOpen(true)}
            className="p-1 rounded-md bg-black/40 border border-slate-700/60 text-yellow-400 hover:bg-[#d4af37]/20 transition-colors text-[10px] px-1.5"
          >
            Rules
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            className="p-1.5 rounded-md bg-black/40 border border-slate-700/60 text-yellow-400 hover:bg-[#d4af37]/20 transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-yellow-400" />}
          </button>
        </div>
      </header>

      {/* Portrait Helper Banner for Mobile */}
      {!isLandscape && !isForcedRotate && (
        <div className="bg-[#072418] border-b border-yellow-400/40 px-3 py-1.5 flex items-center justify-between text-yellow-200 text-xs shadow-md z-40">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-yellow-400 rotate-90 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold">Rotate phone sideways for widescreen Roulette wheel & board</span>
          </div>
          <button
            type="button"
            onClick={toggleRotateMode}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-black text-[10px] px-2.5 py-0.5 rounded active:scale-95 transition shadow cursor-pointer shrink-0"
          >
            Rotate
          </button>
        </div>
      )}

      {/* 2. MAIN STAGE: Left Roller Wheel + Center Betting Felt + Right History */}
      <main className="w-full flex-1 px-0.5 xs:px-1 sm:px-3 py-0.5 flex items-center justify-between gap-0.5 xs:gap-1 sm:gap-2 relative overflow-hidden">
        
        {/* Left Side: Roller Wheel */}
        <div
          className={`transition-all duration-700 ease-out flex items-center justify-center flex-shrink-0 z-20 ${
            isWheelSpinning
              ? 'absolute inset-0 m-auto w-[250px] xs:w-[290px] sm:w-[350px] md:w-[400px] h-[250px] xs:h-[290px] sm:h-[350px] md:h-[400px] z-40 scale-105 drop-shadow-[0_0_50px_rgba(0,0,0,0.95)]'
              : 'relative w-[65px] xs:w-[85px] sm:w-[115px] md:w-[145px] h-[105px] xs:h-[130px] sm:h-[160px] md:h-[185px] -translate-x-[36%] xs:-translate-x-[30%] opacity-95'
          }`}
        >
          <RouletteWheel
            isSpinning={isWheelSpinning}
            winningNumber={winningNumber}
            onSpinComplete={handleSpinComplete}
            spinDurationMs={SPIN_DURATION_MS}
          />

          {/* Last Winning Number Pointer Badge (When wheel is idle on the side) */}
          {!isWheelSpinning && winningNumber !== null && (
            <div className="absolute right-0 bottom-2 z-30 flex items-center gap-1 bg-black/90 border-2 border-yellow-400 rounded-full px-2 py-0.5 shadow-lg">
              <span className="text-[8px] text-yellow-300 font-bold">LAST</span>
              <span className={`text-xs sm:text-sm font-black font-mono-num ${
                getNumberColor(winningNumber) === 'red' ? 'text-red-400' : getNumberColor(winningNumber) === 'black' ? 'text-white' : 'text-emerald-400'
              }`}>
                {winningNumber}
              </span>
            </div>
          )}
        </div>

        {/* Center: Betting Felt (Fits 100% of the screen without scrolling or swiping) */}
        <div
          className={`flex-1 flex flex-col items-center justify-center min-w-0 transition-all duration-500 z-10 ${
            isWheelSpinning ? 'opacity-30 scale-95 pointer-events-none' : 'opacity-100'
          }`}
        >
          <BettingBoard
            bets={currentBets}
            onPlaceBet={handlePlaceBet}
            onRemoveBet={handleRemoveBet}
            disabled={phase !== 'betting'}
            winningNumber={phase === 'result' ? winningNumber : null}
          />
        </div>

        {/* Right Side: Vertical History Bar (Just like in the image) */}
        <div className={`transition-opacity duration-300 z-10 ${isWheelSpinning ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <VerticalHistoryBar
            history={stats.history}
            onOpenTrends={() => setIsTrendsOpen(true)}
          />
        </div>
      </main>

      {/* 3. BOTTOM CONTROLS & CHIPS AREA */}
      <footer className="w-full px-2 xs:px-3 sm:px-5 py-1 bg-gradient-to-t from-black via-[#061810] to-black/90 border-t border-[#1b6b47]/60 flex flex-col gap-1 flex-shrink-0 z-30 shadow-lg">
        {/* All 7 PKR Chips */}
        <ChipSelector
          selectedAmount={selectedChipAmount}
          onSelectAmount={setSelectedChipAmount}
          disabled={phase !== 'betting'}
        />

        {/* Action Buttons & Total Bet Badge */}
        <GameControls
          phase={phase}
          countdownSeconds={countdownSeconds}
          balance={balance}
          totalBet={totalBet}
          lastWinAmount={lastWinAmount}
          lastResult={lastResult}
          hasBets={currentBets.length > 0}
          canRebet={previousBets.length > 0 && currentBets.length === 0}
          onSpin={startSpin}
          onRebet={handleRebet}
          onDouble={handleDouble}
          onClear={handleClear}
          onUndo={handleUndo}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          autoLoop={autoLoop}
          onToggleAutoLoop={() => setAutoLoop(!autoLoop)}
          onOpenTrends={() => setIsTrendsOpen(true)}
          onOpenPaytable={() => setIsPaytableOpen(true)}
        />
      </footer>

      {/* MODALS */}
      <TrendModal
        isOpen={isTrendsOpen}
        onClose={() => setIsTrendsOpen(false)}
        history={stats.history}
        stats={stats}
        onClearHistory={handleClearHistory}
      />

      <PaytableModal
        isOpen={isPaytableOpen}
        onClose={() => setIsPaytableOpen(false)}
      />

      {/* Clean Float Outcome Text - No animation, just the amount written out (e.g. +Rs 600 or -Rs 600) */}
      <RoundOutcomeFloat
        lastResult={lastResult}
        phase={phase}
      />
    </div>
  );

  if (isVirtualRotateActive) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
        <div 
          className="w-[100vh] h-[100vw] overflow-hidden flex flex-col justify-between"
          style={{
            transform: 'rotate(90deg)',
            transformOrigin: 'center center',
          }}
        >
          {mainContent}
        </div>
      </div>
    );
  }

  return mainContent;
}
