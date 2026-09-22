import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Users, Trophy, Flame, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';
import { fetchRecentGameHistory, subscribeToGameHistory, GameHistoryRecord } from '../services/gameSync';

interface GlobalLiveGameTickerProps {
  currentGame?: string;
  className?: string;
}

export const GlobalLiveGameTicker: React.FC<GlobalLiveGameTickerProps> = ({ currentGame, className = '' }) => {
  const [historyList, setHistoryList] = useState<GameHistoryRecord[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(() => Math.floor(Math.random() * 45) + 128);

  useEffect(() => {
    // Initial fetch from public.game_history
    fetchRecentGameHistory(15).then((data) => {
      if (data && data.length > 0) {
        setHistoryList(data);
      } else {
        // Seed default live activity
        const mockSeeds: GameHistoryRecord[] = [
          { user_id: '1', game_name: 'crash', bet_amount: 500, multiplier: 3.42, win_amount: 1710, status: 'won', player_name: 'Faisal_K', created_at: new Date(Date.now() - 15000).toISOString() },
          { user_id: '2', game_name: 'dragon_tiger', bet_amount: 1000, multiplier: 2.0, win_amount: 2000, status: 'won', player_name: 'Asad_Pro', created_at: new Date(Date.now() - 32000).toISOString() },
          { user_id: '3', game_name: 'mines', bet_amount: 250, multiplier: 4.15, win_amount: 1037, status: 'won', player_name: 'Zubair_B', created_at: new Date(Date.now() - 48000).toISOString() },
          { user_id: '4', game_name: 'roulette', bet_amount: 800, multiplier: 2.0, win_amount: 1600, status: 'won', player_name: 'Tariq_786', created_at: new Date(Date.now() - 70000).toISOString() },
          { user_id: '5', game_name: 'wingo', bet_amount: 300, multiplier: 9.0, win_amount: 2700, status: 'won', player_name: 'Ali_VIP', created_at: new Date(Date.now() - 95000).toISOString() },
        ];
        setHistoryList(mockSeeds);
      }
    });

    // Real-time subscription to new game bets/wins
    const unsubscribe = subscribeToGameHistory((newRecord) => {
      setHistoryList((prev) => [newRecord, ...prev.slice(0, 19)]);
    });

    // Gentle fluctuation in online count
    const interval = setInterval(() => {
      setOnlineCount((prev) => Math.max(85, prev + (Math.floor(Math.random() * 5) - 2)));
    }, 6000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const formatGameName = (name: string) => {
    switch (name.toLowerCase()) {
      case 'crash': return '🚀 Crash';
      case 'double_crash': return '🚀🚀 2x Crash';
      case 'dragon_tiger': return '🐉 Dragon Tiger';
      case 'mines': return '💣 Mines';
      case 'roulette': return '🎡 Roulette';
      case 'wingo': return '🎯 WinGo';
      default: return name;
    }
  };

  return (
    <div className={`w-full bg-slate-950/80 backdrop-blur-md border border-amber-500/20 rounded-xl px-3 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 overflow-hidden shadow-lg ${className}`}>
      {/* Realtime Live Status & Online Players */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>LIVE SYNCED</span>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-slate-400">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>{onlineCount} Playing</span>
        </div>
      </div>

      {/* Scrolling Live Wins & Bets from Supabase */}
      <div className="flex-1 w-full overflow-hidden flex items-center">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap">
          <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold shrink-0 mr-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Recent Wins:</span>
          </div>

          <AnimatePresence mode="popLayout">
            {historyList.slice(0, 6).map((item, idx) => (
              <motion.div
                key={item.id || `${item.user_id}_${item.game_name}_${idx}`}
                initial={{ opacity: 0, scale: 0.85, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shrink-0"
              >
                <span className="font-semibold text-slate-200">
                  {item.player_name || (item.email ? item.email.split('@')[0] : 'Player')}
                </span>
                <span className="text-slate-500 text-[10px]">won in</span>
                <span className="text-amber-300 font-medium">{formatGameName(item.game_name)}</span>
                <span className="text-emerald-400 font-bold">
                  +Rs {Number(item.win_amount).toLocaleString()}
                </span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                  {Number(item.multiplier).toFixed(2)}x
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
