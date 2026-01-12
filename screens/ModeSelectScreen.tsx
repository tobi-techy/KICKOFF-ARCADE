import React from "react";
import { useGame } from "../context/GameContext";
import { ScreenName, GameMode, Difficulty } from "../types";
import {
  ChevronLeft,
  User,
  Users,
  Trophy,
  Zap,
  Globe,
  Clock,
  Gauge,
} from "lucide-react";
import { motion } from "framer-motion";

export const ModeSelectScreen: React.FC = () => {
  const { setScreen, setGameMode, matchDuration, setMatchDuration, difficulty, setDifficulty } = useGame();

  const handleSelectMode = (mode: GameMode) => {
    setGameMode(mode);
    if (mode === GameMode.MULTIPLAYER) {
      // Go to team select first, then lobby
      setScreen(ScreenName.TEAM_SELECT);
    } else {
      setScreen(ScreenName.TEAM_SELECT);
    }
  };

  const durations = [
    { label: "5 MINS", value: 300 },
    { label: "10 MINS", value: 600 },
    { label: "30 MINS", value: 1800 },
  ];

  const difficulties: { label: string; value: Difficulty; color: string }[] = [
    { label: "EASY", value: "easy", color: "bg-green-600 border-green-400 shadow-green-500/40" },
    { label: "MEDIUM", value: "medium", color: "bg-yellow-600 border-yellow-400 shadow-yellow-500/40" },
    { label: "HARD", value: "hard", color: "bg-red-600 border-red-400 shadow-red-500/40" },
  ];

  const modes = [
    {
      id: GameMode.SINGLE_PLAYER,
      title: "Single Player",
      subtitle: "VS AI ENGINE",
      description: "Hone your skills against our advanced AI algorithms.",
      icon: <User className="w-8 h-8 text-blue-400" />,
      color: "from-blue-600/20 to-blue-900/40",
      borderColor: "border-blue-500/30",
      stats: { label: "Difficulty", value: "Adaptive" },
      active: true,
    },
    {
      id: GameMode.MULTIPLAYER,
      title: "Multiplayer",
      subtitle: "PVP SHOWDOWN",
      description: "Challenge players across the globe in real-time matches.",
      icon: <Users className="w-8 h-8 text-purple-400" />,
      color: "from-purple-600/20 to-purple-900/40",
      borderColor: "border-purple-500/30",
      stats: { label: "Status", value: "Live" },
      active: true,
    },
    {
      id: GameMode.TOURNAMENT,
      title: "Tournament",
      subtitle: "SEASON 1 CUPS",
      description: "Climb the brackets and win exclusive NFT trophies.",
      icon: <Trophy className="w-8 h-8 text-yellow-400" />,
      color: "from-yellow-600/20 to-yellow-900/40",
      borderColor: "border-yellow-500/30",
      stats: { label: "Prize Pool", value: "NFT Packs" },
      active: true,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#020617] text-white overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
      </div>

      {/* Header */}
      <div className="p-6 flex items-center gap-4 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-30 pt-safe">
        <button
          onClick={() => setScreen(ScreenName.HOME)}
          className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all active:scale-90"
        >
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div>
          <h2 className="text-2xl font-arcade font-black tracking-tight text-white italic leading-none">
            SELECT MODE
          </h2>
          <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mt-1">
            Arena Selection Protocol
          </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-12 relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Match Duration Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                Match Duration
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {durations.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setMatchDuration(d.value)}
                  className={`py-4 rounded-2xl border-2 font-arcade font-bold italic transition-all active:scale-95 ${
                    matchDuration === d.value
                      ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Difficulty Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Gauge className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                AI Difficulty
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {difficulties.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={`py-4 rounded-2xl border-2 font-arcade font-bold italic transition-all active:scale-95 ${
                    difficulty === d.value
                      ? `${d.color} text-white shadow-[0_0_20px]`
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center sm:text-left"
          >
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.4em] mb-2">
              Mission Control
            </h3>
            <p className="text-slate-400 text-sm max-w-md">
              Choose your competitive environment. Higher difficulty modes yield
              greater XP rewards on the Lineara network.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4">
            {modes.map((mode, idx) => (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <button
                  onClick={() => mode.active && handleSelectMode(mode.id)}
                  disabled={!mode.active}
                  className={`w-full relative group overflow-hidden rounded-3xl border ${mode.borderColor} bg-linear-to-r ${mode.color} p-6 text-left transition-all hover:scale-[1.01] active:scale-[0.99] hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]`}
                >
                  <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                    <div className="p-5 bg-black/40 rounded-2xl border border-white/10 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                      {mode.icon}
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h4 className="text-2xl font-arcade font-black italic text-white leading-none">
                          {mode.title}
                        </h4>
                        <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-black rounded italic w-fit mx-auto sm:mx-0">
                          {mode.subtitle}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs font-medium max-w-sm">
                        {mode.description}
                      </p>
                    </div>

                    <div className="hidden md:flex flex-col items-end shrink-0">
                      <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">
                        {mode.stats.label}
                      </div>
                      <div className="text-sm font-arcade font-bold text-white uppercase italic">
                        {mode.stats.value}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Highlight */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-6 bg-black/40 border-t border-white/5 backdrop-blur-md pb-safe">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-blue-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Global Servers: <span className="text-green-500">OPTIMAL</span>
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-400/10 rounded-full border border-yellow-400/20">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest italic">
              2X XP ACTIVE TODAY
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
