import { useState, useEffect, useCallback } from "react";
import {
  connectWallet,
  disconnectWallet,
  getChainId,
  getPlayerProfile,
  getPlayerCards,
  isPlayerRegistered,
  isWalletPersisted,
  registerPlayer,
  recordMatch,
  PlayerProfile,
  PlayerCard,
  LINERA_CONFIG,
} from "./linera";

export function useLineraWallet() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [cards, setCards] = useState<PlayerCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already connected (persisted session)
    const existingChainId = getChainId();
    if (existingChainId && isWalletPersisted()) {
      setChainId(existingChainId);
      setAuthenticated(true);
      // Fetch profile in background
      getPlayerProfile(existingChainId).then(setProfile).catch(() => {});
      getPlayerCards(existingChainId).then(setCards).catch(() => {});
    }
    setReady(true);
  }, []);

  const login = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const newChainId = await connectWallet();
      if (newChainId) {
        setChainId(newChainId);
        setAuthenticated(true);

        // Check if player is registered, if not register them
        const registered = await isPlayerRegistered(newChainId);
        if (!registered) {
          await registerPlayer();
        }

        // Fetch profile
        const playerProfile = await getPlayerProfile(newChainId);
        setProfile(playerProfile);
      } else {
        setError("Failed to connect wallet");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    disconnectWallet();
    setChainId(null);
    setAuthenticated(false);
    setProfile(null);
    setError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!chainId) return;
    setLoading(true);
    try {
      const [playerProfile, playerCards] = await Promise.all([
        getPlayerProfile(chainId),
        getPlayerCards(chainId),
      ]);
      setProfile(playerProfile);
      setCards(playerCards);
    } catch (err) {
      setError("Failed to refresh profile");
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  const submitMatch = useCallback(
    async (homeScore: number, awayScore: number) => {
      if (!chainId) return null;
      setLoading(true);
      setError(null);
      try {
        const result = await recordMatch(homeScore, awayScore);
        if (result) {
          await refreshProfile();
        }
        return result;
      } catch (err) {
        setError("Failed to record match");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [chainId, refreshProfile]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    ready,
    authenticated,
    loading,
    error,
    chainId,
    address: chainId,
    profile,
    cards,
    login,
    logout,
    refreshProfile,
    submitMatch,
    clearError,
    chainConfig: {
      name: "Linera Testnet Conway",
      faucet: LINERA_CONFIG.faucetUrl,
    },
  };
}
