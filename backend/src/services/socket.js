import MatchmakingService from "../services/matchmaking.js";
import { lineraService } from "../services/linera.js";

// In-memory lobby storage
const lobbies = new Map();

export function setupSocketHandlers(io, app) {
  const matchmaking = new MatchmakingService(io);
  app.set("matchmaking", matchmaking);

  io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // ============ LOBBY EVENTS ============

    // Create lobby
    socket.on("lobby:create", (data) => {
      const { lobbyId, hostId, hostName, hostTeam, wagerAmount } = data;
      console.log(`Creating lobby ${lobbyId} by ${hostId}`);
      
      const lobby = {
        lobbyId,
        hostId,
        hostName,
        hostTeam,
        hostSocketId: socket.id,
        wagerAmount: wagerAmount || 0,
        guestId: null,
        guestName: null,
        guestTeam: null,
        guestSocketId: null,
        status: "waiting",
        createdAt: Date.now(),
      };
      
      lobbies.set(lobbyId, lobby);
      socket.join(`lobby:${lobbyId}`);
      socket.emit("lobby:updated", lobby);
    });

    // Get lobby info
    socket.on("lobby:info", (data) => {
      const { lobbyId } = data;
      const lobby = lobbies.get(lobbyId);
      if (lobby) {
        socket.emit("lobby:info", lobby);
      } else {
        socket.emit("lobby:error", { message: "Lobby not found" });
      }
    });

    // Join lobby
    socket.on("lobby:join", (data) => {
      const { lobbyId, guestId, guestName, guestTeam } = data;
      console.log(`Player ${guestId} joining lobby ${lobbyId}`);
      
      const lobby = lobbies.get(lobbyId);
      if (!lobby) {
        socket.emit("lobby:error", { message: "Lobby not found" });
        return;
      }
      if (lobby.guestId) {
        socket.emit("lobby:error", { message: "Lobby is full" });
        return;
      }
      if (lobby.hostId === guestId) {
        socket.emit("lobby:error", { message: "Cannot join your own lobby" });
        return;
      }

      lobby.guestId = guestId;
      lobby.guestName = guestName;
      lobby.guestTeam = guestTeam;
      lobby.guestSocketId = socket.id;
      lobby.status = "ready";

      socket.join(`lobby:${lobbyId}`);
      io.to(`lobby:${lobbyId}`).emit("lobby:updated", lobby);
    });

    // Ready / Start match
    socket.on("lobby:ready", (data) => {
      const { lobbyId, playerId } = data;
      const lobby = lobbies.get(lobbyId);
      if (!lobby || lobby.status !== "ready") return;

      lobby.status = "playing";
      
      // Create match from lobby
      const matchId = lobbyId;
      const match = matchmaking.createMatch(matchId, [
        { playerId: lobby.hostId, socketId: lobby.hostSocketId, side: "home", ready: true },
        { playerId: lobby.guestId, socketId: lobby.guestSocketId, side: "away", ready: true },
      ], lobby.wagerAmount);

      io.to(`lobby:${lobbyId}`).emit("match:start", { 
        matchId, 
        wagerAmount: lobby.wagerAmount,
        host: { id: lobby.hostId, name: lobby.hostName, team: lobby.hostTeam },
        guest: { id: lobby.guestId, name: lobby.guestName, team: lobby.guestTeam },
      });
    });

    // Cancel lobby
    socket.on("lobby:cancel", (data) => {
      const { lobbyId } = data;
      const lobby = lobbies.get(lobbyId);
      if (lobby) {
        io.to(`lobby:${lobbyId}`).emit("lobby:updated", { ...lobby, status: "cancelled" });
        lobbies.delete(lobbyId);
      }
    });

    // ============ MATCHMAKING EVENTS ============

    // Join matchmaking queue
    socket.on("queue:join", (data) => {
      const { playerId, playerData } = data;
      console.log(`Player ${playerId} joining queue`);
      
      const match = matchmaking.addToQueue(playerId, socket.id, playerData);
      if (match) {
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

      if (match.players.every((p) => p.ready)) {
        match.state = "playing";
        match.startedAt = Date.now();
        io.to(`match:${matchId}`).emit("match:start", { matchId });
      }
    });

    // Game state sync
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
        try {
          // If wager match, resolve on chain
          if (match.wagerAmount > 0) {
            const winner = match.score.home > match.score.away 
              ? match.players.find(p => p.side === "home")?.playerId
              : match.players.find(p => p.side === "away")?.playerId;
            
            if (winner) {
              await lineraService.resolveWager(matchId, winner, match.score.home, match.score.away);
            }
          } else {
            await lineraService.recordMatch(match.score.home, match.score.away);
          }
        } catch (error) {
          console.error("Failed to record match on chain:", error);
        }
        
        // Clean up lobby
        lobbies.delete(matchId);
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);
    });
  });
}
