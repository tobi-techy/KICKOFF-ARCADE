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

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const getRankBg = (rank: number, isMe: boolean) => {
    if (isMe) return "bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30";
    if (rank <= 3) return "bg-white/5 border-white/10";
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
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No players yet. Be the first!
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              <div className="flex items-end justify-center gap-4 mb-10 pt-8">
                {/* 2nd Place */}
                {top3[1] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-center"
                  >
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center mb-3 border-4 border-slate-400 shadow-lg ${top3[1].player === playerAddress ? "ring-4 ring-blue-500" : ""}`}>
                      <span className="text-2xl font-black text-slate-800">2</span>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-white truncate max-w-[100px]">
                        {top3[1].username || "Player"}
                      </div>
                      <div className="text-lg font-black text-slate-300">{top3[1].xp} XP</div>
                      <div className="text-[10px] text-slate-500">{top3[1].wins} wins</div>
                    </div>
                    <div className="w-24 h-20 bg-gradient-to-t from-slate-600 to-slate-500 rounded-t-lg mt-3 flex items-center justify-center">
                      <Medal className="w-8 h-8 text-slate-300" />
                    </div>
                  </motion.div>
                )}

                {/* 1st Place */}
                {top3[0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center -mt-8"
                  >
                    <Crown className="w-10 h-10 text-yellow-400 mb-2 animate-pulse" />
                    <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center mb-3 border-4 border-yellow-400 shadow-xl ${top3[0].player === playerAddress ? "ring-4 ring-blue-500" : ""}`}>
                      <span className="text-3xl font-black text-yellow-900">1</span>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-bold text-white truncate max-w-[120px]">
                        {top3[0].username || "Player"}
                      </div>
                      <div className="text-xl font-black text-yellow-400">{top3[0].xp} XP</div>
                      <div className="text-[10px] text-slate-500">{top3[0].wins} wins</div>
                    </div>
                    <div className="w-28 h-28 bg-gradient-to-t from-yellow-600 to-yellow-500 rounded-t-lg mt-3 flex items-center justify-center">
                      <Trophy className="w-10 h-10 text-yellow-300" />
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center"
                  >
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mb-3 border-4 border-amber-600 shadow-lg ${top3[2].player === playerAddress ? "ring-4 ring-blue-500" : ""}`}>
                      <span className="text-2xl font-black text-amber-900">3</span>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-white truncate max-w-[100px]">
                        {top3[2].username || "Player"}
                      </div>
                      <div className="text-lg font-black text-amber-500">{top3[2].xp} XP</div>
                      <div className="text-[10px] text-slate-500">{top3[2].wins} wins</div>
                    </div>
                    <div className="w-24 h-16 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg mt-3 flex items-center justify-center">
                      <Medal className="w-8 h-8 text-amber-400" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Rest of leaderboard */}
              <div className="space-y-2">
                {rest.map((entry, idx) => {
                  const rank = idx + 4;
                  const isMe = entry.player === playerAddress;
                  return (
                    <motion.div
                      key={entry.player}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${getRankBg(rank, isMe)}`}
                    >
                      <div className="w-10 text-center">
                        <span className="text-sm font-bold text-slate-500">#{rank}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate">
                            {entry.username || "Player"}
                          </span>
                          {isMe && (
                            <span className="text-[9px] bg-blue-500 px-2 py-0.5 rounded-full font-bold">
                              YOU
                            </span>
                          )}
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
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
