// Linera blockchain integration for Kickoff Arcade
// Replaces the Movement blockchain integration

// Application ID - UPDATE after deploying to testnet
export const LINERA_CONFIG = {
  faucetUrl: "https://faucet.testnet-conway.linera.net",
  applicationId: "", // Set after deployment
};

// Types matching the Rust contract
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

// GraphQL queries
const QUERIES = {
  playerProfile: (address: string) => `
    query {
      playerProfile(address: "${address}") {
        xp
        coins
        matchesPlayed
        wins
        losses
        draws
        level
      }
    }
  `,
  leaderboard: (count: number) => `
    query {
      leaderboard(count: ${count}) {
        player
        xp
        wins
        level
      }
    }
  `,
  playerCards: (owner: string) => `
    query {
      playerCards(owner: "${owner}") {
        id
        name
        position
        speed
        shooting
        passing
        defending
        rating
        rarity
      }
    }
  `,
  isRegistered: (address: string) => `
    query {
      isRegistered(address: "${address}")
    }
  `,
};

// GraphQL mutations (schedule operations)
const MUTATIONS = {
  registerPlayer: `
    mutation {
      registerPlayer
    }
  `,
  recordMatch: (homeScore: number, awayScore: number) => `
    mutation {
      recordMatch(homeScore: ${homeScore}, awayScore: ${awayScore})
    }
  `,
  mintPlayer: (card: Omit<PlayerCard, "id" | "rating">) => `
    mutation {
      mintPlayer(
        name: "${card.name}",
        position: "${card.position}",
        speed: ${card.speed},
        shooting: ${card.shooting},
        passing: ${card.passing},
        defending: ${card.defending},
        rarity: ${card.rarity}
      )
    }
  `,
};

// Linera client wrapper
let lineraClient: any = null;
let chainId: string | null = null;

export async function initLineraClient() {
  if (lineraClient) return lineraClient;

  // Dynamic import for browser compatibility
  const linera = await import("@linera/client");
  // Initialize WASM module
  if (typeof linera.initialize === 'function') {
    await linera.initialize();
  }

  lineraClient = linera;
  return lineraClient;
}

export async function connectWallet(): Promise<string | null> {
  try {
    const client = await initLineraClient();

    // Request a chain from the faucet
    const response = await fetch(LINERA_CONFIG.faucetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "mutation { claim }" }),
    });

    const data = await response.json();
    chainId = data?.data?.claim?.chainId;

    return chainId;
  } catch (error) {
    console.error("Failed to connect wallet:", error);
    return null;
  }
}

export function getChainId(): string | null {
  return chainId;
}

async function graphqlQuery(query: string): Promise<any> {
  if (!chainId || !LINERA_CONFIG.applicationId) {
    throw new Error("Wallet not connected or application not configured");
  }

  const client = await initLineraClient();
  const response = await client.query(
    chainId,
    LINERA_CONFIG.applicationId,
    query
  );
  return response;
}

async function graphqlMutation(mutation: string): Promise<any> {
  if (!chainId || !LINERA_CONFIG.applicationId) {
    throw new Error("Wallet not connected or application not configured");
  }

  const client = await initLineraClient();
  const response = await client.mutate(
    chainId,
    LINERA_CONFIG.applicationId,
    mutation
  );
  return response;
}

// Public API functions
export async function getPlayerProfile(
  address: string
): Promise<PlayerProfile | null> {
  try {
    const result = await graphqlQuery(QUERIES.playerProfile(address));
    return result?.data?.playerProfile || null;
  } catch {
    return null;
  }
}

export async function getLeaderboard(count = 10): Promise<LeaderboardEntry[]> {
  try {
    const result = await graphqlQuery(QUERIES.leaderboard(count));
    return result?.data?.leaderboard || [];
  } catch {
    return [];
  }
}

export async function getPlayerCards(owner: string): Promise<PlayerCard[]> {
  try {
    const result = await graphqlQuery(QUERIES.playerCards(owner));
    return result?.data?.playerCards || [];
  } catch {
    return [];
  }
}

export async function isPlayerRegistered(address: string): Promise<boolean> {
  try {
    const result = await graphqlQuery(QUERIES.isRegistered(address));
    return result?.data?.isRegistered || false;
  } catch {
    return false;
  }
}

export async function registerPlayer(): Promise<boolean> {
  try {
    await graphqlMutation(MUTATIONS.registerPlayer);
    return true;
  } catch {
    return false;
  }
}

export async function recordMatch(
  homeScore: number,
  awayScore: number
): Promise<{ xpEarned: number; coinsEarned: number } | null> {
  try {
    await graphqlMutation(MUTATIONS.recordMatch(homeScore, awayScore));

    // Calculate rewards client-side (matches contract logic)
    if (homeScore > awayScore) {
      return { xpEarned: 100, coinsEarned: 50 };
    } else if (homeScore < awayScore) {
      return { xpEarned: 25, coinsEarned: 10 };
    } else {
      return { xpEarned: 50, coinsEarned: 20 };
    }
  } catch {
    return null;
  }
}

export async function mintPlayerCard(
  card: Omit<PlayerCard, "id" | "rating">
): Promise<number | null> {
  try {
    const result = await graphqlMutation(MUTATIONS.mintPlayer(card));
    return result?.data?.mintPlayer?.cardId || null;
  } catch {
    return null;
  }
}
