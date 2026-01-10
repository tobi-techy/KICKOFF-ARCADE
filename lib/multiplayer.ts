// Socket.IO client for multiplayer

import { io, Socket } from "socket.io-client";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";

export interface MatchFoundData {
  matchId: string;
  side: "home" | "away";
  opponent: PlayerData;
}

export interface PlayerData {
  playerId: string;
  name: string;
  team: string;
}

export interface GameState {
  ball: { x: number; y: number };
  players: Record<string, { x: number; y: number }>;
  score: { home: number; away: number };
}

class MultiplayerClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(API_URL, { transports: ["websocket"] });

    this.socket.on("connect", () => console.log("Multiplayer connected"));
    this.socket.on("disconnect", () => console.log("Multiplayer disconnected"));

    // Forward events to listeners
    const events = [
      "queue:joined", 
      "match:found", 
      "match:start", 
      "match:sync", 
      "match:score", 
      "match:ended", 
      "match:event",
      "lobby:updated",
      "lobby:info",
      "lobby:error",
    ];
    events.forEach((event) => {
      this.socket?.on(event, (data) => this.emit(event, data));
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  // Event emitter
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data?: any) {
    // If socket event, send to server
    if (this.socket?.connected && event.includes(":") && !event.startsWith("match:sync")) {
      this.socket.emit(event, data);
    }
    // Also notify local listeners
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  // Matchmaking
  joinQueue(playerId: string, playerData: PlayerData) {
    this.socket?.emit("queue:join", { playerId, playerData });
  }

  leaveQueue(playerId: string) {
    this.socket?.emit("queue:leave", { playerId });
  }

  // Match
  joinMatch(matchId: string) {
    this.socket?.emit("match:join", { matchId });
  }

  ready(matchId: string, playerId: string) {
    this.socket?.emit("match:ready", { matchId, playerId });
  }

  syncState(matchId: string, state: GameState) {
    this.socket?.emit("match:sync", { matchId, state });
  }

  sendInput(matchId: string, input: any) {
    this.socket?.emit("match:input", { matchId, input });
  }

  scoreGoal(matchId: string, side: "home" | "away", scorer: string) {
    this.socket?.emit("match:goal", { matchId, side, scorer });
  }

  endMatch(matchId: string) {
    this.socket?.emit("match:end", { matchId });
  }
}

export const multiplayer = new MultiplayerClient();
export default multiplayer;
