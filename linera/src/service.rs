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
use kickoff_arcade::{LeaderboardEntry, Operation, PlayerCard, PlayerProfile};
use self::state::KickoffArcadeState;

pub struct KickoffArcadeService {
    state: KickoffArcadeState,
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
            state,
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        let leaderboard = self.state.leaderboard.get().clone();
        let total_minted = *self.state.total_minted.get();

        Schema::build(
            QueryRoot { leaderboard, total_minted },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish()
        .execute(query)
        .await
    }
}

struct QueryRoot {
    leaderboard: Vec<LeaderboardEntry>,
    total_minted: u64,
}

#[Object]
impl QueryRoot {
    /// Get the leaderboard (top players by XP)
    async fn leaderboard(&self, count: Option<i32>) -> Vec<LeaderboardEntry> {
        let limit = count.unwrap_or(10) as usize;
        self.leaderboard.iter().take(limit).cloned().collect()
    }

    /// Get total NFT cards minted
    async fn total_minted(&self) -> u64 {
        self.total_minted
    }
}
