import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Sparkles,
  ShoppingCart,
  Minus,
  Plus,
  RotateCcw,
  Maximize2,
  Minimize2,
  Smartphone,
  Radio
} from 'lucide-react';
import {
  recordGameResultToSupabase,
  broadcastPlayerBet,
  broadcastPlayerCashout
} from '../services/gameSync';

interface MinesGameSectionProps {
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

interface TileState {
  index: number;
  isMine: boolean;
  isRevealed: boolean;
}

// Multiplier calculation matching the exact reference values from user images
export function getMinesMultiplier(minesCount: number, revealedCount: number): number {
  if (revealedCount <= 0) return 1.00;
  const totalTiles = 25;
  const safeTiles = totalTiles - minesCount;
  if (revealedCount > safeTiles) return 0;

  // Exact reference tables for standard mine presets (Images 0, 1, 2, 3)
  if (minesCount === 2) {
    const table = [1.02, 1.11, 1.22, 1.34, 1.48, 1.64, 1.83, 2.05, 2.32, 2.64, 3.03, 3.52, 4.14, 4.95, 6.04, 7.53, 9.65, 12.87, 18.02, 27.03, 45.05, 90.1, 270.3];
    if (revealedCount <= table.length) return table[revealedCount - 1];
  } else if (minesCount === 8) {
    const table = [1.38, 2.07, 3.17, 4.99, 8.07, 13.45, 23.23, 42.06, 80.9, 167.07, 377.92, 944.8, 2699.4, 9448.0, 44100.0, 308700.0, 4321800.0];
    if (revealedCount <= table.length) return table[revealedCount - 1];
  } else if (minesCount === 14) {
    const table = [2.13, 5.12, 13.1, 36.03, 108.1, 360.33, 1381.28, 6215.75, 34186.6, 256400.0, 3333200.0];
    if (revealedCount <= table.length) return table[revealedCount - 1];
  } else if (minesCount === 20) {
    const table = [4.69, 28.2, 216.2, 2378, 49942];
    if (revealedCount <= table.length) return table[revealedCount - 1];
  }

  // Generalized formula with 0.938 exact RTP factor
  let prob = 1.0;
  for (let i = 0; i < revealedCount; i++) {
    prob *= (safeTiles - i) / (totalTiles - i);
  }
  const rawMult = 0.938 / prob;
  if (rawMult < 10) return parseFloat(rawMult.toFixed(2));
  if (rawMult < 100) return parseFloat(rawMult.toFixed(1));
  return Math.round(rawMult);
}

export const MinesGameSection: React.FC<MinesGameSectionProps> = ({
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
  // Mines count: STRICTLY MIN 2, MAX 24 (Default 2 on startup)
  const [minesCount, setMinesCount] = useState<number>(2);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  // Game state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [grid, setGrid] = useState<TileState[]>(() =>
    Array.from({ length: 25 }, (_, i) => ({ index: i, isMine: false, isRevealed: false }))
  );
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [gameResult, setGameResult] = useState<'IDLE' | 'PLAYING' | 'WON' | 'LOST'>('IDLE');
  const [lastExplodedIndex, setLastExplodedIndex] = useState<number | null>(null);

  // Screen Orientation & Fullscreen State
  const [isLandscape, setIsLandscape] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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

    return () => {
      window.removeEventListener('resize', checkOrientation);
      try {
        const orientation = screen?.orientation as unknown as { lock?: (mode: string) => Promise<void>; unlock?: () => void } | undefined;
        if (orientation && typeof orientation.unlock === 'function') {
          orientation.unlock();
        }
      } catch {}
    };
  }, []);

  const toggleRotateMode = async () => {
    playCustomSound('click');
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
      // Fallback state toggle
      setIsLandscape(prev => !prev);
    }
  };

  // Audio Context for Custom Procedural SFX
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playCustomSound = (type: 'click' | 'safe' | 'bomb' | 'cashout' | 'start') => {
    if (soundMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'safe') {
        const freqs = [587.33, 739.99, 880, 1174.66];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.04);
          gain.gain.setValueAtTime(0.12, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.18);
        });
      } else if (type === 'bomb') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'cashout') {
        const chords = [523.25, 659.25, 783.99, 1046.50];
        chords.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.06);
          gain.gain.setValueAtTime(0.15, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.4);
        });
      } else if (type === 'start') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {}
  };

  // Multiplier calculations
  const currentMultiplier = isPlaying && revealedCount > 0 ? getMinesMultiplier(minesCount, revealedCount) : 0;
  const nextMultiplier = getMinesMultiplier(minesCount, revealedCount + 1);

  const currentWinnings = isPlaying && revealedCount > 0 ? parseFloat((betAmount * currentMultiplier).toFixed(2)) : 0;
  const nextWinnings = parseFloat((betAmount * nextMultiplier).toFixed(2));

  // Multipliers Preview Array for Chests 1 to 6 (or remaining safe steps)
  const maxChests = Math.min(6, 25 - minesCount);
  const previewMultipliers = Array.from({ length: 6 }, (_, i) => {
    const step = i + 1;
    if (step > maxChests) {
      return { step, mult: 0, disabled: true };
    }
    const mult = getMinesMultiplier(minesCount, step);
    return { step, mult, disabled: false };
  });

  // START GAME
  const handleStartGame = () => {
    if (balance < betAmount) {
      showToast('Insufficient wallet balance! Please deposit funds.');
      return;
    }

    playCustomSound('start');
    soundFX?.playClick?.();

    // Deduct bet
    setBalance(prev => prev - betAmount);
    onBetPlaced?.(betAmount);

    // Randomize mine positions strictly between min 2 and max 23
    const allIndexes = Array.from({ length: 25 }, (_, i) => i);
    const shuffled = allIndexes.sort(() => Math.random() - 0.5);
    const mineIndexes = new Set(shuffled.slice(0, minesCount));

    const newGrid: TileState[] = Array.from({ length: 25 }, (_, i) => ({
      index: i,
      isMine: mineIndexes.has(i),
      isRevealed: false
    }));

    setGrid(newGrid);
    setRevealedCount(0);
    setGameResult('PLAYING');
    setIsPlaying(true);
    setLastExplodedIndex(null);

    broadcastPlayerBet('mines', {
      id: `mines_${Date.now()}_${Math.random()}`,
      user_id: currentUser?.id || 'guest',
      name: currentUser?.full_name || 'You',
      game_name: 'mines',
      bet: betAmount,
      round_id: `MN-${Date.now()}`,
      timestamp: Date.now(),
      is_real_user: true
    });

    showToast(`Game Started! Pick a golden tile to reveal treasure! 💎`);
  };

  // TILE CLICK HANDLER
  const handleTileClick = (tileIndex: number) => {
    if (!isPlaying || gameResult !== 'PLAYING') return;

    const tile = grid[tileIndex];
    if (tile.isRevealed) return;

    if (tile.isMine) {
      // BOOM!
      playCustomSound('bomb');
      setLastExplodedIndex(tileIndex);

      // Reveal all tiles with exploded bomb
      setGrid(prev =>
        prev.map(t => ({
          ...t,
          isRevealed: true
        }))
      );

      setIsPlaying(false);
      setGameResult('LOST');
      showToast(`💥 BOOM! You hit a mine. Better luck next round!`);

      // Record Lost game to Supabase
      recordGameResultToSupabase({
        gameName: 'mines',
        betAmount,
        multiplier: 1.0,
        winAmount: 0,
        status: 'lost',
        userId: currentUser?.id,
        email: currentUser?.email,
        playerName: currentUser?.full_name
      });
    } else {
      // SAFE TILE REVEALED
      playCustomSound('safe');
      const newRevealedCount = revealedCount + 1;
      setRevealedCount(newRevealedCount);

      setGrid(prev =>
        prev.map(t => (t.index === tileIndex ? { ...t, isRevealed: true } : t))
      );

      const maxSafe = 25 - minesCount;
      if (newRevealedCount >= maxSafe) {
        // ALL SAFE TILES REVEALED - AUTOMATIC GRAND WIN
        const finalMult = getMinesMultiplier(minesCount, newRevealedCount);
        const finalWin = parseFloat((betAmount * finalMult).toFixed(2));
        setBalance(prev => prev + finalWin);
        setIsPlaying(false);
        setGameResult('WON');
        playCustomSound('cashout');
        soundFX?.playSuccess?.();

        showToast(`🏆 ALL SAFE TILES CLEARED! Won Rs ${finalWin.toLocaleString()}!`);
        if (addTransactionRecord) {
          addTransactionRecord('Profit', finalWin, `Mines Grand Win (${minesCount} mines)`);
        }

        recordGameResultToSupabase({
          gameName: 'mines',
          betAmount,
          multiplier: finalMult,
          winAmount: finalWin,
          status: 'won',
          userId: currentUser?.id,
          email: currentUser?.email,
          playerName: currentUser?.full_name
        });

        broadcastPlayerCashout('mines', {
          user_id: currentUser?.id || 'player',
          name: currentUser?.full_name || 'You',
          multiplier: finalMult,
          win_amount: finalWin,
          game_name: 'mines'
        });
      }
    }
  };

  // CASHOUT HANDLER
  const handleCashout = () => {
    if (!isPlaying || revealedCount === 0) return;

    const winProfit = currentWinnings;
    setBalance(prev => prev + winProfit);
    setIsPlaying(false);
    setGameResult('WON');

    playCustomSound('cashout');
    soundFX?.playSuccess?.();

    // Reveal remaining grid
    setGrid(prev => prev.map(t => ({ ...t, isRevealed: true })));

    showToast(`🎉 CASHED OUT! Won Rs ${winProfit.toLocaleString()} (${currentMultiplier}x)!`);
    if (addTransactionRecord) {
      addTransactionRecord('Profit', winProfit, `Mines Cashout (${currentMultiplier}x)`);
    }

    recordGameResultToSupabase({
      gameName: 'mines',
      betAmount,
      multiplier: currentMultiplier,
      winAmount: winProfit,
      status: 'won',
      userId: currentUser?.id,
      email: currentUser?.email,
      playerName: currentUser?.full_name
    });

    broadcastPlayerCashout('mines', {
      user_id: currentUser?.id || 'player',
      name: currentUser?.full_name || 'You',
      multiplier: currentMultiplier,
      win_amount: winProfit,
      game_name: 'mines'
    });
  };

  // Adjust Mines Count: STRICTLY MIN 2, MAX 24
  const adjustMines = (delta: number) => {
    if (isPlaying) return;
    playCustomSound('click');
    setMinesCount(prev => {
      const next = prev + delta;
      return Math.max(2, Math.min(24, next));
    });
  };

  // Adjust Bet Amount
  const adjustBet = (delta: number) => {
    if (isPlaying) return;
    playCustomSound('click');
    setBetAmount(prev => {
      const next = prev + delta;
      return Math.max(10, next);
    });
  };

  return (
    <div className="space-y-3 w-full mx-auto pb-6 select-none font-sans">
      {/* =========================================================================
          TOP BANNER: Exact Wooden Plank Matching Reference Screenshots
          ========================================================================= */}
      <div className="bg-gradient-to-r from-[#201007] via-[#2f190e] to-[#201007] px-3 py-2 rounded-2xl border-2 border-[#4a2b16] shadow-2xl flex items-center justify-between relative overflow-hidden">
        {/* Subtle woodgrain highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/20 pointer-events-none" />

        {/* Left: Back Button & Win Chips Rs15 Chip */}
        <div className="flex items-center gap-2 relative z-10">
          <button
            type="button"
            onClick={() => {
              playCustomSound('click');
              onBack?.();
            }}
            className="w-7 h-7 rounded-lg bg-[#180c05] hover:bg-[#2e1509] border border-[#442713] flex items-center justify-center text-amber-200 cursor-pointer active:scale-95 transition"
            title="Back to Games Lobby"
          >
            <span className="text-sm font-black">&lt;</span>
          </button>

          <div className="flex items-center bg-gradient-to-r from-[#f59e0b] to-[#d97706] p-0.5 rounded-full shadow-md">
            <div className="bg-[#241207] px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="text-[10px]">🪙</span>
              <div className="flex flex-col leading-none">
                <span className="text-[7px] font-black text-amber-300 uppercase tracking-tighter">Win Chips</span>
                <span className="text-[9px] font-black text-white">Rs15</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Profile Picture (wooden round frame), Name & ID */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-[#f59e0b] p-0.5 shadow-md">
              <div className="w-full h-full rounded-full bg-[#3d2011] overflow-hidden flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-black text-amber-100 leading-tight">
              {currentUser?.full_name || 'mozi'}
            </span>
            <span className="text-[8px] font-mono text-amber-400/80">
              ID:{currentUser?.id?.substring(0, 7) || '9834144'}
            </span>
          </div>

          {/* Red Poker Chip Balance Display */}
          <div className="flex items-center gap-1 bg-[#150a04] px-2.5 py-1 rounded-xl border border-[#4a2b16] ml-1 shadow-inner">
            <span className="text-sm">🎯</span>
            <span className="text-xs font-mono font-black text-white">
              {balance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Right: Golden ADD Button & Rotate & 4-Diamond Settings Menu */}
        <div className="flex items-center gap-1.5 relative z-10">
          {/* Rotate / Landscape Mode Button */}
          <button
            type="button"
            onClick={toggleRotateMode}
            className="flex items-center gap-1 bg-[#180c05] hover:bg-[#2e1509] border border-[#442713] px-2 py-1 rounded-xl text-amber-300 text-[10px] font-black cursor-pointer active:scale-95 transition shadow"
            title="Rotate Screen / Landscape Mode"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ROTATE</span>
          </button>

          {onNavigateToDeposit && (
            <button
              type="button"
              onClick={() => {
                playCustomSound('click');
                onNavigateToDeposit();
              }}
              className="flex items-center gap-1.5 bg-gradient-to-b from-[#fde047] via-[#eab308] to-[#ca8a04] hover:from-[#fef08a] hover:to-[#eab308] text-amber-950 px-3 py-1 rounded-xl font-black text-xs shadow-lg shadow-amber-500/30 border border-yellow-200 cursor-pointer active:scale-95 transition"
            >
              <span className="tracking-wider text-sm font-black drop-shadow-sm">ADD</span>
              <ShoppingCart className="w-4 h-4 text-amber-950 stroke-[2.5]" />
            </button>
          )}

          {/* 4 Diamonds Settings / Sound Menu Icon */}
          <button
            type="button"
            onClick={() => setSoundMuted(!soundMuted)}
            className="p-1 rounded-lg text-amber-200 hover:text-white transition cursor-pointer"
            title="Sound Settings"
          >
            {soundMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <div className="grid grid-cols-2 gap-0.5 w-4 h-4 p-0.5">
                <span className="w-1.5 h-1.5 bg-amber-300 rotate-45 rounded-[1px]" />
                <span className="w-1.5 h-1.5 bg-amber-300 rotate-45 rounded-[1px]" />
                <span className="w-1.5 h-1.5 bg-amber-300 rotate-45 rounded-[1px]" />
                <span className="w-1.5 h-1.5 bg-amber-300 rotate-45 rounded-[1px]" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Optional Portrait Helper Banner on mobile devices */}
      {!isLandscape && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-950 via-[#3a1a09] to-amber-950 border border-amber-500/40 px-3 py-1.5 rounded-xl flex items-center justify-between text-amber-200 text-xs shadow-md"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-400 rotate-90" />
            <span className="text-[10px] sm:text-xs font-bold">Rotate your phone sideways for the full landscape casino experience</span>
          </div>
          <button
            type="button"
            onClick={toggleRotateMode}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-lg active:scale-95 transition shadow cursor-pointer"
          >
            Rotate
          </button>
        </motion.div>
      )}

      {/* =========================================================================
          MAIN GAME BODY: CAVE BACKGROUND + WOOD BOARD + PARCHMENT CONTROLS
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#0a111a] p-2.5 sm:p-4 rounded-3xl border-2 border-[#3d2716] shadow-2xl relative overflow-hidden">
        {/* Glowing Blue Cave Crystals Ambient Lighting */}
        <div className="absolute top-4 -left-10 w-44 h-44 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-4 -right-10 w-44 h-44 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* -----------------------------------------------------------------------
            LEFT SECTION: WOOD-FRAMED 5x5 GOLDEN TILES GRID (Col 7 / 12)
            ----------------------------------------------------------------------- */}
        <div className="sm:col-span-7 flex flex-col items-center justify-center p-2.5 sm:p-3 bg-gradient-to-b from-[#3a2012] via-[#2a160b] to-[#1c0d06] rounded-2xl border-4 border-[#5a3319] shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),0_4px_8px_rgba(0,0,0,0.6)] relative">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full max-w-[340px] aspect-square">
            {grid.map((tile) => {
              const isExploded = lastExplodedIndex === tile.index;
              return (
                <motion.button
                  key={tile.index}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  disabled={!isPlaying || tile.isRevealed}
                  onClick={() => handleTileClick(tile.index)}
                  className={`relative rounded-xl border-2 transition-all flex items-center justify-center aspect-square cursor-pointer disabled:cursor-default overflow-hidden select-none ${
                    !tile.isRevealed
                      ? 'bg-gradient-to-b from-[#fde68a] via-[#f59e0b] to-[#b45309] border-[#fef08a] shadow-[inset_0_2px_0_rgba(255,255,255,0.7),0_3px_6px_rgba(0,0,0,0.6),0_2px_0_#78350f] hover:brightness-110'
                      : tile.isMine
                      ? isExploded
                        ? 'bg-gradient-to-b from-rose-500 to-red-900 border-rose-400 shadow-lg shadow-rose-500/50'
                        : 'bg-[#151c24] border-slate-700 opacity-60'
                      : 'bg-gradient-to-b from-[#15803d] via-[#166534] to-[#14532d] border-emerald-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]'
                  }`}
                >
                  {/* Face Down State: Golden Star Motif */}
                  {!tile.isRevealed && (
                    <div className="w-full h-full flex items-center justify-center relative">
                      <svg className="w-5 h-5 text-amber-200/50 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
                    </div>
                  )}

                  {/* Revealed State */}
                  {tile.isRevealed && (
                    <AnimatePresence>
                      {tile.isMine ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="flex flex-col items-center justify-center"
                        >
                          <span className="text-xl sm:text-2xl drop-shadow-md">💣</span>
                          {isExploded && (
                            <span className="text-[7px] font-black text-white bg-red-600 px-1 rounded-sm uppercase tracking-tighter mt-0.5">
                              BOOM
                            </span>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0, rotate: -15 }}
                          animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="flex flex-col items-center justify-center relative"
                        >
                          <span className="text-2xl sm:text-3xl drop-shadow-[0_2px_10px_rgba(56,189,248,0.9)] filter">💎</span>
                          <Sparkles className="w-4 h-4 text-yellow-200 absolute -top-1.5 -right-1.5 animate-pulse" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            RIGHT SECTION: PARCHMENT PAPER CONTROL PANEL (Col 5 / 12)
            Exact Colors, Multiplier Bags, Steppers, Dual Boxes & 3D Buttons
            ----------------------------------------------------------------------- */}
        <div className="sm:col-span-5 bg-[#f4efe4] text-slate-900 p-2.5 sm:p-3 rounded-2xl border-2 border-[#d9ceb9] shadow-lg flex flex-col justify-between space-y-2.5">
          
          {/* 1. TOP MULTIPLIERS ROAD: 6 Bags/Chests with numbers 01-06 & exact multipliers */}
          <div className="space-y-1">
            <div className="grid grid-cols-6 gap-1 bg-[#eae2d0] p-1.5 rounded-xl border border-[#cfc1a5]">
              {previewMultipliers.map(({ step, mult, disabled }) => {
                const isCurrent = isPlaying && revealedCount === step;
                const isPassed = isPlaying && revealedCount > step;
                const stepPad = step < 10 ? `0${step}` : `${step}`;

                return (
                  <div
                    key={step}
                    className={`flex flex-col items-center justify-center p-0.5 rounded-lg transition-all ${
                      disabled
                        ? 'opacity-40 bg-transparent text-slate-400'
                        : isCurrent
                        ? 'bg-amber-400 text-slate-950 font-black shadow-md scale-105 border border-amber-500'
                        : isPassed
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-transparent text-[#5c3e1e]'
                    }`}
                  >
                    {/* Chest / Bag Graphic with Step Number on badge */}
                    <div className="relative flex items-center justify-center">
                      <span className="text-base sm:text-lg">
                        {disabled ? '📦' : isPassed ? '💎' : step <= 2 ? '📦' : '🎁'}
                      </span>
                      <span className="absolute -top-1 -right-1 text-[7px] font-black bg-[#9a5b23] text-white px-0.5 rounded-full leading-none">
                        {stepPad}
                      </span>
                    </div>

                    {/* Multiplier Value */}
                    <span className="text-[8px] sm:text-[9px] font-black font-mono mt-0.5 text-[#4a2e12]">
                      {disabled ? '0' : mult}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. MINES CONFIGURATION: Minus (-) / Skull Bomb / Plus (+) [Strictly 2 to 23] */}
          <div className="bg-[#eae2d0] p-2 rounded-xl border border-[#cfc1a5] flex items-center justify-between">
            {/* Minus Button */}
            <button
              type="button"
              disabled={isPlaying || minesCount <= 2}
              onClick={() => adjustMines(-1)}
              className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#e06d53] to-[#b8381d] hover:from-[#e67e67] hover:to-[#c64428] text-white flex items-center justify-center font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_3px_6px_rgba(0,0,0,0.3),0_2px_0_#802410] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] active:translate-y-[1px] border border-[#f08c75] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <Minus className="w-5 h-5 stroke-[3.5]" />
            </button>

            {/* Center Bomb Icon, Label & Mines Number */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-2xl">💣</span>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-black text-[#5c3e1e] uppercase tracking-wider">
                    Mines
                  </span>
                  <span className="text-lg font-black font-mono text-[#2b180d] leading-none">
                    {minesCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Plus Button */}
            <button
              type="button"
              disabled={isPlaying || minesCount >= 24}
              onClick={() => adjustMines(1)}
              className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#f97316] to-[#c2410c] hover:from-[#fb923c] hover:to-[#ea580c] text-white flex items-center justify-center font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_3px_6px_rgba(0,0,0,0.3),0_2px_0_#7c2d12] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] active:translate-y-[1px] border border-[#fdba74] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <Plus className="w-5 h-5 stroke-[3.5]" />
            </button>
          </div>

          {/* 3. DUAL NEXT WIN & CURRENT WIN BOXES (Exact match to reference) */}
          <div className="grid grid-cols-2 gap-2">
            {/* NEXT WIN BOX (Sky Blue Theme) */}
            <div className="bg-[#bce4f7] border border-[#8ecae6] rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
              {/* Header Pill */}
              <div className="bg-[#56b3e6] px-2 py-0.5 flex items-center justify-between">
                <span className="text-[9px] font-black text-white uppercase tracking-wider">Next Win</span>
                <span className="text-[9px] font-black font-mono text-white">{nextMultiplier}X</span>
              </div>
              {/* Content Row */}
              <div className="p-1.5 flex items-center justify-between">
                <span className="text-lg">🎁</span>
                <span className="text-sm font-black font-mono text-[#0369a1]">
                  {nextWinnings.toFixed(2)}
                </span>
              </div>
            </div>

            {/* WIN BOX (Orange/Yellow Theme) */}
            <div className="bg-[#fde68a] border border-[#fcd34d] rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
              {/* Header Pill */}
              <div className="bg-[#f59e0b] px-2 py-0.5 flex items-center justify-between">
                <span className="text-[9px] font-black text-white uppercase tracking-wider">Win</span>
                <span className="text-[9px] font-black font-mono text-white">{currentMultiplier}X</span>
              </div>
              {/* Content Row */}
              <div className="p-1.5 flex items-center justify-between">
                <span className="text-lg">🏆</span>
                <span className="text-sm font-black font-mono text-[#92400e]">
                  {currentWinnings.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. BETS CONFIGURATION (Gray Minus / Bets Chip / Orange Plus) */}
          <div className="bg-[#eae2d0] p-2 rounded-xl border border-[#cfc1a5] flex items-center justify-between">
            {/* Bet Minus */}
            <button
              type="button"
              disabled={isPlaying || betAmount <= 10}
              onClick={() => adjustBet(-10)}
              className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#64748b] to-[#334155] hover:from-[#94a3b8] hover:to-[#475569] text-white flex items-center justify-center font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_3px_6px_rgba(0,0,0,0.3),0_2px_0_#1e293b] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] active:translate-y-[1px] border border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <Minus className="w-5 h-5 stroke-[3.5]" />
            </button>

            {/* Center Bet Chip & Amount */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🎯</span>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-black text-[#5c3e1e] uppercase tracking-wider">
                    Bets
                  </span>
                  <span className="text-lg font-black font-mono text-[#2b180d] leading-none">
                    {betAmount}
                  </span>
                </div>
              </div>
            </div>

            {/* Bet Plus */}
            <button
              type="button"
              disabled={isPlaying}
              onClick={() => adjustBet(10)}
              className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#f97316] to-[#c2410c] hover:from-[#fb923c] hover:to-[#ea580c] text-white flex items-center justify-center font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_3px_6px_rgba(0,0,0,0.3),0_2px_0_#7c2d12] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] active:translate-y-[1px] border border-[#fdba74] cursor-pointer transition"
            >
              <Plus className="w-5 h-5 stroke-[3.5]" />
            </button>
          </div>

          {/* 5. MAIN ACTION BUTTON: 3D Beveled Orange Start Game / Green Cash Out with Animated Hand Cursor */}
          <div className="pt-1 relative">
            {!isPlaying ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#f97316] via-[#ea580c] to-[#c2410c] hover:from-[#fb923c] hover:to-[#ea580c] text-white font-black text-base tracking-wider uppercase shadow-[inset_0_2px_0_rgba(255,255,255,0.7),0_4px_10px_rgba(0,0,0,0.4),0_3px_0_#7c2d12] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] active:translate-y-[1px] border border-amber-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Start Game</span>
                </button>

                {/* Animated stylized cartoon hand cursor pointing at Start Game button */}
                <motion.div
                  initial={{ y: 0, opacity: 0.8 }}
                  animate={{ y: [0, 4, 0], opacity: [0.9, 1, 0.9] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className="absolute -bottom-2 right-1/4 pointer-events-none flex items-center drop-shadow-md"
                >
                  <span className="text-2xl transform -rotate-12 select-none">👆</span>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin absolute -top-1 -right-1" />
                </motion.div>
              </div>
            ) : revealedCount > 0 ? (
              <button
                type="button"
                onClick={handleCashout}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#15803d] hover:from-[#4ade80] hover:to-[#16a34a] text-white font-black text-base tracking-wider uppercase shadow-[inset_0_2px_0_rgba(255,255,255,0.7),0_4px_10px_rgba(0,0,0,0.4),0_3px_0_#14532d] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] active:translate-y-[1px] border border-emerald-300 transition cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
              >
                <span>Cash Out Rs {currentWinnings.toFixed(2)}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-3.5 rounded-2xl bg-[#475569] text-slate-200 font-bold text-xs tracking-wider uppercase opacity-80 cursor-default border border-slate-500 flex items-center justify-center gap-1.5"
              >
                <span>Pick a Golden Tile...</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
