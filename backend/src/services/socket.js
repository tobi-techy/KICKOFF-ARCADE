import MatchmakingService from "../services/matchmaking.js";
import { lineraService } from "../services/linera.js";

export function setupSocketHandlers(io, app) {
  const matchmaking = new MatchmakingService(io);
  app.set("matchmaking", matchmaking);

  io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Join matchmaking queue
    socket.on("queue:join", (data) => {
      const { playerId, playerData } = data;
      console.log(`Player ${playerId} joining queue`);
      
      const match = matchmaking.addToQueue(playerId, socket.id, playerData);
      if (match) {
        // Match found immediately
        socket.join(`match:${match.id}`);
      } else {
        socket.emit("queue:joined", { position: matchmaking.getQueueStatus().playersInQueue });
      }
    });

    // Leave matchmaking queue
    socket.on("queue:leave", (data) => {
      const { playerId } = data;
      matchmaking.removeFromQueue(playerId);
      socket.emit("queue:left");
    });

    // Join match room
    socket.on("match:join", (data) => {
      const { matchId } = data;
      socket.join(`match:${matchId}`);
      console.log(`Socket ${socket.id} joined match ${matchId}`);
    });

    // Player ready
    socket.on("match:ready", (data) => {
      const { matchId, playerId } = data;
      const match = matchmaking.getMatch(matchId);
      if (!match) return;

      const player = match.players.find((p) => p.playerId === playerId);
      if (player) player.ready = true;

      // Check if both players ready
      if (match.players.every((p) => p.ready)) {
        match.state = "playing";
        match.startedAt = Date.now();
        io.to(`match:${matchId}`).emit("match:start", { matchId });
      }
    });

    // Game state sync (player position, ball, etc.)
    socket.on("match:sync", (data) => {
      const { matchId, state } = data;
      socket.to(`match:${matchId}`).emit("match:sync", state);
    });

    // Player input
    socket.on("match:input", (data) => {
      const { matchId, input } = data;
      socket.to(`match:${matchId}`).emit("match:input", input);
    });

    // Goal scored
    socket.on("match:goal", async (data) => {
      const { matchId, side, scorer } = data;
      matchmaking.updateScore(matchId, side);
      matchmaking.addMatchEvent(matchId, { type: "goal", side, scorer });
    });

    // Match ended
    socket.on("match:end", async (data) => {
      const { matchId } = data;
      const match = matchmaking.endMatch(matchId);
      
      if (match) {
        // Record on blockchain for both players
        try {
          await lineraService.recordMatch(match.score.home, match.score.away);
        } catch (error) {
          console.error("Failed to record match on chain:", error);
        }
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);
      // Could handle mid-match disconnection here
    });
  });
}
