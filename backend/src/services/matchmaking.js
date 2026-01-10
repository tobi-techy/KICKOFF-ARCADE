import { v4 as uuidv4 } from "uuid";

// In-memory store for active matches (use Redis in production)
const activeMatches = new Map();
const matchQueue = [];

class MatchmakingService {
  constructor(io) {
    this.io = io;
  }

  // Add player to matchmaking queue
  addToQueue(playerId, socketId, playerData) {
    const existing = matchQueue.find((p) => p.playerId === playerId);
    if (existing) return null;

    const queueEntry = {
      playerId,
      socketId,
      playerData,
      joinedAt: Date.now(),
    };
    matchQueue.push(queueEntry);

    // Try to find a match
    return this.tryMatch(queueEntry);
  }

  // Remove player from queue
  removeFromQueue(playerId) {
    const index = matchQueue.findIndex((p) => p.playerId === playerId);
    if (index !== -1) {
      matchQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  // Try to match two players
  tryMatch(newPlayer) {
    if (matchQueue.length < 2) return null;

    // Find opponent (simple FIFO, could add skill-based matching)
    const opponent = matchQueue.find((p) => p.playerId !== newPlayer.playerId);
    if (!opponent) return null;

    // Remove both from queue
    this.removeFromQueue(newPlayer.playerId);
    this.removeFromQueue(opponent.playerId);

    // Create match
    const matchId = uuidv4();
    const match = {
      id: matchId,
      players: [
        { ...newPlayer, side: "home" },
        { ...opponent, side: "away" },
      ],
      state: "starting",
      score: { home: 0, away: 0 },
      createdAt: Date.now(),
      events: [],
    };

    activeMatches.set(matchId, match);

    // Notify both players
    this.io.to(newPlayer.socketId).emit("match:found", {
      matchId,
      side: "home",
      opponent: opponent.playerData,
    });

    this.io.to(opponent.socketId).emit("match:found", {
      matchId,
      side: "away",
      opponent: newPlayer.playerData,
    });

    return match;
  }

  // Create match directly (for lobby-based matches)
  createMatch(matchId, players, wagerAmount = 0) {
    const match = {
      id: matchId,
      players,
      state: "playing",
      score: { home: 0, away: 0 },
      wagerAmount,
      createdAt: Date.now(),
      startedAt: Date.now(),
      events: [],
    };

    activeMatches.set(matchId, match);
    return match;
  }

  // Get match by ID
  getMatch(matchId) {
    return activeMatches.get(matchId);
  }

  // Update match state
  updateMatch(matchId, updates) {
    const match = activeMatches.get(matchId);
    if (!match) return null;

    Object.assign(match, updates);
    return match;
  }

  // Record match event (goal, foul, etc.)
  addMatchEvent(matchId, event) {
    const match = activeMatches.get(matchId);
    if (!match) return null;

    match.events.push({
      ...event,
      timestamp: Date.now(),
    });

    // Broadcast to match room
    this.io.to(`match:${matchId}`).emit("match:event", event);

    return match;
  }

  // Update score
  updateScore(matchId, side) {
    const match = activeMatches.get(matchId);
    if (!match) return null;

    match.score[side]++;

    this.io.to(`match:${matchId}`).emit("match:score", match.score);

    return match;
  }

  // End match
  endMatch(matchId) {
    const match = activeMatches.get(matchId);
    if (!match) return null;

    match.state = "ended";
    match.endedAt = Date.now();

    this.io.to(`match:${matchId}`).emit("match:ended", {
      score: match.score,
      duration: match.endedAt - match.createdAt,
    });

    // Keep match data for a while for results, then clean up
    setTimeout(() => {
      activeMatches.delete(matchId);
    }, 60000);

    return match;
  }

  // Get queue status
  getQueueStatus() {
    return {
      playersInQueue: matchQueue.length,
      activeMatches: activeMatches.size,
    };
  }
}

export default MatchmakingService;
