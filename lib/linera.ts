// Linera blockchain integration via backend API

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";

export const LINERA_CONFIG = {
  faucetUrl: "https://faucet.testnet-conway.linera.net",
  applicationId: "3a0710ee2a379bb1eab89c0891bdb806efea18a50fe0b675e11ca399a6572249",
};

export interface PlayerProfile {
  xp: number;
  coins: number;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  level: number;
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
