import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import { ScreenName, Player, GameMode } from "../types";
import { Button } from "../components/Button";
import {
  ChevronLeft,
  Shirt,
  Lock,
  RefreshCw,
  Zap,
  Crown,
  Info,
  ArrowLeftRight,
  UserPlus,
  Coins,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLineraWallet } from "../lib/useLineraWallet";
import { payMatchFee, SINGLE_PLAYER_FEE } from "../lib/linera";

export const SquadSelectScreen: React.FC = () => {
  const { setScreen, selectedTeam, squad, bench, autoFillSquad, swapPlayers, gameMode } =
    useGame();
  const { profile, authenticated, refreshProfile } = useLineraWallet();
  const [selectedSlot, setSelectedSlot] = useState<{
    index: number;
    source: "squad" | "bench";
  } | null>(null);
  const [paying, setPaying] = useState(false);

  const isSinglePlayer = gameMode === GameMode.SINGLE_PLAYER;
  const hasEnoughCoins = !authenticated || (profile?.coins ?? 0) >= SINGLE_PLAYER_FEE;

  useEffect(() => {
    // Auto-fill squad and bench for instant gameplay feel if empty
    if (squad.every((p) => p === null)) {
      autoFillSquad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSquadFull = squad.every((p) => p !== null);
  const avgRating = Math.round(
    squad.reduce((acc, p) => acc + (p?.rating || 0), 0) / squad.length,
  );

  const handleSlotClick = (index: number, source: "squad" | "bench") => {
    if (!selectedSlot) {
      setSelectedSlot({ index, source });
    } else {
      if (selectedSlot.index === index && selectedSlot.source === source) {
        setSelectedSlot(null);
      } else {
        swapPlayers(selectedSlot.index, index, selectedSlot.source, source);
        setSelectedSlot(null);
      }
    }
  };

  const renderPlayerSlot = (
    index: number,
    role: string,
    source: "squad" | "bench" = "squad",
  ) => {
    const player = source === "squad" ? squad[index] : bench[index];
    const isElite = player && player.rating >= 80;
    const isSelected =
      selectedSlot?.index === index && selectedSlot?.source === source;

    return (
      <motion.div
        key={`${source}-${index}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.05 }}
        className="flex flex-col items-center relative group"
      >
        {source === "squad" && (
          <div className="absolute -top-8 text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            {role}
          </div>
        )}

        <button
          onClick={() => handleSlotClick(index, source)}
          className={`w-16 h-16 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center border-2 relative transition-all hover:scale-110 active:scale-95 duration-300 ${
            isSelected
              ? "border-blue-400 ring-4 ring-blue-500/30 scale-105 bg-slate-800"
              : player
                ? isElite
                  ? "bg-gradient-to-br from-slate-800 to-slate-900 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]"
                  : "bg-gradient-to-br from-slate-800 to-slate-900 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                : "bg-slate-900/50 border-slate-700 border-dashed"
          }`}
        >
          {player ? (
            <div className="text-center relative flex flex-col items-center">
              {isElite && (
                <div className="absolute -top-3 -right-3 rotate-12 z-20">
                  <Crown className="w-6 h-6 text-yellow-400 fill-yellow-400 drop-shadow-md" />
                </div>
              )}
              <Shirt
                className={`w-10 h-10 sm:w-14 sm:h-14 mb-1 drop-shadow-lg`}
                style={{ color: player.color || selectedTeam?.primaryColor || "#fff" }}
              />
              <div
                className={`absolute -bottom-3 bg-slate-950 px-3 py-0.5 rounded-full border-2 font-black text-sm z-20 ${
                  isElite
                    ? "border-yellow-400 text-yellow-400"
                    : "border-emerald-500 text-emerald-400"
                }`}
              >
                {player.rating}
              </div>
            </div>
          ) : (
            <Lock className="w-6 h-6 text-slate-700" />
          )}

          {/* Swap Indicator */}
          {isSelected && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 rounded-2xl">
              <ArrowLeftRight className="w-8 h-8 text-blue-400 animate-pulse" />
            </div>
          )}

          {/* Slot Glow Effect */}
          {player && !isSelected && (
            <div
              className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-xl ${isElite ? "bg-yellow-400" : "bg-emerald-400"}`}
            />
          )}

          {/* Stats tooltip on hover */}
          {player && !isSelected && (
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none whitespace-nowrap">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[8px]">
                <span className="text-blue-400">SPD {player.speed}</span>
                <span className="text-red-400">SHT {player.shooting}</span>
                <span className="text-green-400">PAS {player.passing}</span>
                <span className="text-yellow-400">DEF {player.defending}</span>
              </div>
            </div>
          )}
        </button>

        <span
          className={`mt-6 text-[10px] sm:text-xs font-arcade font-bold uppercase tracking-tight text-center max-w-[80px] line-clamp-1 ${
            isSelected
              ? "text-blue-400"
              : isElite
                ? "text-yellow-400"
                : "text-slate-300"
          }`}
        >
          {player ? player.name : "EMPTY"}
        </span>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-950 text-white overflow-hidden font-arcade">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 bg-slate-900 border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col justify-between z-30 shadow-2xl overflow-y-auto">
        <div>
          <button
            onClick={() => setScreen(ScreenName.TEAM_SELECT)}
            className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest">
              Back
            </span>
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-black italic tracking-tighter text-white mb-1">
              SQUAD <span className="text-blue-500 text-2xl">MGMT</span>
            </h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg w-fit border border-white/10">
              <div
                className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                style={{ backgroundColor: selectedTeam?.primaryColor || "#3b82f6" }}
              />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {selectedTeam?.name}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">
                  Avg Rating
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-2xl font-black text-white">
                    {avgRating}
                  </span>
                </div>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">
                  Formation
                </div>
                <div className="text-sm font-black text-emerald-400 uppercase tracking-tighter">
                  1-2-2-2
                </div>
              </div>
            </div>

            {/* Bench Section */}
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                  Substitutes
                </span>
                <div className="flex items-center gap-1">
                  <UserPlus className="w-3 h-3 text-blue-400" />
                  <span className="text-[8px] text-slate-600 font-bold">
                    BENCH
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 justify-center">
                {bench.map((_, i) => renderPlayerSlot(i, "SUB", "bench"))}
              </div>
              <p className="text-[8px] text-slate-500 text-center mt-4 font-sans italic opacity-60">
                Tap a player card to start swapping positions
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 lg:mt-0 space-y-4">
          <button
            onClick={autoFillSquad}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all flex items-center justify-center gap-3 group border border-white/5"
          >
            <RefreshCw className="w-4 h-4 text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-xs font-black uppercase tracking-widest">
              Reset Squad
            </span>
          </button>

          {isSinglePlayer && authenticated && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-black text-yellow-400 uppercase tracking-widest">
                Entry Fee: {SINGLE_PLAYER_FEE} coins
              </span>
            </div>
          )}

          <Button
            fullWidth
            size="lg"
            disabled={!isSquadFull || (isSinglePlayer && authenticated && !hasEnoughCoins) || paying}
            onClick={async () => {
              if (isSinglePlayer && authenticated) {
                setPaying(true);
                const success = await payMatchFee(SINGLE_PLAYER_FEE);
                setPaying(false);
                if (success) {
                  refreshProfile();
                  setScreen(ScreenName.MATCH);
                }
              } else {
                setScreen(ScreenName.MATCH);
              }
            }}
            className={`py-6 text-lg tracking-[0.2em] shadow-2xl transition-all ${
              isSquadFull && hasEnoughCoins ? "shadow-blue-600/20" : "opacity-50 grayscale"
            }`}
          >
            {paying ? "PAYING..." : !isSquadFull ? "SQUAD INCOMPLETE" : !hasEnoughCoins ? "NOT ENOUGH COINS" : "START MATCH"}
          </Button>
        </div>
      </div>

      {/* Main Pitch View - Horizontal Landscape */}
      <div className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center p-8 sm:p-12 lg:p-20">
        <AnimatePresence>
          {selectedSlot && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-blue-600 px-6 py-2 rounded-full border-2 border-white/20 shadow-2xl flex items-center gap-3"
            >
              <ArrowLeftRight className="w-4 h-4 text-white animate-spin-slow" />
              <span className="text-xs font-black uppercase tracking-widest">
                Selecting player to swap...
              </span>
              <button
                onClick={() => setSelectedSlot(null)}
                className="ml-2 text-white/60 hover:text-white text-[10px] underline"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        {/* Tactical Board */}
        <div className="relative w-full max-w-6xl aspect-[16/9] lg:aspect-[21/9] bg-emerald-950/20 rounded-[40px] border-[12px] border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex items-center justify-around px-8 sm:px-16">
          {/* Pitch markings */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white/40"></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 border-4 border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-1/4 bottom-1/4 left-0 w-32 border-y-4 border-r-4 border-white/40"></div>
            <div className="absolute top-1/4 bottom-1/4 right-0 w-32 border-y-4 border-l-4 border-white/40"></div>
          </div>

          {/* Player Formation Grid (Horizontal) */}
          <div className="flex items-center justify-around w-full h-full relative z-10">
            {/* GOALKEEPER */}
            <div className="flex flex-col justify-center">
              {renderPlayerSlot(0, "GK")}
            </div>

            {/* DEFENDERS */}
            <div className="flex flex-col justify-center gap-20 sm:gap-32">
              {renderPlayerSlot(1, "DEF")}
              {renderPlayerSlot(2, "DEF")}
            </div>

            {/* MIDFIELDERS */}
            <div className="flex flex-col justify-center gap-20 sm:gap-32">
              {renderPlayerSlot(3, "MID")}
              {renderPlayerSlot(4, "MID")}
            </div>

            {/* ATTACKERS */}
            <div className="flex flex-col justify-center gap-20 sm:gap-32">
              {renderPlayerSlot(5, "ATT")}
              {renderPlayerSlot(6, "ATT")}
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-12 right-12 flex gap-4 pointer-events-none opacity-20">
          <div className="w-1 h-32 bg-gradient-to-b from-blue-500 to-transparent"></div>
          <div className="w-1 h-24 bg-gradient-to-b from-blue-500 to-transparent delay-100"></div>
          <div className="w-1 h-40 bg-gradient-to-b from-blue-500 to-transparent delay-200"></div>
        </div>
      </div>
    </div>
  );
};
