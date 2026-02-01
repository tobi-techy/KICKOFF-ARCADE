import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import { ScreenName, GameMode } from "../types";
import { ChevronLeft, Trophy, Lock, Crown, Star, Users, Loader2, History } from "lucide-react";
import { motion } from "framer-motion";
import { useLineraWallet } from "../lib/useLineraWallet";
import { useToast } from "../context/ToastContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const ENTRY_FEE = 50;
const TOURNAMENT_SIZE = 8;

interface TournamentMatch {
  player1: string;
  player2: string;
  score1: number;
  score2: number;
  winner: string;
  played: boolean;
}

interface Tournament {
  id: number;
  participants: string[];
  bracket: TournamentMatch[];
  currentRound: number;
  prizePool: number;
  winner: string;
  status: number; // 0=open, 1=in_progress, 2=completed
  createdAt: number;
}

interface HistoryEntry {
  id: number;
  winner: string;
  winnerUsername: string;
  prize: number;
  participants: number;
  completedAt: number;
}

export const TournamentScreen: React.FC = () => {
  const { setScreen, setGameMode, setTournamentMatchIndex } = useGame();
  const { profile, authenticated, playerAddress } = useLineraWallet();
  const { showToast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const hasEnoughCoins = (profile?.coins ?? 0) >= ENTRY_FEE;
  const isParticipant = tournament?.participants.includes(playerAddress || "") ?? false;

  useEffect(() => {
    fetchTournament();
    fetchHistory();
  }, []);

  const fetchTournament = async () => {
    try {
      const res = await fetch(`${API_URL}/api/linera/tournament`);
      const data = await res.json();
      setTournament(data.data || null);
    } catch (e) {
      console.error("Failed to fetch tournament:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/linera/tournament/history`);
      const data = await res.json();
      setHistory(data.data || []);
    } catch (e) {
      console.error("Failed to fetch history:", e);
    }
  };

  const handleJoin = async () => {
    if (!authenticated || !hasEnoughCoins || joining) return;
    setJoining(true);
    try {
      const res = await fetch(`${API_URL}/api/linera/tournament/join`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("Joined tournament!", "success");
        fetchTournament();
      } else {
        showToast(data.error || "Failed to join", "error");
      }
    } catch (e) {
      showToast("Failed to join tournament", "error");
    } finally {
      setJoining(false);
    }
  };

  const findMyMatch = (): number | null => {
    if (!tournament || !playerAddress) return null;
    for (let i = 0; i < tournament.bracket.length; i++) {
      const m = tournament.bracket[i];
      if (!m.played && (m.player1 === playerAddress || m.player2 === playerAddress)) {
        return i;
      }
    }
    return null;
  };

  const handlePlayMatch = (matchIndex: number) => {
    setTournamentMatchIndex(matchIndex);
    setGameMode(GameMode.TOURNAMENT);
    setScreen(ScreenName.TEAM_SELECT);
  };

  const getRoundName = (idx: number): string => {
    if (idx < 4) return "Quarter Final";
    if (idx < 6) return "Semi Final";
    return "Final";
  };

  const shortenAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "TBD";

  const MatchCard = ({ match, idx }: { match: TournamentMatch; idx: number }) => {
    const isMyMatch = playerAddress && (match.player1 === playerAddress || match.player2 === playerAddress);
    const canPlay = isMyMatch && !match.played && match.player1 && match.player2;

    return (
      <div className={`p-3 rounded-xl border ${
        isMyMatch ? "bg-blue-500/20 border-blue-500/50" : 
        match.played ? "bg-green-500/10 border-green-500/20" : 
        "bg-white/5 border-white/10"
      }`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${match.player1 ? "text-white" : "text-slate-600"}`}>
              {match.player1 === playerAddress ? "YOU" : shortenAddr(match.player1)}
            </span>
            {match.played && <span className="text-xs font-black text-white">{match.score1}</span>}
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${match.player2 ? "text-white" : "text-slate-600"}`}>
              {match.player2 === playerAddress ? "YOU" : shortenAddr(match.player2)}
            </span>
            {match.played && <span className="text-xs font-black text-white">{match.score2}</span>}
          </div>
        </div>
        {canPlay && (
          <button
            onClick={() => handlePlayMatch(idx)}
            className="w-full mt-2 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg text-[10px] font-black uppercase"
          >
            Play Now
          </button>
        )}
        {!match.played && (!match.player1 || !match.player2) && (
          <div className="flex items-center justify-center mt-2 text-slate-600">
            <Lock className="w-3 h-3" />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#020617]">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#020617] text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[60vw] h-[60vw] bg-blue-600/10 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => setScreen(ScreenName.MODE_SELECT)} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl">
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <div>
              <h2 className="text-xl font-arcade font-black text-white italic">CHAMPIONS CUP</h2>
              <p className="text-[10px] text-yellow-400 font-black uppercase tracking-[0.2em]">
                {tournament ? `${tournament.participants.length}/${TOURNAMENT_SIZE} Players` : "Open"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHistory(!showHistory)} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl">
            <History className="w-5 h-5 text-slate-300" />
          </button>
          <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="text-[9px] text-yellow-400/70 uppercase">Prize Pool</div>
            <div className="text-lg font-black text-yellow-400">{tournament?.prizePool || ENTRY_FEE * TOURNAMENT_SIZE} <span className="text-xs">COINS</span></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 relative z-10">
        {showHistory ? (
          <div className="max-w-2xl mx-auto space-y-3">
            <h3 className="text-lg font-black mb-4">Past Tournaments</h3>
            {history.length === 0 ? (
              <p className="text-slate-500 text-center py-10">No tournaments completed yet</p>
            ) : (
              history.map((h) => (
                <div key={h.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{h.winnerUsername || shortenAddr(h.winner)}</div>
                    <div className="text-xs text-slate-500">Tournament #{h.id}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-black">{h.prize} coins</div>
                    <div className="text-[10px] text-slate-500">{h.participants} players</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Join Banner */}
            {(!tournament || tournament.status === 0) && !isParticipant && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto mb-8 p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white mb-1">Join the Tournament</h3>
                    <p className="text-sm text-slate-400">Entry: {ENTRY_FEE} coins • {tournament ? `${TOURNAMENT_SIZE - tournament.participants.length} spots left` : `${TOURNAMENT_SIZE} spots`}</p>
                  </div>
                  <button
                    onClick={handleJoin}
                    disabled={!authenticated || !hasEnoughCoins || joining}
                    className={`px-6 py-3 rounded-xl font-black uppercase text-sm flex items-center gap-2 ${
                      authenticated && hasEnoughCoins ? "bg-yellow-500 hover:bg-yellow-400 text-black" : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {joining && <Loader2 className="w-4 h-4 animate-spin" />}
                    {!authenticated ? "Connect Wallet" : !hasEnoughCoins ? "Not Enough Coins" : "Enter"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Waiting for players */}
            {tournament && tournament.status === 0 && (
              <div className="max-w-2xl mx-auto mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="font-bold">Waiting for players ({tournament.participants.length}/{TOURNAMENT_SIZE})</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: TOURNAMENT_SIZE }).map((_, i) => (
                    <div key={i} className={`p-2 rounded-lg text-center text-xs ${tournament.participants[i] ? "bg-green-500/20 text-green-400" : "bg-slate-800 text-slate-600"}`}>
                      {tournament.participants[i] === playerAddress ? "YOU" : tournament.participants[i] ? shortenAddr(tournament.participants[i]) : "Empty"}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Winner Banner */}
            {tournament && tournament.status === 2 && (
              <div className="max-w-2xl mx-auto mb-8 p-6 bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 rounded-2xl border border-yellow-500/30 text-center">
                <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <h3 className="text-xl font-black text-yellow-400">Tournament Complete!</h3>
                <p className="text-white">Winner: {tournament.winner === playerAddress ? "YOU!" : shortenAddr(tournament.winner)}</p>
                <p className="text-sm text-slate-400">Prize: {tournament.prizePool} coins</p>
              </div>
            )}

            {/* Bracket */}
            {tournament && tournament.status >= 1 && tournament.bracket.length > 0 && (
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-3 gap-6">
                  {/* QF */}
                  <div className="space-y-3">
                    <div className="text-center text-[10px] font-black text-slate-500 uppercase mb-4">Quarter Finals</div>
                    {tournament.bracket.slice(0, 4).map((m, i) => <MatchCard key={i} match={m} idx={i} />)}
                  </div>
                  {/* SF */}
                  <div className="space-y-6 pt-16">
                    <div className="text-center text-[10px] font-black text-slate-500 uppercase mb-4">Semi Finals</div>
                    {tournament.bracket.slice(4, 6).map((m, i) => <MatchCard key={i + 4} match={m} idx={i + 4} />)}
                  </div>
                  {/* Final */}
                  <div className="pt-32">
                    <div className="text-center mb-4">
                      <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                      <div className="text-[10px] font-black text-yellow-400 uppercase">Final</div>
                    </div>
                    {tournament.bracket[6] && <MatchCard match={tournament.bracket[6]} idx={6} />}
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-full border border-yellow-500/30">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-black text-yellow-400">Winner: {tournament.prizePool} Coins</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
