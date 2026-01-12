# Kickoff Arcade ⚽

A real-time football arcade game built on **Linera blockchain**, featuring on-chain rewards, multiplayer with staking, and pixel art graphics.

![Kickoff Arcade](https://img.shields.io/badge/Linera-Testnet%20Conway-blue) ![Version](https://img.shields.io/badge/version-1.0.0-green)

## 🎮 Features

### Gameplay
- **Real-time Physics** - Smooth ball and player physics using planck.js
- **8-Direction Sprites** - Pixel art characters with running animations
- **AI Opponents** - Smart AI with formation-based positioning
- **Multiple Game Modes** - Single Player, Multiplayer, Tournament

### Blockchain Integration
- **On-Chain Rewards** - XP and coins stored on Linera blockchain
- **Multiplayer Staking** - Wager coins against opponents with escrow
- **Leaderboard** - Global rankings synced across microchains
- **Player Profiles** - Persistent stats (wins, losses, level)

### Multiplayer
- **Private Lobbies** - Create match with shareable link + QR code
- **Coin Staking** - Stake 0-1000 coins per match
- **Escrow System** - Smart contract holds stakes until match ends
- **Winner Takes All** - 95% of pot goes to winner (5% fee)

## 🔗 Live Demo

**Application ID:** `870548fc630a2ded1af86fd0ef5fd77a140afcbdc59280d8925224d84b775778`

**Chain ID:** `17ef7b84785e23ecb8d93fba80fc8e54e943b2c1c333f6a1c9245e98d957e894`

## 🛠️ Tech Stack

### Frontend
- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion
- planck.js (physics)
- `@linera/client` for blockchain

### Smart Contracts (Linera)
- Rust + linera-sdk v0.15.8
- WebAssembly (WASM)
- GraphQL API via async-graphql

### Backend
- Node.js + Express
- Socket.IO (real-time multiplayer)
- Linera CLI integration

## 📦 Smart Contract Operations

### Player Management
| Operation | Description |
|-----------|-------------|
| `RegisterPlayer` | Create new player profile |
| `RecordMatch { home_score, away_score }` | Record match result, earn XP/coins |
| `ForfeitMatch` | Quit match early (-50 XP, -25 coins penalty) |

### Wager System (Multiplayer)
| Operation | Description |
|-----------|-------------|
| `CreateWager { lobby_id, amount }` | Host stakes coins, creates escrow |
| `AcceptWager { lobby_id }` | Guest stakes matching amount |
| `CancelWager { lobby_id }` | Host cancels before guest joins (refund) |
| `ResolveWager { lobby_id, winner, scores }` | Distribute winnings to winner |
| `ForfeitWager { lobby_id }` | Quit wager match (lose stake + XP) |

### NFT Cards
| Operation | Description |
|-----------|-------------|
| `MintPlayer { name, position, stats, rarity }` | Mint player NFT card |

### Queries (GraphQL)
- `playerProfile(address)` - Get player stats
- `leaderboard(count)` - Get top players
- `playerCards(owner)` - Get NFT collection
- `wager(lobbyId)` - Get wager/escrow info
- `isRegistered(address)` - Check if player exists

## 🏆 Rewards System

| Outcome | XP Earned | Coins Earned |
|---------|-----------|--------------|
| Win | 100 | 50 |
| Draw | 50 | 20 |
| Loss | 25 | 10 |
| Forfeit | -50 | -25 |
| **Welcome Bonus** | 100 | 500 |
| **Daily Reward** | 50 | 100 |

**Level Calculation:** `Level = (Total XP / 500) + 1`

**Wager Winnings:** Winner receives 95% of total pot (5% protocol fee)

**Daily Rewards:** Claim once every 24 hours from the Rewards screen

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust with `wasm32-unknown-unknown` target
- Linera CLI tools (v0.15.8)

### 1. Install Linera CLI

```bash
# Install Linera CLI
cargo install linera-service@0.15.8

# Add WASM target
rustup target add wasm32-unknown-unknown

# Initialize wallet (creates ~/.linera)
linera wallet init --faucet https://faucet.testnet-conway.linera.net

# Request a chain
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
```

### 2. Build & Deploy Smart Contracts

```bash
# Build contracts
cd linera
cargo build --release --target wasm32-unknown-unknown

# Deploy to testnet (save the Application ID output)
linera publish-and-create \
  target/wasm32-unknown-unknown/release/kickoff_arcade_contract.wasm \
  target/wasm32-unknown-unknown/release/kickoff_arcade_service.wasm \
  --json-argument "null"
```

### 3. Configure Environment

```bash
# Backend (.env in /backend)
PORT=3001
APPLICATION_ID=<your-application-id-from-deploy>
CHAIN_ID=<your-chain-id>

# Frontend (.env.local in root)
VITE_API_URL=http://localhost:3001
```

### 4. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd backend && npm install
```

### 5. Run the App

```bash
# Terminal 1: Start backend (auto-starts linera service on port 8080)
cd backend && npm start

# Terminal 2: Start frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### Testing Game Modes

**Single Player:**
1. Click "Connect Wallet" on home screen
2. Select "Single Player" → Choose difficulty → Pick team
3. Play match with keyboard controls

**Multiplayer (Local Testing):**
1. Start the app in two browser windows
2. Window 1: Create multiplayer lobby, set wager amount
3. Window 2: Join via the lobby link or enter lobby code
4. Both players select teams → Match starts

**Rewards/Profile:**
- After matches, XP and coins are recorded on-chain
- View stats on the Rewards screen

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `linera service` not found | Run `cargo install linera-service@0.15.8` |
| Port 8080 in use | Kill existing linera service: `pkill -f "linera service"` |
| Wallet not connecting | Clear localStorage and reconnect |
| Backend won't start | Ensure `.env` has valid APPLICATION_ID and CHAIN_ID |

### Deploy to Testnet Conway

```bash
# Initialize wallet (first time only)
linera wallet init --faucet https://faucet.testnet-conway.linera.net
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net

# Deploy application
linera publish-and-create \
  linera/target/wasm32-unknown-unknown/release/kickoff_arcade_contract.wasm \
  linera/target/wasm32-unknown-unknown/release/kickoff_arcade_service.wasm \
  --json-argument "null"
```

## 📁 Project Structure

```
kickoff-arcade/
├── linera/                    # Linera smart contracts
│   ├── src/
│   │   ├── lib.rs             # ABI definitions & operations
│   │   ├── state.rs           # Application state (Views)
│   │   ├── contract.rs        # Contract logic (mutations)
│   │   └── service.rs         # Service (GraphQL queries)
│   └── Cargo.toml
├── backend/                   # Node.js backend
│   └── src/
│       ├── index.js           # Express server
│       ├── routes/linera.js   # Linera API routes
│       └── services/
│           ├── linera.js      # Linera CLI wrapper
│           ├── socket.js      # Socket.IO handlers
│           └── matchmaking.js # Match/lobby management
├── lib/
│   ├── linera.ts              # Frontend Linera client
│   ├── useLineraWallet.ts     # React hook for wallet
│   └── multiplayer.ts         # Socket.IO client
├── screens/
│   ├── HomeScreen.tsx         # Main menu
│   ├── MatchScreen.tsx        # Game gameplay
│   ├── MultiplayerLobbyScreen.tsx  # Lobby with QR/link
│   ├── MatchResultScreen.tsx  # Results + wager winnings
│   └── RewardsScreen.tsx      # On-chain profile/stats
├── components/
│   ├── PixelPlayer.tsx        # Animated sprite component
│   └── Joystick.tsx           # Touch controls
├── utils/
│   ├── physics.ts             # planck.js game physics
│   ├── ai.ts                  # AI player logic
│   └── sounds.ts              # Web Audio sound effects
└── public/sprites/            # Pixel art character sprites
    ├── attacker/
    ├── midfielder/
    ├── defender/
    └── goalkeeper/
```

## 🎮 Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move player |
| Space (hold) | Pass (charge power) |
| Enter (hold) | Shoot (charge power) |
| Q | Through ball |
| E | Slide tackle |
| Tab | Switch player |
| Shift | Sprint |
| Escape | Pause menu |

## 🔄 Multiplayer Flow

### Host (Player 1)
1. Select Multiplayer → Choose Team
2. Set wager amount (0-1000 coins)
3. Share link or QR code with opponent
4. Wait for opponent → Start match

### Guest (Player 2)
1. Open invite link
2. Select team
3. See required wager amount
4. Stake coins → Join match

### After Match
- Winner receives 95% of total pot
- Both players get XP based on result
- Stats recorded on-chain

## 🔐 Security

- **Escrow System** - Stakes locked in smart contract until match ends
- **Forfeit Protection** - Quitting gives opponent full pot
- **On-Chain Verification** - All results stored immutably

## 📝 Environment Variables

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:3001
```

### Backend (.env)
```
PORT=3001
APPLICATION_ID=0db11f239706aa1024d0d530d933b510530a88f13b50ca0e3c914c7c9aef336e
CHAIN_ID=17ef7b84785e23ecb8d93fba80fc8e54e943b2c1c333f6a1c9245e98d957e894
```

## 📄 License

MIT

## 👥 Credits

- Pixel art sprites generated with [Pixellab](https://pixellab.ai)
- Built for Linera Buildathon
