import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import { ScreenName } from "../types";
import { Button } from "../components/Button";
import {
  Home,
  Share2,
  Star,
  Lock,
  Trophy,
  Zap,
  ChevronRight,
  ShieldCheck,
  Gift,
  Loader2,
  Coins,
  LogOut,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLineraWallet } from "../lib/useLineraWallet";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";
const DAY_MS = 86_400_000; // 24 hours in milliseconds

export const RewardsScreen: React.FC = () => {
  const { setScreen, xp: localXp, walletAddress } = useGame();
  const { profile, authenticated, loading, refreshProfile, logout } = useLineraWallet();
  const [claiming, setClaiming] = useState(false);

  // Refresh profile on mount
  useEffect(() => {
    if (authenticated) refreshProfile();
  }, [authenticated, refreshProfile]);

  // Use on-chain data if available, fallback to local
  const xp = profile?.xp ?? localXp;
  const coins = profile?.coins ?? 0;
  const matchesPlayed = profile?.matchesPlayed ?? 0;
  const wins = profile?.wins ?? 0;
  const losses = profile?.losses ?? 0;
  const draws = profile?.draws ?? 0;
  const level = profile?.level ?? Math.floor(xp / 500) + 1;
  const progress = ((xp % 500) / 500) * 100;
  const nextLevelXp = 500 - (xp % 500);

  // Check if daily reward is available (24h since last claim)
  const lastClaim = profile?.lastDailyClaim ? Number(profile.lastDailyClaim) / 1000 : 0; // Convert microseconds to ms
  const canClaimDaily = Date.now() - lastClaim >= DAY_MS;
  const timeUntilClaim = Math.max(0, DAY_MS - (Date.now() - lastClaim));
  const hoursLeft = Math.floor(timeUntilClaim / 3600000);
  const minsLeft = Math.floor((timeUntilClaim % 3600000) / 60000);

  const claimDailyReward = async () => {
    if (!canClaimDaily || claiming) return;
    setClaiming(true);
    try {
      // Ensure player is registered first
      if (!profile) {
        console.error("Profile not loaded");
        setClaiming(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/linera/daily-reward`, { method: "POST" });
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Wait for blockchain to sync
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refreshProfile();
        // Double refresh to ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 500));
        await refreshProfile();
      } else {
        console.error("Claim failed:", data.error);
      }
    } catch (e) {
      console.error("Failed to claim daily reward:", e);
    }
    setClaiming(false);
  };

  const handleLogout = async () => {
    await refreshProfile(); // Refresh before logout
    logout();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] text-white overflow-hidden selection:bg-blue-500/30 ">
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40vw] h-[40vw] bg-yellow-500/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-30 pt-safe">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-arcade font-black italic tracking-tight leading-none">
              DASHBOARD
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {loading ? (
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full ${authenticated ? "bg-green-500" : "bg-yellow-500"} animate-pulse`} />
              )}
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                {authenticated ? "On-Chain Verified" : "Local Only"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">
              Network
            </div>
            <div className="text-xs font-black text-blue-400 italic mt-1">
              CONWAY_TESTNET
            </div>
          </div>
          {authenticated && (
            <button
              onClick={handleLogout}
              className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5 text-red-400" />
            </button>
          )}
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto no-scrollbar px-4 py-6"
      >
        <div className="max-w-4xl mx-auto space-y-8">
        {/* Progress Visualization Hero */}
        <motion.div
          variants={itemVariants}
          className="relative group rounded-[2.5rem] p-1 bg-linear-to-br from-blue-500/20 via-white/5 to-purple-500/20 overflow-hidden"
        >
          <div className="bg-slate-950/80 backdrop-blur-3xl rounded-[2.4rem] p-8 relative overflow-hidden">
            {/* Background stats flair */}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex justify-between items-start relative z-10 mb-8">
              <div>
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mb-2">
                  Pilot Rank
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-7xl font-arcade font-black italic text-white leading-none">
                    {level}
                  </div>
                  <div className="h-12 w-px bg-white/10" />
                  <div>
                    <div className="text-sm font-black text-blue-400 uppercase italic">
                      {level >= 10 ? "Legend" : level >= 5 ? "Veteran" : "Rookie"}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      {matchesPlayed} Matches Played
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right space-y-2">
                <div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mb-1">
                    Total XP
                  </div>
                  <div className="text-2xl font-arcade font-black text-yellow-400 flex items-center justify-end gap-1">
                    {xp} <Zap className="w-4 h-4 fill-current" />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mb-1">
                    Coins
                  </div>
                  <div className="text-2xl font-arcade font-black text-amber-500 flex items-center justify-end gap-1">
                    {coins} <Coins className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Match Record */}
            <div className="flex justify-center gap-6 mb-6 py-3 bg-white/5 rounded-xl">
              <div className="text-center">
                <div className="text-2xl font-arcade font-black text-green-400">{wins}</div>
                <div className="text-[9px] text-slate-500 font-bold uppercase">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-arcade font-black text-slate-400">{draws}</div>
                <div className="text-[9px] text-slate-500 font-bold uppercase">Draws</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-arcade font-black text-red-400">{losses}</div>
                <div className="text-[9px] text-slate-500 font-bold uppercase">Losses</div>
              </div>
              <div className="text-center border-l border-white/10 pl-6">
                <div className="text-2xl font-arcade font-black text-white">
                  {matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0}%
                </div>
                <div className="text-[9px] text-slate-500 font-bold uppercase">Win Rate</div>
              </div>
            </div>

            {/* Futuristic Progress Bar */}
            <div className="relative space-y-3">
              <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">
                <span>LVL {level}</span>
                <span className="text-white">
                  {nextLevelXp} XP TO RANK {level + 1}
                </span>
              </div>
              <div className="h-4 w-full bg-slate-900/50 rounded-full p-1 border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-300 rounded-full relative"
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:20px_20px] animate-[shimmer_2s_infinite_linear]" />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Season Rewards Section */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
              <Gift className="w-4 h-4" /> Season Rewards
            </h3>
            <span className="text-[10px] font-bold text-blue-400 italic">
              View All
            </span>
          </div>

          {/* Daily Reward Card */}
          {authenticated && (
            <motion.button
              onClick={claimDailyReward}
              disabled={!canClaimDaily || claiming}
              className={`w-full p-5 rounded-2xl border transition-all ${
                canClaimDaily
                  ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-amber-500/40 hover:border-amber-400"
                  : "bg-white/5 border-white/10"
              }`}
              whileTap={canClaimDaily ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${canClaimDaily ? "bg-amber-500/20" : "bg-white/5"}`}>
                    {claiming ? (
                      <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                    ) : (
                      <Calendar className={`w-6 h-6 ${canClaimDaily ? "text-amber-400" : "text-slate-500"}`} />
                    )}
                  </div>
                  <div className="text-left">
                    <div className={`font-black uppercase ${canClaimDaily ? "text-amber-400" : "text-slate-400"}`}>
                      Daily Reward
                    </div>
                    <div className="text-xs text-slate-500">
                      {canClaimDaily ? "+50 XP, +100 Coins" : `Available in ${hoursLeft}h ${minsLeft}m`}
                    </div>
                  </div>
                </div>
                {canClaimDaily && (
                  <div className="px-4 py-2 bg-amber-500 text-black font-black text-sm rounded-lg">
                    CLAIM
                  </div>
                )}
              </div>
            </motion.button>
          )}

          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {/* Reward 1: Claimed */}
            <RewardCard
              title="Starter Pack"
              subtitle="Common Kit"
              status="CLAIMED"
              icon={<Star className="w-6 h-6 text-yellow-400" />}
              active
            />

            {/* Reward 2: Available */}
            <RewardCard
              title="Pro Scout"
              subtitle="Elite Player"
              status="UNLOCKS LVL 2"
              icon={<Trophy className="w-6 h-6 text-slate-600" />}
              locked={level < 2}
            />

            {/* Reward 3: Locked */}
            <RewardCard
              title="Stadium Key"
              subtitle="Home Arena"
              status="UNLOCKS LVL 5"
              icon={<Lock className="w-6 h-6 text-slate-600" />}
              locked
            />
          </div>
        </motion.div>

        {/* Quest/Activity List */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] px-2">
            Recent Activity
          </h3>
          <div className="space-y-3">
            <ActivityItem
              title="Movement Cup Win"
              xp="+150"
              time="2m ago"
              color="text-green-400"
            />
            <ActivityItem
              title="Daily Training"
              xp="+50"
              time="1h ago"
              color="text-blue-400"
            />
          </div>
        </motion.div>
        </div>
      </motion.div>

      {/* Footer Controls */}
      <div className="p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 pb-safe z-30">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => {}}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <span className="flex items-center justify-center gap-2 text-sm">
                <Share2 className="w-4 h-4" /> SHARE
              </span>
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setScreen(ScreenName.HOME)}
              className="shadow-blue-600/20"
            >
              <span className="flex items-center justify-center gap-2 text-sm">
                <Home className="w-4 h-4" /> HOME
              </span>
            </Button>
          </div>

          {walletAddress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-3"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-[10px] text-blue-400 font-mono tracking-tight uppercase">
                  ID: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-full transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
              </button>
            </motion.div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

const RewardCard = ({
  title,
  subtitle,
  status,
  icon,
  locked = false,
  active = false,
}: {
  title: string;
  subtitle: string;
  status: string;
  icon: React.ReactNode;
  locked?: boolean;
  active?: boolean;
}) => (
  <div
    className={`min-w-[160px] p-6 rounded-3xl border transition-all duration-300 ${
      active
        ? "bg-yellow-400/5 border-yellow-400/30"
        : "bg-white/5 border-white/5"
    } ${locked ? "opacity-40 grayscale" : "opacity-100"}`}
  >
    <div className="relative mb-6">
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
          active ? "bg-yellow-400/10" : "bg-slate-800"
        }`}
      >
        {icon}
      </div>
      {active && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded italic">
          NEW
        </div>
      )}
    </div>
    <div className="space-y-1">
      <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">
        {subtitle}
      </div>
      <div className="text-sm font-black text-white italic truncate">
        {title}
      </div>
      <div
        className={`text-[8px] font-black uppercase mt-3 tracking-widest ${
          active ? "text-yellow-400" : "text-slate-600"
        }`}
      >
        {status}
      </div>
    </div>
  </div>
);

const ActivityItem = ({
  title,
  xp,
  time,
  color,
}: {
  title: string;
  xp: string;
  time: string;
  color: string;
}) => (
  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
    <div className="flex items-center gap-4">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      <div>
        <div className="text-sm font-black text-white italic">{title}</div>
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          {time}
        </div>
      </div>
    </div>
    <div className={`text-sm font-arcade font-black italic ${color}`}>{xp}</div>
  </div>
);
