# Kickoff Arcade Backend

Backend server for Kickoff Arcade with Linera blockchain integration and multiplayer support.

## Features

- **Linera CLI Integration**: Execute blockchain operations via REST API
- **Multiplayer Matchmaking**: Socket.IO based real-time matchmaking
- **Game State Sync**: Real-time game state synchronization
- **Webhooks**: Event notifications for external integrations

## Prerequisites

- Node.js 18+
- Linera CLI installed and wallet initialized
- Linera wallet with testnet tokens

## Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

## Run

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Linera Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/linera/register` | Register new player |
| POST | `/api/linera/match` | Record match result |
| GET | `/api/linera/profile/:address` | Get player profile |
| GET | `/api/linera/leaderboard` | Get leaderboard |
| POST | `/api/linera/mint` | Mint player card |
| GET | `/api/linera/wallet` | Get wallet info |

### Game

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/game/status` | Matchmaking queue status |
| GET | `/api/game/match/:id` | Get match details |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/match/started` | Match started event |
| POST | `/api/webhooks/match/ended` | Match ended event |
| POST | `/api/webhooks/match/goal` | Goal scored event |

## WebSocket Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `queue:join` | `{ playerId, playerData }` | Join matchmaking |
| `queue:leave` | `{ playerId }` | Leave matchmaking |
| `match:join` | `{ matchId }` | Join match room |
| `match:ready` | `{ matchId, playerId }` | Player ready |
| `match:sync` | `{ matchId, state }` | Sync game state |
| `match:input` | `{ matchId, input }` | Player input |
| `match:goal` | `{ matchId, side, scorer }` | Goal scored |
| `match:end` | `{ matchId }` | End match |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `queue:joined` | `{ position }` | Joined queue |
| `match:found` | `{ matchId, side, opponent }` | Match found |
| `match:start` | `{ matchId }` | Match starting |
| `match:sync` | `state` | Game state update |
| `match:score` | `{ home, away }` | Score update |
| `match:ended` | `{ score, duration }` | Match ended |

## Architecture

```
backend/
├── src/
│   ├── index.js           # Entry point
│   ├── routes/
│   │   ├── linera.js      # Blockchain API
│   │   ├── game.js        # Game API
│   │   └── webhooks.js    # Webhook handlers
│   └── services/
│       ├── linera.js      # Linera CLI wrapper
│       ├── matchmaking.js # Matchmaking logic
│       └── socket.js      # WebSocket handlers
```
