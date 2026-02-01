//! Application state using Linera Views

use kickoff_arcade::{LeaderboardEntry, PlayerCard, PlayerProfile, Tournament, TournamentHistoryEntry, Wager};
use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};

#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = ViewStorageContext)]
pub struct KickoffArcadeState {
    /// Player profiles indexed by owner address
    pub players: MapView<String, PlayerProfile>,
    /// Leaderboard entries (top 100 by XP)
    pub leaderboard: RegisterView<Vec<LeaderboardEntry>>,
    /// Player NFT cards indexed by owner
    pub cards: MapView<String, Vec<PlayerCard>>,
    /// Total cards minted
    pub total_minted: RegisterView<u64>,
    /// Active wagers/escrows indexed by lobby_id
    pub wagers: MapView<String, Wager>,
    /// Track which host chain we're subscribed to (for guests)
    pub subscribed_to: RegisterView<Option<String>>,
    /// Current active tournament
    pub active_tournament: RegisterView<Option<Tournament>>,
    /// Tournament history (last 20)
    pub tournament_history: RegisterView<Vec<TournamentHistoryEntry>>,
    /// Next tournament ID
    pub next_tournament_id: RegisterView<u64>,
}
