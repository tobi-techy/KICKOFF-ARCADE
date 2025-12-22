import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Movement Testnet Configuration
export const MOVEMENT_CONFIG = {
  network: Network.CUSTOM,
  fullnode: "https://testnet.movementnetwork.xyz/v1",
  indexer: "https://hasura.testnet.movementnetwork.xyz/v1/graphql",
  chainId: 250,
  name: "Movement Testnet",
  faucet: "https://faucet.testnet.movementnetwork.xyz/",
  explorer: "https://explorer.movementnetwork.xyz/?network=bardock+testnet",
};

// Initialize Aptos client for Movement
export const movementClient = new Aptos(
  new AptosConfig({
    network: Network.CUSTOM,
    fullnode: MOVEMENT_CONFIG.fullnode,
  })
);

// Contract addresses (to be deployed)
export const CONTRACTS = {
  playerNFT: "", // Will be set after deployment
  rewards: "",
  leaderboard: "",
};
