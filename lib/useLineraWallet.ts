import { useState, useEffect, useCallback } from "react";
import {
  connectWallet,
  getChainId,
  getPlayerProfile,
  isPlayerRegistered,
  registerPlayer,
  recordMatch,
  PlayerProfile,
  LINERA_CONFIG,
} from "./linera";

export function useLineraWallet() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already connected
    const existingChainId = getChainId();
    if (existingChainId) {
      setChainId(existingChainId);
      setAuthenticated(true);
    }
    setReady(true);
  }, []);

  const login = useCallback(async () => {
    setLoading(true);
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
      }
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setChainId(null);
    setAuthenticated(false);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!chainId) return;
    const playerProfile = await getPlayerProfile(chainId);
    setProfile(playerProfile);
  }, [chainId]);

  const submitMatch = useCallback(
    async (homeScore: number, awayScore: number) => {
      if (!chainId) return null;
      const result = await recordMatch(homeScore, awayScore);
      if (result) {
        await refreshProfile();
      }
      return result;
    },
    [chainId, refreshProfile]
  );

  return {
    ready,
    authenticated,
    loading,
    chainId,
    address: chainId, // Alias for compatibility
    profile,
    login,
    logout,
    refreshProfile,
    submitMatch,
    chainConfig: {
      name: "Linera Testnet Conway",
      faucet: LINERA_CONFIG.faucetUrl,
    },
  };
}
