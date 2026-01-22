import React, { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { ScreenName } from "../types";
import { Button } from "../components/Button";
import { useLineraWallet } from "../lib/useLineraWallet";
import { UsernameModal } from "../components/UsernameModal";
import {
  ChevronLeft,
  Wallet,
  ShieldCheck,
  Cpu,
  Lock,
  Loader2,
  Terminal,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const WalletScreen: React.FC = () => {
  const { setScreen, connectWallet } = useGame();
  const { ready, authenticated, chainId, needsUsername, loading, login, completeRegistration } = useLineraWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [terminalStep, setTerminalStep] = useState(0);
  const [connectionComplete, setConnectionComplete] = useState(false);

  const logs = [
    "INITIALIZING SECURE PROTOCOL...",
    "HANDSHAKING WITH LINERA NETWORK...",
    "VERIFYING NODE INTEGRITY...",
    "AWAITING USER SIGNATURE...",
  ];

  // Watch for successful authentication (only redirect if registered)
  useEffect(() => {
    // Wait until loading is done to know the final needsUsername state
    if (isConnecting && authenticated && chainId && !loading && !needsUsername) {
      // User authenticated and already registered, complete the flow
      setTerminalStep(logs.length);
      setTimeout(() => {
        connectWallet(chainId);
        setConnectionComplete(true);
        setTimeout(() => {
          setScreen(ScreenName.REWARDS);
        }, 1000);
      }, 500);
    }
  }, [authenticated, chainId, isConnecting, needsUsername, loading]);

  const handleUsernameSubmit = async (username: string) => {
    const success = await completeRegistration(username);
    if (success) {
      connectWallet(chainId!);
      setConnectionComplete(true);
      setTimeout(() => {
        setScreen(ScreenName.REWARDS);
      }, 1000);
    }
  };

  useEffect(() => {
    if (isConnecting && terminalStep < logs.length - 1) {
      const timer = setTimeout(() => {
        setTerminalStep((s) => s + 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isConnecting, terminalStep]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setTerminalStep(0);
    
    // Wait for terminal animation then trigger Privy login
    setTimeout(() => {
      login();
    }, 2000);
  };

  return (
    <>
      {needsUsername && <UsernameModal onSubmit={handleUsernameSubmit} loading={loading} />}
    <div className="flex flex-col h-full bg-[#020617] p-6 text-white items-center justify-center relative overflow-hidden">
      {/* Holographic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,210,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setScreen(ScreenName.HOME)}
        className="absolute top-8 left-8 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all z-20"
      >
        <ChevronLeft className="w-5 h-5 text-slate-400" />
      </motion.button>

      <div className="max-w-md w-full relative z-20">
        <AnimatePresence mode="wait">
          {!isConnecting ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center"
            >
              {/* Holographic Icon */}
              <div className="relative w-32 h-32 mx-auto mb-10">
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(59,130,246,0.2)",
                      "0 0 40px rgba(59,130,246,0.4)",
                      "0 0 20px rgba(59,130,246,0.2)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-full h-full bg-blue-600/10 rounded-3xl flex items-center justify-center border border-blue-500/30 backdrop-blur-xl relative z-10"
                >
                  <Wallet className="w-16 h-16 text-blue-400" />
                </motion.div>
                <div className="absolute -inset-4 bg-blue-500/10 blur-2xl rounded-full" />
              </div>

              <h2 className="text-4xl font-arcade font-black italic tracking-tighter mb-4">
                AUTHENTICATE
              </h2>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em] mb-10 leading-relaxed">
                Connect your identity to the Linera <br />
                Decentralized Network
              </p>

              <div className="grid grid-cols-1 gap-4 mb-10">
                <FeatureItem
                  icon={<ShieldCheck className="w-5 h-5" />}
                  title="SECURE VAULT"
                  desc="Military-grade asset protection"
                />
                <FeatureItem
                  icon={<Cpu className="w-5 h-5" />}
                  title="ON-CHAIN STATS"
                  desc="Immutable career history"
                />
              </div>

              <div className="space-y-4">
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  onClick={handleConnect}
                  disabled={!ready}
                  className="h-16 shadow-blue-500/20 group overflow-hidden disabled:opacity-50"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {!ready ? "LOADING..." : "INITIALIZE LINK"} <Lock className="w-5 h-5" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </Button>
                <button
                  onClick={() => setScreen(ScreenName.HOME)}
                  className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] hover:text-white transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/80 border border-blue-500/30 rounded-3xl p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(59,130,246,0.1)] relative overflow-hidden"
            >
              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_0%,rgba(59,130,246,0.05)_50%,transparent_100%)] bg-[length:100%_4px] animate-[pulse_2s_infinite]" />

              <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                <Terminal className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-arcade font-bold text-blue-400 uppercase tracking-widest">
                  Secure_Link_v4.0.1
                </span>
              </div>

              <div className="space-y-4 mb-10 font-mono">
                {logs.slice(0, terminalStep + 1).map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 text-[10px]"
                  >
                    <span className="text-blue-500/50">[{i + 1}]</span>
                    <span className="text-slate-300 font-bold">{log}</span>
                    {i < terminalStep && <CheckCircle className="w-3 h-3 text-green-500" />}
                  </motion.div>
                ))}
                {!connectionComplete && terminalStep < logs.length && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                    <span className="w-2 h-4 bg-blue-500 animate-pulse" />
                  </div>
                )}
                {connectionComplete && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 text-[10px] text-green-400 font-bold"
                  >
                    <CheckCircle className="w-4 h-4" />
                    CONNECTION ESTABLISHED - {chainId?.slice(0, 8)}...
                  </motion.div>
                )}
              </div>

              <div className="flex flex-col items-center">
                <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: connectionComplete ? "100%" : `${(terminalStep / logs.length) * 80}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full ${connectionComplete ? "bg-green-500" : "bg-blue-500"} shadow-[0_0_15px_rgba(59,130,246,0.8)]`}
                  />
                </div>
                <span className="text-[9px] text-slate-500 font-black mt-4 uppercase tracking-[0.2em]">
                  {connectionComplete ? "Link established" : "Encryption active"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] text-slate-700 font-black uppercase tracking-[0.5em] whitespace-nowrap">
        Linera Labs • Identity Protocol
      </div>
    </div>
    </>
  );
};

const FeatureItem = ({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center gap-4 text-left group hover:bg-white/10 transition-colors">
    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div>
      <h4 className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">
        {title}
      </h4>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
        {desc}
      </p>
    </div>
  </div>
);
