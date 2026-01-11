// Linera blockchain integration via local linera service
// Requires: linera service --port 8080

const APP_ID = process.env.APPLICATION_ID;
const CHAIN_ID = process.env.CHAIN_ID;
const SERVICE_URL = process.env.LINERA_SERVICE_URL || "http://localhost:8080";

class LineraService {
  constructor() {
    this.baseUrl = `${SERVICE_URL}/chains/${CHAIN_ID}/applications/${APP_ID}`;
    this.isReady = true;
  }

  async startService() {
    console.log("Linera service: Using", SERVICE_URL);
    console.log("Linera service: App endpoint", this.baseUrl);
    return true;
  }

  stopService() {}

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

  async forfeitWager(lobbyId) {
    return this.mutate(`mutation { forfeitWager(lobbyId: "${lobbyId}") }`);
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

  async getWalletInfo() {
    return { info: "Cloud mode - wallet managed by frontend" };
  }

  async getBalance(chainId) {
    return { balance: "N/A in cloud mode" };
  }
}

export const lineraService = new LineraService();
export default LineraService;
