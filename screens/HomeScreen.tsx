import React from "react";
import { useGame } from "../context/GameContext";
import { ScreenName } from "../types";
import { Button } from "../components/Button";
import {
  Trophy,
  Zap,
  Shield,
  Globe,
  ChevronRight,
  Activity,
  Cpu,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";

export const HomeScreen: React.FC = () => {
  const { setScreen, walletAddress } = useGame();

  return (
    <div className="flex flex-col h-full items-center justify-between bg-[#020617] text-white relative overflow-hidden crt-effect">
      {/* --- BACKGROUND LAYER --- */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated Grid Floor */}
        <div
          className="absolute inset-0 arcade-grid opacity-20"
          style={{
            perspective: "1000px",
            transform: "rotateX(60deg) translateY(-20%)",
            transformOrigin: "top",
          }}
        />

        {/* Neon Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-blue-600/20 rounded-full blur-[140px] animate-pulse-glow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-orange-600/15 rounded-full blur-[140px] animate-pulse-glow delay-2000" />

        {/* Scanlines */}
        <div className="scanline-overlay opacity-30" />
      </div>

      {/* --- HEADER STATUS BAR --- */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full h-12 bg-white/5 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-6"
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest font-arcade italic">
              System: Stable
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Activity className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-arcade italic">
              Latency: 14ms
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
            <Globe className="w-3 h-3 text-blue-400 animate-spin-slow" />
            <span className="text-[9px] font-black text-white/80 uppercase tracking-widest">
              Movement Testnet
            </span>
          </div>
          {/*{walletAddress && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
              <Wallet className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
          )}*/}
        </div>
      </motion.div>

      {/* --- HERO SECTION --- */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 w-full px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8"
        >
          {/* Trophy Glow */}
          <div className="absolute inset-0 bg-yellow-400/20 blur-[60px] rounded-full animate-pulse" />

          <motion.div
            animate={{
              rotateY: [0, 360],
              y: [0, -10, 0],
            }}
            transition={{
              rotateY: { duration: 10, repeat: Infinity, ease: "linear" },
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative z-10 p-8 bg-gradient-to-br from-white/10 to-transparent rounded-full backdrop-blur-xl border border-white/20 shadow-2xl"
          >
            <Trophy className="w-20 h-20 md:w-32 md:h-32 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <h1 className="text-8xl md:text-[12rem] font-arcade font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-500 tracking-tighter leading-[0.8] mb-2 select-none">
            KICKOFF
            <br />
            <span className="text-glow-yellow text-yellow-400">ARCADE</span>
          </h1>

          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-blue-500" />
            <span className="text-xs md:text-sm text-blue-400 font-arcade font-bold uppercase tracking-[0.5em] italic">
              The Next Gen of Web3 Football
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-blue-500" />
          </div>
        </motion.div>
      </div>

      {/* --- ACTION SECTION --- */}
      <div className="w-full max-w-5xl px-6 pb-12 z-10 flex flex-col md:flex-row items-end justify-between gap-8">
        {/* Left Side: Features */}
        <div className="hidden lg:grid grid-cols-1 gap-4 w-64 mb-4">
          <div className="glass-morphism rounded-2xl p-4 flex items-center gap-4 group">
            <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/40 transition-colors">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-black text-white font-arcade uppercase italic">
                AI Engine v2.0
              </div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                Smart Tactics
              </div>
            </div>
          </div>
          <div className="glass-morphism rounded-2xl p-4 flex items-center gap-4 group">
            <div className="p-2 bg-yellow-500/20 rounded-lg group-hover:bg-yellow-500/40 transition-colors">
              <Shield className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-black text-white font-arcade uppercase italic">
                Safe Protocol
              </div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                On-Chain Assets
              </div>
            </div>
          </div>
        </div>

        {/* Center: Main CTA */}
        <div className="w-full max-w-md flex flex-col gap-4 mx-auto md:mx-0">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setScreen(ScreenName.MODE_SELECT)}
            className="h-24 rounded-[2rem] text-4xl shadow-[0_0_50px_rgba(234,179,8,0.3)] group relative overflow-hidden border-2 border-yellow-400/50"
          >
            <div className="absolute inset-0 bg-yellow-400 group-hover:bg-yellow-300 transition-colors" />
            <div className="relative z-10 flex items-center justify-center gap-6 font-arcade font-black italic text-black">
              INSERT COIN{" "}
              <ChevronRight className="w-10 h-10 animate-bounce-x" />
            </div>
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </Button>

          {!walletAddress ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setScreen(ScreenName.WALLET_CONNECT)}
              className="w-full py-4 glass-morphism rounded-2xl text-[10px] font-arcade font-black uppercase tracking-[0.3em] text-slate-300 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-3 h-3 text-yellow-400" />
              Connect Wallet To Sync Progress
            </motion.button>
          ) : (
            <div className="w-full py-4 glass-morphism rounded-2xl border border-green-500/30 flex items-center justify-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
              <span className="text-[10px] font-arcade font-bold text-green-400 uppercase tracking-widest">
                ID: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Version/Stats */}
        <div className="hidden lg:flex flex-col items-end gap-2 text-right w-64 mb-4">
          <div className="text-[10px] font-arcade font-black text-white/40 uppercase tracking-[0.2em]">
            Server Status: <span className="text-green-500">Nominal</span>
          </div>
          <div className="text-[10px] font-arcade font-black text-white/40 uppercase tracking-[0.2em]">
            Region: Global-North
          </div>
          <div className="px-3 py-1 bg-slate-800 rounded-full text-[9px] text-slate-500 font-mono border border-slate-700 mt-2">
            v1.0.4-ALPHA • MOVEMENT
          </div>
        </div>
      </div>

      {/* --- FOOTER DECORATION --- */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-yellow-400 to-orange-600 shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
    </div>
  );
};
