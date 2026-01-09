import React from "react";
import { useGame } from "../context/GameContext";
import { TEAMS } from "../constants";
import { ScreenName } from "../types";
import {
  ChevronLeft,
  Shield,
  Zap,
  Swords,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { motion } from "framer-motion";

export const TeamSelectScreen: React.FC = () => {
  const { setScreen, selectTeam } = useGame();

  const handleSelect = (team: (typeof TEAMS)[0]) => {
    selectTeam(team);
    setScreen(ScreenName.SQUAD_SELECT);
  };

  // Generate deterministic stats based on index for demo purposes
  const getStats = (idx: number) => {
    return {
      att: 70 + ((idx * 7) % 25),
      mid: 72 + ((idx * 4) % 20),
      def: 68 + ((idx * 9) % 27),
    };
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] text-white overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-purple-600 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-30 pt-safe">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setScreen(ScreenName.HOME)}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all active:scale-90"
          >
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <h2 className="text-2xl font-arcade font-black tracking-tight text-white italic leading-none">
              SELECT CLUB
            </h2>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mt-1">
              Tournament Season 1
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">
            Global Pro League
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mb-8 text-center sm:text-left"
          >
            Choose your representative
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
            {TEAMS.map((team, idx) => {
              const stats = getStats(idx);
              const avg = Math.round((stats.att + stats.mid + stats.def) / 3);

              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.4 }}
                >
                  <button
                    onClick={() => handleSelect(team)}
                    className="w-full relative group overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/40 p-1 transition-all hover:border-white/30 hover:shadow-[0_0_40px_rgba(0,0,0,0.5)] active:scale-[0.98]"
                  >
                    <div className="relative overflow-hidden rounded-[1.8rem] bg-slate-950 flex flex-col sm:flex-row h-full">
                      {/* Left: Brand Color & Badge */}
                      <div
                        className="w-full sm:w-40 h-32 sm:h-auto flex items-center justify-center relative overflow-hidden shrink-0"
                        style={{
                          background: `linear-gradient(180deg, ${team.primaryColor}, ${team.secondaryColor})`,
                        }}
                      >
                        {/* Abstract Background for Badge Section */}
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                        <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />

                        <div className="relative z-10 p-6 bg-white/10 backdrop-blur-md rounded-full border-4 border-white/20 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                          <Shield
                            className="w-12 h-12 text-white drop-shadow-lg"
                            fill="currentColor"
                            fillOpacity={0.4}
                          />
                        </div>

                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-white/40 uppercase tracking-widest italic">
                          {team.abbr}
                        </div>
                      </div>

                      {/* Right: Info & Stats */}
                      <div className="flex-1 p-6 flex flex-col justify-between text-left">
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-3xl font-arcade font-black text-white italic leading-none group-hover:text-yellow-400 transition-colors">
                                {team.name}
                              </h3>
                              <p className="text-[10px] text-slate-500 font-bold mt-1 tracking-widest uppercase">
                                Linera Regional Div
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                                Overall
                              </div>
                              <div className="text-3xl font-arcade font-black text-white">
                                {avg}
                              </div>
                            </div>
                          </div>

                          {/* Stat Bars */}
                          <div className="space-y-4">
                            <StatBar
                              label="Attack"
                              value={stats.att}
                              icon={<Swords className="w-3 h-3" />}
                              color="bg-red-500"
                            />
                            <StatBar
                              label="Midfield"
                              value={stats.mid}
                              icon={<Zap className="w-3 h-3" />}
                              color="bg-blue-400"
                            />
                            <StatBar
                              label="Defense"
                              value={stats.def}
                              icon={<ShieldAlert className="w-3 h-3" />}
                              color="bg-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="mt-8 flex items-center justify-between">
                          <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="w-6 h-6 rounded-full border border-slate-800 bg-slate-800"
                              />
                            ))}
                            <div className="text-[8px] text-slate-500 self-center ml-4 font-bold uppercase tracking-widest">
                              Local Fanbase
                            </div>
                          </div>
                          <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest group-hover:bg-yellow-400 group-hover:text-black transition-all">
                            Select Club
                          </div>
                        </div>
                      </div>

                      {/* Interactive Highlight */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="p-6 text-center bg-black/40 border-t border-white/5 backdrop-blur-md pb-safe">
        <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.5em]">
          Strategic selection impacts starting line-up chemistry
        </p>
      </div>
    </div>
  );
};

const StatBar = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) => {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
        <div className="flex items-center gap-1.5 text-slate-400">
          {icon}
          {label}
        </div>
        <span className="text-white">{value}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          className={`h-full ${color} shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
        />
      </div>
    </div>
  );
};
