import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  PlusCircle,
  Award,
  ChevronRight,
  Flame,
  Sparkles,
  Ticket,
  Coins,
  ArrowDownLeft,
  ShieldCheck,
  Zap,
  TrendingUp,
  Copy,
  Check
} from 'lucide-react';
import minesGameCardImg from '../assets/images/mines_game_card_1787164742680.jpg';
import crashGameCardImg from '../assets/images/crash_game_card_1787164753923.jpg';
import dragonTigerCardImg from '../assets/images/dragon_tiger_card_1787165912928.jpg';
import rouletteLogoImg from '../assets/images/roulette_logo.jpeg';
import wingoLotteryLogoImg from '../assets/images/wingo_lottery_logo.jpeg';

interface GamesLobbySectionProps {
  balance: number;
  currentUser?: {
    id?: string;
    full_name?: string;
    email?: string;
  } | null;
  onSelectGame: (game: 'mines' | 'crash' | 'dragon_tiger' | 'double_crash' | 'roulette' | 'wingo') => void;
  onNavigateToDeposit: () => void;
  onNavigateToWithdraw: () => void;
  gameTurnoverRequired?: number;
  gameWagered?: number;
  remainingGameTurnover?: number;
  soundFX?: {
    playClick?: () => void;
  };
}

export const GamesLobbySection: React.FC<GamesLobbySectionProps> = ({
  balance,
  currentUser,
  onSelectGame,
  onNavigateToDeposit,
  onNavigateToWithdraw,
  gameTurnoverRequired = 0,
  gameWagered = 0,
  remainingGameTurnover = 0,
  soundFX
}) => {
  const [copiedId, setCopiedId] = useState(false);

  const handleGameClick = (game: 'mines' | 'crash' | 'dragon_tiger' | 'double_crash' | 'roulette' | 'wingo') => {
    soundFX?.playClick?.();
    onSelectGame(game);
  };

  const displayName = currentUser?.full_name || 'Player';
  const displayId = currentUser?.id ? currentUser.id.substring(0, 7) : '9834144';
  const turnoverPct = gameTurnoverRequired > 0 ? Math.min(100, Math.round((gameWagered / gameTurnoverRequired) * 100)) : 100;

  const handleCopyId = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(displayId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-12 select-none font-sans">
      
      {/* =========================================================================
          CLASSIC VIP CASINO USER DASHBOARD: COMPACT BALANCE, WITHDRAWAL & ADD CASH
          ========================================================================= */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#161a29] via-[#10121d] to-[#0a0c14] border border-amber-500/30 p-3 sm:p-4 shadow-[0_8px_30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,215,0,0.15)] overflow-hidden">
        {/* Ambient Subtle Golden Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Integrated Row: Profile on Left, Compact Chips Balance on Right */}
        <div className="relative z-10 flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
          {/* User Profile */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-[1.5px] shadow">
                <div className="w-full h-full rounded-[10px] bg-[#1a1215] flex items-center justify-center overflow-hidden border border-amber-300/30">
                  <span className="text-base select-none">👑</span>
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#10121d] flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-white" />
              </span>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-white tracking-wide truncate max-w-[110px] sm:max-w-[140px]">
                  {displayName}
                </span>
                <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0 shadow-sm border border-yellow-200">
                  VIP 1
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="flex items-center gap-1 text-[9px] font-mono text-amber-300 font-bold bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 transition cursor-pointer"
                  title="Click to copy ID"
                >
                  <span>ID: {displayId}</span>
                  {copiedId ? (
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-amber-400/80" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Compact Chips Balance Box */}
          <div className="bg-slate-950/80 border border-amber-500/25 rounded-xl px-3 py-1.5 text-right shrink-0 shadow-inner flex flex-col justify-center">
            <span className="text-[8px] sm:text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center justify-end gap-1">
              <Coins className="w-3 h-3 text-amber-400" />
              <span>Chips Balance</span>
            </span>
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-sm sm:text-base font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 drop-shadow-sm">
                Rs {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Turnover Progress Bar (if required) */}
        {gameTurnoverRequired > 0 && remainingGameTurnover > 0 && (
          <div className="relative z-10 my-2 bg-slate-950/90 border border-slate-800 rounded-lg p-2 space-y-1">
            <div className="flex justify-between items-center text-[9px] font-bold">
              <span className="text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-2.5 h-2.5 text-amber-400" />
                Wagering Turnover
              </span>
              <span className="text-amber-300 font-mono">
                Rs {gameWagered.toLocaleString()} / Rs {gameTurnoverRequired.toLocaleString()} ({turnoverPct}%)
              </span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${turnoverPct}%` }}
              />
            </div>
          </div>
        )}

        {/* High-Visibility Action Buttons: ADD CASH & WITHDRAWAL */}
        <div className="relative z-10 grid grid-cols-2 gap-2.5 pt-2.5">
          {/* Button 1: Add Cash / Deposit */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => {
              soundFX?.playClick?.();
              onNavigateToDeposit();
            }}
            className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm py-2.5 px-3 rounded-xl shadow-[0_4px_14px_rgba(245,158,11,0.35)] flex items-center justify-center gap-1.5 transition cursor-pointer border border-yellow-200/60"
          >
            <PlusCircle className="w-4 h-4 fill-slate-950 text-amber-300 stroke-[2.5]" />
            <span className="tracking-wide uppercase font-black">ADD CASH</span>
          </motion.button>

          {/* Button 2: Withdrawal */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => {
              soundFX?.playClick?.();
              onNavigateToWithdraw();
            }}
            className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm py-2.5 px-3 rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5 transition cursor-pointer border border-emerald-300/40"
          >
            <Wallet className="w-4 h-4" />
            <span className="tracking-wide uppercase font-black">WITHDRAW</span>
          </motion.button>
        </div>

      </div>

      {/* =========================================================================
          GAMES SECTION HEADER FOR HIGH CLARITY
          ========================================================================= */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 fill-red-500 text-amber-400 animate-pulse" />
          <h3 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider drop-shadow-sm">
            Hot Casino Games
          </h3>
        </div>
        <span className="text-[10px] font-bold text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          6 Live Games
        </span>
      </div>

      {/* =========================================================================
          CASINO GAMES GRID: DRAGON TIGER, MINES & CRASH
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">

        {/* -------------------------------------------------------------
            1. DRAGON TIGER GAME CARD
            ------------------------------------------------------------- */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleGameClick('dragon_tiger')}
          className="group relative cursor-pointer rounded-2xl p-[3px] bg-gradient-to-b from-[#ffd700] via-[#f59e0b] to-[#b45309] shadow-[0_6px_20px_rgba(245,158,11,0.4),0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.7)] transition-all duration-200"
        >
          {/* Flame "Hot" Badge on Top-Left */}
          <div className="absolute -top-2 -left-2 z-20 flex items-center gap-0.5 bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 text-white px-2 py-0.5 rounded-full shadow-[0_2px_8px_rgba(220,38,38,0.7)] border border-amber-300">
            <Flame className="w-3 h-3 fill-amber-300 text-amber-300 animate-bounce" />
            <span className="text-[9px] font-black italic tracking-wider">Hot</span>
          </div>

          {/* Card Inner Image Wrapper */}
          <div className="w-full aspect-square rounded-[13px] overflow-hidden relative shadow-inner bg-[#2c080e] border border-yellow-200/50 flex items-center justify-center">
            <img
              src={dragonTigerCardImg}
              alt="Dragon Tiger Game"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-white/10 pointer-events-none" />

            {/* Bottom Title Bar with Play CTA */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-[#5c131a]/90 to-transparent pt-4 pb-1.5 px-2 text-center">
              <span className="text-xs font-black tracking-widest text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                DRAGON TIGER
              </span>
              <p className="text-[8px] font-bold text-amber-200/90 tracking-tight">
                Live Casino Table
              </p>
            </div>
          </div>
        </motion.div>

        {/* -------------------------------------------------------------
            2. MINES GAME CARD
            ------------------------------------------------------------- */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleGameClick('mines')}
          className="group relative cursor-pointer rounded-2xl p-[3px] bg-gradient-to-b from-[#ffd700] via-[#f59e0b] to-[#b45309] shadow-[0_6px_20px_rgba(245,158,11,0.4),0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.7)] transition-all duration-200"
        >
          {/* Flame "Hot" Badge on Top-Left */}
          <div className="absolute -top-2 -left-2 z-20 flex items-center gap-0.5 bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 text-white px-2 py-0.5 rounded-full shadow-[0_2px_8px_rgba(220,38,38,0.7)] border border-amber-300">
            <Flame className="w-3 h-3 fill-amber-300 text-amber-300 animate-bounce" />
            <span className="text-[9px] font-black italic tracking-wider">Hot</span>
          </div>

          {/* Card Inner Image Wrapper */}
          <div className="w-full aspect-square rounded-[13px] overflow-hidden relative shadow-inner bg-[#2c1308] border border-yellow-200/50 flex items-center justify-center">
            <img
              src={minesGameCardImg}
              alt="Mines Game"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10 pointer-events-none" />

            {/* Bottom Title Bar with Play CTA */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-[#6b1419]/90 to-transparent pt-4 pb-1.5 px-2 text-center">
              <span className="text-xs font-black tracking-widest text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                MINES 5x5
              </span>
              <p className="text-[8px] font-bold text-amber-200/90 tracking-tight">
                Tap to Play
              </p>
            </div>
          </div>
        </motion.div>

        {/* -------------------------------------------------------------
            3. AVIATOR CRASH GAME CARD (CLASSIC)
            ------------------------------------------------------------- */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleGameClick('crash')}
          className="group relative cursor-pointer rounded-2xl p-[3px] bg-gradient-to-b from-[#ffd700] via-[#f59e0b] to-[#b45309] shadow-[0_6px_20px_rgba(245,158,11,0.4),0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.7)] transition-all duration-200"
        >
          {/* Flame "Classic" Badge on Top-Left */}
          <div className="absolute -top-2 -left-2 z-20 flex items-center gap-0.5 bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 text-white px-2 py-0.5 rounded-full shadow-[0_2px_8px_rgba(220,38,38,0.7)] border border-amber-300">
            <Flame className="w-3 h-3 fill-amber-300 text-amber-300 animate-bounce" />
            <span className="text-[9px] font-black italic tracking-wider">Classic</span>
          </div>

          {/* Card Inner Image Wrapper */}
          <div className="w-full aspect-square rounded-[13px] overflow-hidden relative shadow-inner bg-[#20051e] border border-yellow-200/50 flex items-center justify-center">
            <img
              src={crashGameCardImg}
              alt="Aviator Crash Game"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10 pointer-events-none" />

            {/* Bottom Title Bar with Play CTA */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-[#6b1419]/90 to-transparent pt-4 pb-1.5 px-2 text-center">
              <span className="text-xs font-black tracking-widest text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                AVIATOR CRASH
              </span>
              <p className="text-[8px] font-bold text-amber-200/90 tracking-tight">
                Classic Mode • Tap to Play
              </p>
            </div>
          </div>
        </motion.div>

        {/* -------------------------------------------------------------
            4. DOUBLE CRASH GAME CARD (2X DUAL BETS)
            ------------------------------------------------------------- */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleGameClick('double_crash')}
          className="group relative cursor-pointer rounded-2xl p-[3px] bg-gradient-to-b from-[#ec4899] via-[#8b5cf6] to-[#3b82f6] shadow-[0_6px_20px_rgba(139,92,246,0.4),0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_8px_25px_rgba(139,92,246,0.7)] transition-all duration-200"
        >
          {/* Flame "2X BETS" Badge on Top-Left */}
          <div className="absolute -top-2 -left-2 z-20 flex items-center gap-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 text-white px-2 py-0.5 rounded-full shadow-[0_2px_8px_rgba(236,72,153,0.8)] border border-pink-300">
            <Sparkles className="w-3 h-3 fill-yellow-300 text-yellow-300 animate-pulse" />
            <span className="text-[9px] font-black italic tracking-wider">2X BETS</span>
          </div>

          {/* Card Inner Image Wrapper */}
          <div className="w-full aspect-square rounded-[13px] overflow-hidden relative shadow-inner bg-[#1a052e] border border-pink-300/50 flex items-center justify-center">
            <img
              src={crashGameCardImg}
              alt="Double Crash Game"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 brightness-110 hue-rotate-15"
            />
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-purple-950/20 to-white/10 pointer-events-none" />

            {/* Bottom Title Bar with Play CTA */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-[#3b0764]/90 to-transparent pt-4 pb-1.5 px-2 text-center">
              <span className="text-xs font-black tracking-widest text-pink-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                DOUBLE CRASH
              </span>
              <p className="text-[8px] font-bold text-purple-200/90 tracking-tight">
                Dual Betting • Tap to Play
              </p>
            </div>
          </div>
        </motion.div>

        {/* -------------------------------------------------------------
            5. EUROPEAN ROULETTE GAME CARD
            ------------------------------------------------------------- */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleGameClick('roulette')}
          data-testid="card-game-roulette"
          className="group relative cursor-pointer rounded-2xl p-[3px] bg-gradient-to-b from-[#f8d66d] via-[#d4af37] to-[#7c4f12] shadow-[0_6px_20px_rgba(212,175,55,0.4),0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_8px_25px_rgba(212,175,55,0.7)] transition-all duration-200"
        >
          <div className="w-full aspect-square rounded-[13px] overflow-hidden relative shadow-inner bg-[#3b0715] border border-yellow-200/50 flex items-center justify-center">
            <img
              src={rouletteLogoImg}
              alt="Roulette"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-white/10 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-[#5c131a]/90 to-transparent pt-10 pb-1.5 px-2 text-center">
              <span className="text-xs font-black tracking-widest text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                ROULETTE
              </span>
              <p className="text-[8px] font-bold text-amber-200/90 tracking-tight">
                European Table
              </p>
            </div>
          </div>
        </motion.div>

        {/* -------------------------------------------------------------
            6. WINGO LOTTERY GAME CARD
            ------------------------------------------------------------- */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleGameClick('wingo')}
          data-testid="card-game-wingo"
          className="group relative cursor-pointer rounded-2xl p-[3px] bg-gradient-to-b from-[#f8d66d] via-[#d4af37] to-[#7c4f12] shadow-[0_6px_20px_rgba(212,175,55,0.4),0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_8px_25px_rgba(212,175,55,0.7)] transition-all duration-200"
        >
          <div className="w-full aspect-square rounded-[13px] overflow-hidden relative shadow-inner bg-[#3b0715] border border-yellow-200/50 flex items-center justify-center">
            <img
              src={wingoLotteryLogoImg}
              alt="WinGo Lottery"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-white/10 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-[#064752]/90 to-transparent pt-10 pb-1.5 px-2 text-center">
              <span className="text-xs font-black tracking-widest text-cyan-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                WINGO LOTTERY
              </span>
              <p className="text-[8px] font-bold text-cyan-100/90 tracking-tight">
                Lucky Ball Table
              </p>
            </div>
          </div>
        </motion.div>

      </div>

      {/* =========================================================================
          BOTTOM QUICK PROMOTIONS STRIP
          ========================================================================= */}
      <div className="bg-gradient-to-r from-[#2c0d10] via-[#3d1317] to-[#2c0d10] p-3 rounded-2xl border border-[#6b252a] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-amber-100">Daily Spin & Bonus</h4>
            <p className="text-[9px] text-amber-300/70">Win daily cash rebate rewards</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            soundFX?.playClick?.();
            onNavigateToDeposit();
          }}
          className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow active:scale-95 transition cursor-pointer flex items-center gap-1"
        >
          <span>Claim</span>
          <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
        </button>
      </div>

    </div>
  );
};
