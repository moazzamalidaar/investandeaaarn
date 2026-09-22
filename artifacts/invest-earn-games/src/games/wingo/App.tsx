import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  BetCategory,
  GamePhase,
  HistoryItem,
  PlacedChipVisual,
  Player,
} from './types';
import {
  BALL_MAP,
  CHIP_PRESETS,
  INITIAL_BOT_PLAYERS,
  INITIAL_HISTORY,
  INITIAL_USER,
  MULTIPLIERS,
  calculateRoundOutcome,
  generateRoundId,
} from './utils/gameLogic';
import { sounds } from './utils/audio';
import { Smartphone } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { TableSeats } from './components/TableSeats';
import { CasinoTable } from './components/CasinoTable';
import { ChipBar } from './components/ChipBar';
import { BallMachine } from './components/BallMachine';
import { StartStopBanner } from './components/StartStopBanner';
import { TrendModal } from './components/TrendModal';
import { AddChipsModal } from './components/AddChipsModal';
import { SettingsModal } from './components/SettingsModal';
import { BonusGiftModal } from './components/BonusGiftModal';
import { OnlinePlayersModal } from './components/OnlinePlayersModal';
import { EmoteOverlay, ActiveEmote } from './components/EmoteOverlay';
import poolFireworksBg from './assets/images/pool_fireworks_bg_1787350522545.jpg';

interface WinGoAppProps {
  onBack?: () => void;
}

export default function App({ onBack }: WinGoAppProps) {
  // Game State
  const [phase, setPhase] = useState<GamePhase>('BETTING');
  const [countdown, setCountdown] = useState<number>(12);
  const [machineTimer, setMachineTimer] = useState<number>(8);
  const [roundId, setRoundId] = useState<string>(() => generateRoundId());
  const [history, setHistory] = useState<HistoryItem[]>(INITIAL_HISTORY);
  const [winningBallNumber, setWinningBallNumber] = useState<number | null>(null);
  const [winningCategories, setWinningCategories] = useState<BetCategory[]>([]);

  // User & Bot States
  const [user, setUser] = useState<Player>({
    ...INITIAL_USER,
    name: 'mozi',
  });

  const [bots, setBots] = useState<Player[]>([
    {
      id: 'bot_1',
      name: 'G21761',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      balance: 14200,
    },
    {
      id: 'bot_2',
      name: 'G26508',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      balance: 28550,
    },
    {
      id: 'bot_3',
      name: 'P24311',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
      balance: 8900,
    },
  ]);

  const [selectedChip, setSelectedChip] = useState<number>(100);

  // Betting Pools
  const [userBets, setUserBets] = useState<Record<BetCategory, number>>({
    green: 0,
    violet: 0,
    red: 0,
    '0': 0,
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
    '6': 0,
    '7': 0,
    '8': 0,
    '9': 0,
  });

  const [lastRoundBets, setLastRoundBets] = useState<Record<BetCategory, number> | null>(null);

  const [poolBets, setPoolBets] = useState<Record<BetCategory, number>>({
    green: 2450,
    violet: 1140,
    red: 4610,
    '0': 150,
    '1': 100,
    '2': 500,
    '3': 0,
    '4': 2550,
    '5': 170,
    '6': 1200,
    '7': 100,
    '8': 650,
    '9': 0,
  });

  const [placedChips, setPlacedChips] = useState<PlacedChipVisual[]>([]);

  // Banners & Modals
  const [bannerType, setBannerType] = useState<'start' | 'stop' | null>('start');
  const [isTrendOpen, setIsTrendOpen] = useState<boolean>(false);
  const [isAddChipsOpen, setIsAddChipsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBonusOpen, setIsBonusOpen] = useState<boolean>(false);
  const [isPlayersOpen, setIsPlayersOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

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

  // Active Emotes flying around
  const [activeEmotes, setActiveEmotes] = useState<ActiveEmote[]>([]);

  // Round Return Summary (+ for positive, - for negative)
  const [roundReturn, setRoundReturn] = useState<{
    totalBet: number;
    totalWin: number;
    netReturn: number;
    returnAmount: number;
    isWin: boolean;
  } | null>(null);

  // Refs for tracking async timeouts & latest state
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const userBetsRef = useRef(userBets);
  userBetsRef.current = userBets;
  const winningBallRef = useRef(winningBallNumber);
  winningBallRef.current = winningBallNumber;
  const roundIdRef = useRef(roundId);
  roundIdRef.current = roundId;

  // Trigger floating chicken/egg emote periodically or on demand
  const triggerEmote = useCallback(
    (type: ActiveEmote['type'], from: { x: number; y: number }, to: { x: number; y: number }) => {
      const id = `${Date.now()}_${Math.random()}`;
      setActiveEmotes((prev) => [...prev, { id, type, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y }]);
      setTimeout(() => {
        setActiveEmotes((prev) => prev.filter((e) => e.id !== id));
      }, 1500);
    },
    []
  );

  // Bot Auto Betting AI during BETTING phase
  useEffect(() => {
    if (phase !== 'BETTING') return undefined;

    const botBetInterval = setInterval(() => {
      if (Math.random() > 0.45) {
        const categories: BetCategory[] = [
          'green',
          'violet',
          'red',
          '0',
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
        ];
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const chipVal = CHIP_PRESETS[Math.floor(Math.random() * (CHIP_PRESETS.length - 1))];

        const botIndex = Math.floor(Math.random() * bots.length);
        const bot = bots[botIndex];

        setPoolBets((prev) => ({
          ...prev,
          [randomCat]: prev[randomCat] + chipVal,
        }));

        setPlacedChips((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}_${Math.random()}`,
            option: randomCat,
            value: chipVal,
            xPercent: (Math.random() - 0.5) * 1.3,
            yPercent: (Math.random() - 0.5) * 1.3,
            color: '#fbbf24',
            fromPlayerId: bot.id,
          },
        ]);

        sounds.playChip();
      }
    }, 700);

    return () => clearInterval(botBetInterval);
  }, [phase, bots, triggerEmote]);

  // Main Game Loop State Machine
  useEffect(() => {
    // 1. BETTING PHASE
    if (phase === 'BETTING') {
      setBannerType('start');
      sounds.playBell('start');
      const bannerTimer = setTimeout(() => setBannerType(null), 1600);

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setPhase('LOCKING');
            return 0;
          }
          if (prev <= 4) sounds.playTick(true);
          else sounds.playTick(false);
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        clearTimeout(bannerTimer);
      };
    }

    // 2. LOCKING PHASE (Stop Betting)
    if (phase === 'LOCKING') {
      setBannerType('stop');
      sounds.playBell('stop');

      const lockTimer = setTimeout(() => {
        setBannerType(null);
        const chosenNumber = Math.floor(Math.random() * 10);
        setWinningBallNumber(chosenNumber);
        setMachineTimer(5); // Exactly 5 seconds for ball review / rolling
        setPhase('MACHINE_ROLL');
      }, 1200);

      return () => clearTimeout(lockTimer);
    }

    // 3. MACHINE_ROLL PHASE (5s tumble countdown)
    if (phase === 'MACHINE_ROLL') {
      timerRef.current = setInterval(() => {
        setMachineTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setPhase('PAYOUT');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }

    // 4. PAYOUT & RESULT DISPLAY PHASE (Displays for 4.5-5 seconds)
    if (phase === 'PAYOUT') {
      const currentWinningBall = winningBallRef.current;
      const currentUserBets = userBetsRef.current;
      const currentRoundId = roundIdRef.current;

      if (currentWinningBall !== null) {
        const outcome = calculateRoundOutcome(currentWinningBall);
        setWinningCategories(outcome.winningCategories);
        
        const totalBet = (Object.values(currentUserBets) as number[]).reduce((a, b) => a + b, 0);
        let totalWin = 0;

        outcome.winningCategories.forEach((cat) => {
          const betAmt = currentUserBets[cat] || 0;
          if (betAmt > 0) {
            const mult = MULTIPLIERS[cat] || 1;
            totalWin += betAmt * mult;
          }
        });

        const netReturn = totalWin - totalBet;

        if (totalBet > 0) {
          // Net profit after deducting all lost/wasted bets from payout
          const returnAmount = netReturn;
          const isWin = netReturn > 0;
          setRoundReturn({
            totalBet,
            totalWin,
            netReturn,
            returnAmount,
            isWin,
          });

          if (totalWin > 0) {
            sounds.playCoinPayout();
            if (isWin) {
              confetti({
                particleCount: 120,
                spread: 90,
                origin: { y: 0.6 },
              });
            }

            setUser((prev) => ({
              ...prev,
              balance: prev.balance + totalWin,
              lastWin: totalWin,
              lastReturn: netReturn,
            }));
          } else {
            // Complete round loss: netReturn is -totalBet
            setUser((prev) => ({
              ...prev,
              lastWin: 0,
              lastReturn: -totalBet,
            }));
          }
        } else {
          setRoundReturn(null);
        }

        // Update bots with simulated returns (+ or -)
        setBots((prev) =>
          prev.map((bot) => {
            const won = Math.random() > 0.4;
            const returnDelta = won
              ? Math.floor(100 + Math.random() * 900)
              : -Math.floor(50 + Math.random() * 300);
            return {
              ...bot,
              balance: Math.max(1000, bot.balance + returnDelta),
              lastReturn: returnDelta,
            };
          })
        );

        // Append to History
        const newHistoryItem: HistoryItem = {
          roundId: currentRoundId,
          number: currentWinningBall,
          color: outcome.color,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setHistory((prev) => [...prev, newHistoryItem]);
      }

      setLastRoundBets({ ...currentUserBets });

      // Stay on screen for 4.5 seconds to show the revealed winning ball and result
      const restartTimer = setTimeout(() => {
        setUserBets({
          green: 0,
          violet: 0,
          red: 0,
          '0': 0,
          '1': 0,
          '2': 0,
          '3': 0,
          '4': 0,
          '5': 0,
          '6': 0,
          '7': 0,
          '8': 0,
          '9': 0,
        });

        setPoolBets({
          green: Math.floor(1000 + Math.random() * 3000),
          violet: Math.floor(500 + Math.random() * 1500),
          red: Math.floor(1500 + Math.random() * 4000),
          '0': Math.floor(100 + Math.random() * 300),
          '1': Math.floor(100 + Math.random() * 300),
          '2': Math.floor(100 + Math.random() * 300),
          '3': 0,
          '4': Math.floor(1000 + Math.random() * 2000),
          '5': Math.floor(100 + Math.random() * 300),
          '6': Math.floor(500 + Math.random() * 1000),
          '7': Math.floor(50 + Math.random() * 200),
          '8': Math.floor(200 + Math.random() * 500),
          '9': 0,
        });

        setPlacedChips([]);
        setWinningBallNumber(null);
        setWinningCategories([]);
        setRoundReturn(null);
        setUser((prev) => ({ ...prev, lastWin: 0, lastReturn: undefined }));
        setBots((prev) => prev.map((b) => ({ ...b, lastReturn: undefined })));
        setRoundId(generateRoundId());
        setCountdown(12);
        setPhase('BETTING');
      }, 4500);

      return () => clearTimeout(restartTimer);
    }
    return undefined;
  }, [phase]);

  // Handle User Bet Placement
  const handlePlaceBet = (category: BetCategory) => {
    if (phase !== 'BETTING') return;

    if (user.balance < selectedChip) {
      setIsAddChipsOpen(true);
      return;
    }

    sounds.playChip();

    setUser((prev) => ({
      ...prev,
      balance: prev.balance - selectedChip,
    }));

    setUserBets((prev) => ({
      ...prev,
      [category]: prev[category] + selectedChip,
    }));

    setPlacedChips((prev) => [
      ...prev,
      {
        id: `user_${Date.now()}_${Math.random()}`,
        option: category,
        value: selectedChip,
        xPercent: (Math.random() - 0.5) * 1.2,
        yPercent: (Math.random() - 0.5) * 1.2,
        color: '#f59e0b',
        fromPlayerId: user.id,
      },
    ]);
  };

  // ReBet functionality
  const handleReBet = () => {
    if (phase !== 'BETTING' || !lastRoundBets) return;

    const totalRequired = (Object.values(lastRoundBets) as number[]).reduce((a, b) => a + b, 0);
    if (totalRequired === 0) return;

    if (user.balance < totalRequired) {
      setIsAddChipsOpen(true);
      return;
    }

    sounds.playChip();

    setUser((prev) => ({
      ...prev,
      balance: prev.balance - totalRequired,
    }));

    setUserBets((prev) => {
      const next = { ...prev };
      (Object.entries(lastRoundBets) as [BetCategory, number][]).forEach(([cat, amt]) => {
        next[cat] += amt;
      });
      return next;
    });

    (Object.entries(lastRoundBets) as [BetCategory, number][]).forEach(([cat, amt]) => {
      if (amt > 0) {
        setPlacedChips((prev) => [
          ...prev,
          {
            id: `rebet_${Date.now()}_${Math.random()}`,
            option: cat,
            value: amt,
            xPercent: (Math.random() - 0.5) * 1.2,
            yPercent: (Math.random() - 0.5) * 1.2,
            color: '#f59e0b',
            fromPlayerId: user.id,
          },
        ]);
      }
    });
  };

  const handleAddBalance = (amount: number) => {
    setUser((prev) => ({
      ...prev,
      balance: prev.balance + amount,
    }));
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  const isVirtualRotateActive = isForcedRotate && !isLandscape;

  const mainContent = (
    <main
      className="relative w-screen h-screen min-h-[580px] bg-[#020d12] flex flex-col justify-between overflow-hidden font-sans select-none"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 50% 100%, #854d0e 0%, transparent 40%),
          radial-gradient(circle at 10% 90%, #713f12 0%, transparent 25%),
          radial-gradient(circle at 90% 90%, #713f12 0%, transparent 25%),
          linear-gradient(to bottom, #01080b 0%, #031822 50%, #020c10 100%)
        `,
      }}
    >
      {/* 8-Ball Pool Fireworks Wallpaper Layer (Low Visibility Ambient Blend) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <img
          src={poolFireworksBg}
          alt="Fireworks Wallpaper Background"
          className="w-full h-full object-cover opacity-20 filter brightness-90 contrast-125 saturate-120"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020d12]/70 via-[#031822]/40 to-[#020d12]/80" />
      </div>

      {/* Background honeycomb geometric watermarks at bottom corners */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none z-0"
        style={{
          backgroundImage:
            'radial-gradient(#f59e0b 1px, transparent 1px), radial-gradient(#06b6d4 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px',
        }}
      />

      {/* CASINO FELT TABLE WITH CURVED PADDED LEATHER RAIL */}
      <div className="relative w-full h-full flex flex-col justify-between p-1.5 sm:p-3 z-10">
        
        {/* Felt Surface Container with Realistic Leather Padded Border */}
        <div
          className="relative w-full h-full rounded-[36px] sm:rounded-[56px] border-[8px] sm:border-[14px] border-[#14181c] shadow-[0_20px_60px_rgba(0,0,0,0.95),inset_0_3px_25px_rgba(6,182,212,0.4)] flex flex-col justify-between overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at 50% 45%, #0d515e 0%, #083c46 45%, #05262c 85%, #02171c 100%)',
            boxShadow:
              '0 0 0 2px #262e35, inset 0 0 60px rgba(0,0,0,0.8), inset 0 0 15px rgba(6,182,212,0.5)',
          }}
        >
          {/* Subtle Wallpaper overlay texture inside felt table with low visibility */}
          <div className="absolute inset-0 pointer-events-none opacity-15 mix-blend-overlay overflow-hidden">
            <img
              src={poolFireworksBg}
              alt=""
              className="w-full h-full object-cover scale-105 filter blur-[1px]"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Subtle Ambient Glowing Edge Highlights */}
          <div className="absolute inset-x-8 top-0 h-28 bg-gradient-to-b from-cyan-400/15 via-cyan-500/5 to-transparent rounded-t-[50px] pointer-events-none" />
          <div className="absolute inset-x-12 bottom-0 h-24 bg-gradient-to-t from-cyan-400/20 via-cyan-500/5 to-transparent rounded-b-[50px] pointer-events-none" />

          {/* Top Bar matching Screenshot 16 */}
          <TopBar
            history={history}
            onBack={onBack}
            onOpenTrend={() => setIsTrendOpen(true)}
            onOpenAddChips={() => setIsAddChipsOpen(true)}
            onOpenBonus={() => setIsBonusOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onToggleRotate={toggleRotateMode}
            isLandscape={isLandscape}
            isForcedRotate={isForcedRotate}
          />

          {/* Portrait Helper Banner for Mobile */}
          {!isLandscape && !isForcedRotate && (
            <div className="mx-4 my-1 bg-[#042d38]/95 border border-cyan-400/50 rounded-xl px-3 py-1 flex items-center justify-between text-cyan-200 text-xs shadow-md z-30">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-yellow-400 rotate-90 shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold">Rotate phone sideways for full Pool Table & Ball Machine view</span>
              </div>
              <button
                type="button"
                onClick={toggleRotateMode}
                className="bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded active:scale-95 transition shadow cursor-pointer shrink-0"
              >
                Rotate
              </button>
            </div>
          )}

          {/* Left & Right on-table players and seats */}
          <TableSeats
            bots={bots}
            onSeatClick={() => setIsPlayersOpen(true)}
          />

          {/* Central Casino Table Bet Grid (Green, Violet, Red, and 0-9) */}
          <div className="relative flex-1 flex items-center justify-center my-auto z-10">
            <CasinoTable
              currentPhase={phase}
              countdown={phase === 'BETTING' ? countdown : phase === 'LOCKING' ? 0 : machineTimer}
              roundId={roundId}
              userBets={userBets}
              poolBets={poolBets}
              placedChips={placedChips}
              winningCategories={winningCategories}
              onPlaceBet={handlePlaceBet}
              selectedChip={selectedChip}
            />

            {/* 3D Gumball Lottery Machine (Appears in Center when rolling) */}
            <BallMachine
              isVisible={phase === 'MACHINE_ROLL' || phase === 'RESULT_SHOW'}
              countdownSeconds={machineTimer}
              winningBall={winningBallNumber !== null ? BALL_MAP[winningBallNumber] : null}
            />
          </div>

          {/* Bottom Padded Leather Rail & Metallic 3D Chips Dock */}
          <div
            className="relative w-full border-t border-cyan-500/30 pt-1"
            style={{
              background: 'linear-gradient(to top, rgba(2,15,19,0.95) 0%, rgba(4,32,38,0.7) 100%)',
            }}
          >
            <ChipBar
              user={user}
              selectedChip={selectedChip}
              onSelectChip={setSelectedChip}
              onReBet={handleReBet}
              canReBet={!!lastRoundBets && phase === 'BETTING'}
              onOpenAddChips={() => setIsAddChipsOpen(true)}
              onOpenPlayers={() => setIsPlayersOpen(true)}
              returnChange={user.lastReturn ?? (roundReturn ? roundReturn.returnAmount : null)}
            />
          </div>
        </div>
      </div>

      {/* Payout Return Result Floating Card during PAYOUT phase */}
      {phase === 'PAYOUT' && roundReturn && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in zoom-in duration-300">
          <div
            className={`px-5 sm:px-7 py-3 sm:py-3.5 rounded-3xl border-2 shadow-[0_15px_40px_rgba(0,0,0,0.9)] flex flex-col items-center gap-1.5 backdrop-blur-md ${
              roundReturn.netReturn > 0
                ? 'bg-emerald-950/95 border-emerald-400 text-emerald-100 shadow-[0_0_35px_rgba(16,185,129,0.6)]'
                : roundReturn.netReturn < 0
                ? 'bg-rose-950/95 border-rose-400 text-rose-100 shadow-[0_0_35px_rgba(239,68,68,0.6)]'
                : 'bg-slate-900/95 border-yellow-400 text-yellow-100 shadow-[0_0_35px_rgba(250,204,21,0.5)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-xl border shadow-md ${
                  roundReturn.netReturn > 0
                    ? 'bg-emerald-600 border-emerald-200 text-white'
                    : roundReturn.netReturn < 0
                    ? 'bg-rose-600 border-rose-200 text-white'
                    : 'bg-amber-600 border-amber-200 text-white'
                }`}
              >
                {roundReturn.netReturn > 0 ? '+' : roundReturn.netReturn < 0 ? '-' : '='}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase text-cyan-200/90">
                  {roundReturn.netReturn > 0
                    ? 'Net Profit (After Losses Deducted)'
                    : roundReturn.netReturn < 0
                    ? 'Net Loss'
                    : 'Break Even'}
                </span>
                <span
                  className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    roundReturn.netReturn > 0
                      ? 'text-emerald-300'
                      : roundReturn.netReturn < 0
                      ? 'text-rose-300'
                      : 'text-amber-300'
                  }`}
                >
                  {roundReturn.netReturn > 0
                    ? `+Rs ${roundReturn.netReturn.toFixed(2)}`
                    : roundReturn.netReturn < 0
                    ? `-Rs ${Math.abs(roundReturn.netReturn).toFixed(2)}`
                    : 'Rs 0.00'}
                </span>
              </div>
            </div>

            {/* Breakdown Badges */}
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-semibold text-slate-300 bg-black/50 px-3 py-0.5 rounded-full border border-white/10">
              <span>Bet: Rs {roundReturn.totalBet}</span>
              <span className="text-white/40">•</span>
              <span>Win: Rs {roundReturn.totalWin}</span>
              <span className="text-white/40">•</span>
              <span
                className={
                  roundReturn.netReturn > 0
                    ? 'text-emerald-400 font-bold'
                    : roundReturn.netReturn < 0
                    ? 'text-rose-400 font-bold'
                    : 'text-amber-300 font-bold'
                }
              >
                Net: {roundReturn.netReturn > 0 ? '+' : ''}
                Rs {roundReturn.netReturn.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Start / Stop Betting Alarm Clock Banners */}
      <StartStopBanner type={bannerType} />

      {/* Floating Animated Emotes (Chicken, Eggs, Tomatoes, Hearts) */}
      <EmoteOverlay emotes={activeEmotes} />

      {/* Modals */}
      <TrendModal
        isOpen={isTrendOpen}
        onClose={() => setIsTrendOpen(false)}
        history={history}
      />

      <AddChipsModal
        isOpen={isAddChipsOpen}
        onClose={() => setIsAddChipsOpen(false)}
        onAdd={handleAddBalance}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      <BonusGiftModal
        isOpen={isBonusOpen}
        onClose={() => setIsBonusOpen(false)}
        onClaim={handleAddBalance}
      />

      <OnlinePlayersModal
        isOpen={isPlayersOpen}
        onClose={() => setIsPlayersOpen(false)}
        players={bots}
        user={user}
      />
    </main>
  );

  if (isVirtualRotateActive) {
    return (
      <div className="fixed inset-0 z-50 bg-[#020d12] flex items-center justify-center overflow-hidden">
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
