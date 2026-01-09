//! Kickoff Arcade - ABI definitions for the Linera application

use async_graphql::{Request, Response, SimpleObject};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

pub struct KickoffArcadeAbi;

impl ContractAbi for KickoffArcadeAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for KickoffArcadeAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Operations that can be executed on the contract
#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Register a new player
    RegisterPlayer,
    /// Record a match result
    RecordMatch { home_score: u8, away_score: u8 },
    /// Mint a player NFT card
    MintPlayer {
        name: String,
        position: String,
        speed: u8,
        shooting: u8,
        passing: u8,
        defending: u8,
        rarity: u8,
    },
}

/// Player profile data
#[derive(Clone, Debug, Default, Deserialize, Serialize, SimpleObject)]
pub struct PlayerProfile {
    pub xp: u64,
    pub coins: u64,
    pub matches_played: u64,
    pub wins: u64,
    pub losses: u64,
    pub draws: u64,
    pub level: u64,
}

/// Leaderboard entry
#[derive(Clone, Debug, Deserialize, Serialize, SimpleObject)]
pub struct LeaderboardEntry {
    pub player: String,
    pub xp: u64,
    pub wins: u64,
    pub level: u64,
}

/// Player NFT card
#[derive(Clone, Debug, Default, Deserialize, Serialize, SimpleObject)]
pub struct PlayerCard {
    pub id: u64,
    pub name: String,
    pub position: String,
    pub speed: u8,
    pub shooting: u8,
    pub passing: u8,
    pub defending: u8,
    pub rating: u8,
    pub rarity: u8,
}

/// Calculate XP and coin rewards based on match outcome
pub fn calculate_rewards(home_score: u8, away_score: u8) -> (u64, u64) {
    if home_score > away_score {
        (100, 50) // Win
    } else if home_score < away_score {
        (25, 10) // Loss
    } else {
        (50, 20) // Draw
    }
}

/// Calculate level from XP
pub fn calculate_level(xp: u64) -> u64 {
    (xp / 500) + 1
}
