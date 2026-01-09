//! Kickoff Arcade Contract - handles state mutations

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};
use kickoff_arcade::{
    calculate_level, calculate_rewards, LeaderboardEntry, Operation, PlayerCard, PlayerProfile,
};
use self::state::KickoffArcadeState;

pub struct KickoffArcadeContract {
    state: KickoffArcadeState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(KickoffArcadeContract);

impl WithContractAbi for KickoffArcadeContract {
    type Abi = kickoff_arcade::KickoffArcadeAbi;
}

impl Contract for KickoffArcadeContract {
    type Message = ();
    type Parameters = ();
    type InstantiationArgument = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = KickoffArcadeState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        KickoffArcadeContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        self.runtime.application_parameters();
        self.state.leaderboard.set(Vec::new());
        self.state.total_minted.set(0);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        let owner = self.owner_id();

        match operation {
            Operation::RegisterPlayer => {
                if self.state.players.get(&owner).await.unwrap().is_none() {
                    self.state
                        .players
                        .insert(&owner, PlayerProfile::default())
                        .unwrap();
                }
            }

            Operation::RecordMatch { home_score, away_score } => {
                let (xp_earned, coins_earned) = calculate_rewards(home_score, away_score);

                let mut profile = self
                    .state
                    .players
                    .get(&owner)
                    .await
                    .unwrap()
                    .unwrap_or_default();

                profile.xp += xp_earned;
                profile.coins += coins_earned;
                profile.matches_played += 1;

                if home_score > away_score {
                    profile.wins += 1;
                } else if home_score < away_score {
                    profile.losses += 1;
                } else {
                    profile.draws += 1;
                }

                profile.level = calculate_level(profile.xp);
                self.state.players.insert(&owner, profile.clone()).unwrap();
                self.update_leaderboard(&owner, &profile).await;
            }

            Operation::MintPlayer { name, position, speed, shooting, passing, defending, rarity } => {
                let total = self.state.total_minted.get();
                let card_id = *total + 1;
                self.state.total_minted.set(card_id);

                let rating = ((speed as u16 + shooting as u16 + passing as u16 + defending as u16) / 4) as u8;
                let card = PlayerCard {
                    id: card_id,
                    name,
                    position,
                    speed,
                    shooting,
                    passing,
                    defending,
                    rating,
                    rarity,
                };

                let mut cards = self
                    .state
                    .cards
                    .get(&owner)
                    .await
                    .unwrap()
                    .unwrap_or_default();
                cards.push(card);
                self.state.cards.insert(&owner, cards).unwrap();
            }
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {}

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl KickoffArcadeContract {
    fn owner_id(&self) -> String {
        self.runtime
            .authenticated_signer()
            .map(|o| o.to_string())
            .unwrap_or_default()
    }

    async fn update_leaderboard(&mut self, player: &str, profile: &PlayerProfile) {
        let mut entries = self.state.leaderboard.get().clone();
        entries.retain(|e| e.player != player);
        entries.push(LeaderboardEntry {
            player: player.to_string(),
            xp: profile.xp,
            wins: profile.wins,
            level: profile.level,
        });
        entries.sort_by(|a, b| b.xp.cmp(&a.xp));
        entries.truncate(100);
        self.state.leaderboard.set(entries);
    }
}
