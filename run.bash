#!/usr/bin/env bash
set -eu

# Start local Linera network
eval "$(linera net helper)"
linera_spawn linera net up --with-faucet

export LINERA_FAUCET_URL=http://localhost:8080

# Initialize wallet
linera wallet init --faucet="$LINERA_FAUCET_URL"

# Request a chain and capture the output
REQUEST_OUTPUT=$(linera wallet request-chain --faucet="$LINERA_FAUCET_URL" 2>&1)
USER_CHAIN_ID=$(echo "$REQUEST_OUTPUT" | grep -oE '^[a-f0-9]{64}' | head -1)

# Build contracts
cd /build/linera
cargo build --release --target wasm32-unknown-unknown

# Deploy contract
cd /build
DEPLOY_OUTPUT=$(linera publish-and-create \
  linera/target/wasm32-unknown-unknown/release/kickoff_arcade_contract.wasm \
  linera/target/wasm32-unknown-unknown/release/kickoff_arcade_service.wasm \
  --json-argument "null" 2>&1)

APPLICATION_ID=$(echo "$DEPLOY_OUTPUT" | tail -1)
CHAIN_ID=$USER_CHAIN_ID
OWNER_ADDRESS=$(linera wallet show | grep -oE '0x[a-f0-9]{64}' | head -1)

echo "=========================================="
echo "Application ID: $APPLICATION_ID"
echo "Chain ID: $CHAIN_ID"
echo "Owner Address: $OWNER_ADDRESS"
echo "=========================================="

# Start linera service for application queries (port 8081)
linera service --port 8081 &
sleep 2

# Set env vars for backend
export APPLICATION_ID
export CHAIN_ID
export OWNER_ADDRESS
export LINERA_SERVICE_URL=http://localhost:8081
export PORT=3001

# Install dependencies
cd /build
npm install

cd /build/backend
npm install

# Start backend in background
npm start &

# Start frontend on port 5173
cd /build
npm run dev -- --host 0.0.0.0 --port 5173
