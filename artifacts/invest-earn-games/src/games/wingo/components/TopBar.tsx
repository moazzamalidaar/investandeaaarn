import React from 'react';
import { HistoryItem } from '../types';
import { BallIcon } from './BallIcon';
import { ChevronLeft, ShoppingCart, TrendingUp, Smartphone } from 'lucide-react';

interface TopBarProps {
  history: HistoryItem[];
  onBack?: () => void;
  onOpenTrend: () => void;
  onOpenAddChips: () => void;
  onOpenBonus: () => void;
  onOpenSettings: () => void;
  onToggleRotate?: () => void;
  isLandscape?: boolean;
  isForcedRotate?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  history,
  onBack,
  onOpenTrend,
  onOpenAddChips,
  onOpenBonus,
  onOpenSettings,
  onToggleRotate,
  isLandscape,
  isForcedRotate,
}) => {
  // Show up to the last 12 winning balls
  const recentBalls = history.slice(-12);

  return (
    <div className="relative z-30 flex items-center justify-between w-full max-w-6xl mx-auto px-2 sm:px-4 pt-1 sm:pt-2 pb-0.5 select-none">
      
      {/* LEFT SECTION: Back Button, Win Chips Rs15, and Mini Gumball Machine */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        
        {/* Circular Back / Exit Button */}
        <button
          type="button"
          onClick={onBack ?? onOpenSettings}
          className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-red-600 via-rose-700 to-red-950 border-2 border-yellow-300 shadow-[0_4px_8px_rgba(0,0,0,0.7),inset_0_2px_4px_rgba(255,255,255,0.6)] flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer"
          title={onBack ? "Back to games lobby" : "Back"}
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3] -ml-0.5 text-yellow-300" />
        </button>

        {/* Win Chips Rs15 Badge Button */}
        <button
          type="button"
          onClick={onOpenBonus}
          className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-red-600 via-rose-800 to-red-950 border-2 border-yellow-300 shadow-[0_4px_10px_rgba(0,0,0,0.8),inset_0_2px_3px_rgba(255,255,255,0.7)] flex flex-col items-center justify-center active:scale-95 transition-transform group cursor-pointer"
          title="Win Free Chips Rs15"
        >
          <span className="text-[7px] sm:text-[8px] font-black text-yellow-300 leading-tight uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
            Win
          </span>
          <span className="text-[6px] sm:text-[7px] font-extrabold text-white leading-none -mt-0.5">
            Chips
          </span>
          <span className="text-[7px] sm:text-[8px] font-black text-amber-300 leading-tight">
            Rs15
          </span>
        </button>

        {/* Decorative Mini Gumball Lottery Machine Icon matching Screenshot 23 */}
        <div className="hidden xs:flex flex-col items-center justify-center shrink-0">
          <div className="w-6 h-7 sm:w-7 sm:h-8 rounded-md bg-gradient-to-b from-[#164e63] via-[#083344] to-[#021822] border border-amber-400 shadow-md flex flex-col items-center justify-between p-0.5">
            {/* Top copper cap */}
            <div className="w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-t-sm shadow-xs" />
            {/* Mini colored balls inside glass */}
            <div className="flex gap-0.5 my-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs" />
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-xs" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-xs" />
            </div>
            {/* Base copper stand */}
            <div className="w-full h-1.5 bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500 rounded-b-sm shadow-xs" />
          </div>
        </div>
      </div>

      {/* CENTER SECTION: Winning Ball History Ribbon & Trend Button with "NEW" Badge */}
      <div className="flex items-center mx-1 sm:mx-2 max-w-[55%] sm:max-w-none overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 bg-[#021f26]/95 backdrop-blur-md border border-cyan-400/50 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.2)]">
          {recentBalls.map((item, idx) => (
            <div
              key={`${item.roundId}-${idx}`}
              className="transform transition-transform hover:scale-115"
            >
              <BallIcon number={item.number} color={item.color} size="sm" />
            </div>
          ))}

          {/* Trend Chart Icon Button with "NEW" pill badge */}
          <div className="relative ml-0.5 sm:ml-1 shrink-0">
            <span className="absolute -top-2 -right-1 bg-sky-500 text-white font-black text-[6px] sm:text-[7px] px-1 py-0.2 rounded-full uppercase shadow tracking-tight">
              NEW
            </span>
            <button
              type="button"
              onClick={onOpenTrend}
              className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 rounded-full bg-[#042d38] hover:bg-[#073d4c] border border-cyan-400/60 flex items-center justify-center text-yellow-400 hover:text-yellow-300 transition-all shadow-inner active:scale-90 cursor-pointer"
              title="Trend Analysis"
            >
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: Big 3D "ADD" Button & Diamond Settings Button */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        
        {/* ADD Button with 3D text and shopping cart */}
        <button
          type="button"
          onClick={onOpenAddChips}
          className="relative flex items-center gap-1 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 border-2 border-yellow-300 rounded-xl px-2.5 sm:px-3.5 py-1 sm:py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_2px_3px_rgba(255,255,255,0.7)] active:scale-95 transition-all group cursor-pointer"
          title="Add Cash / Chips"
        >
          <span className="text-xs sm:text-base font-black italic tracking-wider text-yellow-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
            ADD
          </span>
          {/* Shopping Cart Icon with Gold Rim */}
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 shadow-inner">
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          </div>
        </button>

        {/* Rotate Screen / Landscape Mode Button */}
        {onToggleRotate && (
          <button
            type="button"
            onClick={onToggleRotate}
            className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 shadow-[0_4px_8px_rgba(0,0,0,0.7)] flex items-center justify-center active:scale-95 transition-transform cursor-pointer ${
              isLandscape || isForcedRotate
                ? 'bg-gradient-to-b from-amber-500 via-amber-600 to-yellow-700 border-yellow-200 text-yellow-100 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                : 'bg-gradient-to-b from-red-600 via-rose-700 to-red-950 border-yellow-300 text-yellow-300'
            }`}
            title="Rotate Screen / Landscape Mode"
          >
            <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 rotate-90" />
          </button>
        )}

        {/* Diamond Settings / Menu Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-red-600 via-rose-700 to-red-950 border-2 border-yellow-300 shadow-[0_4px_8px_rgba(0,0,0,0.7),inset_0_2px_4px_rgba(255,255,255,0.6)] flex items-center justify-center text-yellow-300 active:scale-95 transition-transform cursor-pointer"
          title="Settings"
        >
          {/* 4 Golden Diamond Tiles in a 2x2 grid */}
          <div className="grid grid-cols-2 gap-0.5">
            <div className="w-1.5 h-1.5 bg-yellow-300 rotate-45 shadow-xs" />
            <div className="w-1.5 h-1.5 bg-yellow-300 rotate-45 shadow-xs" />
            <div className="w-1.5 h-1.5 bg-yellow-300 rotate-45 shadow-xs" />
            <div className="w-1.5 h-1.5 bg-yellow-300 rotate-45 shadow-xs" />
          </div>
        </button>
      </div>
    </div>
  );
};
