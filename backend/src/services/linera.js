// Linera blockchain integration via local linera service
import { spawn } from "child_process";

const APP_ID = process.env.APPLICATION_ID;
const CHAIN_ID = process.env.CHAIN_ID;
const SERVICE_PORT = process.env.LINERA_SERVICE_PORT || "8080";
const SERVICE_URL = process.env.LINERA_SERVICE_URL || `http://localhost:${SERVICE_PORT}`;

class LineraService {
  constructor() {
    this.baseUrl = `${SERVICE_URL}/chains/${CHAIN_ID}/applications/${APP_ID}`;
    this.process = null;
  }

  async startService() {
    return new Promise((resolve) => {
      console.log("Spawning linera service on port", SERVICE_PORT);
      this.process = spawn("linera", ["service", "--port", SERVICE_PORT], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.process.stdout.on("data", (data) => {
        console.log(`[linera] ${data.toString().trim()}`);
      });

      this.process.stderr.on("data", (data) => {
        console.log(`[linera] ${data.toString().trim()}`);
      });

      this.process.on("error", (err) => {
        console.error("Failed to start linera service:", err.message);
        console.log("Continuing without local linera service...");
        resolve(false);
      });

      // Wait for service to be ready
      setTimeout(async () => {
        console.log("Linera service: App endpoint", this.baseUrl);
        resolve(true);
      }, 2000);
    });
  }

  stopService() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      console.log("Linera service stopped");
    }
  }

  async query(graphqlQuery) {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: graphqlQuery }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0]?.message || "GraphQL error");
      }
      return result;
    } catch (error) {
      console.error("Linera query failed:", error.message);
      throw error;
    }
  }

  async mutate(mutation) {
    return this.query(mutation);
  }

  // API Methods
  async registerPlayer(chainId) {
    return this.mutate(`mutation { registerPlayer }`);
  }

  async recordMatch(homeScore, awayScore) {
    return this.mutate(
      `mutation { recordMatch(homeScore: ${homeScore}, awayScore: ${awayScore}) }`
    );
  }

  async forfeitMatch() {
    return this.mutate(`mutation { forfeitMatch }`);
  }

  async claimDailyReward() {
    return this.mutate(`mutation { claimDailyReward }`);
  }

  async getPlayerProfile(address) {
    return this.query(`
      query {
        playerProfile(address: "${address}") {
          xp
          coins
          matchesPlayed
          wins
          losses
          draws
          level
          lastDailyClaim
        }
      }
    `);
  }

  async isRegistered(address) {
    return this.query(`query { isRegistered(address: "${address}") }`);
  }

  async getLeaderboard(count = 10) {
    return this.query(`
      query {
        leaderboard(count: ${count}) {
          player
          xp
          wins
          level
        }
      }
    `);
  }

  async getPlayerCards(owner) {
    return this.query(`
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
    `);
  }

  async mintPlayerCard(name, position, speed, shooting, passing, defending, rarity) {
    return this.mutate(`
      mutation {
        mintPlayer(
          name: "${name}",
          position: "${position}",
          speed: ${speed},
          shooting: ${shooting},
          passing: ${passing},
          defending: ${defending},
          rarity: ${rarity}
        )
      }
    `);
  }

  async createWager(lobbyId, amount) {
    return this.mutate(`
      mutation {
        createWager(lobbyId: "${lobbyId}", amount: ${amount})
      }
    `);
  }

  async acceptWager(lobbyId, hostChainId) {
    return this.mutate(`
      mutation {
        acceptWager(lobbyId: "${lobbyId}", hostChainId: "${hostChainId || CHAIN_ID}")
      }
    `);
  }

  async cancelWager(lobbyId) {
    return this.mutate(`
      mutation {
        cancelWager(lobbyId: "${lobbyId}")
      }
    `);
  }

  async resolveWager(lobbyId, winner, homeScore, awayScore) {
    return this.mutate(`
      mutation {
        resolveWager(lobbyId: "${lobbyId}", winner: "${winner}", homeScore: ${homeScore}, awayScore: ${awayScore})
      }
    `);
  }

  async forfeitWager(lobbyId) {
    return this.mutate(`mutation { forfeitWager(lobbyId: "${lobbyId}") }`);
  }

  async getWager(lobbyId) {
    return this.query(`
      query {
        wager(lobbyId: "${lobbyId}") {
          lobbyId
          host
          hostChain
          guest
          guestChain
          amount
          status
          winner
          createdAt
        }
      }
    `);
  }

  async getWalletInfo() {
    return {
      network: "testnet-conway",
      chainId: CHAIN_ID,
      applicationId: APP_ID,
      serviceUrl: this.baseUrl,
      faucetUrl: "https://faucet.testnet-conway.linera.net",
    };
  }

  async getNetworkStatus() {
    try {
      // Query the app to verify connection
      const result = await this.query(`query { totalMinted }`);
      return {
        connected: true,
        network: "testnet-conway",
        chainId: CHAIN_ID,
        applicationId: APP_ID,
        totalMinted: result.data?.totalMinted || 0,
      };
    } catch (error) {
      return {
        connected: false,
        network: "testnet-conway",
        error: error.message,
      };
    }
  }
}

export const lineraService = new LineraService();
export default LineraService;
