// Linera blockchain integration for local network (dockerized)

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";

export const LINERA_CONFIG = {
  faucetUrl: (import.meta as any).env?.VITE_FAUCET_URL || "http://localhost:8080",
  applicationId: (import.meta as any).env?.VITE_APPLICATION_ID || "",
  chainId: (import.meta as any).env?.VITE_CHAIN_ID || "",
  network: "local",
};

export interface PlayerProfile {
  username: string;
  xp: number;
  coins: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  level: number;
  lastDailyClaim?: number;
}

export interface PlayerCard {
  id: number;
  name: string;
  position: string;
  speed: number;
  shooting: number;
  passing: number;
  defending: number;
  rating: number;
  rarity: number;
}

export interface LeaderboardEntry {
  player: string;
  username: string;
  xp: number;
  wins: number;
  level: number;
}

// State
let chainId: string | null = null;
let playerAddress: string | null = null;

const STORAGE_KEY = "linera_chain_id";
const PLAYER_ADDRESS_KEY = "linera_player_address";

export function getChainId(): string | null {
  return chainId || localStorage.getItem(STORAGE_KEY);
}

export function getPlayerAddress(): string | null {
  return playerAddress || localStorage.getItem(PLAYER_ADDRESS_KEY);
}

export function isWalletPersisted(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

export function isBrowserWalletAvailable(): boolean {
  return false; // Local network mode - no browser wallet needed
}

async function api(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  return res.json();
}

export async function connectWallet(): Promise<{ chainId: string; playerAddress: string } | null> {
  try {
    // Check for existing session
    const existingChain = localStorage.getItem(STORAGE_KEY);
    const existingAddress = localStorage.getItem(PLAYER_ADDRESS_KEY);
    if (existingChain && existingAddress) {
      chainId = existingChain;
      playerAddress = existingAddress;
      console.log("Restored wallet:", chainId, playerAddress);
      return { chainId, playerAddress };
    }

    // Local network mode - request chain from faucet via backend
    const result = await api("/api/linera/wallet/connect", { method: "POST" });
    
    if (!result.chainId || !result.playerAddress) {
      throw new Error("Failed to get wallet info from local network");
    }

    chainId = result.chainId;
    playerAddress = result.playerAddress;
    localStorage.setItem(STORAGE_KEY, chainId);
    localStorage.setItem(PLAYER_ADDRESS_KEY, playerAddress);
    console.log("Connected to local network:", chainId, playerAddress);

    return { chainId, playerAddress };
  } catch (error) {
    console.error("Failed to connect:", error);
    throw error;
  }
}

export function disconnectWallet(): void {
  chainId = null;
  playerAddress = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PLAYER_ADDRESS_KEY);
}

// GraphQL query helper via backend API
async function graphqlQuery(query: string): Promise<any> {
  const result = await api("/api/linera/query", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
  return result.data;
}

export const SINGLE_PLAYER_FEE = 10; // Cost in coins to play single player

export async function registerPlayer(username: string): Promise<boolean> {
  try {
    const id = getChainId();
    if (!id) return false;
    const result = await api("/api/linera/register", {
      method: "POST",
      body: JSON.stringify({ chainId: id, username }),
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function payMatchFee(amount: number = SINGLE_PLAYER_FEE): Promise<boolean> {
  try {
    const result = await api("/api/linera/match/pay-fee", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function recordMatch(
  homeScore: number,
  awayScore: number
): Promise<{ xpEarned: number; coinsEarned: number } | null> {
  try {
    const result = await api("/api/linera/match", {
      method: "POST",
      body: JSON.stringify({ homeScore, awayScore }),
    });
    return result.rewards || null;
  } catch {
    return null;
  }
}

export async function getPlayerProfile(address: string): Promise<PlayerProfile | null> {
  try {
    const result = await api(`/api/linera/profile/${address}`);
    return result.data || null;
  } catch {
    return null;
  }
}

export async function getLeaderboard(count = 10): Promise<LeaderboardEntry[]> {
  try {
    const result = await api(`/api/linera/leaderboard?count=${count}`);
    return result.data || [];
  } catch {
    return [];
  }
}

export async function isPlayerRegistered(address: string): Promise<boolean> {
  const profile = await getPlayerProfile(address);
  return profile !== null;
}

export async function createWager(lobbyId: string, amount: number): Promise<boolean> {
  try {
    const result = await api("/api/linera/wager/create", {
      method: "POST",
      body: JSON.stringify({ lobbyId, amount }),
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function acceptWager(lobbyId: string): Promise<boolean> {
  try {
    const result = await api("/api/linera/wager/accept", {
      method: "POST",
      body: JSON.stringify({ lobbyId }),
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function cancelWager(lobbyId: string): Promise<boolean> {
  try {
    const result = await api("/api/linera/wager/cancel", {
      method: "POST",
      body: JSON.stringify({ lobbyId }),
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function resolveWager(
  lobbyId: string,
  winner: string,
  homeScore: number,
  awayScore: number
): Promise<boolean> {
  try {
    const result = await api("/api/linera/wager/resolve", {
      method: "POST",
      body: JSON.stringify({ lobbyId, winner, homeScore, awayScore }),
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function getWager(lobbyId: string): Promise<any | null> {
  try {
    const result = await api(`/api/linera/wager/${lobbyId}`);
    return result.data || null;
  } catch {
    return null;
  }
}

export async function forfeitMatch(): Promise<boolean> {
  try {
    const result = await api("/api/linera/forfeit", {
      method: "POST",
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function forfeitWager(lobbyId: string): Promise<boolean> {
  try {
    const result = await api("/api/linera/wager/forfeit", {
      method: "POST",
      body: JSON.stringify({ lobbyId }),
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function getPlayerCards(owner: string): Promise<PlayerCard[]> {
  try {
    const result = await api(`/api/linera/cards/${owner}`);
    return result.data || [];
  } catch {
    return [];
  }
}

export async function mintPlayerCard(
  name: string,
  position: string,
  speed: number,
  shooting: number,
  passing: number,
  defending: number,
  rarity: number
): Promise<boolean> {
  try {
    const result = await api("/api/linera/mint", {
      method: "POST",
      body: JSON.stringify({ name, position, speed, shooting, passing, defending, rarity }),
    });
    return result.success;
  } catch {
    return false;
  }
}
