# Kickoff Arcade - Linera Buildathon

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A real-time football arcade game built on **Linera blockchain**, featuring on-chain rewards, leaderboards, and player NFT cards.

## 🎮 Features

- **Real-time Gameplay**: Fast-paced football matches with AI opponents
- **On-Chain Rewards**: XP and coins earned from matches stored on Linera
- **Leaderboard**: Global rankings synced across microchains
- **Player NFT Cards**: Collectible player cards with unique stats

## 🔗 Live Demo

**Frontend**: [Coming Soon - Testnet Conway]

**Application ID**: `[To be updated after deployment]`

## 🛠️ Tech Stack

### Frontend
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- `@linera/client` for blockchain integration

### Smart Contracts (Linera)
- Rust + linera-sdk v0.15.8
- WebAssembly (WASM)
- GraphQL API via async-graphql

## 📦 Linera SDK Features Used

- **Views**: `MapView`, `RegisterView` for persistent state
- **Contract/Service Architecture**: Metered contract for mutations, unmetered service for queries
- **GraphQL Integration**: Full query/mutation support via async-graphql
- **Cross-chain ready**: Message types defined for future leaderboard sync

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Rust with `wasm32-unknown-unknown` target
- Linera CLI tools (v0.15.8)

### Install Dependencies

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

### Build Linera Contracts

```bash
cd linera
cargo build --release --target wasm32-unknown-unknown
```

### Deploy to Testnet Conway

```bash
# Initialize wallet
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
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs             # ABI definitions
│       ├── state.rs           # Application state (Views)
│       ├── contract.rs        # Contract binary
│       └── service.rs         # Service binary (GraphQL)
├── lib/
│   ├── linera.ts              # Linera client integration
│   └── useLineraWallet.ts     # React hook for wallet
├── screens/                   # Game screens
├── components/                # UI components
└── context/                   # React context
```

## 📊 Smart Contract Operations

### Operations (Mutations)
- `RegisterPlayer` - Register a new player
- `RecordMatch { home_score, away_score }` - Record match result, earn XP/coins
- `MintPlayer { name, position, stats, rarity }` - Mint a player NFT card

### Queries (GraphQL)
- `playerProfile(address)` - Get player stats
- `leaderboard(count)` - Get top players
- `playerCards(owner)` - Get player's NFT collection
- `isRegistered(address)` - Check if player exists

## 🏆 Rewards System

| Outcome | XP Earned | Coins Earned |
|---------|-----------|--------------|
| Win     | 100       | 50           |
| Draw    | 50        | 20           |
| Loss    | 25        | 10           |

Level = (Total XP / 500) + 1

## 📝 Changelog

### Wave 5 (Jan 2026)
- Initial Linera migration from Movement blockchain
- Implemented rewards, leaderboard, and NFT contracts
- Frontend integration with `@linera/client`
- Deployed to Testnet Conway

## 👥 Team

- **Name**: [Your Name]
- **Discord**: [Your Discord]
- **Wallet**: [Your Linera Wallet Address]

## 📄 License

MIT
