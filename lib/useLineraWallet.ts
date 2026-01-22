import { useState, useEffect, useCallback } from "react";
import {
  connectWallet,
  disconnectWallet,
  getChainId,
  getPlayerAddress,
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
  const [walletAvailable, setWalletAvailable] = useState(true); // Always available in local mode
  const [authenticated, setAuthenticated] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);
  const [playerAddress, setPlayerAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [cards, setCards] = useState<PlayerCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);

  // Check wallet availability and restore session
  useEffect(() => {
    const checkWallet = () => {
      // Check for persisted session
      const existingChainId = getChainId();
      const existingAddress = getPlayerAddress();
      if (existingChainId && existingAddress && isWalletPersisted()) {
        setChainId(existingChainId);
        setPlayerAddress(existingAddress);
        setAuthenticated(true);
        // Fetch profile in background using player address
        getPlayerProfile(existingAddress).then(setProfile).catch(() => {});
        getPlayerCards(existingAddress).then(setCards).catch(() => {});
      }

      setReady(true);
    };

    checkWallet();
  }, []);

  const login = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await connectWallet();
      
      if (result) {
        setChainId(result.chainId);
        setPlayerAddress(result.playerAddress);
        setAuthenticated(true);

        // Check if player is registered using player address
        const registered = await isPlayerRegistered(result.playerAddress);
        if (!registered) {
          setNeedsUsername(true);
        } else {
          const playerProfile = await getPlayerProfile(result.playerAddress);
          setProfile(playerProfile);
        }
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
    setPlayerAddress(null);
    setAuthenticated(false);
    setProfile(null);
    setCards([]);
    setNeedsUsername(false);
    setError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!playerAddress) return;
    setLoading(true);
    try {
      const [playerProfile, playerCards] = await Promise.all([
        getPlayerProfile(playerAddress),
        getPlayerCards(playerAddress),
      ]);
      setProfile(playerProfile);
      setCards(playerCards);
    } catch (err) {
      setError("Failed to refresh profile");
    } finally {
      setLoading(false);
    }
  }, [playerAddress]);

  const completeRegistration = useCallback(async (username: string) => {
    if (!playerAddress) return false;
    setLoading(true);
    try {
      const success = await registerPlayer(username);
      if (success) {
        setNeedsUsername(false);
        await refreshProfile();
        return true;
      }
      setError("Registration failed");
      return false;
    } catch (err) {
      setError("Registration failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [chainId, refreshProfile]);

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
    [playerAddress, refreshProfile]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    ready,
    walletAvailable,
    authenticated,
    loading,
    error,
    chainId,
    playerAddress,
    address: playerAddress, // Use playerAddress as the display address
    profile,
    cards,
    needsUsername,
    login,
    logout,
    refreshProfile,
    submitMatch,
    completeRegistration,
    clearError,
    chainConfig: {
      name: "Linera Local Network",
      faucet: LINERA_CONFIG.faucetUrl,
    },
  };
}
