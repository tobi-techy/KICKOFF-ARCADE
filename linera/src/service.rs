//! Kickoff Arcade Service - read-only GraphQL queries

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;
use async_graphql::{EmptySubscription, Object, Schema};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::WithServiceAbi,
    views::View,
    Service, ServiceRuntime,
};
use kickoff_arcade::{LeaderboardEntry, Operation, PlayerCard, PlayerProfile, Wager};
use self::state::KickoffArcadeState;

pub struct KickoffArcadeService {
    state: Arc<KickoffArcadeState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(KickoffArcadeService);

impl WithServiceAbi for KickoffArcadeService {
    type Abi = kickoff_arcade::KickoffArcadeAbi;
}

impl Service for KickoffArcadeService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = KickoffArcadeState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        KickoffArcadeService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        Schema::build(
            QueryRoot { state: self.state.clone() },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish()
        .execute(query)
        .await
    }
}

struct QueryRoot {
    state: Arc<KickoffArcadeState>,
}

#[Object]
impl QueryRoot {
    /// Get player profile by address
    async fn player_profile(&self, address: String) -> Option<PlayerProfile> {
        self.state.players.get(&address).await.unwrap()
    }

    /// Check if player is registered
    async fn is_registered(&self, address: String) -> bool {
        self.state.players.get(&address).await.unwrap().is_some()
    }

    /// Get player's NFT cards
    async fn player_cards(&self, owner: String) -> Vec<PlayerCard> {
        self.state.cards.get(&owner).await.unwrap().unwrap_or_default()
    }

    /// Get the leaderboard (top players by XP)
    async fn leaderboard(&self, count: Option<i32>) -> Vec<LeaderboardEntry> {
        let limit = count.unwrap_or(10) as usize;
        self.state.leaderboard.get().iter().take(limit).cloned().collect()
    }

    /// Get total NFT cards minted
    async fn total_minted(&self) -> u64 {
        *self.state.total_minted.get()
    }

    /// Get wager by lobby ID
    async fn wager(&self, lobby_id: String) -> Option<Wager> {
        self.state.wagers.get(&lobby_id).await.unwrap()
    }
}
