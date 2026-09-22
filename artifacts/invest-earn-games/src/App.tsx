import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { motion, AnimatePresence } from 'framer-motion';
import { MechPricing3DSection } from './components/MechPricing3DSection';
import { CrashGameSection } from './components/CrashGameSection';
import { DoubleCrashGameSection } from './components/DoubleCrashGameSection';
import { MinesGameSection } from './components/MinesGameSection';
import { DragonTigerGameSection } from './components/DragonTigerGameSection';
import { GamesLobbySection } from './components/GamesLobbySection';
import RouletteGame from './games/roulette/App';
import WinGoGame from './games/wingo/App';
import { AddCashDepositPanel, DEPOSIT_TIERS } from './components/AddCashDepositPanel';
import { PlanDepositPanel } from './components/PlanDepositPanel';
import {
  User,
  Lock,
  Mail,
  Gift,
  ArrowRight,
  Sparkles,
  KeyRound,
  TrendingUp,
  Volume2,
  VolumeX,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Layers,
  Home,
  CreditCard,
  Wallet,
  Users,
  LogOut,
  Copy,
  Share2,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  ChevronRight,
  Award,
  PlusCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Plus,
  Clock,
  Rocket,
  Gamepad2,
  X,
  ArrowRightLeft,
  Save,
  RotateCw,
  Trash2,
} from 'lucide-react';
import {
  fetchCloudCrashConfig,
  saveCloudCrashConfig,
  getSynchronizedCrashRound,
  CloudCrashConfig
} from './services/gameSync';

/* ==========================================================================
   1. TYPES & DATA STRUCTURES
   ========================================================================== */
interface Plan {
  n: string;
  i: number;
  d: number;
  t: number;
  c: string;
  b: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  password?: string;
  referred_by?: string;
  force_unlocked?: boolean;
}

interface Transaction {
  id: string | number;
  user_id: string;
  type: 'Deposit' | 'Withdraw' | 'Profit' | 'ReferralBonus';
  status: 'Pending' | 'Approved' | 'Rejected';
  amount: number;
  planName?: string;
  dailyProfit?: number;
  proof_url?: string;
  trx_id?: string;
  name?: string;
  method?: string;
  number?: string;
  referred_from?: string;
  created_at?: string;
  category?: 'game' | 'plan';
  bonusChips?: number;
}

interface ReferredMemberDetail {
  id: string;
  fullName: string;
  email: string;
  joinedDate: string;
  isActive: boolean;
  depositCount: number;
  totalDeposited: number;
  commissionEarned: number;
  activePlanNames: string[];
}

const PLANS: Plan[] = [
  { n: "Plan 500", i: 500, d: 40, t: 1200, c: "text-blue-400", b: "border-blue-500/30" },
  { n: "Plan 1,000", i: 1000, d: 90, t: 2700, c: "text-slate-300", b: "border-slate-500/30" },
  { n: "Plan 2,000", i: 2000, d: 200, t: 6000, c: "text-yellow-500", b: "border-yellow-500/30" },
  { n: "Plan 3,000", i: 3000, d: 330, t: 9900, c: "text-purple-400", b: "border-purple-400/30" },
  { n: "Plan 5,000", i: 5000, d: 600, t: 18000, c: "text-red-500", b: "border-red-500/30" },
  { n: "Plan 10,000", i: 10000, d: 1300, t: 39000, c: "text-emerald-400", b: "border-emerald-500/30" },
  { n: "Plan 20,000", i: 20000, d: 2800, t: 84000, c: "text-orange-400", b: "border-orange-500/30" },
  { n: "Plan 50,000", i: 50000, d: 7500, t: 225000, c: "text-pink-400", b: "border-pink-400/30" },
  { n: "Plan 100,000", i: 100000, d: 20000, t: 600000, c: "text-cyan-400", b: "border-cyan-400/30" }
];

/* ==========================================================================
   2. SUPABASE INITIALIZATION
   ========================================================================== */
const SUPABASE_URL = "https://rmprouugsnemwkbjgvvs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcHJvdXVnc25lbXdrYmpndnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTYyMDEsImV4cCI6MjA5NzM3MjIwMX0.2d976jNh5ncgT1T9fJpPcjeb5SIO-vZHyk8pQBxYhPs";
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================================================
   3. WEB AUDIO SYNTHESIZER ENGINE
   ========================================================================== */
class SoundFXEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public playAirRelease() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(600, now + 0.12);
      filter.Q.value = 1.5;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.15);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  public playMechTransform() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const servoOsc = this.ctx.createOscillator();
      const servoGain = this.ctx.createGain();

      servoOsc.type = 'sawtooth';
      servoOsc.frequency.setValueAtTime(240, now);
      servoOsc.frequency.exponentialRampToValueAtTime(720, now + 0.15);
      servoOsc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(2800, now + 0.18);

      servoGain.gain.setValueAtTime(0.001, now);
      servoGain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      servoGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      servoOsc.connect(filter);
      filter.connect(servoGain);
      servoGain.connect(this.ctx.destination);

      servoOsc.start(now);
      servoOsc.stop(now + 0.4);
      this.playAirRelease();
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  public playClick() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(2200, now);
      osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.015);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

      osc1.connect(gain);
      gain.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.02);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  public playPowerUp() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3);

      osc2.frequency.setValueAtTime(330, now);
      osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.3);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.38);
      osc2.stop(now + 0.38);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  public playTabSwipe() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  public playSuccess() {
    this.playPowerUp();
  }
}

const soundFX = new SoundFXEngine();

/* ==========================================================================
   4. INLINED AUTH SCREEN COMPONENT
   ========================================================================== */
interface AuthScreenProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  fullName: string;
  setFullName: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  referredByCode: string;
  setReferredByCode: (val: string) => void;
  authMode: 'login' | 'signup';
  setAuthMode: (mode: 'login' | 'signup') => void;
  handleAuth: () => void;
}

function AuthScreen({
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
  confirmPassword,
  setConfirmPassword,
  referredByCode,
  setReferredByCode,
  authMode,
  setAuthMode,
  handleAuth,
}: AuthScreenProps) {
  const [isMuted, setIsMuted] = useState(false);

  const toggleSound = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 relative overflow-hidden font-sans">
      <button
        type="button"
        onClick={toggleSound}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition backdrop-blur-md cursor-pointer"
        title="Toggle Sound Effects"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-blue-400" />}
      </button>

      <div className="w-full max-w-sm mx-auto my-auto space-y-6 relative z-10 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-3"
        >
          {/* Modern Ultra-Sleek IE Logo Emblem */}
          <div 
            onClick={() => soundFX.playClick()}
            className="flex justify-center mb-3 relative cursor-pointer group select-none"
            title="Invest Earn IE Emblem"
          >
            {/* Multi-layered Ambient Light Glow */}
            <div className="absolute w-28 h-28 rounded-full bg-gradient-to-r from-emerald-500/30 via-teal-400/25 to-cyan-500/30 blur-2xl animate-pulse pointer-events-none" />
            
            {/* Modern High-Tech Monogram Badge */}
            <div className="w-24 h-24 rounded-3xl p-0.5 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 shadow-2xl shadow-emerald-500/20 relative z-10 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-slate-950/95 rounded-[22px] flex flex-col items-center justify-center relative overflow-hidden border border-white/10 backdrop-blur-xl">
                {/* Subtle Background Geometry & Lighting */}
                <div className="absolute -top-6 -right-6 w-12 h-12 bg-emerald-500/20 rounded-full blur-md pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-cyan-500/20 rounded-full blur-md pointer-events-none" />
                
                {/* Stylized Monogram Text */}
                <span className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-tr from-emerald-300 via-teal-100 to-cyan-300 drop-shadow-[0_2px_12px_rgba(16,185,129,0.4)]">
                  IE
                </span>
                
                {/* Subtitle / Tag Badge */}
                <span className="text-[8px] font-black tracking-widest text-emerald-400/90 uppercase mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Yield
                </span>
              </div>
            </div>
          </div>

          {/* Heavy Falling Physics Title Words */}
          <h1 className="text-3xl sm:text-4xl font-black tracking-wider flex justify-center items-center gap-2.5 overflow-hidden py-1">
            <span className="inline-block text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.7)] animate-fall-word-1">
              Invest
            </span>
            <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 drop-shadow-[0_0_20px_rgba(212,175,55,0.8)] animate-fall-word-2">
              Earn
            </span>
          </h1>

          <p className="text-xs text-slate-300/90 font-medium tracking-wide uppercase">
            Heavy Transaction Platform
          </p>
        </motion.div>

        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`relative overflow-hidden rounded-3xl p-5 shadow-2xl backdrop-blur-xl border transition-all duration-500 space-y-4 ${
            authMode === 'signup'
              ? 'bg-gradient-to-b from-slate-900/95 via-amber-950/20 to-slate-950/95 border-amber-400/40 shadow-amber-500/10'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          {/* Ambient Light Orbs on Transformation */}
          {authMode === 'signup' && (
            <>
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
            </>
          )}

          {/* Interactive Morphing Tab Switcher */}
          <div className="flex bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800/80 relative shadow-inner">
            <button
              type="button"
              onClick={() => {
                soundFX.playTabSwipe();
                setAuthMode('login');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all relative z-10 cursor-pointer ${
                authMode === 'login' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              LOG IN
              {authMode === 'login' && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl -z-10 shadow-lg shadow-blue-500/30"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playTabSwipe();
                setAuthMode('signup');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all relative z-10 cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'signup' ? 'text-slate-950' : 'text-amber-400/90 hover:text-amber-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>CREATE ACCOUNT</span>
              {authMode === 'signup' && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 rounded-xl -z-10 shadow-lg shadow-amber-500/40"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={authMode}
              initial={{ opacity: 0, y: 15, scale: 0.98, rotateX: -5 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: -15, scale: 0.98, rotateX: 5 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              onSubmit={(e) => {
                e.preventDefault();
                soundFX.playClick();
                handleAuth();
              }}
              className="space-y-3"
            >
              {/* Special Agent Welcome Banner on Create Account Transformation */}
              {authMode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-cyan-500/15 border border-amber-400/30 flex items-center gap-3 relative overflow-hidden"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                      Instant Agent Unlock
                    </p>
                    <p className="text-[11px] font-bold text-white leading-snug">
                      Unlock 20% Direct Referral Bonus & High-Yield Pools
                    </p>
                  </div>
                </motion.div>
              )}

              {authMode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-slate-950 border border-amber-500/30 focus:border-amber-400 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-600 outline-none transition shadow-sm"
                    />
                  </div>
                </motion.div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Email Address</label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute left-3.5 top-3 ${authMode === 'signup' ? 'text-amber-400/80' : 'text-slate-500'}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full bg-slate-950 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-600 outline-none transition ${
                      authMode === 'signup'
                        ? 'border border-amber-500/30 focus:border-amber-400'
                        : 'border border-slate-800 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Password</label>
                <div className="relative">
                  <Lock className={`w-4 h-4 absolute left-3.5 top-3 ${authMode === 'signup' ? 'text-amber-400/80' : 'text-slate-500'}`} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full bg-slate-950 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-600 outline-none transition ${
                      authMode === 'signup'
                        ? 'border border-amber-500/30 focus:border-amber-400'
                        : 'border border-slate-800 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              {authMode === 'signup' && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Confirm Password</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-amber-500/30 focus:border-amber-400 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-600 outline-none transition"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Referral Code (Optional)</label>
                    <div className="relative">
                      <Gift className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={referredByCode}
                        onChange={(e) => setReferredByCode(e.target.value)}
                        placeholder="Enter invite code"
                        className="w-full bg-slate-950 border border-amber-500/30 focus:border-amber-400 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-600 outline-none transition"
                      />
                    </div>
                  </motion.div>
                </>
              )}

              <button
                type="submit"
                className={`w-full font-black py-3.5 rounded-xl text-xs shadow-xl transition active:scale-95 flex items-center justify-center gap-2 mt-4 cursor-pointer relative overflow-hidden ${
                  authMode === 'signup'
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-300 text-slate-950 shadow-amber-500/30 hover:brightness-105'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500'
                }`}
              >
                {/* Dynamic Shimmer Beam on Signup button */}
                {authMode === 'signup' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer pointer-events-none" />
                )}
                {authMode === 'signup' ? <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950/20" /> : null}
                <span>{authMode === 'login' ? 'SIGN IN TO PORTAL' : 'COMPLETE REGISTRATION'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.form>
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="text-center py-2 text-[10px] text-slate-500">
        Invest Earn © 2026. Secure Encryption & Automated Yield Execution.
      </div>
    </div>
  );
}

/* ==========================================================================
   5. MAIN APP COMPONENT
   ========================================================================== */
export default function App() {
  const [screen, setScreen] = useState<'login' | 'dashboard' | 'plans' | 'deposit' | 'game_deposit' | 'withdraw' | 'referral' | 'crash' | 'admin'>('login');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeGameTab, setActiveGameTab] = useState<'lobby' | 'crash' | 'double_crash' | 'mines' | 'dragon_tiger' | 'roulette' | 'wingo'>('lobby');

  // Game Gameplay Wagering (4x Turnover) State
  const [gameWagered, setGameWagered] = useState<number>(0);

  // Crash Game Predictions State
  const [crashPredictions, setCrashPredictions] = useState<number[]>(() => {
    const saved = localStorage.getItem('invest_earn_crash_predictions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [2.10, 1.45, 5.20, 1.85, 3.42, 1.12, 12.50, 2.05, 10.00, 4.20];
  });

  useEffect(() => {
    localStorage.setItem('invest_earn_crash_predictions', JSON.stringify(crashPredictions));
  }, [crashPredictions]);

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referredByCode, setReferredByCode] = useState('');

  // Current logged in user profile
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  // Selected plan for deposit
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; amount: number; dailyProfit: number }>({ name: 'Plan 1,000', amount: 1000, dailyProfit: 90 });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  // Withdraw state
  const [wdName, setWdName] = useState('');
  const [wdMethod, setWdMethod] = useState('EasyPaisa');
  const [wdNumber, setWdNumber] = useState('');
  const [wdAmount, setWdAmount] = useState('');

  // Separate Balances: Plan (Investment/ROI) vs Game (Casino Chips)
  const [planBalance, setPlanBalance] = useState<number>(0);
  const [gameBalance, setGameBalance] = useState<number>(0);
  const balance = planBalance + gameBalance; // Total Combined Portfolio Balance

  // Withdraw Source: 'plan' (ROI/Referral commissions) vs 'game' (Gaming chips)
  const [wdSource, setWdSource] = useState<'plan' | 'game'>('plan');

  // Inter-Wallet Transfer State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferDirection, setTransferDirection] = useState<'plan_to_game' | 'game_to_plan'>('plan_to_game');
  const [transferAmount, setTransferAmount] = useState<string>('');

  const [totalWithdrawn, setTotalWithdrawn] = useState<number>(0);
  const [activePlansCount, setActivePlansCount] = useState<number>(0);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [txFilter, setTxFilter] = useState<'all' | 'deposit' | 'profit' | 'withdraw'>('all');

  // Referral system state
  const [totalReferralsCount, setTotalReferralsCount] = useState<number>(0);
  const [activeReferralsCount, setActiveReferralsCount] = useState<number>(0);
  const [lockedReferralBonus, setLockedReferralBonus] = useState<number>(0);
  const [isForceUnlocked, setIsForceUnlocked] = useState<boolean>(false);
  const [referralLogs, setReferralLogs] = useState<{ id: string; friendName: string; note: string; bonus: number; date: string; status: string }[]>([]);
  const [referredMembersDetail, setReferredMembersDetail] = useState<ReferredMemberDetail[]>([]);
  const [memberFilter, setMemberFilter] = useState<'all' | 'active' | 'non-active'>('all');
  const [referralSubTab, setReferralSubTab] = useState<'network' | 'logs'>('network');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // 4x Wagering calculations for game deposits
  const totalApprovedGameDeposits = userTransactions
    .filter(t => (t.type || '').toLowerCase() === 'deposit' && (t.status || '').toLowerCase() === 'approved' && ((t.category === 'game') || (t.planName || '').toLowerCase().includes('game') || (t.planName || '').toLowerCase().includes('chips')))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const gameTurnoverRequired = totalApprovedGameDeposits * 4;
  const remainingGameTurnover = Math.max(0, gameTurnoverRequired - gameWagered);
  const turnoverProgressPct = gameTurnoverRequired > 0 ? Math.min(100, Math.round((gameWagered / gameTurnoverRequired) * 100)) : 100;

  // Admin state
  const [adminTab, setAdminTab] = useState<'members' | 'profit_buy' | 'deposits' | 'withdrawals' | 'crash_predictor'>('members');
  const [adminDepositFilter, setAdminDepositFilter] = useState<'all' | 'game' | 'plan'>('all');
  const [adminDepositStatusFilter, setAdminDepositStatusFilter] = useState<'pending' | 'all'>('pending');
  const [adminProofPreviewModal, setAdminProofPreviewModal] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<Profile[]>([]);
  const [adminTransactions, setAdminTransactions] = useState<Transaction[]>([]);
  const [adminAgentStats, setAdminAgentStats] = useState<{
    profile: Profile;
    totalRefs: number;
    activeRefs: number;
    lockedBonus: number;
    isUnlocked: boolean;
  }[]>([]);
  const [manualSelectedUser, setManualSelectedUser] = useState<string>('');
  const [manualSelectedPlanName, setManualSelectedPlanName] = useState<string>(PLANS[0].n);
  const [profitModalUser, setProfitModalUser] = useState<Profile | null>(null);
  const [manualProfitAmount, setManualProfitAmount] = useState<string>('');
  const [manualProfitNote, setManualProfitNote] = useState<string>('Daily Profit');
  const [manualProfitTarget, setManualProfitTarget] = useState<'plan' | 'game'>('plan');

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2800);
  };

  const clearToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(null);
    toastTimerRef.current = null;
  };

  // Cloud Crash Predictions Synchronization State
  const [isSavingPredictions, setIsSavingPredictions] = useState<boolean>(false);
  const [lastSavedCloudTime, setLastSavedCloudTime] = useState<number | null>(null);
  const [liveRoundInfo, setLiveRoundInfo] = useState(() => getSynchronizedCrashRound());

  // Keep live round info fresh for the admin panel & game components
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveRoundInfo(getSynchronizedCrashRound());
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial crash predictions from Supabase and listen for cloud updates
  useEffect(() => {
    fetchCloudCrashConfig().then((cfg) => {
      if (cfg && Array.isArray(cfg.predictions) && cfg.predictions.length > 0) {
        setCrashPredictions(cfg.predictions);
        if (cfg.updatedAt) setLastSavedCloudTime(cfg.updatedAt);
      }
    });

    const poll = setInterval(() => {
      fetchCloudCrashConfig().then((cfg) => {
        if (cfg && Array.isArray(cfg.predictions) && cfg.predictions.length > 0) {
          // If admin tab isn't open or active, keep crashPredictions in sync
          if (adminTab !== 'crash_predictor') {
            setCrashPredictions(cfg.predictions);
            if (cfg.updatedAt) setLastSavedCloudTime(cfg.updatedAt);
          }
        }
      });
    }, 4000);

    return () => clearInterval(poll);
  }, [adminTab]);

  const handleSavePredictionsToCloud = async (customPreds?: number[]) => {
    setIsSavingPredictions(true);
    try {
      const predsToSave = (customPreds || crashPredictions).map(v => {
        const num = parseFloat(String(v));
        return isNaN(num) || num < 1.01 ? 1.01 : Number(num.toFixed(2));
      });

      const currentRound = getSynchronizedCrashRound();
      // If waiting, target starts at current round; if already running or crashed, target starts at next round
      const startRound = currentRound.phase === 'WAITING' ? currentRound.roundIndex : currentRound.roundIndex + 1;

      const ok = await saveCloudCrashConfig({
        baseRoundIndex: startRound,
        predictions: predsToSave,
        updatedAt: Date.now()
      });

      if (ok) {
        setCrashPredictions(predsToSave);
        setLastSavedCloudTime(Date.now());
        showToast(`✅ ${predsToSave.length} Predictions saved & applied to all users!`);
      } else {
        showToast('❌ Could not save to cloud. Please check network.');
      }
    } catch (e) {
      console.error(e);
      showToast('❌ Failed to save predictions to cloud.');
    } finally {
      setIsSavingPredictions(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferredByCode(ref);
      showToast(`Referral link detected! Code: ${ref.substring(0, 8)}...`);
    }

    const savedUid = localStorage.getItem('user_id');
    const savedAdmin = localStorage.getItem('admin_logged_in');

    if (savedAdmin === 'true') {
      setScreen('admin');
      loadAdminData();
    } else if (savedUid) {
      loadUserProfile(savedUid);
      setScreen('dashboard');
    }
  }, []);

  useEffect(() => {
    if (screen === 'dashboard' || screen === 'crash' || screen === 'game_deposit' || screen === 'withdraw' || screen === 'plans') {
      loadDashboardData();
    } else if (screen === 'referral') {
      loadReferralData();
    } else if (screen === 'admin') {
      loadAdminData();
    }
  }, [screen]);

  // Real-time synchronization across browser tabs (e.g. Admin approves in one tab/view)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const uid = localStorage.getItem('user_id');
      if (!uid) return;
      if (
        e.key === `tx_${uid}` ||
        e.key === 'global_transactions' ||
        e.key === `game_chips_${uid}` ||
        e.key === 'local_users'
      ) {
        loadDashboardData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadUserProfile = async (uid: string) => {
    try {
      const { data } = await _supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (data) {
        setCurrentUser(data);
        setIsForceUnlocked(!!data.force_unlocked);
      } else {
        const localProfStr = localStorage.getItem(`profile_${uid}`);
        if (localProfStr) {
          const prof = JSON.parse(localProfStr);
          setCurrentUser(prof);
          setIsForceUnlocked(!!prof.force_unlocked);
        } else {
          const mockUser: Profile = { id: uid, full_name: 'Investor User', email: 'user@investearn.com' };
          setCurrentUser(mockUser);
        }
      }
    } catch {
      const mockUser: Profile = { id: uid, full_name: 'Investor User', email: 'user@investearn.com' };
      setCurrentUser(mockUser);
    }
  };

  const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleAuth = async () => {
    if (authMode === 'login') {
      if (email.trim() === 'lucifer@site.com' && password === '28151122') {
        localStorage.setItem('admin_logged_in', 'true');
        setScreen('admin');
        showToast('Welcome Admin!');
        return;
      }

      if (!email || !password) {
        showToast('Please enter email and password.');
        return;
      }

      try {
        const { data, error } = await _supabase.from('profiles').select('*').eq('email', email.trim()).maybeSingle();
        
        if (error || !data) {
          const localUsersStr = localStorage.getItem('local_users') || '[]';
          const localUsers: Profile[] = JSON.parse(localUsersStr);
          const found = localUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
          
          if (found) {
            const match = await bcrypt.compare(password, found.password || '');
            if (match) {
              localStorage.setItem('user_id', found.id);
              setCurrentUser(found);
              setIsForceUnlocked(!!found.force_unlocked);
              setScreen('dashboard');
              showToast('Logged in successfully!');
              return;
            }
          }
          showToast('User not found or incorrect credentials!');
          return;
        }

        const match = await bcrypt.compare(password, data.password || '');
        if (!match) {
          showToast('Incorrect password!');
          return;
        }

        localStorage.setItem('user_id', data.id);
        setCurrentUser(data);
        setIsForceUnlocked(!!data.force_unlocked);
        setScreen('dashboard');
        showToast('Logged in successfully!');
      } catch (err: any) {
        showToast('Login Error: ' + err.message);
      }
    } else {
      if (!fullName || !email || !password) {
        showToast('Please fill all required fields!');
        return;
      }

      if (password !== confirmPassword) {
        showToast('Passwords do not match!');
        return;
      }

      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUid = generateUUID();
        const newProfile: Profile = {
          id: newUid,
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          referred_by: referredByCode.trim() || undefined,
          force_unlocked: false
        };

        const dbProfile = {
          id: newUid,
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          referred_by: referredByCode.trim() || null
        };

        const { error } = await _supabase.from('profiles').insert([dbProfile]);
        
        const localUsersStr = localStorage.getItem('local_users') || '[]';
        const localUsers: Profile[] = JSON.parse(localUsersStr);
        localUsers.push(newProfile);
        localStorage.setItem('local_users', JSON.stringify(localUsers));
        localStorage.setItem(`profile_${newUid}`, JSON.stringify(newProfile));

        if (error) {
          console.log('Supabase insert note:', error.message);
        }

        showToast('Account created successfully! Please log in.');
        setAuthMode('login');
      } catch (err: any) {
        showToast('Signup failed: ' + err.message);
      }
    }
  };

  const loadDashboardData = async () => {
    const uid = localStorage.getItem('user_id');
    if (!uid) return;

    let allTrans: Transaction[] = [];
    const localTxStr = localStorage.getItem(`tx_${uid}`) || '[]';
    const localTx: Transaction[] = JSON.parse(localTxStr);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);
      let supabaseData: any[] = [];
      if (isUuid) {
        const { data } = await _supabase
          .from('transactions')
          .select('*')
          .eq('user_id', uid);
        if (data) supabaseData = data;
      }

      const txMap = new Map<string, Transaction>();
      localTx.forEach(t => txMap.set(String(t.id), t));
      supabaseData.forEach(t => txMap.set(String(t.id), t));
      allTrans = Array.from(txMap.values());
    } catch {
      allTrans = localTx;
    }

    let pBal = 0; // Plan / Investment Balance
    let gBal = 0; // Game Chips Balance
    let totalWd = 0;
    let activePlans = 0;

    allTrans.forEach(t => {
      const amt = Number(t.amount || 0);
      const st = (t.status || '').toLowerCase();
      const tp = (t.type || '').toLowerCase();
      const isGame = (t.category === 'game') || 
        (t.planName || '').toLowerCase().includes('game') || 
        (t.planName || '').toLowerCase().includes('chips') ||
        (t.planName || '').toLowerCase().includes('mines') ||
        (t.planName || '').toLowerCase().includes('crash') ||
        (t.planName || '').toLowerCase().includes('dragon');

      if ((tp === 'profit' || tp === 'referralbonus') && st === 'approved') {
        if (isGame) {
          gBal += amt; // Game winnings/cashout
        } else {
          pBal += amt; // Daily ROI profits & Referral bonuses
        }
      } else if (tp === 'deposit' && st === 'approved') {
        if (isGame) {
          const bonus = Number(t.bonusChips || 0);
          gBal += (amt + bonus); // Game chips + any free bonus added directly to gaming balance
        } else {
          activePlans += 1; // Investment plan active for daily profits
        }
      } else if (tp === 'withdraw') {
        if (st === 'approved' || st === 'pending') {
          if (isGame) {
            gBal -= amt;
          } else {
            pBal -= amt;
          }
          if (st === 'approved') totalWd += amt;
        }
      }
    });

    // Check for any local wallet transfers
    const transfersStr = localStorage.getItem(`transfers_${uid}`) || '[]';
    try {
      const transfers: { from: 'plan' | 'game'; to: 'plan' | 'game'; amount: number }[] = JSON.parse(transfersStr);
      transfers.forEach(tr => {
        if (tr.from === 'plan' && tr.to === 'game') {
          pBal -= tr.amount;
          gBal += tr.amount;
        } else if (tr.from === 'game' && tr.to === 'plan') {
          gBal -= tr.amount;
          pBal += tr.amount;
        }
      });
    } catch {}

    // Sync active game chips with calculated game balance and save
    localStorage.setItem(`game_chips_${uid}`, String(Math.max(0, gBal)));

    const savedWagered = parseFloat(localStorage.getItem(`game_wagered_${uid}`) || '0');
    setGameWagered(isNaN(savedWagered) ? 0 : savedWagered);

    setPlanBalance(Math.max(0, pBal));
    setGameBalance(Math.max(0, gBal));
    setTotalWithdrawn(totalWd);
    setActivePlansCount(activePlans);
    setUserTransactions(allTrans);
  };

  const loadReferralData = async () => {
    const uid = localStorage.getItem('user_id');
    if (!uid) return;

    let allUsers: Profile[] = [];
    let allTx: Transaction[] = [];

    try {
      const { data: profilesData } = await _supabase.from('profiles').select('*');
      if (profilesData && profilesData.length > 0) {
        allUsers = profilesData;
      } else {
        const localUsersStr = localStorage.getItem('local_users') || '[]';
        allUsers = JSON.parse(localUsersStr);
      }
    } catch {
      const localUsersStr = localStorage.getItem('local_users') || '[]';
      allUsers = JSON.parse(localUsersStr);
    }

    try {
      const { data: txData } = await _supabase.from('transactions').select('*');
      if (txData && txData.length > 0) {
        allTx = txData;
      } else {
        const globalTxStr = localStorage.getItem('global_transactions') || '[]';
        allTx = JSON.parse(globalTxStr);
      }
    } catch {
      const globalTxStr = localStorage.getItem('global_transactions') || '[]';
      allTx = JSON.parse(globalTxStr);
    }

    const referredUsers = allUsers.filter(u => u.referred_by === uid);
    setTotalReferralsCount(referredUsers.length);

    let activeCount = 0;
    let computedBonus = 0;
    const logs: { id: string; friendName: string; note: string; bonus: number; date: string; status: string }[] = [];

    const membersDetail: ReferredMemberDetail[] = referredUsers.map(refUser => {
      const refUserDeposits = allTx.filter(t => t.user_id === refUser.id && t.type === 'Deposit' && t.status === 'Approved');
      const isActive = refUserDeposits.length > 0;
      if (isActive) {
        activeCount += 1;
      }

      const totalDep = refUserDeposits.reduce((acc, d) => acc + (d.amount || 0), 0);
      let userCommission = 0;

      refUserDeposits.forEach(dep => {
        const bonusAmount = dep.amount * 0.20;
        computedBonus += bonusAmount;
        userCommission += bonusAmount;

        logs.push({
          id: String(dep.id || 'dep_' + Math.random()),
          friendName: refUser.full_name || 'Friend (' + refUser.id.substring(0, 6) + ')',
          note: `20% Bonus on ${dep.planName || 'Deposit'} (Rs ${dep.amount})`,
          bonus: bonusAmount,
          date: dep.created_at || 'Recently',
          status: activeCount >= 10 || isForceUnlocked ? 'Unlocked' : 'Locked'
        });
      });

      const refUserProfits = allTx.filter(t => t.user_id === refUser.id && t.type === 'Profit' && t.status === 'Approved');
      refUserProfits.forEach(prof => {
        const commAmount = prof.amount * 0.10;
        computedBonus += commAmount;
        userCommission += commAmount;

        logs.push({
          id: String(prof.id || 'prof_' + Math.random()),
          friendName: refUser.full_name || 'Friend',
          note: `10% Daily Return Commission`,
          bonus: commAmount,
          date: prof.created_at || 'Today',
          status: activeCount >= 10 || isForceUnlocked ? 'Unlocked' : 'Locked'
        });
      });

      let joinDateStr = 'Recent';
      if (refUser.id && refUser.id.startsWith('usr_')) {
        const ts = parseInt(refUser.id.replace('usr_', ''));
        if (!isNaN(ts)) {
          joinDateStr = new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }

      return {
        id: refUser.id,
        fullName: refUser.full_name || 'Anonymous User',
        email: refUser.email || 'N/A',
        joinedDate: joinDateStr,
        isActive,
        depositCount: refUserDeposits.length,
        totalDeposited: totalDep,
        commissionEarned: userCommission,
        activePlanNames: Array.from(new Set(refUserDeposits.map(d => d.planName || '').filter(Boolean)))
      };
    });

    setActiveReferralsCount(activeCount);
    setLockedReferralBonus(computedBonus);
    setReferralLogs(logs.reverse());
    setReferredMembersDetail(membersDetail);
  };

  const handleTransferReferralBonus = async () => {
    const uid = localStorage.getItem('user_id');
    if (!uid) return;

    if (activeReferralsCount < 10 && !isForceUnlocked) {
      showToast("Minimum 10 active referrals required to unlock funds!");
      return;
    }

    if (lockedReferralBonus <= 0) {
      showToast("No locked referral earnings available to transfer.");
      return;
    }

    const dbPayload = {
      user_id: uid,
      type: 'ReferralBonus',
      status: 'Approved',
      amount: lockedReferralBonus,
      planName: 'Unlocked Agent Earnings'
    };

    let insertedId: string | number = 'tx_ref_' + Date.now();

    try {
      const { data, error } = await _supabase.from('transactions').insert([dbPayload]).select();
      if (error) {
        console.error("Referral bonus insert error:", error);
      } else if (data && data.length > 0) {
        insertedId = data[0].id;
      }
    } catch {
      // fallback
    }

    const newTx: Transaction = {
      id: insertedId,
      user_id: uid,
      type: 'ReferralBonus',
      status: 'Approved',
      amount: lockedReferralBonus,
      planName: 'Unlocked Agent Earnings'
    };

    const localTxStr = localStorage.getItem(`tx_${uid}`) || '[]';
    const localTx: Transaction[] = JSON.parse(localTxStr);
    localTx.push(newTx);
    localStorage.setItem(`tx_${uid}`, JSON.stringify(localTx));

    const globalTxStr = localStorage.getItem('global_transactions') || '[]';
    const globalTx: Transaction[] = JSON.parse(globalTxStr);
    globalTx.push(newTx);
    localStorage.setItem('global_transactions', JSON.stringify(globalTx));

    showToast(`Rs ${lockedReferralBonus.toFixed(2)} transferred to your main wallet balance!`);
    loadDashboardData();
    loadReferralData();
  };

  const copyReferralLink = () => {
    const uid = localStorage.getItem('user_id') || 'USER_ID';
    const refUrl = `${window.location.origin}${window.location.pathname}?ref=${uid}`;
    navigator.clipboard.writeText(refUrl);
    setIsCopied(true);
    showToast("Referral link copied!");
    setTimeout(() => {
      setIsCopied(false);
    }, 2500);
  };

  const handleAdminManualBuyPlan = async () => {
    if (!manualSelectedUser) {
      showToast("Please select a user first!");
      return;
    }

    const planObj = PLANS.find(p => p.n === manualSelectedPlanName);
    if (!planObj) return;

    const dbPayload = {
      user_id: manualSelectedUser,
      type: 'Deposit',
      status: 'Approved',
      amount: planObj.i,
      planName: planObj.n,
      dailyProfit: planObj.d,
      proof_url: 'https://placehold.co/400x600/059669/ffffff?text=Admin+Assigned+Plan'
    };

    let insertedId: string | number = 'dep_admin_' + Date.now();

    try {
      const { data, error } = await _supabase.from('transactions').insert([dbPayload]).select();
      if (error) {
        console.error("Admin manual plan insert error:", error);
      } else if (data && data.length > 0) {
        insertedId = data[0].id;
      }
    } catch {
      // fallback
    }

    const newDepTx: Transaction = {
      id: insertedId,
      user_id: manualSelectedUser,
      type: 'Deposit',
      status: 'Approved',
      amount: planObj.i,
      planName: planObj.n,
      dailyProfit: planObj.d,
      proof_url: 'https://placehold.co/400x600/059669/ffffff?text=Admin+Assigned+Plan',
      created_at: new Date().toLocaleString()
    };

    const globalTxStr = localStorage.getItem('global_transactions') || '[]';
    const globalTx: Transaction[] = JSON.parse(globalTxStr);
    globalTx.push(newDepTx);
    localStorage.setItem('global_transactions', JSON.stringify(globalTx));

    const targetUserObj = adminUsers.find(u => u.id === manualSelectedUser);
    showToast(`Plan ${planObj.n} assigned & activated for ${targetUserObj?.full_name || 'User'}!`);
    loadAdminData();
  };

  const handleGiveIndividualProfit = async (targetUserId: string, customAmt?: number) => {
    const amt = customAmt !== undefined ? customAmt : parseFloat(manualProfitAmount || '0');
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid profit amount!");
      return;
    }

    const targetUserObj = adminUsers.find(u => u.id === targetUserId);
    const noteText = manualProfitNote.trim() || (manualProfitTarget === 'game' ? 'Game Chips Profit' : 'Daily Profit');
    const isGameTarget = manualProfitTarget === 'game';

    const dbProf = {
      user_id: targetUserId,
      type: 'Profit',
      status: 'Approved',
      amount: amt,
      planName: noteText,
      category: isGameTarget ? 'game' : 'plan'
    };

    let newId: string | number = 'prof_ind_' + Date.now();

    try {
      const { data, error } = await _supabase.from('transactions').insert([dbProf]).select();
      if (error) {
        console.error("Individual profit insert error:", error);
      } else if (data && data.length > 0) {
        newId = data[0].id;
      }
    } catch (e) {
      console.error("Individual profit catch error:", e);
    }

    const profTx: Transaction = {
      id: newId,
      user_id: targetUserId,
      type: 'Profit',
      status: 'Approved',
      amount: amt,
      planName: noteText,
      category: isGameTarget ? 'game' : 'plan',
      created_at: new Date().toLocaleString()
    };

    const globalTxStr = localStorage.getItem('global_transactions') || '[]';
    const globalTx: Transaction[] = JSON.parse(globalTxStr);
    globalTx.push(profTx);
    localStorage.setItem('global_transactions', JSON.stringify(globalTx));

    const localTxStr = localStorage.getItem(`tx_${targetUserId}`) || '[]';
    const localTx: Transaction[] = JSON.parse(localTxStr);
    localTx.push(profTx);
    localStorage.setItem(`tx_${targetUserId}`, JSON.stringify(localTx));

    // If game chips target, update member's local game chips storage
    if (isGameTarget) {
      const curChips = parseFloat(localStorage.getItem(`game_chips_${targetUserId}`) || '0');
      localStorage.setItem(`game_chips_${targetUserId}`, String(curChips + amt));
    }

    showToast(`Rs ${amt} ${isGameTarget ? 'Game Chips' : 'Daily Profit'} credited to ${targetUserObj?.full_name || 'Member'}!`);
    setProfitModalUser(null);
    setManualProfitAmount('');
    setManualProfitNote('Daily Profit');
    loadAdminData();
  };

  const shareWhatsApp = () => {
    const uid = localStorage.getItem('user_id') || 'USER_ID';
    const refUrl = `${window.location.origin}${window.location.pathname}?ref=${uid}`;
    const message = encodeURIComponent(`Earn daily income with Invest Earn! Join using my referral link: ${refUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const handleWalletTransfer = (direction: 'plan_to_game' | 'game_to_plan', amt: number) => {
    const uid = localStorage.getItem('user_id') || 'demo';

    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid transfer amount!");
      return;
    }

    if (direction === 'plan_to_game') {
      if (amt > planBalance) {
        showToast(`Insufficient Plan Balance! Available: Rs ${planBalance.toFixed(2)}`);
        return;
      }
      setPlanBalance(prev => Math.max(0, prev - amt));
      setGameBalance(prev => {
        const next = prev + amt;
        localStorage.setItem(`game_chips_${uid}`, String(next));
        return next;
      });
      showToast(`Transferred Rs ${amt} to Game Chips successfully! 🎮`);
    } else {
      if (amt > gameBalance) {
        showToast(`Insufficient Game Chips Balance! Available: Rs ${gameBalance.toFixed(2)}`);
        return;
      }
      if (totalApprovedGameDeposits > 0 && remainingGameTurnover > 0) {
        showToast(`⚠️ 4x Turnover Required! Rs ${remainingGameTurnover.toLocaleString()} remaining before Game Chips can be transferred.`);
        return;
      }
      setGameBalance(prev => {
        const next = Math.max(0, prev - amt);
        localStorage.setItem(`game_chips_${uid}`, String(next));
        return next;
      });
      setPlanBalance(prev => prev + amt);
      showToast(`Transferred Rs ${amt} to Plan Wallet successfully! 📈`);
    }

    const transfersStr = localStorage.getItem(`transfers_${uid}`) || '[]';
    try {
      const transfers = JSON.parse(transfersStr);
      transfers.push({
        from: direction === 'plan_to_game' ? 'plan' : 'game',
        to: direction === 'plan_to_game' ? 'game' : 'plan',
        amount: amt,
        date: new Date().toISOString()
      });
      localStorage.setItem(`transfers_${uid}`, JSON.stringify(transfers));
    } catch {}

    setIsTransferModalOpen(false);
    setTransferAmount('');
  };

  useEffect(() => {
    const uid = localStorage.getItem('user_id') || 'demo';
    localStorage.setItem(`game_chips_${uid}`, String(gameBalance));
  }, [gameBalance]);

  const handleGameTransaction = async (type: 'Profit' | 'Deposit' | 'Withdraw' | 'ReferralBonus', amount: number, note: string) => {
    const uid = localStorage.getItem('user_id') || 'demo';
    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const validUserId = isUuid(uid) ? uid : (currentUser && isUuid(currentUser.id) ? currentUser.id : null);

    const dbPayload: any = {
      type: type || 'Profit',
      status: 'Approved',
      amount: amount,
      planName: note,
      category: 'game'
    };
    if (validUserId) {
      dbPayload.user_id = validUserId;
    }

    let insertedId: string | number = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const { data, error } = await _supabase.from('transactions').insert([dbPayload]).select();
      if (!error && data && data.length > 0) {
        insertedId = data[0].id;
      }
    } catch {}

    const newTx: Transaction = {
      id: insertedId,
      user_id: uid,
      type: type || 'Profit',
      status: 'Approved',
      amount: amount,
      planName: note,
      category: 'game',
      created_at: new Date().toLocaleString()
    };

    setUserTransactions(prev => [newTx, ...prev]);

    const localTxStr = localStorage.getItem(`tx_${uid}`) || '[]';
    const localTx: Transaction[] = JSON.parse(localTxStr);
    localTx.push(newTx);
    localStorage.setItem(`tx_${uid}`, JSON.stringify(localTx));
  };

  const handleGameBetPlaced = (betAmt: number) => {
    if (betAmt <= 0) return;
    const uid = localStorage.getItem('user_id');
    setGameWagered(prev => {
      const next = prev + betAmt;
      if (uid) localStorage.setItem(`game_wagered_${uid}`, String(next));
      return next;
    });
  };

  const selectPlan = (name: string, amount: number, dailyProfit: number) => {
    setSelectedPlan({ name, amount, dailyProfit });
    setScreen('deposit');
  };

  const submitPlanDeposit = async (amount: number, planName: string, dailyProfit: number, activeProofFile: File) => {
    const uid = localStorage.getItem('user_id');
    if (!uid) {
      showToast('Please log in first!');
      return;
    }

    if (!activeProofFile) {
      showToast("Payment screenshot proof is mandatory!");
      return;
    }

    setIsSubmittingDeposit(true);
    let proofUrl = "https://placehold.co/400x600/1e293b/ffffff?text=Payment+Screenshot";

    try {
      const fileExt = activeProofFile.name.split('.').pop();
      const fileName = `${uid}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await _supabase.storage.from('proofs').upload(fileName, activeProofFile);
      if (!uploadError && uploadData) {
        const { data: urlData } = _supabase.storage.from('proofs').getPublicUrl(fileName);
        if (urlData) proofUrl = urlData.publicUrl;
      }
    } catch {
      // Fallback
    }

    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const validUserId = isUuid(uid) ? uid : (currentUser && isUuid(currentUser.id) ? currentUser.id : null);

    const formattedPlanName = planName.startsWith('Plan') ? planName : `Plan ${planName}`;

    let insertedId: string | number = 'dep_' + Date.now();

    const dbPayload: any = {
      type: 'Deposit',
      status: 'Pending',
      amount: amount,
      planName: formattedPlanName,
      dailyProfit: dailyProfit,
      proof_url: proofUrl,
      method: 'JazzCash/Raast Till',
      category: 'plan'
    };

    if (validUserId) {
      dbPayload.user_id = validUserId;
    }

    try {
      const { data, error } = await _supabase.from('transactions').insert([dbPayload]).select();
      if (error) {
        console.warn("Plan deposit initial insert error, retrying standard payload:", error.message);
        const fallbackPayload: any = {
          type: 'Deposit',
          status: 'Pending',
          amount: amount,
          planName: formattedPlanName,
          dailyProfit: dailyProfit,
          proof_url: proofUrl,
          method: 'JazzCash/Raast Till'
        };
        if (validUserId) fallbackPayload.user_id = validUserId;
        const { data: fbData } = await _supabase.from('transactions').insert([fallbackPayload]).select();
        if (fbData && fbData.length > 0) {
          insertedId = fbData[0].id;
        }
      } else if (data && data.length > 0) {
        insertedId = data[0].id;
      }
    } catch (e) {
      console.error("Plan deposit catch error:", e);
    }

    const newDepTx: Transaction = {
      id: insertedId,
      user_id: uid,
      type: 'Deposit',
      status: 'Pending',
      amount: amount,
      planName: formattedPlanName,
      dailyProfit: dailyProfit,
      proof_url: proofUrl,
       method: 'JazzCash/Raast Till',
      created_at: new Date().toLocaleString(),
      category: 'plan'
    };

    const localTxStr = localStorage.getItem(`tx_${uid}`) || '[]';
    const localTx: Transaction[] = JSON.parse(localTxStr);
    localTx.push(newDepTx);
    localStorage.setItem(`tx_${uid}`, JSON.stringify(localTx));

    const globalTxStr = localStorage.getItem('global_transactions') || '[]';
    const globalTx: Transaction[] = JSON.parse(globalTxStr);
    globalTx.push(newDepTx);
    localStorage.setItem('global_transactions', JSON.stringify(globalTx));

    setIsSubmittingDeposit(false);
    showToast(`Your Rs ${amount.toLocaleString()} (${formattedPlanName}) deposit request has been submitted!`);
    loadDashboardData();
    setScreen('dashboard');
  };

  const submitGameDeposit = async (amount: number, bonusChips: number, activeProofFile: File) => {
    const uid = localStorage.getItem('user_id');
    if (!uid) {
      showToast('Please log in first!');
      return;
    }

    if (!activeProofFile) {
      showToast("Payment screenshot receipt is mandatory!");
      return;
    }

    setIsSubmittingDeposit(true);
    let proofUrl = "https://placehold.co/400x600/1e293b/ffffff?text=Payment+Screenshot";

    try {
      const fileExt = activeProofFile.name.split('.').pop();
      const fileName = `${uid}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await _supabase.storage.from('proofs').upload(fileName, activeProofFile);
      if (!uploadError && uploadData) {
        const { data: urlData } = _supabase.storage.from('proofs').getPublicUrl(fileName);
        if (urlData) proofUrl = urlData.publicUrl;
      }
    } catch {
      // Fallback
    }

    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const validUserId = isUuid(uid) ? uid : (currentUser && isUuid(currentUser.id) ? currentUser.id : null);

    const gamePlanName = `🎮 Game Deposit (Rs ${amount.toLocaleString()}${bonusChips ? ` + Rs ${bonusChips} Bonus` : ''})`;

    let insertedId: string | number = 'gdep_' + Date.now();

    const dbPayload: any = {
      type: 'Deposit',
      status: 'Pending',
      amount: amount,
      planName: gamePlanName,
      dailyProfit: 0, // Game deposits do NOT have daily commissions/ROI
      proof_url: proofUrl,
       method: 'JazzCash/Raast Till',
      category: 'game',
      bonusChips: bonusChips || 0
    };

    if (validUserId) {
      dbPayload.user_id = validUserId;
    }

    try {
      const { data, error } = await _supabase.from('transactions').insert([dbPayload]).select();
      if (error) {
        console.warn("Game deposit initial insert error, retrying standard payload:", error.message);
        const fallbackPayload: any = {
          type: 'Deposit',
          status: 'Pending',
          amount: amount,
          planName: gamePlanName,
          dailyProfit: 0,
          proof_url: proofUrl,
           method: 'JazzCash/Raast Till'
        };
        if (validUserId) fallbackPayload.user_id = validUserId;
        const { data: fbData } = await _supabase.from('transactions').insert([fallbackPayload]).select();
        if (fbData && fbData.length > 0) {
          insertedId = fbData[0].id;
        }
      } else if (data && data.length > 0) {
        insertedId = data[0].id;
      }
    } catch (e) {
      console.error("Game deposit catch error:", e);
    }

    const newDepTx: Transaction = {
      id: insertedId,
      user_id: uid,
      type: 'Deposit',
      status: 'Pending',
      amount: amount,
      planName: gamePlanName,
      dailyProfit: 0,
      proof_url: proofUrl,
       method: 'JazzCash/Raast Till',
      created_at: new Date().toLocaleString(),
      category: 'game',
      bonusChips: bonusChips || 0
    };

    const localTxStr = localStorage.getItem(`tx_${uid}`) || '[]';
    const localTx: Transaction[] = JSON.parse(localTxStr);
    localTx.push(newDepTx);
    localStorage.setItem(`tx_${uid}`, JSON.stringify(localTx));

    const globalTxStr = localStorage.getItem('global_transactions') || '[]';
    const globalTx: Transaction[] = JSON.parse(globalTxStr);
    globalTx.push(newDepTx);
    localStorage.setItem('global_transactions', JSON.stringify(globalTx));

    setIsSubmittingDeposit(false);
    showToast(`Rs ${amount.toLocaleString()} Game Chips deposit request submitted! (4x gameplay required to withdraw)`);
    loadDashboardData();
    setScreen('crash');
  };

  const submitWithdraw = async () => {
    const uid = localStorage.getItem('user_id');
    if (!uid) return;

    const amt = parseFloat(wdAmount || '0');
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter valid withdrawal amount!");
      return;
    }

    // Minimum withdrawal rule = Rs 600
    if (amt < 600) {
      showToast("Minimum withdrawal amount is Rs 600!");
      return;
    }

    if (!wdName.trim() || !wdNumber.trim()) {
      showToast("Please fill all withdrawal details (Name & Mobile Number)!");
      return;
    }

    if (wdSource === 'plan') {
      if (amt > planBalance) {
        showToast(`Error: Insufficient Plan Balance! Available: Rs ${planBalance.toFixed(2)}`);
        return;
      }
    } else {
      // Game Chips withdrawal
      if (amt > gameBalance) {
        showToast(`Error: Insufficient Game Chips Balance! Available: Rs ${gameBalance.toFixed(2)}`);
        return;
      }

      // 4X Gameplay Turnover Check for Game Deposits
      if (totalApprovedGameDeposits > 0 && remainingGameTurnover > 0) {
        showToast(`⚠️ 4x Gameplay Turnover Required! Complete Rs ${remainingGameTurnover.toLocaleString()} more in game bets before withdrawing Game Chips.`);
        return;
      }
    }

    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const validUserId = isUuid(uid) ? uid : (currentUser && isUuid(currentUser.id) ? currentUser.id : null);

    const withdrawalLabel = wdSource === 'game' ? '🎮 Game Chips Withdrawal' : '📈 Plan Profit Withdrawal';

    const dbPayload: any = {
      type: 'Withdraw',
      status: 'Pending',
      name: wdName.trim(),
      method: wdMethod,
      number: wdNumber.trim(),
      amount: amt,
      category: wdSource,
      planName: withdrawalLabel
    };

    if (validUserId) {
      dbPayload.user_id = validUserId;
    }

    let insertedId: string | number = 'wd_' + Date.now();

    try {
      const { data, error } = await _supabase.from('transactions').insert([dbPayload]).select();
      if (error) {
        console.error("Withdraw insert error:", error);
      } else if (data && data.length > 0) {
        insertedId = data[0].id;
      }
    } catch (e) {
      console.error("Withdraw catch error:", e);
    }

    const newWdTx: Transaction = {
      id: insertedId,
      user_id: uid,
      type: 'Withdraw',
      status: 'Pending',
      name: wdName.trim(),
      method: wdMethod,
      number: wdNumber.trim(),
      amount: amt,
      category: wdSource,
      planName: withdrawalLabel,
      created_at: new Date().toLocaleString()
    };

    if (wdSource === 'game') {
      setGameBalance(prev => {
        const next = Math.max(0, prev - amt);
        localStorage.setItem(`game_chips_${uid}`, String(next));
        return next;
      });
    } else {
      setPlanBalance(prev => Math.max(0, prev - amt));
    }

    const localTxStr = localStorage.getItem(`tx_${uid}`) || '[]';
    const localTx: Transaction[] = JSON.parse(localTxStr);
    localTx.push(newWdTx);
    localStorage.setItem(`tx_${uid}`, JSON.stringify(localTx));

    const globalTxStr = localStorage.getItem('global_transactions') || '[]';
    const globalTx: Transaction[] = JSON.parse(globalTxStr);
    globalTx.push(newWdTx);
    localStorage.setItem('global_transactions', JSON.stringify(globalTx));

    showToast(`Rs ${amt} (${wdSource === 'game' ? 'Game Chips' : 'Plan Balance'}) withdrawal request submitted!`);
    setWdAmount('');
    setWdName('');
    setWdNumber('');
    loadDashboardData();
    setScreen('dashboard');
  };

  const loadAdminData = async () => {
    let users: Profile[] = [];
    let trans: Transaction[] = [];

    const localUsersStr = localStorage.getItem('local_users') || '[]';
    const localUsers: Profile[] = JSON.parse(localUsersStr);

    const globalTxStr = localStorage.getItem('global_transactions') || '[]';
    const globalTx: Transaction[] = JSON.parse(globalTxStr);

    try {
      const { data: pData } = await _supabase.from('profiles').select('*');
      const { data: tData } = await _supabase.from('transactions').select('*');

      const userMap = new Map<string, Profile>();
      localUsers.forEach(u => userMap.set(u.id, u));
      if (pData) pData.forEach(u => userMap.set(u.id, u));
      users = Array.from(userMap.values());

      const txMap = new Map<string, Transaction>();
      globalTx.forEach(t => txMap.set(String(t.id), t));
      if (tData) tData.forEach(t => txMap.set(String(t.id), t));
      trans = Array.from(txMap.values());
    } catch (e) {
      console.error("Admin load error:", e);
      users = localUsers;
      trans = globalTx;
    }

    setAdminUsers(users);
    setAdminTransactions(trans);

    const agentStats = users.map(user => {
      const refUsers = users.filter(u => u.referred_by === user.id);
      let actCount = 0;
      let computedLocked = 0;

      refUsers.forEach(r => {
        const rDeposits = trans.filter(t => t.user_id === r.id && t.type === 'Deposit' && t.status === 'Approved');
        if (rDeposits.length > 0) actCount += 1;
        rDeposits.forEach(d => {
          computedLocked += Number(d.amount || 0) * 0.20;
        });

        const rProfits = trans.filter(t => t.user_id === r.id && t.type === 'Profit' && t.status === 'Approved');
        rProfits.forEach(p => {
          computedLocked += Number(p.amount || 0) * 0.10;
        });
      });

      return {
        profile: user,
        totalRefs: refUsers.length,
        activeRefs: actCount,
        lockedBonus: computedLocked,
        isUnlocked: actCount >= 10 || !!user.force_unlocked
      };
    });

    setAdminAgentStats(agentStats);
  };

  const toggleForceUnlock = async (userId: string) => {
    const updatedUsers = adminUsers.map(u => {
      if (u.id === userId) {
        return { ...u, force_unlocked: !u.force_unlocked };
      }
      return u;
    });

    const targetUser = updatedUsers.find(u => u.id === userId);
    if (!targetUser) return;

    localStorage.setItem('local_users', JSON.stringify(updatedUsers));
    localStorage.setItem(`profile_${userId}`, JSON.stringify(targetUser));

    try {
      await _supabase.from('profiles').update({ force_unlocked: targetUser.force_unlocked }).eq('id', userId);
    } catch {
      // local fallback
    }

    showToast(`Agent ${targetUser.full_name} ${targetUser.force_unlocked ? 'Force Unlocked!' : 'Locked'}`);
    loadAdminData();
  };

  const updateStatus = async (txId: string | number, newStatus: 'Approved' | 'Rejected' | 'Pending') => {
    try {
      // 1. Immediately update global transactions in localStorage
      const globalTxStr = localStorage.getItem('global_transactions') || '[]';
      const globalTx: Transaction[] = JSON.parse(globalTxStr);
      const targetTx = globalTx.find(t => String(t.id) === String(txId));

      const updatedTx = globalTx.map(t => String(t.id) === String(txId) ? { ...t, status: newStatus } : t);
      localStorage.setItem('global_transactions', JSON.stringify(updatedTx));

      // 2. Also update target user's local tx cache so their dashboard balance reflects immediately
      if (targetTx && targetTx.user_id) {
        const userTxStr = localStorage.getItem(`tx_${targetTx.user_id}`) || '[]';
        const userTx: Transaction[] = JSON.parse(userTxStr);
        const updatedUserTx = userTx.map(t => String(t.id) === String(txId) ? { ...t, status: newStatus } : t);
        localStorage.setItem(`tx_${targetTx.user_id}`, JSON.stringify(updatedUserTx));

        // If newly approved game deposit, increment and save user's game chips immediately
        const isGame = (targetTx.category === 'game') || 
          (targetTx.planName || '').toLowerCase().includes('game') || 
          (targetTx.planName || '').toLowerCase().includes('chips') ||
          (targetTx.planName || '').toLowerCase().includes('mines') ||
          (targetTx.planName || '').toLowerCase().includes('crash') ||
          (targetTx.planName || '').toLowerCase().includes('dragon');

        if (newStatus === 'Approved' && (targetTx.status || '').toLowerCase() !== 'approved') {
          if (isGame && (targetTx.type || '').toLowerCase() === 'deposit') {
            const addedChips = Number(targetTx.amount || 0) + Number(targetTx.bonusChips || 0);
            const curSaved = parseFloat(localStorage.getItem(`game_chips_${targetTx.user_id}`) || '0');
            const newTotal = (isNaN(curSaved) ? 0 : curSaved) + addedChips;
            localStorage.setItem(`game_chips_${targetTx.user_id}`, String(newTotal));
            
            const currentUid = localStorage.getItem('user_id');
            if (currentUid === targetTx.user_id) {
              setGameBalance(prev => prev + addedChips);
            }
          }
        }
      }

      // 3. Try to sync to Supabase if it's not a client-generated fallback ID
      const isClientOnlyId = String(txId).startsWith('gdep_') || String(txId).startsWith('dep_') || String(txId).startsWith('wd_') || String(txId).startsWith('prof_') || String(txId).startsWith('tx_');

      if (!isClientOnlyId) {
        try {
          const { error } = await _supabase
            .from('transactions')
            .update({ status: newStatus })
            .eq('id', txId);

          if (error) {
            console.warn("Supabase status update note:", error.message);
          }
        } catch (supaErr) {
          console.warn("Supabase update error:", supaErr);
        }
      }

      showToast(`Transaction marked as ${newStatus} successfully!`);
      loadAdminData();
      loadDashboardData();
    } catch (err: any) {
      console.error("Update failed:", err);
      showToast(`Transaction marked as ${newStatus}`);
      loadAdminData();
    }
  };

  const distributeProfitAll = async () => {
    let activeDeps: Transaction[] = [];
    try {
      const { data } = await _supabase.from('transactions').select('*').eq('status', 'Approved').eq('type', 'Deposit');
      if (data && data.length > 0) activeDeps = data;
      else {
        const globalTxStr = localStorage.getItem('global_transactions') || '[]';
        const globalTx: Transaction[] = JSON.parse(globalTxStr);
        activeDeps = globalTx.filter(t => t.status === 'Approved' && t.type === 'Deposit');
      }
    } catch {
      const globalTxStr = localStorage.getItem('global_transactions') || '[]';
      const globalTx: Transaction[] = JSON.parse(globalTxStr);
      activeDeps = globalTx.filter(t => t.status === 'Approved' && t.type === 'Deposit');
    }

    if (activeDeps.length === 0) {
      showToast('No active deposits found for distribution.');
      return;
    }

    const globalTxStr = localStorage.getItem('global_transactions') || '[]';
    const globalTx: Transaction[] = JSON.parse(globalTxStr);

    for (const t of activeDeps) {
      const dbProf = {
        user_id: t.user_id,
        type: 'Profit',
        status: 'Approved',
        amount: t.dailyProfit || 0,
        planName: t.planName
      };

      let newId: string | number = 'prof_' + Math.random();
      try {
        const { data } = await _supabase.from('transactions').insert([dbProf]).select();
        if (data && data.length > 0) newId = data[0].id;
      } catch {
        // local
      }

      const profTx: Transaction = {
        id: newId,
        user_id: t.user_id,
        type: 'Profit',
        status: 'Approved',
        amount: t.dailyProfit || 0,
        planName: t.planName,
        created_at: new Date().toLocaleString()
      };
      globalTx.push(profTx);
    }

    localStorage.setItem('global_transactions', JSON.stringify(globalTx));
    showToast('Daily profits distributed to all active investors!');
    loadAdminData();
  };

  const handleLogout = () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('admin_logged_in');
    setCurrentUser(null);
    setScreen('login');
    showToast('Logged out successfully.');
  };

  const changeTab = (newScreen: 'dashboard' | 'plans' | 'deposit' | 'withdraw' | 'referral' | 'crash' | 'admin') => {
    soundFX.playTabSwipe();
    clearToast();
    if (newScreen === 'crash') {
      setActiveGameTab('lobby');
    }
    setScreen(newScreen);
  };

  return (
    <div className={`min-h-screen flex flex-col mx-auto border-x border-slate-800 bg-slate-950 text-slate-100 relative font-sans shadow-2xl overflow-x-hidden selection:bg-blue-500 selection:text-white transition-all duration-300 ${
      screen === 'crash' && (activeGameTab === 'mines' || activeGameTab === 'dragon_tiger') ? 'max-w-4xl w-full px-2' : (screen === 'crash' && (activeGameTab === 'roulette' || activeGameTab === 'wingo') ? 'w-full max-w-none' : 'max-w-md')
    }`}>
      
      {/* Dynamic Background Effects */}
      <div className="fixed top-0 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-1/3 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Toast Notification Container */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-5 left-1/2 bg-slate-900/95 text-white px-5 py-3 rounded-2xl z-[9999] border border-blue-500/30 shadow-[0_0_25px_rgba(59,130,246,0.3)] font-bold text-xs text-center backdrop-blur-xl flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      {screen !== 'login' && screen !== 'admin' && !(screen === 'crash' && (activeGameTab === 'roulette' || activeGameTab === 'wingo')) && (
        <header className="bg-slate-900/85 backdrop-blur-md sticky top-0 z-40 px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 flex items-center justify-center text-white text-xs font-black shadow-md border border-white/20">
              IE
            </div>
            <div>
              <h1 className="text-xs font-extrabold text-white tracking-wide">INVEST EARN</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                {activeReferralsCount >= 10 || isForceUnlocked ? (
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Unlocked Agent
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/40 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    Standard
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Main Balance</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">Rs {balance.toFixed(2)}</span>
          </div>
        </header>
      )}

      {/* LOGIN & SIGNUP SCREEN */}
      {screen === 'login' && (
        <AuthScreen
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          fullName={fullName}
          setFullName={setFullName}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          referredByCode={referredByCode}
          setReferredByCode={setReferredByCode}
          authMode={authMode}
          setAuthMode={setAuthMode}
          handleAuth={handleAuth}
        />
      )}

      {/* DASHBOARD SCREEN */}
      {screen === 'dashboard' && (
        <div className="px-4 pt-4 flex-1 flex flex-col space-y-4 pb-24 scroll-container overflow-y-auto">
          
          {/* Top User Greeting & Status Bar */}
          <div className="flex justify-between items-center bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-emerald-400 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-blue-500/20 border border-white/20">
                  {(currentUser?.full_name || 'U').substring(0, 2).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    {currentUser?.full_name || 'Investor'}
                  </h2>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              type="button"
              className="text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>Exit</span>
            </button>
          </div>

          {/* Single Focused Plan Balance Card on Home Page */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-400/30 text-white shadow-xl relative overflow-hidden backdrop-blur-xl group"
          >
            {/* Soft Ambient Light Glow */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-400/30 transition-all duration-700" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top row: Label & Eye Toggle */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-400/20">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-200">Plan Wallet Balance</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title={showBalance ? "Hide Balance" : "Show Balance"}
              >
                {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            </div>

            {/* Amount Display */}
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-black text-white tracking-tight">
                {showBalance ? `Rs ${planBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••••'}
              </span>
              <span className="text-[9px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                PKR
              </span>
            </div>

            <p className="text-xs text-slate-400 font-medium">Daily Investment ROI & Referral Earnings</p>

            {/* Deposit & Withdraw Quick Actions */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => changeTab('plans')}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.35),inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(0,0,0,0.4)] active:scale-[0.98] active:translate-y-[1px] border border-emerald-200/90 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3.5]" />
                <span>DEPOSIT</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWdSource('plan');
                  changeTab('withdraw');
                }}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.35),inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(0,0,0,0.4)] active:scale-[0.98] active:translate-y-[1px] border border-yellow-200/90 transition-all cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[3.5]" />
                <span>WITHDRAW</span>
              </button>
            </div>
          </motion.div>

          {/* Quick Metrics & Overview Cards - Lighter Glass Accents */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-slate-900/90 to-blue-950/30 p-4 rounded-2xl border border-blue-500/20 flex items-center gap-3 shadow-lg hover:border-blue-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/10">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-extrabold text-blue-300/80 uppercase tracking-wider truncate">Active Strategies</p>
                <p className="text-base font-black text-white mt-0.5">{activePlansCount} Active</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900/90 to-emerald-950/30 p-4 rounded-2xl border border-emerald-500/20 flex items-center gap-3 shadow-lg hover:border-emerald-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/10">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-extrabold text-emerald-300/80 uppercase tracking-wider truncate">Total Withdrawn</p>
                <p className="text-base font-mono font-black text-emerald-300 mt-0.5">Rs {totalWithdrawn.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Recent Activity / Transactions Section (Compact & Small) */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center px-0.5">
              <h3 className="font-extrabold text-[11px] text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-blue-400" />
                <span>Recent Activity</span>
              </h3>
              <span className="text-[9px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                {userTransactions.length} items
              </span>
            </div>

            {/* Filter Tabs - Compact */}
            <div className="flex gap-1 bg-slate-900/80 p-0.5 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => setTxFilter('all')}
                className={`flex-1 py-1 rounded-lg text-[9px] font-extrabold transition cursor-pointer ${
                  txFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTxFilter('profit')}
                className={`flex-1 py-1 rounded-lg text-[9px] font-extrabold transition cursor-pointer ${
                  txFilter === 'profit' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Profits
              </button>
              <button
                type="button"
                onClick={() => setTxFilter('deposit')}
                className={`flex-1 py-1 rounded-lg text-[9px] font-extrabold transition cursor-pointer ${
                  txFilter === 'deposit' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Deposits
              </button>
              <button
                type="button"
                onClick={() => setTxFilter('withdraw')}
                className={`flex-1 py-1 rounded-lg text-[9px] font-extrabold transition cursor-pointer ${
                  txFilter === 'withdraw' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Withdraws
              </button>
            </div>

            {/* Transaction Items Container - Max Height Scrollable for Small Portion */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden divide-y divide-slate-800/60 shadow-lg max-h-48 overflow-y-auto scrollbar-thin">
              {(() => {
                const filtered = userTransactions.filter((h) => {
                  if (txFilter === 'profit') return (h.type || '').toLowerCase() === 'profit' || (h.type || '').toLowerCase() === 'referralbonus';
                  if (txFilter === 'deposit') return (h.type || '').toLowerCase() === 'deposit';
                  if (txFilter === 'withdraw') return (h.type || '').toLowerCase() === 'withdraw';
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-6 px-4 space-y-1">
                      <Clock className="w-4 h-4 text-slate-500 mx-auto" />
                      <p className="text-[11px] text-slate-400 font-bold">No activity recorded yet</p>
                      <p className="text-[9px] text-slate-500">Activate a plan from the Plans tab to get started!</p>
                    </div>
                  );
                }

                return filtered.map((h, idx) => {
                  const isPositive = (h.type || '').toLowerCase() === 'profit' || (h.type || '').toLowerCase() === 'referralbonus' || (h.type || '').toLowerCase() === 'deposit';
                  const isApproved = (h.status || '').toLowerCase() === 'approved';
                  const isRejected = (h.status || '').toLowerCase() === 'rejected';

                  return (
                    <div key={`tx-row-${h.id || idx}-${idx}`} className="p-2.5 flex justify-between items-center text-xs hover:bg-slate-800/40 transition">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          h.type === 'Profit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          h.type === 'Deposit' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          h.type === 'Withdraw' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {h.type === 'Profit' ? <ArrowDownLeft className="w-3.5 h-3.5" /> :
                           h.type === 'Deposit' ? <Plus className="w-3.5 h-3.5" /> :
                           h.type === 'Withdraw' ? <ArrowUpRight className="w-3.5 h-3.5" /> :
                           <Gift className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-bold text-white text-[11px] flex items-center gap-1">
                            <span>{h.type}</span>
                            {h.planName && <span className="text-slate-400 text-[9px] font-normal">({h.planName})</span>}
                          </p>
                          <p className="text-[9px] text-slate-500">{h.created_at || 'Recently'}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`font-mono font-bold text-[11px] ${isPositive ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {isPositive ? '+' : '-'}Rs {h.amount}
                        </p>
                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full inline-block ${
                          isApproved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          isRejected ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {h.status}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* INVESTMENT PLANS SCREEN */}
      {screen === 'plans' && (
        <div className="flex-1 flex flex-col min-h-screen pb-20">
          <MechPricing3DSection
            onSelectPlanForDeposit={(p) => selectPlan(p.name, p.amount, p.dailyProfit)}
            onOpenApp={() => changeTab('dashboard')}
          />
        </div>
      )}

      {/* INVESTMENT PLANS DEPOSIT SCREEN - CLEAN PLANS BUY PANEL */}
      {screen === 'deposit' && (
        <PlanDepositPanel
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          onBack={() => setScreen('plans')}
          onSubmitPlanDeposit={async (amt, pName, dProfit, pFile) => {
            await submitPlanDeposit(amt, pName, dProfit, pFile);
          }}
          isSubmitting={isSubmittingDeposit}
          showToast={showToast}
          soundFX={soundFX}
          userTransactions={userTransactions}
        />
      )}

      {/* GAME DEPOSIT SCREEN - CASINO "ADD CASH" CHIPS PANEL (ZERO DAILY COMMISSION, 4X WAGERING) */}
      {screen === 'game_deposit' && (
        <AddCashDepositPanel
          balance={gameBalance}
          onBack={() => setScreen('crash')}
          onSubmitGameDeposit={async (amt, bonus, pFile) => {
            await submitGameDeposit(amt, bonus, pFile);
          }}
          isSubmitting={isSubmittingDeposit}
          showToast={showToast}
          soundFX={soundFX}
          userTransactions={userTransactions}
        />
      )}

      {/* WITHDRAW SCREEN */}
      {screen === 'withdraw' && (
        <div className="px-4 pt-5 flex-1 flex flex-col space-y-4 overflow-y-auto pb-24 scroll-container">
          <div className="flex items-center justify-between bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-3.5 rounded-2xl border border-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.5)] border border-amber-300/60 shrink-0">
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Withdraw Funds</h2>
                <p className="text-[10px] text-slate-400 font-medium">EasyPaisa & JazzCash Instant Payout</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Portfolio</span>
              <span className="font-mono font-black text-emerald-400 text-xs">Rs {balance.toFixed(2)}</span>
            </div>
          </div>

          {/* DUAL BALANCE SOURCE SELECTION TABS */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 block px-1">Select Withdrawal Account / Wallet</label>
            <div className="grid grid-cols-2 gap-2">
              {/* Option 1: Plan Balance */}
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setWdSource('plan');
                }}
                className={`p-3 rounded-2xl border text-left transition relative overflow-hidden cursor-pointer ${
                  wdSource === 'plan'
                    ? 'bg-blue-950/60 border-blue-400 shadow-lg shadow-blue-500/15'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-extrabold uppercase text-blue-300 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-blue-400" /> Plan Wallet
                  </span>
                  {wdSource === 'plan' && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                </div>
                <div className="text-base font-black font-mono text-white">
                  Rs {planBalance.toFixed(2)}
                </div>
                <p className="text-[9px] text-emerald-400 font-bold mt-0.5">⚡ No 4x Wager Needed</p>
              </button>

              {/* Option 2: Game Chips Balance */}
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setWdSource('game');
                }}
                className={`p-3 rounded-2xl border text-left transition relative overflow-hidden cursor-pointer ${
                  wdSource === 'game'
                    ? 'bg-purple-950/60 border-purple-400 shadow-lg shadow-purple-500/15'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-extrabold uppercase text-purple-300 flex items-center gap-1">
                    <Gamepad2 className="w-3 h-3 text-purple-400" /> Game Chips
                  </span>
                  {wdSource === 'game' && <span className="w-2 h-2 rounded-full bg-purple-400" />}
                </div>
                <div className="text-base font-black font-mono text-white">
                  Rs {gameBalance.toFixed(2)}
                </div>
                <p className="text-[9px] text-amber-400 font-bold mt-0.5">🎮 Casino Chips</p>
              </button>
            </div>
          </div>

          {/* 4x Gameplay Wagering Status Indicator if Game Deposits exist & Game source is chosen */}
          {wdSource === 'game' && totalApprovedGameDeposits > 0 && (
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-3.5 rounded-2xl border border-amber-500/30 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Game 4x Turnover Progress
                </span>
                <span className={remainingGameTurnover === 0 ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>
                  {remainingGameTurnover === 0 ? '✅ Unlocked' : `${turnoverProgressPct}%`}
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-amber-500/30">
                <div
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                  style={{ width: `${turnoverProgressPct}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Played: <b className="text-white font-mono">Rs {gameWagered.toLocaleString()}</b></span>
                <span>Required 4x: <b className="text-amber-300 font-mono">Rs {gameTurnoverRequired.toLocaleString()}</b></span>
              </div>
              {remainingGameTurnover > 0 && (
                <p className="text-[10px] text-amber-200/80 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                  ⚠️ Complete Rs {remainingGameTurnover.toLocaleString()} more in game bets to unlock game deposit withdrawal.
                </p>
              )}
            </div>
          )}
          
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3.5">
            <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-[11px] text-amber-300 font-bold flex items-center justify-between">
              <span>Selected Wallet: <strong className="text-white">{wdSource === 'game' ? '🎮 Game Chips' : '📈 Plan Wallet'}</strong></span>
              <span className="font-mono font-black text-amber-200">
                Available: Rs {(wdSource === 'game' ? gameBalance : planBalance).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Account Holder Name</label>
              <input
                type="text"
                placeholder="Name as per Account"
                value={wdName}
                onChange={(e) => setWdName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 outline-none text-white text-xs focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Payment Method</label>
              <select
                value={wdMethod}
                onChange={(e) => setWdMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 outline-none text-white text-xs font-bold focus:border-blue-500 cursor-pointer"
              >
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="JazzCash">JazzCash</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Account Mobile Number</label>
              <input
                type="text"
                placeholder="03XXXXXXXXX"
                value={wdNumber}
                onChange={(e) => setWdNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 outline-none text-white text-xs font-mono focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">Withdrawal Amount (Rs)</label>
                <button
                  type="button"
                  onClick={() => setWdAmount(String(Math.floor(wdSource === 'game' ? gameBalance : planBalance)))}
                  className="text-[9px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  Max Available
                </button>
              </div>
              <input
                type="number"
                placeholder="Minimum Rs 600"
                value={wdAmount}
                onChange={(e) => setWdAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 outline-none text-white text-xs font-mono focus:border-blue-500"
              />
            </div>

            <button type="button" onClick={submitWithdraw} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-black text-xs shadow-lg transition mt-2 cursor-pointer active:scale-95">
              Submit Rs {wdAmount || '0'} Withdrawal Request
            </button>
          </div>
        </div>
      )}

      {/* REFERRAL / AGENT HUB */}
      {screen === 'referral' && (
        <div className="px-4 pt-5 flex-1 flex flex-col space-y-4 overflow-y-auto pb-24 scroll-container relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-white">Agent Referral Hub</h2>
              <p className="text-xs text-slate-400">Track downline members & rewards</p>
            </div>
            
            {activeReferralsCount >= 10 || isForceUnlocked ? (
              <span className="px-3 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40">
                Unlocked Agent
              </span>
            ) : (
              <span className="px-3 py-1 text-xs font-bold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/40">
                Standard Member
              </span>
            )}
          </div>

          <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 space-y-2">
            <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">Locked Agent Commissions</p>
            <h2 className="text-3xl font-mono font-bold text-amber-300">
              Rs <span>{lockedReferralBonus.toFixed(2)}</span>
            </h2>
            <p className="text-[10px] text-slate-400">10 Active Members required to unlock agent earnings</p>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-bold text-slate-300">Active Referrals Progress</p>
                <p className="text-2xl font-black text-white mt-0.5">
                  <span className="text-blue-400">{activeReferralsCount}</span> <span className="text-slate-500 text-base font-normal">/ 10 Active Goal</span>
                </p>
              </div>
              <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30">
                {Math.min(Math.round((activeReferralsCount / 10) * 100), 100)}%
              </span>
            </div>

            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="bg-gradient-to-r from-blue-600 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((activeReferralsCount / 10) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
            <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider">Your Referral Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}${window.location.pathname}?ref=${currentUser?.id || 'USER_ID'}`}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-300 outline-none truncate"
              />
              <button
                type="button"
                onClick={copyReferralLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  isCopied ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button
              type="button"
              onClick={shareWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-2.5 rounded-xl transition text-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Referral Link on WhatsApp</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleTransferReferralBonus}
            disabled={activeReferralsCount < 10 && !isForceUnlocked}
            className={`w-full py-3.5 rounded-2xl font-extrabold text-xs transition ${
              activeReferralsCount >= 10 || isForceUnlocked
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg'
                : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
            }`}
          >
            Transfer Commissions to Main Balance
          </button>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setReferralSubTab('network')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${referralSubTab === 'network' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                Referred Members ({referredMembersDetail.length})
              </button>
              <button
                type="button"
                onClick={() => setReferralSubTab('logs')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${referralSubTab === 'logs' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                Earning Logs ({referralLogs.length})
              </button>
            </div>

            {referralSubTab === 'network' && (
              <div className="p-3 space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMemberFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${memberFilter === 'all' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                  >
                    All ({referredMembersDetail.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberFilter('active')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${memberFilter === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                  >
                    Active ({referredMembersDetail.filter(m => m.isActive).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberFilter('non-active')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${memberFilter === 'non-active' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                  >
                    Non-Active ({referredMembersDetail.filter(m => !m.isActive).length})
                  </button>
                </div>

                {referredMembersDetail.filter(m => {
                  if (memberFilter === 'active') return m.isActive;
                  if (memberFilter === 'non-active') return !m.isActive;
                  return true;
                }).map((m) => (
                  <div key={m.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-xs">{m.fullName}</h4>
                        <p className="text-[10px] text-slate-400">{m.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${m.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {m.isActive ? 'Active' : 'Non-Active'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900 p-2 rounded-lg text-slate-300">
                      <div>Deposited: Rs {m.totalDeposited}</div>
                      <div>Bonus: +Rs {m.commissionEarned.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {referralSubTab === 'logs' && (
              <div className="divide-y divide-slate-800">
                {referralLogs.map((log) => (
                  <div key={log.id} className="p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white">{log.friendName}</p>
                      <p className="text-[10px] text-slate-400">{log.note}</p>
                    </div>
                    <p className="font-mono font-bold text-emerald-400">+Rs {log.bonus.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GAMES ARENA TAB (LOBBY + MINES + AVIATOR CRASH + DRAGON TIGER + ROULETTE + WINGO) */}
      {screen === 'crash' && (
        <div className={`flex-1 flex flex-col relative z-10 ${
          activeGameTab === 'roulette' || activeGameTab === 'wingo' || activeGameTab === 'dragon_tiger'
            ? 'min-h-0 overflow-hidden w-full h-full p-0'
            : activeGameTab === 'crash' || activeGameTab === 'double_crash'
              ? 'px-2 sm:px-4 pt-2 space-y-3 overflow-y-auto pb-10 scroll-container'
              : 'px-3 sm:px-4 pt-4 space-y-3 overflow-y-auto pb-24 scroll-container'
        }`}>
          
          {/* Active View: Lobby or Selected Game */}
          <div className={activeGameTab === 'lobby' ? '' : 'hidden'}>
            <GamesLobbySection
              balance={gameBalance}
              currentUser={currentUser}
              gameTurnoverRequired={gameTurnoverRequired}
              gameWagered={gameWagered}
              remainingGameTurnover={remainingGameTurnover}
              onSelectGame={(game) => {
                setToastMessage(null);
                setActiveGameTab(game);
              }}
              onNavigateToDeposit={() => setScreen('game_deposit')}
              onNavigateToWithdraw={() => {
                setWdSource('game');
                changeTab('withdraw');
              }}
              soundFX={soundFX}
            />
          </div>

          {activeGameTab === 'crash' && (
            <div className="h-full flex flex-col">
              <CrashGameSection
                balance={gameBalance}
                setBalance={setGameBalance}
                showToast={showToast}
                crashPredictions={crashPredictions}
                setCrashPredictions={setCrashPredictions}
                currentUser={currentUser}
                onBack={() => {
                  clearToast();
                  setActiveGameTab('lobby');
                }}
                onNavigateToDeposit={() => setScreen('game_deposit')}
                onBetPlaced={handleGameBetPlaced}
                addTransactionRecord={(type, amount, note) => {
                  handleGameTransaction(type, amount, note);
                }}
                soundFX={soundFX}
              />
            </div>
          )}

          {activeGameTab === 'double_crash' && (
            <div className="h-full flex flex-col">
              <DoubleCrashGameSection
                balance={gameBalance}
                setBalance={setGameBalance}
                showToast={showToast}
                crashPredictions={crashPredictions}
                setCrashPredictions={setCrashPredictions}
                currentUser={currentUser}
                onBack={() => {
                  clearToast();
                  setActiveGameTab('lobby');
                }}
                onNavigateToDeposit={() => setScreen('game_deposit')}
                onBetPlaced={handleGameBetPlaced}
                addTransactionRecord={(type, amount, note) => {
                  handleGameTransaction(type, amount, note);
                }}
                soundFX={soundFX}
              />
            </div>
          )}

          {activeGameTab === 'mines' && (
            <div>
              <MinesGameSection
                balance={gameBalance}
                setBalance={setGameBalance}
                showToast={showToast}
                currentUser={currentUser}
                onBack={() => {
                  clearToast();
                  setActiveGameTab('lobby');
                }}
                onNavigateToDeposit={() => setScreen('game_deposit')}
                onBetPlaced={handleGameBetPlaced}
                addTransactionRecord={(type, amount, note) => {
                  handleGameTransaction(type, amount, note);
                }}
                soundFX={soundFX}
              />
            </div>
          )}

          {activeGameTab === 'dragon_tiger' && (
            <div>
              <DragonTigerGameSection
                balance={gameBalance}
                setBalance={setGameBalance}
                showToast={showToast}
                currentUser={currentUser}
                onBack={() => {
                  clearToast();
                  setActiveGameTab('lobby');
                }}
                onNavigateToDeposit={() => setScreen('game_deposit')}
                onBetPlaced={handleGameBetPlaced}
                addTransactionRecord={(type, amount, note) => {
                  handleGameTransaction(type, amount, note);
                }}
                soundFX={soundFX}
              />
            </div>
          )}

          {activeGameTab === 'roulette' && (
            <RouletteGame onBack={() => {
              clearToast();
              setActiveGameTab('lobby');
            }} />
          )}

          {activeGameTab === 'wingo' && (
            <WinGoGame onBack={() => {
              clearToast();
              setActiveGameTab('lobby');
            }} />
          )}
        </div>
      )}

      {/* ADMIN CONTROL PANEL */}
      {screen === 'admin' && (
        <div className="px-4 pt-5 flex-1 flex flex-col space-y-4 overflow-y-auto pb-24 scroll-container relative z-10">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-sm font-extrabold text-white">ADMIN PANEL</h2>
              <p className="text-[10px] text-slate-400">Master Control System</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Logout
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setAdminTab('members')}
              className={`py-2 text-[10px] font-bold rounded-xl cursor-pointer ${adminTab === 'members' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              Members
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('profit_buy')}
              className={`py-2 text-[10px] font-bold rounded-xl cursor-pointer ${adminTab === 'profit_buy' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              Distribute
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('deposits')}
              className={`py-2 text-[10px] font-bold rounded-xl cursor-pointer ${adminTab === 'deposits' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              Deposits
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('withdrawals')}
              className={`py-2 text-[10px] font-bold rounded-xl cursor-pointer ${adminTab === 'withdrawals' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              Withdraws
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('crash_predictor')}
              className={`py-2 text-[10px] font-bold rounded-xl cursor-pointer ${adminTab === 'crash_predictor' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'}`}
            >
              Predictor
            </button>
          </div>

          {adminTab === 'members' && (
            <div className="space-y-3">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Total Registered Members: <strong className="text-white">{adminUsers.length}</strong></span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Admin Portal
                </span>
              </div>

              {adminUsers.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No registered members found</p>
              ) : (
                adminUsers.map((user) => {
                  const userTxs = adminTransactions.filter(t => t.user_id === user.id);
                  const userDeposits = userTxs.filter(t => t.type === 'Deposit' && t.status === 'Approved');
                  const pendingDeposits = userTxs.filter(t => t.type === 'Deposit' && t.status === 'Pending');
                  const userProfits = userTxs.filter(t => t.type === 'Profit' && t.status === 'Approved');
                  const totalProfitGiven = userProfits.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
                  const totalInvested = userDeposits.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

                  return (
                    <div key={user.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-white text-xs truncate">{user.full_name}</p>
                            {user.force_unlocked && (
                              <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 shrink-0">
                                Unlocked
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-blue-400 font-mono truncate">{user.email}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playClick();
                              setProfitModalUser(profitModalUser?.id === user.id ? null : user);
                              setManualProfitAmount('');
                              setManualProfitNote('Daily Profit');
                            }}
                            className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white text-[10px] font-black px-3 py-1.5 rounded-xl border border-emerald-400/40 shadow-md shadow-emerald-500/20 flex items-center gap-1 cursor-pointer active:scale-95 transition"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Give Profit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleForceUnlock(user.id)}
                            className="bg-slate-800 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-700 text-slate-300 cursor-pointer hover:bg-slate-700 hover:text-white transition"
                          >
                            {user.force_unlocked ? 'Lock' : 'Unlock'}
                          </button>
                        </div>
                      </div>

                      {/* Active Plans Display Badge Section */}
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" /> Active Plan(s):
                          </span>
                          <span className="text-xs font-black text-amber-400 font-mono">
                            {userDeposits.length} {userDeposits.length === 1 ? 'Plan' : 'Plans'}
                          </span>
                        </div>

                        {userDeposits.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {userDeposits.map((dep, idx) => {
                              const isGame = dep.category === 'game' || 
                                (dep.planName || '').toLowerCase().includes('game') || 
                                (dep.planName || '').toLowerCase().includes('chips');
                              return (
                                <div
                                  key={dep.id || idx}
                                  className={`px-2.5 py-1 rounded-lg border flex items-center gap-2 text-[10px] ${
                                    isGame
                                      ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                                      : 'bg-gradient-to-r from-slate-900 to-amber-950/50 border-amber-500/30 text-amber-300'
                                  }`}
                                >
                                  <span className="font-extrabold flex items-center gap-1">
                                    {isGame ? <Gamepad2 className="w-3 h-3 text-purple-400" /> : <TrendingUp className="w-3 h-3 text-amber-400" />}
                                    {dep.planName || (isGame ? `Game Deposit Rs ${dep.amount}` : `Plan ${dep.amount}`)}
                                  </span>
                                  <span className="text-emerald-400 font-mono font-bold">Rs {dep.amount}</span>
                                  {dep.dailyProfit ? (
                                    <span className="text-[9px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80 font-mono">
                                      +Rs {dep.dailyProfit}/day
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 italic pt-0.5">No active plans purchased yet</p>
                        )}

                        {pendingDeposits.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-800/80 mt-1.5">
                            <span className="text-[9px] text-yellow-400 font-bold uppercase">Pending Request:</span>
                            {pendingDeposits.map((pDep, pIdx) => {
                              const isGame = pDep.category === 'game' || 
                                (pDep.planName || '').toLowerCase().includes('game') || 
                                (pDep.planName || '').toLowerCase().includes('chips');
                              return (
                                <div
                                  key={pDep.id || pIdx}
                                  className={`px-2 py-0.5 rounded border text-[9px] flex items-center gap-1 ${
                                    isGame
                                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                                      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                                  }`}
                                >
                                  <span>{pDep.planName || (isGame ? 'Game Deposit' : 'Plan Deposit')}</span>
                                  <span className="font-mono font-bold">Rs {pDep.amount}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Quick Member Stats Summary */}
                      <div className="grid grid-cols-3 gap-2 text-[10px] bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 font-mono text-slate-400">
                        <div>Total Invested: <span className="text-white font-bold">Rs {totalInvested}</span></div>
                        <div>Active Plans: <span className="text-amber-400 font-bold">{userDeposits.length}</span></div>
                        <div>Total Profit: <span className="text-emerald-400 font-bold">Rs {totalProfitGiven.toFixed(2)}</span></div>
                      </div>

                      {/* Inline Give Profit Drawer */}
                      <AnimatePresence>
                        {profitModalUser?.id === user.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.98 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.98 }}
                            transition={{ duration: 0.25 }}
                            className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/40 space-y-3 pt-3 overflow-hidden"
                          >
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                Grant Daily Profit to {user.full_name}
                              </span>
                              <button
                                type="button"
                                onClick={() => setProfitModalUser(null)}
                                className="text-[10px] text-slate-500 hover:text-white font-bold cursor-pointer"
                              >
                                ✕ Close
                              </button>
                            </div>

                            {/* Preset Amount Buttons */}
                            <div>
                              <label className="text-[9px] font-bold uppercase text-slate-400 mb-1 block">Quick Amount Presets</label>
                              <div className="flex flex-wrap gap-1.5">
                                {[40, 90, 200, 330, 600, 1300, 2800].map((amt) => (
                                  <button
                                    key={amt}
                                    type="button"
                                    onClick={() => setManualProfitAmount(String(amt))}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                      manualProfitAmount === String(amt)
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-sm'
                                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/50'
                                    }`}
                                  >
                                    + Rs {amt}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Inputs & Submit */}
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={manualProfitAmount}
                                  onChange={(e) => setManualProfitAmount(e.target.value)}
                                  placeholder="Amount (Rs)"
                                  className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                                />
                                <input
                                  type="text"
                                  value={manualProfitNote}
                                  onChange={(e) => setManualProfitNote(e.target.value)}
                                  placeholder="Note / Plan Name"
                                  className="w-36 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  soundFX.playClick();
                                  handleGiveIndividualProfit(user.id);
                                }}
                                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <PlusCircle className="w-4 h-4" />
                                <span>Credit Rs {manualProfitAmount || '0'} Profit Now</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {adminTab === 'profit_buy' && (
            <div className="space-y-4">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-extrabold text-xs text-white uppercase">Global Profit Distribution</h3>
                <button
                  type="button"
                  onClick={distributeProfitAll}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Distribute Daily Profit to All Active Investors
                </button>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-extrabold text-xs text-white uppercase">Manual Plan Purchase</h3>
                <select
                  value={manualSelectedUser}
                  onChange={(e) => setManualSelectedUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-blue-500"
                >
                  <option value="">Select User</option>
                  {adminUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
                <select
                  value={manualSelectedPlanName}
                  onChange={(e) => setManualSelectedPlanName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-blue-500"
                >
                  {PLANS.map((p) => (
                    <option key={p.n} value={p.n}>{p.n} - Rs {p.i}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAdminManualBuyPlan}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Activate Selected Plan
                </button>
              </div>
            </div>
          )}

          {adminTab === 'deposits' && (() => {
            const allDepTxs = adminTransactions.filter(t => (t.type || '').toLowerCase() === 'deposit');
            
            const isGameTx = (t: Transaction) => {
              return t.category === 'game' || 
                (t.planName || '').toLowerCase().includes('game') || 
                (t.planName || '').toLowerCase().includes('chips');
            };

            const pendingCount = allDepTxs.filter(t => (t.status || '').toLowerCase() === 'pending').length;
            const gameCount = allDepTxs.filter(t => (t.status || '').toLowerCase() === 'pending' && isGameTx(t)).length;
            const planCount = allDepTxs.filter(t => (t.status || '').toLowerCase() === 'pending' && !isGameTx(t)).length;

            const filteredDeposits = allDepTxs.filter(t => {
              const statusMatch = adminDepositStatusFilter === 'pending'
                ? (t.status || '').toLowerCase() === 'pending'
                : true;
              
              if (!statusMatch) return false;

              if (adminDepositFilter === 'game') return isGameTx(t);
              if (adminDepositFilter === 'plan') return !isGameTx(t);
              return true;
            });

            return (
              <div className="space-y-4">
                {/* Top Statistics & Filter Controls */}
                <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-amber-400" />
                        Deposit Requests Hub
                      </h3>
                      <p className="text-[10px] text-slate-400">Review, verify and approve user payments</p>
                    </div>
                    <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAdminDepositStatusFilter('pending')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          adminDepositStatusFilter === 'pending'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Pending ({pendingCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminDepositStatusFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          adminDepositStatusFilter === 'all'
                            ? 'bg-blue-600 text-white font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All Records ({allDepTxs.length})
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setAdminDepositFilter('all')}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 border ${
                        adminDepositFilter === 'all'
                          ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800/80 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>All ({adminDepositStatusFilter === 'pending' ? pendingCount : allDepTxs.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminDepositFilter('game')}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 border ${
                        adminDepositFilter === 'game'
                          ? 'bg-purple-900/60 text-purple-200 border-purple-500 font-black shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800/80 hover:text-purple-300'
                      }`}
                    >
                      <Gamepad2 className="w-3 h-3 text-purple-400" />
                      <span>🎮 Game ({gameCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminDepositFilter('plan')}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 border ${
                        adminDepositFilter === 'plan'
                          ? 'bg-blue-900/60 text-blue-200 border-blue-500 font-black shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800/80 hover:text-blue-300'
                      }`}
                    >
                      <TrendingUp className="w-3 h-3 text-blue-400" />
                      <span>📈 Plans ({planCount})</span>
                    </button>
                  </div>
                </div>

                {filteredDeposits.length === 0 ? (
                  <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800 text-center space-y-2">
                    <p className="text-xs text-slate-400 font-medium">
                      No {adminDepositStatusFilter === 'pending' ? 'pending' : ''} {adminDepositFilter === 'game' ? 'game' : adminDepositFilter === 'plan' ? 'investment plan' : ''} deposits found
                    </p>
                    <p className="text-[10px] text-slate-600">New deposit requests will show up here in real-time</p>
                  </div>
                ) : (
                  filteredDeposits.map((t) => {
                    const isGame = isGameTx(t);
                    const depUser = adminUsers.find(u => u.id === t.user_id);
                    const isPending = (t.status || '').toLowerCase() === 'pending';
                    const isApproved = (t.status || '').toLowerCase() === 'approved';
                    const isRejected = (t.status || '').toLowerCase() === 'rejected';

                    return (
                      <div
                        key={t.id}
                        className={`p-4 rounded-2xl border transition shadow-lg space-y-3 relative overflow-hidden ${
                          isGame
                            ? 'bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-900/90 border-purple-500/40 shadow-purple-950/20'
                            : 'bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-900/90 border-blue-500/40 shadow-blue-950/20'
                        }`}
                      >
                        {/* Type Banner Header */}
                        <div className="flex justify-between items-start gap-2 border-b border-slate-800/80 pb-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isGame ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 shadow-sm">
                                  <Gamepad2 className="w-3 h-3 text-purple-400" />
                                  GAME CASH DEPOSIT
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1 shadow-sm">
                                  <TrendingUp className="w-3 h-3 text-blue-400" />
                                  INVESTMENT PLAN
                                </span>
                              )}

                              {isGame ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  🎮 4x Gameplay Turnover
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  📈 Daily ROI Plan
                                </span>
                              )}

                              {!isPending && (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  isApproved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                }`}>
                                  {t.status}
                                </span>
                              )}
                            </div>

                            {/* Plan or Chips Title */}
                            <div className="pt-0.5">
                              <h4 className="text-sm font-black text-white">
                                {isGame ? (
                                  <span className="text-purple-200">{t.planName || `Game Deposit Rs ${t.amount}`}</span>
                                ) : (
                                  <span className="text-amber-300">{t.planName || `Plan ${t.amount}`}</span>
                                )}
                              </h4>
                              {isGame ? (
                                <p className="text-[10px] text-purple-300/80 font-medium">
                                  User wants to add gaming chips to play Crash, Mines & Dragon Tiger
                                </p>
                              ) : (
                                <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                  <span>Daily Return: +Rs {t.dailyProfit || 0}/Day</span>
                                  <span className="text-slate-400 font-normal">• Total: Rs {((t.dailyProfit || 0) * 30).toLocaleString()} (30 Days)</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Amount Box */}
                          <div className="text-right shrink-0">
                            <span className="text-base font-black text-emerald-400 font-mono block">
                              Rs {Number(t.amount || 0).toLocaleString()}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">
                              {isGame ? 'Chips Value' : 'Plan Price'}
                            </span>
                          </div>
                        </div>

                        {/* Member & Transaction Details */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">User Information</span>
                            <span className="font-extrabold text-white block truncate">{depUser?.full_name || 'Member'}</span>
                            <span className="text-blue-400 font-mono block truncate text-[9px]">{depUser?.email || t.user_id}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Payment Method & Time</span>
                            <span className="font-bold text-emerald-300 block">EasyPaisa (03226951443)</span>
                            <span className="text-slate-400 font-mono block text-[9px]">{t.created_at || 'Recently submitted'}</span>
                          </div>
                        </div>

                        {/* Payment Screenshot Proof Box */}
                        {t.proof_url && (
                          <div className="bg-slate-950/90 p-2 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <img
                                src={t.proof_url}
                                alt="Payment Screenshot"
                                className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0 cursor-pointer hover:opacity-80 transition"
                                onClick={() => setAdminProofPreviewModal(t.proof_url || null)}
                              />
                              <div className="truncate">
                                <span className="text-[10px] font-bold text-slate-200 block truncate">Payment Screenshot Proof</span>
                                <span className="text-[9px] text-slate-500 font-mono block">Click to enlarge image</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setAdminProofPreviewModal(t.proof_url || null)}
                              className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 transition flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Proof</span>
                            </button>
                          </div>
                        )}

                        {/* Action Buttons for Pending Requests */}
                        {isPending ? (
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => updateStatus(t.id, 'Approved')}
                              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2 flex-1 rounded-xl text-xs font-black transition cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-98 flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Approve {isGame ? 'Game Deposit' : 'Plan'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(t.id, 'Rejected')}
                              className="bg-red-600/80 hover:bg-red-600 text-white py-2 px-4 rounded-xl text-xs font-bold transition cursor-pointer shadow-md active:scale-98"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-0.5">
                            <span>Status: <strong className={isApproved ? 'text-emerald-400' : 'text-red-400'}>{t.status}</strong></span>
                            <button
                              type="button"
                              onClick={() => updateStatus(t.id, isApproved ? 'Pending' : 'Approved')}
                              className="text-slate-500 hover:text-slate-300 underline cursor-pointer text-[9px]"
                            >
                              Change Status
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })()}

          {adminTab === 'withdrawals' && (
            <div className="space-y-3">
              {adminTransactions.filter(t => (t.status || '').toLowerCase() === 'pending' && (t.type || '').toLowerCase() === 'withdraw').length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No pending withdrawals</p>
              ) : (
                adminTransactions.filter(t => (t.status || '').toLowerCase() === 'pending' && (t.type || '').toLowerCase() === 'withdraw').map((t) => (
                  <div key={t.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-white">{t.name} ({t.method})</span>
                      <span className="text-xs font-bold text-amber-400">Rs {t.amount}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">Mobile No: {t.number}</p>
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => updateStatus(t.id, 'Approved')} className="bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 flex-1 rounded-lg text-xs font-bold transition cursor-pointer">
                        Approve
                      </button>
                      <button type="button" onClick={() => updateStatus(t.id, 'Rejected')} className="bg-red-600 hover:bg-red-500 text-white py-1.5 flex-1 rounded-lg text-xs font-bold transition cursor-pointer">
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {adminTab === 'crash_predictor' && (
            <div className="space-y-4">
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-500/40 space-y-4 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                        Crash Game Predictions (Next 10 Rounds)
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Edit and broadcast multipliers. All users across all devices crash at these exact targets.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      Cloud Sync Active
                    </span>
                  </div>
                </div>

                {/* Live Round Synchronization Card */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-center">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Active Round</span>
                      <span className="text-xs font-mono font-black text-amber-300">CR-{liveRoundInfo.roundIndex}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          liveRoundInfo.phase === 'WAITING'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : liveRoundInfo.phase === 'RUNNING'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          {liveRoundInfo.phase === 'WAITING' ? `⏳ WAITING (${liveRoundInfo.countdownSec}s)` :
                           liveRoundInfo.phase === 'RUNNING' ? `🚀 FLYING (${liveRoundInfo.currentMultiplier.toFixed(2)}x)` :
                           `💥 CRASHED AT ${liveRoundInfo.crashPoint.toFixed(2)}x`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Target: <strong className="text-amber-400">{liveRoundInfo.crashPoint.toFixed(2)}x</strong>
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 pt-0.5">
                        {lastSavedCloudTime ? `Last saved to cloud: ${new Date(lastSavedCloudTime).toLocaleTimeString()}` : 'Live Supabase Sync Enabled'}
                      </p>
                    </div>
                  </div>

                  {/* Refresh from cloud button */}
                  <button
                    type="button"
                    onClick={() => {
                      fetchCloudCrashConfig().then((cfg) => {
                        if (cfg && Array.isArray(cfg.predictions)) {
                          setCrashPredictions(cfg.predictions);
                          showToast('Refreshed predictions from Supabase cloud!');
                        }
                      });
                    }}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-slate-700 transition cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3 text-slate-400" />
                    <span>Reload Cloud</span>
                  </button>
                </div>

                {/* Quick Presets Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                    <span>Quick Multiplier Presets</span>
                    <span className="text-[9px] text-slate-500">Auto-fill 10 rounds</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const lowSafe = [1.35, 1.80, 2.10, 1.45, 1.95, 2.40, 1.25, 1.70, 2.20, 1.50];
                        setCrashPredictions(lowSafe);
                        showToast('Filled 10 rounds with Safe / Low targets (1.25x - 2.40x)');
                      }}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 p-2 rounded-xl text-left transition cursor-pointer"
                    >
                      <span className="text-[10px] font-bold text-emerald-400 block">🛡️ Safe / Low</span>
                      <span className="text-[9px] text-slate-400 font-mono">1.25x – 2.40x</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const balanced = [2.10, 1.45, 5.20, 1.85, 3.42, 1.12, 12.50, 2.05, 10.00, 4.20];
                        setCrashPredictions(balanced);
                        showToast('Filled 10 rounds with Balanced targets');
                      }}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 p-2 rounded-xl text-left transition cursor-pointer"
                    >
                      <span className="text-[10px] font-bold text-amber-400 block">⚖️ Balanced Mix</span>
                      <span className="text-[9px] text-slate-400 font-mono">1.12x – 12.50x</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const highRisk = [4.50, 6.20, 8.80, 14.50, 5.40, 18.00, 7.20, 10.50, 22.00, 6.80];
                        setCrashPredictions(highRisk);
                        showToast('Filled 10 rounds with High Multiplier targets (4.50x - 22.00x)');
                      }}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 p-2 rounded-xl text-left transition cursor-pointer"
                    >
                      <span className="text-[10px] font-bold text-purple-400 block">🚀 High Flights</span>
                      <span className="text-[9px] text-slate-400 font-mono">4.50x – 22.00x</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const randomized = Array.from({ length: 10 }, () => {
                          const r = Math.random();
                          if (r < 0.35) return parseFloat((Math.random() * (1.80 - 1.15) + 1.15).toFixed(2));
                          if (r < 0.70) return parseFloat((Math.random() * (3.50 - 1.85) + 1.85).toFixed(2));
                          if (r < 0.90) return parseFloat((Math.random() * (8.50 - 3.55) + 3.55).toFixed(2));
                          return parseFloat((Math.random() * (25.00 - 8.55) + 8.55).toFixed(2));
                        });
                        setCrashPredictions(randomized);
                        showToast('Generated 10 realistic random round predictions!');
                      }}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 p-2 rounded-xl text-left transition cursor-pointer"
                    >
                      <span className="text-[10px] font-bold text-cyan-400 block">🎲 Randomize 10</span>
                      <span className="text-[9px] text-slate-400 font-mono">Realistic RNG</span>
                    </button>
                  </div>
                </div>

                {/* 10 Predictions Editor List */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase pt-1">
                    <span>Next 10 Rounds Prediction Queue</span>
                    <span>Target Multiplier</span>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {crashPredictions.map((pred, idx) => {
                      const estimatedRoundIndex = (liveRoundInfo.phase === 'WAITING' ? liveRoundInfo.roundIndex : liveRoundInfo.roundIndex + 1) + idx;
                      const isNextRound = idx === 0;

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                            isNextRound
                              ? 'bg-amber-950/20 border-amber-500/50 shadow-sm'
                              : 'bg-slate-950 border-slate-800/90'
                          }`}
                        >
                          {/* Round Info */}
                          <div className="flex items-center gap-2.5">
                            <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border ${
                              isNextRound
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}>
                              #{idx + 1}
                            </span>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono font-bold text-white">
                                  CR-{estimatedRoundIndex}
                                </span>
                                {isNextRound && (
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    NEXT ROUND
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-500 font-mono block">
                                {isNextRound ? 'Takes effect immediately in next flight' : `Queue step +${idx}`}
                              </span>
                            </div>
                          </div>

                          {/* Multiplier Input & Steppers */}
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {/* Quick Stepper Buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setCrashPredictions(prev => {
                                    const updated = [...prev];
                                    updated[idx] = Math.max(1.01, parseFloat((updated[idx] - 0.10).toFixed(2)));
                                    return updated;
                                  });
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white px-1.5 py-1 rounded text-[10px] font-mono border border-slate-800 cursor-pointer"
                              >
                                -0.1
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCrashPredictions(prev => {
                                    const updated = [...prev];
                                    updated[idx] = parseFloat((updated[idx] + 0.10).toFixed(2));
                                    return updated;
                                  });
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white px-1.5 py-1 rounded text-[10px] font-mono border border-slate-800 cursor-pointer"
                              >
                                +0.1
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCrashPredictions(prev => {
                                    const updated = [...prev];
                                    updated[idx] = parseFloat((updated[idx] + 1.00).toFixed(2));
                                    return updated;
                                  });
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white px-1.5 py-1 rounded text-[10px] font-mono border border-slate-800 cursor-pointer"
                              >
                                +1.0
                              </button>
                            </div>

                            {/* Direct Value Input */}
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                step="0.01"
                                min="1.01"
                                value={pred}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  const newV = isNaN(val) ? 1.01 : Math.max(1.01, parseFloat(val.toFixed(2)));
                                  setCrashPredictions(prev => {
                                    const updated = [...prev];
                                    updated[idx] = newV;
                                    return updated;
                                  });
                                }}
                                className="w-24 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1 text-center font-mono font-black text-amber-300 outline-none text-xs"
                              />
                              <span className="text-slate-400 font-bold ml-1.5 text-xs">x</span>
                            </div>

                            {/* Remove button if more than 10 */}
                            {crashPredictions.length > 10 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCrashPredictions(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-slate-500 hover:text-red-400 p-1 transition cursor-pointer"
                                title="Remove round"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add / Reset Controls */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCrashPredictions(prev => [...prev, parseFloat((Math.random() * 4 + 1.3).toFixed(2))]);
                        showToast('Added round prediction to the end of queue!');
                      }}
                      className="flex-1 bg-slate-950 hover:bg-slate-850 text-slate-300 text-xs font-bold py-2 rounded-xl border border-slate-800 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>+ Add More Rounds</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCrashPredictions([2.10, 1.45, 5.20, 1.85, 3.42, 1.12, 12.50, 2.05, 10.00, 4.20]);
                        showToast('Reset back to standard 10 round defaults!');
                      }}
                      className="bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-800 transition cursor-pointer"
                    >
                      Reset 10
                    </button>
                  </div>
                </div>

                {/* Primary Save & Broadcast to Cloud Button */}
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    disabled={isSavingPredictions}
                    onClick={() => handleSavePredictionsToCloud()}
                    className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPredictions ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>SAVING & BROADCASTING TO ALL USERS...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-slate-950" />
                        <span>SAVE PREDICTIONS TO CLOUD (APPLY TO ALL USERS)</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center pt-2">
                    ⚡ Instant Sync: When saved, every active player in Crash and Double Crash will receive and fly to these exact crash points.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wallet Transfer Modal (Plan Wallet <-> Game Chips Wallet) */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4"
            onClick={() => setIsTransferModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Transfer Funds</h3>
                    <p className="text-[10px] text-slate-400">Move between Plan & Game Wallets</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Transfer Direction Switcher */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex-1 text-center p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">From</span>
                    <span className="font-extrabold text-white text-xs">
                      {transferDirection === 'plan_to_game' ? '📈 Plan Wallet' : '🎮 Game Chips'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block mt-0.5">
                      Rs {(transferDirection === 'plan_to_game' ? planBalance : gameBalance).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setTransferDirection(prev => prev === 'plan_to_game' ? 'game_to_plan' : 'plan_to_game');
                    }}
                    className="mx-2 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition cursor-pointer active:scale-95"
                    title="Switch Direction"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>

                  <div className="flex-1 text-center p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">To</span>
                    <span className="font-extrabold text-white text-xs">
                      {transferDirection === 'plan_to_game' ? '🎮 Game Chips' : '📈 Plan Wallet'}
                    </span>
                    <span className="text-[10px] font-mono text-blue-400 font-bold block mt-0.5">
                      Rs {(transferDirection === 'plan_to_game' ? gameBalance : planBalance).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block">Transfer Amount (Rs)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const max = transferDirection === 'plan_to_game' ? planBalance : gameBalance;
                      setTransferAmount(String(Math.floor(max)));
                    }}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Max Amount
                  </button>
                </div>
                <input
                  type="number"
                  placeholder="Enter amount (min Rs 10)"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3.5 outline-none text-white text-xs font-mono focus:border-indigo-500"
                />
              </div>

              {/* Quick Amount Pills */}
              <div className="grid grid-cols-4 gap-1.5">
                {[50, 100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTransferAmount(String(amt))}
                    className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold transition cursor-pointer border border-slate-700 text-center"
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              {/* Submit Transfer Button */}
              <button
                type="button"
                onClick={() => handleWalletTransfer(transferDirection, Number(transferAmount))}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-indigo-500/20 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Confirm Transfer</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Payment Screenshot Proof Modal Viewer */}
      <AnimatePresence>
        {adminProofPreviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
            onClick={() => setAdminProofPreviewModal(null)}
          >
            <div
              className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-sm w-full space-y-3 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  Payment Proof Screenshot
                </span>
                <button
                  type="button"
                  onClick={() => setAdminProofPreviewModal(null)}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[60vh]">
                <img
                  src={adminProofPreviewModal}
                  alt="Payment Screenshot Proof"
                  className="w-full h-full object-contain max-h-[60vh]"
                />
              </div>

              <div className="flex gap-2">
                <a
                  href={adminProofPreviewModal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl text-center transition cursor-pointer"
                >
                  Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setAdminProofPreviewModal(null)}
                  className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM NAVIGATION BAR - EXACTLY 4 TABS: HOME, PLANS, GAMES, REFERRALS */}
      {screen !== 'login' && screen !== 'admin' && !(screen === 'crash' && activeGameTab !== 'lobby') && (
        <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 max-w-md w-[calc(100%-1.5rem)] z-50 h-16 px-1.5 flex items-center justify-around bg-slate-900/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl shadow-black/80">
          <button
            type="button"
            onClick={() => changeTab('dashboard')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
              screen === 'dashboard'
                ? 'text-blue-400 bg-blue-500/10 font-bold border border-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">HOME</span>
          </button>
          
          <button
            type="button"
            onClick={() => changeTab('plans')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
              screen === 'plans'
                ? 'text-blue-400 bg-blue-500/10 font-bold border border-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">PLANS</span>
          </button>

          <button
            type="button"
            onClick={() => changeTab('crash')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
              screen === 'crash'
                ? 'text-emerald-400 bg-emerald-500/10 font-bold border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rocket className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">GAMES</span>
          </button>

          <button
            type="button"
            onClick={() => changeTab('referral')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
              screen === 'referral'
                ? 'text-blue-400 bg-blue-500/10 font-bold border border-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">REFERRALS</span>
          </button>
        </nav>
      )}

    </div>
  );
}
