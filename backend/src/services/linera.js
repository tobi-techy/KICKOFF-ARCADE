import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const APP_ID = process.env.APPLICATION_ID;
const CHAIN_ID = process.env.CHAIN_ID;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 30000;

class LineraService {
  constructor() {
    this.serviceProcess = null;
    this.servicePort = 8080;
    this.serviceUrl = `http://localhost:${this.servicePort}`;
    this.isReady = false;
  }

  async exec(command, timeout = 30000) {
    try {
      const { stdout, stderr } = await execAsync(`linera ${command}`, { timeout });
      if (stderr) console.warn("Linera stderr:", stderr);
      return stdout.trim();
    } catch (error) {
      console.error("Linera command failed:", error.message);
      throw error;
    }
  }

  async startService() {
    if (this.serviceProcess) return;

    const { spawn } = await import("child_process");
    this.serviceProcess = spawn("linera", ["service", "--port", String(this.servicePort)], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.serviceProcess.stdout.on("data", (data) => {
      const msg = data.toString();
      console.log("[linera-service]", msg);
      if (msg.includes("GraphiQL") || msg.includes("localhost:8080")) {
        this.isReady = true;
      }
    });

    this.serviceProcess.stderr.on("data", (data) => {
      const msg = data.toString();
      console.log("[linera-service]", msg);
      // Linera logs to stderr, check for ready signal there too
      if (msg.includes("GraphiQL") || msg.includes("localhost:8080")) {
        this.isReady = true;
      }
    });

    this.serviceProcess.on("exit", (code) => {
      console.log(`Linera service exited with code ${code}`);
      this.isReady = false;
      this.serviceProcess = null;
    });

    // Wait for service to be ready
    await this.waitForReady(15000);
    console.log(`Linera service started on port ${this.servicePort}`);
  }

  async waitForReady(timeout = 10000) {
    const start = Date.now();
    while (!this.isReady && Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!this.isReady) throw new Error("Linera service failed to start");
  }

  stopService() {
    if (this.serviceProcess) {
      this.serviceProcess.kill();
      this.serviceProcess = null;
      this.isReady = false;
    }
  }

  async fetchWithTimeout(url, options, timeout = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(id);
    }
  }

  async queryWithRetry(query, retries = MAX_RETRIES) {
    const url = `${this.serviceUrl}/chains/${CHAIN_ID}/applications/${APP_ID}`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (!this.isReady) {
          await this.startService();
        }

        const response = await this.fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
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
        console.error(`Query attempt ${attempt}/${retries} failed:`, error.message);
        if (attempt === retries) throw error;
        await new Promise((r) => setTimeout(r, RETRY_DELAY * attempt));
      }
    }
  }

  async query(query) {
    return this.queryWithRetry(query);
  }

  async mutate(mutation) {
    return this.queryWithRetry(mutation);
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

  async acceptWager(lobbyId) {
    return this.mutate(`
      mutation {
        acceptWager(lobbyId: "${lobbyId}")
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

  async getWager(lobbyId) {
    return this.query(`
      query {
        wager(lobbyId: "${lobbyId}") {
          lobbyId
          host
          guest
          amount
          status
          winner
        }
      }
    `);
  }

  async forfeitMatch() {
    return this.mutate(`mutation { forfeitMatch }`);
  }

  async forfeitWager(lobbyId) {
    return this.mutate(`mutation { forfeitWager(lobbyId: "${lobbyId}") }`);
  }

  async getWalletInfo() {
    return this.exec("wallet show");
  }

  async getBalance(chainId) {
    return this.exec(`wallet show ${chainId || ""}`);
  }
}

export const lineraService = new LineraService();
export default LineraService;
