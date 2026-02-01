# Kickoff Arcade ⚽

A real-time football arcade game built on **Linera blockchain**, featuring on-chain rewards, tournaments with prize pools, multiplayer staking, and pixel art graphics.

![Kickoff Arcade](https://img.shields.io/badge/Linera-Buildathon-blue) ![Version](https://img.shields.io/badge/version-1.0.0-green) ![Docker](https://img.shields.io/badge/Docker-Ready-blue)

---

## 🚀 Quick Start (For Judges)

> **This project uses the official Linera dockerized buildathon template for local network deployment.**

### Prerequisites
- [Docker Desktop](https://docs.docker.com/get-docker/) installed and running
- At least 4GB RAM allocated to Docker

### Run the App

```bash
# 1. Clone the repository
git clone https://github.com/tobi-techy/KICKOFF-ARCADE.git
cd KICKOFF-ARCADE

# 2. Build and start (takes ~5-10 minutes first time)
docker compose up --build
```

### What Happens
1. Builds Docker image with Linera CLI + Rust + Node.js
2. Starts local Linera network with faucet
3. Creates wallet and requests a chain
4. Compiles and deploys smart contracts
5. Starts Linera GraphQL service (port 8081)
6. Starts backend API (port 3001)
7. Starts frontend (port 5173)

### When Ready
Look for this in the logs:
```
VITE v6.x.x ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Access the Game

| URL | Service |
|-----|---------|
| **http://localhost:5173** | 🎮 Game UI |
| http://localhost:3001 | Backend API |
| http://localhost:8080 | Linera Faucet |
| http://localhost:8081 | Linera GraphQL |

### Test the Features

1. **Connect Wallet** - Click "Connect Wallet" on home screen (auto-connects to local network)
2. **Register** - Enter a username to create your on-chain profile
3. **Single Player** - Select difficulty, pay entry fee, play match
4. **Leaderboard** - View global rankings with podium
5. **Tournament** - Join with 50 coins, compete in bracket
6. **Rewards** - Check your XP, coins, and claim daily reward

### Stop the App
```bash
docker compose down
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Ensure Docker has 4GB+ RAM in settings |
| Port in use | Run `docker compose down` first |
| Stuck on build | Check Docker is running, retry |
| Frontend blank | Wait for "VITE ready" in logs |

---

## 🎮 Features

### Gameplay
- **Real-time Physics** - Smooth ball and player physics using planck.js
- **8-Direction Sprites** - Pixel art characters with running animations
- **AI Opponents** - Smart AI with formation-based positioning (Easy/Medium/Hard)
- **Multiple Game Modes** - Single Player, Multiplayer, Tournament

### Blockchain Integration
- **On-Chain Rewards** - XP and coins stored on Linera blockchain
- **Tournament System** - 8-player brackets with prize pools from entry fees
- **Multiplayer Staking** - Wager coins against opponents with escrow
- **Leaderboard** - Global rankings with podium display for top 3
- **Player Profiles** - Persistent stats (wins, losses, level, username)

### Tournament Mode (New!)
- **8-Player Brackets** - Quarter Finals → Semi Finals → Final
- **Entry Fee** - 50 coins to join
- **Prize Pool** - Winner takes all (400 coins from 8 players)
- **Tournament History** - Track past winners and prizes

### Multiplayer
- **Private Lobbies** - Create match with shareable link + QR code
- **Coin Staking** - Stake 0-1000 coins per match
- **Escrow System** - Smart contract holds stakes until match ends
- **Winner Takes All** - 95% of pot goes to winner (5% fee)

---

## 🚀 Quick Start with Docker (Recommended)

This project uses the **official Linera buildathon template** with Docker for easy setup. Everything runs in a single container - no manual Linera installation required.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

### Run with One Command

```bash
# Clone the repository
git clone https://github.com/tobi-techy/KICKOFF-ARCADE.git
cd KICKOFF-ARCADE

# Start everything with Docker
docker compose up --build
```

This will:
1. Build the Docker image with Linera CLI tools and Rust toolchain
2. Start a local Linera network with faucet
3. Initialize wallet and request a chain
4. Build and deploy the smart contracts
5. Start the Linera GraphQL service
6. Start the backend API server
7. Start the frontend dev server

### Access the App

Once you see `VITE ready` in the logs:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Game UI |
| **Backend API** | http://localhost:3001 | REST API |
| **Linera Faucet** | http://localhost:8080 | Get test tokens |
| **Linera GraphQL** | http://localhost:8081 | Query contract state |

### Docker Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Container                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Frontend  │  │   Backend   │  │   Linera Network    │  │
│  │   (Vite)    │  │  (Express)  │  │  ┌───────────────┐  │  │
│  │   :5173     │  │   :3001     │  │  │ Faucet :8080  │  │  │
│  └─────────────┘  └─────────────┘  │  │ Service :8081 │  │  │
│                                     │  │ Shard :9001   │  │  │
│                                     │  └───────────────┘  │  │
│                                     └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: Rust for Linera tools, Node.js 22 for app |
| `compose.yaml` | Docker Compose config with port mappings |
| `run.bash` | Startup script: network init, contract deploy, start services |

---

## 🛠️ Manual Setup (Alternative)

If you prefer running without Docker:

### Prerequisites
- Node.js 18+
- Rust with `wasm32-unknown-unknown` target
- Linera CLI tools (v0.15.5)

### 1. Install Linera CLI

```bash
cargo install --locked linera-service@0.15.5 linera-storage-service@0.15.5
rustup target add wasm32-unknown-unknown
```

### 2. Start Local Network

```bash
eval "$(linera net helper)"
linera_spawn linera net up --with-faucet
export LINERA_FAUCET_URL=http://localhost:8080
linera wallet init --faucet="$LINERA_FAUCET_URL"
linera wallet request-chain --faucet="$LINERA_FAUCET_URL"
```

### 3. Build & Deploy Contracts

```bash
cd linera
cargo build --release --target wasm32-unknown-unknown

linera publish-and-create \
  target/wasm32-unknown-unknown/release/kickoff_arcade_contract.wasm \
  target/wasm32-unknown-unknown/release/kickoff_arcade_service.wasm \
  --json-argument "null"
```

### 4. Configure Environment

Create `backend/.env`:
```env
PORT=3001
APPLICATION_ID=<application-id-from-deploy>
CHAIN_ID=<your-chain-id>
OWNER_ADDRESS=<your-wallet-address>
```

### 5. Start Services

```bash
# Terminal 1: Linera service
linera service --port 8081

# Terminal 2: Backend
cd backend && npm install && npm start

# Terminal 3: Frontend
npm install && npm run dev
```

---

## 📦 Smart Contract Operations

### Player Management
| Operation | Description |
|-----------|-------------|
| `RegisterPlayer { username }` | Create profile with welcome bonus (100 XP, 500 coins) |
| `RecordMatch { home_score, away_score }` | Record result, earn XP/coins |
| `PayMatchFee { amount }` | Pay entry fee for single player (5/10/20 coins) |
| `ClaimDailyReward` | Claim daily bonus (50 XP, 100 coins) |
| `ForfeitMatch` | Quit match (-50 XP, -25 coins penalty) |

### Tournament System
| Operation | Description |
|-----------|-------------|
| `JoinTournament` | Pay 50 coins, join active tournament |
| `RecordTournamentMatch { match_index, score1, score2 }` | Record bracket match, advance winner |

### Wager System (Multiplayer)
| Operation | Description |
|-----------|-------------|
| `CreateWager { lobby_id, amount }` | Host stakes coins, creates escrow |
| `AcceptWager { lobby_id, host_chain_id }` | Guest stakes matching amount |
| `ResolveWager { lobby_id, winner, home_score, away_score }` | Distribute winnings |
| `ForfeitWager { lobby_id }` | Quit wager match (lose stake) |

### GraphQL Queries
```graphql
playerProfile(address: String!) -> PlayerProfile
leaderboard(count: Int) -> [LeaderboardEntry]
activeTournament -> Tournament
tournamentHistory -> [TournamentHistoryEntry]
wager(lobbyId: String!) -> Wager
isRegistered(address: String!) -> Boolean
```

---

## 🏆 Rewards System

| Outcome | XP | Coins |
|---------|-----|-------|
| Win | +100 | +50 |
| Draw | +50 | +20 |
| Loss | +25 | +10 |
| Forfeit | -50 | -25 |
| Welcome Bonus | +100 | +500 |
| Daily Reward | +50 | +100 |
| Tournament Win | +500 | Prize Pool |

### Single Player Entry Fees
| Difficulty | Fee |
|------------|-----|
| Easy | 5 coins |
| Medium | 10 coins |
| Hard | 20 coins |

---

## 📁 Project Structure

```
kickoff-arcade/
├── Dockerfile              # Multi-stage Docker build
├── compose.yaml            # Docker Compose configuration
├── run.bash                # Container startup script
├── linera/                 # Linera smart contracts (Rust)
│   ├── src/
│   │   ├── lib.rs          # ABI, types, operations
│   │   ├── state.rs        # Application state (Views)
│   │   ├── contract.rs     # Contract logic (mutations)
│   │   └── service.rs      # GraphQL queries
│   └── Cargo.toml
├── backend/                # Node.js backend
│   └── src/
│       ├── index.js        # Express server
│       ├── routes/linera.js # API routes
│       └── services/
│           ├── linera.js   # Linera GraphQL client
│           └── socket.js   # Socket.IO for multiplayer
├── screens/                # React screens
│   ├── HomeScreen.tsx
│   ├── MatchScreen.tsx
│   ├── TournamentScreen.tsx
│   ├── LeaderboardScreen.tsx
│   └── RewardsScreen.tsx
├── lib/
│   ├── linera.ts           # Frontend Linera client
│   └── useLineraWallet.ts  # React wallet hook
└── public/sprites/         # Pixel art assets
```

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move player |
| Space (hold) | Pass (charge power) |
| Enter (hold) | Shoot (charge power) |
| Tab | Switch player |
| Shift | Sprint |
| Escape | Pause menu |

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Docker build fails | Ensure Docker has enough memory (4GB+) |
| Port already in use | `docker compose down` then retry |
| Contract not deploying | Check logs: `docker compose logs -f` |
| Frontend not loading | Wait for "VITE ready" in logs |
| Wallet not connecting | Clear browser localStorage |

### View Logs
```bash
docker compose logs -f        # All logs
docker compose logs -f app    # Container logs only
```

### Rebuild After Changes
```bash
docker compose down
docker compose up --build
```

---

## 🔗 Links

- **GitHub**: https://github.com/tobi-techy/KICKOFF-ARCADE
- **Linera Docs**: https://linera.dev
- **Buildathon**: https://app.akindo.io

---

## 👥 Team

Built for the Linera Buildathon

| Name | Discord | Wallet Address |
|------|---------|----------------|
| Tobi | @tobi_techy | `<YOUR_WALLET_ADDRESS>` |

---

## 🔧 Linera SDK Features Used

### Contract (linera-sdk v0.15.5)
- **Views System** - `MapView`, `RegisterView` for persistent state
- **GraphQL Integration** - `async-graphql` for queries and mutations
- **Cross-Chain Messaging** - `runtime.send_message()` for multiplayer sync
- **Authenticated Signer** - `runtime.authenticated_signer()` for player identity
- **System Time** - `runtime.system_time()` for daily rewards and timestamps
- **Event Streaming** - `runtime.emit()` for real-time match events

### Protocol Features
- **Microchain Architecture** - Each player operates on their own chain
- **Faucet Integration** - Automatic chain provisioning via faucet
- **Local Network** - `linera net up` for development/testing
- **WASM Contracts** - Compiled to `wasm32-unknown-unknown` target

### Frontend Integration
- **GraphQL Queries** - Direct queries to Linera service endpoint
- **Mutation Operations** - Contract operations via GraphQL mutations

---

## 📄 License

MIT
