# Changelog

All notable changes to Kickoff Arcade.

## [Wave 6] - 2026-02-01

### Added

#### Dockerized Buildathon Template Integration
- Multi-stage Dockerfile with Rust (Linera CLI) and Node.js 22
- docker-compose.yaml with all port mappings (5173, 3001, 8080, 8081, 9001)
- run.bash startup script for automatic network init, contract deploy, and service startup
- One-command setup: `docker compose up --build`

#### Tournament System
- `JoinTournament` operation with 50 coin entry fee
- 8-player bracket: Quarter Finals → Semi Finals → Final
- `RecordTournamentMatch` advances winners through bracket
- Prize pool from entry fees (winner takes 400 coins)
- Tournament history tracking (last 20 completed)
- Real-time bracket UI with "Play Now" buttons

#### Leaderboard Redesign
- Visual podium for top 3 players (gold/silver/bronze)
- Crown icon and animations for #1
- Username display instead of wallet addresses

#### Single Player Match Fees
- Difficulty-based fees: Easy (5), Medium (10), Hard (20) coins
- `PayMatchFee` contract operation
- Toast notifications for payment status

#### Local Network Wallet
- Replaced Croissant wallet with local network mode
- Backend returns playerAddress from OWNER_ADDRESS env var
- Profile queries use authenticated signer

### Technical
- Added tournament types: `Tournament`, `TournamentMatch`, `TournamentHistoryEntry`
- New state fields: `active_tournament`, `tournament_history`, `next_tournament_id`
- Backend endpoints: GET/POST `/tournament`, `/tournament/history`, `/tournament/join`, `/tournament/match`
- `tournamentMatchIndex` in GameContext for match flow

---

## [Wave 5] - Previous

### Added
- Multiplayer wager system with escrow
- Cross-chain messaging for guest players
- Socket.IO real-time match sync
- QR code lobby sharing
- Daily rewards system
- Player registration with welcome bonus

---

## [Wave 4] - Previous

### Added
- Core gameplay with planck.js physics
- 8-direction pixel art sprites
- AI opponents with formation positioning
- On-chain player profiles
- XP and coin rewards
- Leaderboard rankings
