import React, { useState } from "react";
import { useGame } from "../context/GameContext";
import { ScreenName, GameMode } from "../types";
import { ChevronLeft, Trophy, Lock, Swords, Crown, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useLineraWallet } from "../lib/useLineraWallet";

interface TournamentMatch {
  id: string;
  round: "R16" | "QF" | "SF" | "FINAL";
  home: { name: string; score?: number } | null;
  away: { name: string; score?: number } | null;
  status: "upcoming" | "live" | "completed" | "locked";
  isUserMatch?: boolean;
}

const ENTRY_FEE = 50;

export const TournamentScreen: React.FC = () => {
  const { setScreen, setGameMode } = useGame();
  const { profile, authenticated, playerAddress } = useLineraWallet();
  const [joined, setJoined] = useState(false);

  const hasEnoughCoins = (profile?.coins ?? 0) >= ENTRY_FEE;

  // Mock tournament bracket data
  const bracket: TournamentMatch[] = [
    // Round of 16
    { id: "r16-1", round: "R16", home: { name: "FC Barcelona", score: 3 }, away: { name: "PSG", score: 1 }, status: "completed" },
    { id: "r16-2", round: "R16", home: { name: "Bayern Munich", score: 2 }, away: { name: "Arsenal", score: 2 }, status: "completed" },
    { id: "r16-3", round: "R16", home: { name: "Real Madrid", score: 4 }, away: { name: "Liverpool", score: 1 }, status: "completed" },
    { id: "r16-4", round: "R16", home: { name: "Man City", score: 2 }, away: { name: "Napoli", score: 0 }, status: "completed" },
    { id: "r16-5", round: "R16", home: { name: "Inter Milan" }, away: { name: "Atletico" }, status: "upcoming" },
    { id: "r16-6", round: "R16", home: { name: "Dortmund" }, away: { name: "Chelsea" }, status: "upcoming" },
    { id: "r16-7", round: "R16", home: { name: "Porto" }, away: { name: "Juventus" }, status: "locked" },
    { id: "r16-8", round: "R16", home: joined ? { name: "YOU" } : null, away: { name: "AC Milan" }, status: joined ? "upcoming" : "locked", isUserMatch: joined },
    // Quarter Finals
    { id: "qf-1", round: "QF", home: { name: "FC Barcelona" }, away: { name: "Bayern Munich" }, status: "upcoming" },
    { id: "qf-2", round: "QF", home: { name: "Real Madrid" }, away: { name: "Man City" }, status: "locked" },
    { id: "qf-3", round: "QF", home: null, away: null, status: "locked" },
    { id: "qf-4", round: "QF", home: null, away: null, status: "locked" },
    // Semi Finals
    { id: "sf-1", round: "SF", home: null, away: null, status: "locked" },
    { id: "sf-2", round: "SF", home: null, away: null, status: "locked" },
    // Final
    { id: "final", round: "FINAL", home: null, away: null, status: "locked" },
  ];

  const getMatchesByRound = (round: string) => bracket.filter((m) => m.round === round);

  const handleJoin = () => {
    if (!authenticated || !hasEnoughCoins) return;
    setJoined(true);
  };

  const handlePlayMatch = () => {
    setGameMode(GameMode.TOURNAMENT);
    setScreen(ScreenName.TEAM_SELECT);
  };

  const MatchCard = ({ match }: { match: TournamentMatch }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-3 rounded-xl border ${
        match.isUserMatch
          ? "bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30"
          : match.status === "locked"
          ? "bg-slate-900/50 border-slate-700/30 opacity-50"
          : match.status === "completed"
          ? "bg-green-500/10 border-green-500/20"
          : "bg-white/5 border-white/10"
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold ${match.home ? "text-white" : "text-slate-600"}`}>
            {match.home?.name || "TBD"}
          </span>
          {match.status === "completed" && (
            <span className="text-xs font-black text-white">{match.home?.score}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold ${match.away ? "text-white" : "text-slate-600"}`}>
            {match.away?.name || "TBD"}
          </span>
          {match.status === "completed" && (
            <span className="text-xs font-black text-white">{match.away?.score}</span>
          )}
        </div>
      </div>
      {match.isUserMatch && match.status === "upcoming" && (
        <button
          onClick={handlePlayMatch}
          className="w-full mt-2 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg text-[10px] font-black uppercase"
        >
          Play Now
        </button>
      )}
      {match.status === "locked" && (
        <div className="flex items-center justify-center mt-2 text-slate-600">
          <Lock className="w-3 h-3" />
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full bg-[#020617] text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[60vw] h-[60vw] bg-blue-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-yellow-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setScreen(ScreenName.MODE_SELECT)}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-xl">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-arcade font-black tracking-tight text-white italic">
                CHAMPIONS CUP
              </h2>
              <p className="text-[10px] text-yellow-400 font-black uppercase tracking-[0.2em]">
                Season 1 • 16 Teams
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="text-[9px] text-yellow-400/70 uppercase tracking-widest">Prize Pool</div>
            <div className="text-lg font-black text-yellow-400">500 <span className="text-xs">COINS</span></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 relative z-10">
        {/* Join Banner */}
        {!joined && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mb-8 p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl border border-blue-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white mb-1">Join the Tournament</h3>
                <p className="text-sm text-slate-400">Entry fee: {ENTRY_FEE} coins • Win up to 500 coins!</p>
              </div>
              <button
                onClick={handleJoin}
                disabled={!authenticated || !hasEnoughCoins}
                className={`px-6 py-3 rounded-xl font-black uppercase text-sm ${
                  authenticated && hasEnoughCoins
                    ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
              >
                {!authenticated ? "Connect Wallet" : !hasEnoughCoins ? "Not Enough Coins" : "Enter Tournament"}
              </button>
            </div>
          </motion.div>
        )}

        {/* Bracket */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-5 gap-4">
            {/* Round of 16 */}
            <div className="space-y-3">
              <div className="text-center mb-4">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Round of 16</div>
              </div>
              {getMatchesByRound("R16").map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>

            {/* Quarter Finals */}
            <div className="space-y-6 pt-12">
              <div className="text-center mb-4">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quarter Finals</div>
              </div>
              {getMatchesByRound("QF").map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>

            {/* Semi Finals */}
            <div className="space-y-12 pt-24">
              <div className="text-center mb-4">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Semi Finals</div>
              </div>
              {getMatchesByRound("SF").map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>

            {/* Final */}
            <div className="pt-40 col-span-2 flex justify-center">
              <div className="w-full max-w-xs">
                <div className="text-center mb-4">
                  <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Grand Final</div>
                </div>
                {getMatchesByRound("FINAL").map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-full border border-yellow-500/30">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-black text-yellow-400">Winner: 500 Coins + NFT Trophy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
