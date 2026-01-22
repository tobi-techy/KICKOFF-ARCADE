import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import { ScreenName } from "../types";
import { ChevronLeft, Trophy, Medal, Crown, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { getLeaderboard, LeaderboardEntry } from "../lib/linera";
import { useLineraWallet } from "../lib/useLineraWallet";

export const LeaderboardScreen: React.FC = () => {
  const { setScreen } = useGame();
  const { playerAddress } = useLineraWallet();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard(50).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-slate-500">#{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30";
    if (rank === 2) return "bg-gradient-to-r from-slate-400/20 to-slate-500/10 border-slate-400/30";
    if (rank === 3) return "bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/30";
    return "bg-white/5 border-white/10";
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-yellow-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <div className="p-6 flex items-center gap-4 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-30">
        <button
          onClick={() => setScreen(ScreenName.HOME)}
          className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-arcade font-black tracking-tight text-white italic">
              LEADERBOARD
            </h2>
            <p className="text-[10px] text-yellow-400 font-black uppercase tracking-[0.2em]">
              Global Rankings
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 relative z-10">
        <div className="max-w-2xl mx-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No players yet. Be the first!
            </div>
          ) : (
            entries.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.player === playerAddress;
              return (
                <motion.div
                  key={entry.player}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${getRankBg(rank)} ${
                    isMe ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <div className="w-10 flex justify-center">{getRankIcon(rank)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white truncate">
                        {entry.username || entry.player.slice(0, 10) + "..."}
                      </span>
                      {isMe && (
                        <span className="text-[9px] bg-blue-500 px-2 py-0.5 rounded-full font-bold">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {entry.player.slice(0, 8)}...{entry.player.slice(-6)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-yellow-400">{entry.xp} XP</div>
                    <div className="text-[10px] text-slate-500 uppercase">
                      {entry.wins} Wins • Lvl {entry.level}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
