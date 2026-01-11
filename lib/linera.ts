// Linera blockchain integration via backend API

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";

export const LINERA_CONFIG = {
  faucetUrl: "https://faucet.testnet-conway.linera.net",
  applicationId: "0db11f239706aa1024d0d530d933b510530a88f13b50ca0e3c914c7c9aef336e",
};
//dcb4a5413bcbadbb255c592595615c818e7265f8adb28ae75fd6cbb601c28798
export interface PlayerProfile {
  xp: number;
  coins: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  level: number;
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
  xp: number;
  wins: number;
  level: number;
}

// State
let chainId: string | null = null;
let signerKey: string | null = null;
let initialized = false;

const STORAGE = {
  chainId: "linera_chain_id",
  signerKey: "linera_signer_key",
};

export function getChainId(): string | null {
  return chainId || localStorage.getItem(STORAGE.chainId);
}

async function api(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  return res.json();
}

export async function initLineraClient() {
  if (initialized) return;
  const linera = await import("@linera/client");
  await linera.initialize();
  initialized = true;
}

export async function connectWallet(): Promise<string | null> {
  try {
    // Check for existing session
    const existingChain = localStorage.getItem(STORAGE.chainId);
    const existingKey = localStorage.getItem(STORAGE.signerKey);
    
    if (existingChain && existingKey) {
      chainId = existingChain;
      signerKey = existingKey;
      return chainId;
    }

    await initLineraClient();
    const linera = await import("@linera/client");
    const { signer: signerModule } = linera;

    const faucet = new linera.Faucet(LINERA_CONFIG.faucetUrl);
    const wallet = await faucet.createWallet();
    const signer = signerModule.PrivateKey.createRandom();
    const address = signer.address();

    console.log("Claiming chain for:", address);
    const claimedChain = await faucet.claimChain(wallet, address);
    chainId = (claimedChain as any).chainId || claimedChain.toString();
    console.log("Chain claimed:", chainId);

    // Persist wallet data
    localStorage.setItem(STORAGE.chainId, chainId);
    // Note: In production, encrypt this or use a secure storage method
    localStorage.setItem(STORAGE.signerKey, address);
    signerKey = address;

    return chainId;
  } catch (error) {
    console.error("Failed to connect:", error);
    return null;
  }
}

export function disconnectWallet(): void {
  chainId = null;
  signerKey = null;
  localStorage.removeItem(STORAGE.chainId);
  localStorage.removeItem(STORAGE.signerKey);
}

export function isWalletPersisted(): boolean {
  return !!(localStorage.getItem(STORAGE.chainId) && localStorage.getItem(STORAGE.signerKey));
}

export async function registerPlayer(): Promise<boolean> {
  try {
    const id = getChainId();
    if (!id) return false;
    const result = await api("/api/linera/register", {
      method: "POST",
      body: JSON.stringify({ chainId: id }),
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
