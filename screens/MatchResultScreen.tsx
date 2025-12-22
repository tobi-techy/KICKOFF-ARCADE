import React from "react";
import { useGame } from "../context/GameContext";
import { ScreenName } from "../types";
import { Button } from "../components/Button";
import {
  Trophy,
  XCircle,
  MinusCircle,
  Coins,
  ArrowRight,
  Target,
  Activity,
  RotateCcw,
  Star,
  Zap,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

export const MatchResultScreen: React.FC = () => {
  const { matchStats, setScreen, walletAddress } = useGame();

  if (!matchStats) return null;

  const isWin = matchStats.outcome === "WIN";
  const isLoss = matchStats.outcome === "LOSS";

  const headerColor = isWin
    ? "text-yellow-400"
    : isLoss
      ? "text-red-500"
      : "text-slate-300";

  const OutcomeIcon = isWin ? Trophy : isLoss ? XCircle : MinusCircle;

  return (
    <div className="flex flex-col h-full bg-[#020617] items-center pt-safe pb-6 px-6 relative overflow-hidden">
      {/* Immersive Victory/Defeat Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {isWin && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-transparent"></div>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: -20, x: Math.random() * 400 - 200, opacity: 1 }}
                animate={{
                  y: 800,
                  rotate: 360,
                  opacity: 0,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
                className="absolute top-0 left-1/2 text-yellow-500/30"
              >
                <Star size={Math.random() * 20 + 10} fill="currentColor" />
              </motion.div>
            ))}
          </>
        )}
        {isLoss && (
          <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 via-transparent to-transparent"></div>
        )}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      </div>

      <div className="flex-1 w-full max-w-lg flex flex-col items-center justify-center z-10 py-8">
        {/* Outcome Badge */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12 }}
          className="flex flex-col items-center mb-8"
        >
          <div
            className={`relative p-8 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl mb-6`}
          >
            <OutcomeIcon
              className={`w-24 h-24 ${headerColor} drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]`}
            />
            {isWin && (
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -inset-4 border-2 border-yellow-400/30 rounded-full"
              />
            )}
          </div>

          <h1
            className={`text-7xl font-arcade font-black ${headerColor} tracking-tighter uppercase italic drop-shadow-2xl`}
          >
            {matchStats.outcome}
          </h1>
        </motion.div>

        {/* Score Board */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-8 mb-12"
        >
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-blue-600 border border-white/20 mb-2"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase">
              HOME
            </span>
          </div>
          <div className="text-6xl font-arcade font-black text-white flex items-center gap-4">
            <span>{matchStats.homeScore}</span>
            <span className="text-slate-700 text-4xl">-</span>
            <span>{matchStats.awayScore}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-red-600 border border-white/20 mb-2"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase">
              AWAY
            </span>
          </div>
        </motion.div>

        {/* Statistics & Rewards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {/* Detailed Stats */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-[2rem] p-6"
          >
            <h3 className="text-slate-500 text-[10px] font-black uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
              <Activity className="w-3 h-3" /> Match Stats
            </h3>
            <div className="space-y-4">
              <StatRow
                label="Possession"
                value={`${matchStats.possession}%`}
                icon={<Zap className="w-3 h-3 text-yellow-400" />}
              />
              <StatRow
                label="Shots"
                value={matchStats.homeScore + 3}
                icon={<Target className="w-3 h-3 text-blue-400" />}
              />
              <StatRow
                label="Pass Acc."
                value="84%"
                icon={<ArrowRight className="w-3 h-3 text-emerald-400" />}
              />
            </div>
          </motion.div>

          {/* Rewards */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-[2rem] p-6 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-slate-500 text-[10px] font-black uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                <Coins className="w-3 h-3" /> Earned
              </h3>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-arcade font-black text-white">
                  +{matchStats.xpEarned}
                </span>
                <span className="text-yellow-400 font-black text-xs mb-2">
                  XP
                </span>
              </div>
            </div>

            {!walletAddress ? (
              <div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">
                    NFT Bonus
                  </span>
                  <span className="text-red-400 font-black uppercase italic">
                    Locked
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-green-400 font-bold uppercase">
                    On-Chain Sync
                  </span>
                  <span className="text-green-400 font-black uppercase italic">
                    Ready
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-lg space-y-3 z-20 pb-safe">
        {!walletAddress ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col gap-3"
          >
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => setScreen(ScreenName.WALLET_CONNECT)}
              className="h-16 group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                CLAIM ON MOVEMENT <ChevronRight className="w-5 h-5" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setScreen(ScreenName.HOME)}
              className="text-slate-500 hover:text-white"
            >
              <span className="flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> REPLAY WITHOUT SAVING
              </span>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col gap-3"
          >
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => setScreen(ScreenName.REWARDS)}
              className="h-16"
            >
              PROCEED TO REWARDS{" "}
              <ChevronRight className="w-5 h-5 inline ml-1" />
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setScreen(ScreenName.HOME)}
            >
              RETURN TO LOBBY
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const StatRow = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      {icon}
      {label}
    </div>
    <div className="text-sm font-arcade font-black text-white">{value}</div>
  </div>
);
