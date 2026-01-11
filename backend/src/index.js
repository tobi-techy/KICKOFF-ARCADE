import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import lineraRoutes from "./routes/linera.js";
import gameRoutes from "./routes/game.js";
import webhookRoutes from "./routes/webhooks.js";
import { setupSocketHandlers } from "./services/socket.js";
import { lineraService } from "./services/linera.js";

const app = express();
const httpServer = createServer(app);

// CORS configuration for production
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Routes
app.use("/api/linera", lineraRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/webhooks", webhookRoutes);

// Socket.IO setup
setupSocketHandlers(io, app);

// Start server
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Start Linera service in background
    console.log("Starting Linera service...");
    await lineraService.startService();
    
    httpServer.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
      console.log(`WebSocket ready for multiplayer`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  lineraService.stopService();
  process.exit(0);
});

start();
