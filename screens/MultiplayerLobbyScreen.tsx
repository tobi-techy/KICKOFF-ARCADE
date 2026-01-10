import React, { useState, useEffect, useCallback } from "react";
import { useGame } from "../context/GameContext";
import { ScreenName, LobbyData } from "../types";
import { Button } from "../components/Button";
import {
  Copy,
  Check,
  Coins,
  Loader2,
  X,
  Swords,
  Crown,
  Shield,
  QrCode,
  Link2,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLineraWallet } from "../lib/useLineraWallet";
import { createWager, acceptWager, cancelWager, getWager } from "../lib/linera";
import { multiplayer } from "../lib/multiplayer";
import QRCode from "react-qr-code";

const WAGER_OPTIONS = [0, 50, 100, 250, 500, 1000];

export const MultiplayerLobbyScreen: React.FC = () => {
  const { setScreen, selectedTeam, walletAddress, lobby: existingLobby, setLobby } = useGame();
  const { profile, authenticated, chainId } = useLineraWallet();

  // If joining via link, existingLobby will have the lobbyId
  const isJoining = existingLobby && existingLobby.hostId === "";
  const [lobbyId] = useState(() => existingLobby?.lobbyId || crypto.randomUUID().slice(0, 8));
  const [isHost] = useState(!isJoining);
  
  const [wagerAmount, setWagerAmount] = useState(0);
  const [lobby, setLobbyState] = useState<LobbyData | null>(isJoining ? null : null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(isJoining);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [joiningWager, setJoiningWager] = useState<number>(0);

  const lobbyUrl = `${window.location.origin}?join=${lobbyId}`;
  const userCoins = profile?.coins ?? 0;

  // If joining, fetch lobby info immediately
  useEffect(() => {
    if (isJoining && lobbyId) {
      fetchLobbyInfo(lobbyId);
    }
  }, [isJoining, lobbyId]);

  // Fetch lobby info for joining player
  const fetchLobbyInfo = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Get wager info from chain
      const wagerData = await getWager(id);
      if (wagerData) {
        setJoiningWager(wagerData.amount || 0);
        setLobbyState({
          lobbyId: id,
          hostId: wagerData.host || "",
          hostName: wagerData.host?.slice(0, 8) || "Host",
          hostTeam: "Unknown",
          wagerAmount: wagerData.amount || 0,
          status: "waiting",
        });
      }
      
      // Also connect to socket to get live updates
      multiplayer.connect();
      multiplayer.emit("lobby:info", { lobbyId: id });
    } catch (err: any) {
      setError("Failed to fetch lobby info");
    } finally {
      setLoading(false);
    }
  };

  // Connect to multiplayer and listen for events
  useEffect(() => {
    multiplayer.connect();

    const unsubUpdate = multiplayer.on("lobby:updated", (data: LobbyData) => {
      setLobbyState(data);
      setLobby(data);
      if (data.status === "ready") {
        setTimeout(() => setScreen(ScreenName.MATCH), 1500);
      }
    });

    const unsubInfo = multiplayer.on("lobby:info", (data: LobbyData) => {
      if (data) {
        setLobbyState(data);
        setJoiningWager(data.wagerAmount);
      }
    });

    const unsubStart = multiplayer.on("match:start", () => {
      setScreen(ScreenName.MATCH);
    });

    const unsubError = multiplayer.on("lobby:error", (data: { message: string }) => {
      setError(data.message);
      setLoading(false);
    });

    return () => {
      unsubUpdate();
      unsubInfo();
      unsubStart();
      unsubError();
    };
  }, [setScreen, setLobby]);

  // Create lobby as host
  const createLobby = useCallback(async () => {
    if (wagerAmount > 0 && !authenticated) {
      setError("Connect wallet to create wager match");
      return;
    }
    if (wagerAmount > userCoins) {
      setError("Insufficient coins");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create wager on-chain if amount > 0
      if (wagerAmount > 0) {
        const success = await createWager(lobbyId, wagerAmount);
        if (!success) throw new Error("Failed to create wager on-chain");
      }

      const newLobby: LobbyData = {
        lobbyId,
        hostId: chainId || walletAddress || "host",
        hostName: walletAddress?.slice(0, 8) || "Host",
        hostTeam: selectedTeam?.name || "Unknown",
        wagerAmount,
        status: "waiting",
      };

      // Create lobby on backend
      multiplayer.emit("lobby:create", newLobby);
      setLobbyState(newLobby);
      setLobby(newLobby);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [lobbyId, wagerAmount, authenticated, chainId, walletAddress, selectedTeam, userCoins, setLobby]);

  // Join existing lobby as guest
  const joinLobby = useCallback(async () => {
    if (joiningWager > 0 && !authenticated) {
      setError("Connect wallet to join wager match");
      return;
    }
    if (joiningWager > userCoins) {
      setError(`Need ${joiningWager} coins to join (you have ${userCoins})`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Accept wager on-chain if amount > 0
      if (joiningWager > 0) {
        const success = await acceptWager(lobbyId);
        if (!success) throw new Error("Failed to accept wager on-chain");
      }

      // Join lobby on backend
      multiplayer.emit("lobby:join", {
        lobbyId,
        guestId: chainId || walletAddress || "guest",
        guestName: walletAddress?.slice(0, 8) || "Guest",
        guestTeam: selectedTeam?.name || "Unknown",
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [lobbyId, joiningWager, authenticated, chainId, walletAddress, selectedTeam, userCoins]);

  // Cancel lobby
  const handleCancel = async () => {
    if (lobby && lobby.wagerAmount > 0 && isHost) {
      await cancelWager(lobbyId);
    }
    multiplayer.emit("lobby:cancel", { lobbyId });
    setLobby(null);
    setScreen(ScreenName.MODE_SELECT);
  };

  // Copy link
  const copyLink = () => {
    navigator.clipboard.writeText(lobbyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Ready up / Start match
  const handleReady = () => {
    multiplayer.emit("lobby:ready", { lobbyId, playerId: chainId || walletAddress });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/40">
        <button onClick={handleCancel} className="p-2 hover:bg-white/10 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-arcade font-black italic">
          {isJoining ? "JOIN MATCH" : "CREATE MATCH"}
        </h1>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto space-y-6">
          
          {/* JOINING FLOW - Show lobby info and join button */}
          {isJoining && !lobby?.guestId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Lobby Info Card */}
              <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl p-6 border border-white/10">
                <div className="text-center mb-4">
                  <div className="text-xs text-slate-400 uppercase font-bold mb-1">Joining Lobby</div>
                  <div className="text-3xl font-arcade font-black tracking-wider">{lobbyId}</div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  </div>
                ) : (
                  <>
                    {/* Host Info */}
                    {lobby && (
                      <div className="bg-white/5 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <Crown className="w-5 h-5 text-yellow-400" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase">Host</div>
                            <div className="font-bold">{lobby.hostName}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Wager Required */}
                    {joiningWager > 0 && (
                      <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coins className="w-5 h-5 text-yellow-400" />
                            <span className="font-bold text-yellow-400">WAGER REQUIRED</span>
                          </div>
                          <span className="text-2xl font-arcade font-black text-yellow-400">
                            {joiningWager}
                          </span>
                        </div>
                        <div className="text-xs text-yellow-400/70 mt-2">
                          Winner takes {joiningWager * 2 * 0.95} coins (5% fee)
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Your balance: {userCoins} coins
                        </div>
                      </div>
                    )}

                    {/* Your Team */}
                    <div className="bg-white/5 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg border-2 border-white/20"
                          style={{ backgroundColor: selectedTeam?.primaryColor }}
                        />
                        <div>
                          <div className="text-xs text-slate-500 uppercase">Your Team</div>
                          <div className="font-bold">{selectedTeam?.name || "Select Team"}</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={joinLobby}
                disabled={loading || (joiningWager > 0 && (!authenticated || joiningWager > userCoins))}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Swords className="w-5 h-5 mr-2" />
                    {joiningWager > 0 ? `STAKE ${joiningWager} & JOIN` : "JOIN MATCH"}
                  </>
                )}
              </Button>

              {joiningWager > 0 && !authenticated && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setScreen(ScreenName.WALLET_CONNECT)}
                >
                  Connect Wallet to Join
                </Button>
              )}
            </motion.div>
          )}

          {/* HOST FLOW - Wager Selection (before lobby created) */}
          {isHost && !lobby && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Your Team */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl border-2 border-white/20"
                    style={{ backgroundColor: selectedTeam?.primaryColor }}
                  />
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-bold">Your Team</div>
                    <div className="font-bold">{selectedTeam?.name || "Select Team"}</div>
                  </div>
                </div>
              </div>

              {/* Wager Selection */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" /> Wager Amount
                  </h3>
                  <div className="text-xs text-slate-500">
                    Balance: <span className="text-yellow-400 font-bold">{userCoins}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {WAGER_OPTIONS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setWagerAmount(amount)}
                      disabled={amount > userCoins && amount > 0}
                      className={`py-3 px-4 rounded-xl font-bold transition-all ${
                        wagerAmount === amount
                          ? "bg-yellow-500 text-black"
                          : amount > userCoins && amount > 0
                          ? "bg-white/5 text-slate-600 cursor-not-allowed"
                          : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      {amount === 0 ? "FREE" : amount}
                    </button>
                  ))}
                </div>

                {wagerAmount > 0 && (
                  <div className="mt-4 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                    <div className="text-xs text-yellow-400">
                      <strong>Winner takes:</strong> {Math.floor(wagerAmount * 2 * 0.95)} coins (5% fee)
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={createLobby}
                disabled={loading || (wagerAmount > 0 && !authenticated)}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Swords className="w-5 h-5 mr-2" />
                    {wagerAmount > 0 ? `STAKE ${wagerAmount} & CREATE` : "CREATE LOBBY"}
                  </>
                )}
              </Button>

              {wagerAmount > 0 && !authenticated && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setScreen(ScreenName.WALLET_CONNECT)}
                >
                  Connect Wallet First
                </Button>
              )}
            </motion.div>
          )}

          {/* LOBBY CREATED - Share Link & Wait */}
          {lobby && (isHost || lobby.guestId) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Lobby Info */}
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-6 border border-white/10">
                <div className="text-center mb-4">
                  <div className="text-xs text-slate-400 uppercase font-bold mb-1">Lobby Code</div>
                  <div className="text-3xl font-arcade font-black tracking-wider">{lobbyId}</div>
                </div>

                {lobby.wagerAmount > 0 && (
                  <div className="flex items-center justify-center gap-2 py-2 px-4 bg-yellow-500/20 rounded-xl mb-4">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold text-yellow-400">{lobby.wagerAmount} COINS STAKED</span>
                  </div>
                )}

                {/* Share Options - Only for host waiting */}
                {isHost && !lobby.guestId && (
                  <>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={copyLink}
                        className="flex-1"
                      >
                        {copied ? <Check className="w-4 h-4 mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                        {copied ? "COPIED!" : "COPY LINK"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setShowQR(!showQR)}
                        className="px-4"
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* QR Code */}
                    <AnimatePresence>
                      {showQR && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-4 flex justify-center overflow-hidden"
                        >
                          <div className="bg-white p-4 rounded-xl">
                            <QRCode value={lobbyUrl} size={160} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>

              {/* Players */}
              <div className="space-y-3">
                {/* Host */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-4">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Crown className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 uppercase">Host</div>
                    <div className="font-bold">{lobby.hostName}</div>
                    <div className="text-xs text-slate-400">{lobby.hostTeam}</div>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>

                {/* Guest */}
                <div className={`rounded-xl p-4 border flex items-center gap-4 ${
                  lobby.guestId 
                    ? "bg-white/5 border-white/10" 
                    : "bg-white/[0.02] border-dashed border-white/10"
                }`}>
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Shield className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 uppercase">Opponent</div>
                    {lobby.guestId ? (
                      <>
                        <div className="font-bold">{lobby.guestName}</div>
                        <div className="text-xs text-slate-400">{lobby.guestTeam}</div>
                      </>
                    ) : (
                      <div className="text-slate-500 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Waiting for opponent...
                      </div>
                    )}
                  </div>
                  {lobby.guestId && <div className="w-3 h-3 rounded-full bg-green-500" />}
                </div>
              </div>

              {/* Actions */}
              {lobby.guestId ? (
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  onClick={handleReady}
                  disabled={loading}
                >
                  <Swords className="w-5 h-5 mr-2" />
                  START MATCH
                </Button>
              ) : isHost ? (
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={handleCancel}
                  className="text-red-400 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  CANCEL LOBBY
                </Button>
              ) : null}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
