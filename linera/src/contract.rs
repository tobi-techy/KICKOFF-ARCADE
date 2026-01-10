//! Kickoff Arcade Contract - handles state mutations

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};
use kickoff_arcade::{
    calculate_level, calculate_rewards, LeaderboardEntry, Operation, PlayerCard, PlayerProfile, Wager,
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

            Operation::ForfeitMatch => {
                // XP and coin penalty for quitting any match
                let xp_penalty: u64 = 50;
                let coin_penalty: u64 = 25;

                let mut profile = self
                    .state
                    .players
                    .get(&owner)
                    .await
                    .unwrap()
                    .unwrap_or_default();

                profile.xp = profile.xp.saturating_sub(xp_penalty);
                profile.coins = profile.coins.saturating_sub(coin_penalty);
                profile.matches_played += 1;
                profile.losses += 1;
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

            Operation::CreateWager { lobby_id, amount } => {
                // Verify player has enough coins
                let mut profile = self
                    .state
                    .players
                    .get(&owner)
                    .await
                    .unwrap()
                    .unwrap_or_default();

                assert!(profile.coins >= amount, "Insufficient coins for wager");

                // Deduct coins (escrow)
                profile.coins -= amount;
                self.state.players.insert(&owner, profile).unwrap();

                // Create wager
                let wager = Wager {
                    lobby_id: lobby_id.clone(),
                    host: owner,
                    guest: String::new(),
                    amount,
                    status: 0, // pending
                    winner: String::new(),
                };
                self.state.wagers.insert(&lobby_id, wager).unwrap();
            }

            Operation::AcceptWager { lobby_id } => {
                let mut wager = self
                    .state
                    .wagers
                    .get(&lobby_id)
                    .await
                    .unwrap()
                    .expect("Wager not found");

                assert!(wager.status == 0, "Wager not pending");
                assert!(wager.host != owner, "Cannot accept own wager");

                // Verify guest has enough coins
                let mut profile = self
                    .state
                    .players
                    .get(&owner)
                    .await
                    .unwrap()
                    .unwrap_or_default();

                assert!(profile.coins >= wager.amount, "Insufficient coins for wager");

                // Deduct coins (escrow)
                profile.coins -= wager.amount;
                self.state.players.insert(&owner, profile).unwrap();

                // Update wager
                wager.guest = owner;
                wager.status = 1; // accepted
                self.state.wagers.insert(&lobby_id, wager).unwrap();
            }

            Operation::CancelWager { lobby_id } => {
                let wager = self
                    .state
                    .wagers
                    .get(&lobby_id)
                    .await
                    .unwrap()
                    .expect("Wager not found");

                assert!(wager.status == 0, "Can only cancel pending wager");
                assert!(wager.host == owner, "Only host can cancel");

                // Refund host
                let mut profile = self
                    .state
                    .players
                    .get(&owner)
                    .await
                    .unwrap()
                    .unwrap_or_default();
                profile.coins += wager.amount;
                self.state.players.insert(&owner, profile).unwrap();

                // Mark cancelled
                let mut wager = wager;
                wager.status = 3; // cancelled
                self.state.wagers.insert(&lobby_id, wager).unwrap();
            }

            Operation::ResolveWager { lobby_id, winner, home_score, away_score } => {
                let mut wager = self
                    .state
                    .wagers
                    .get(&lobby_id)
                    .await
                    .unwrap()
                    .expect("Wager not found");

                assert!(wager.status == 1, "Wager not in accepted state");

                let total_pot = wager.amount * 2;
                let fee = total_pot / 20; // 5% fee
                let winnings = total_pot - fee;

                // Record match for both players
                let (xp_win, _) = calculate_rewards(
                    if winner == wager.host { home_score } else { away_score },
                    if winner == wager.host { away_score } else { home_score },
                );
                let (xp_lose, _) = calculate_rewards(
                    if winner != wager.host { home_score } else { away_score },
                    if winner != wager.host { away_score } else { home_score },
                );

                // Update winner
                let mut winner_profile = self
                    .state
                    .players
                    .get(&winner)
                    .await
                    .unwrap()
                    .unwrap_or_default();
                winner_profile.coins += winnings;
                winner_profile.xp += xp_win;
                winner_profile.matches_played += 1;
                winner_profile.wins += 1;
                winner_profile.level = calculate_level(winner_profile.xp);
                self.state.players.insert(&winner, winner_profile.clone()).unwrap();
                self.update_leaderboard(&winner, &winner_profile).await;

                // Update loser
                let loser = if winner == wager.host { &wager.guest } else { &wager.host };
                let mut loser_profile = self
                    .state
                    .players
                    .get(loser)
                    .await
                    .unwrap()
                    .unwrap_or_default();
                loser_profile.xp += xp_lose;
                loser_profile.matches_played += 1;
                loser_profile.losses += 1;
                loser_profile.level = calculate_level(loser_profile.xp);
                self.state.players.insert(loser, loser_profile.clone()).unwrap();
                self.update_leaderboard(loser, &loser_profile).await;

                // Mark resolved
                wager.status = 2;
                wager.winner = winner;
                self.state.wagers.insert(&lobby_id, wager).unwrap();
            }

            Operation::ForfeitWager { lobby_id } => {
                let mut wager = self
                    .state
                    .wagers
                    .get(&lobby_id)
                    .await
                    .unwrap()
                    .expect("Wager not found");

                assert!(wager.status == 1, "Wager not in accepted state");

                // Determine who forfeited and who wins
                let forfeiter = owner.clone();
                let winner = if forfeiter == wager.host { 
                    wager.guest.clone() 
                } else { 
                    wager.host.clone() 
                };

                // XP penalty for forfeiting (lose 50 XP)
                let xp_penalty: u64 = 50;
                
                // Forfeiter loses their stake + XP penalty
                let mut forfeiter_profile = self
                    .state
                    .players
                    .get(&forfeiter)
                    .await
                    .unwrap()
                    .unwrap_or_default();
                forfeiter_profile.xp = forfeiter_profile.xp.saturating_sub(xp_penalty);
                forfeiter_profile.matches_played += 1;
                forfeiter_profile.losses += 1;
                forfeiter_profile.level = calculate_level(forfeiter_profile.xp);
                self.state.players.insert(&forfeiter, forfeiter_profile.clone()).unwrap();
                self.update_leaderboard(&forfeiter, &forfeiter_profile).await;

                // Winner gets the full pot (no fee on forfeit)
                let total_pot = wager.amount * 2;
                let mut winner_profile = self
                    .state
                    .players
                    .get(&winner)
                    .await
                    .unwrap()
                    .unwrap_or_default();
                winner_profile.coins += total_pot;
                winner_profile.xp += 100; // Win XP
                winner_profile.matches_played += 1;
                winner_profile.wins += 1;
                winner_profile.level = calculate_level(winner_profile.xp);
                self.state.players.insert(&winner, winner_profile.clone()).unwrap();
                self.update_leaderboard(&winner, &winner_profile).await;

                // Mark as resolved (forfeit)
                wager.status = 2;
                wager.winner = winner;
                self.state.wagers.insert(&lobby_id, wager).unwrap();
            }
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {}

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl KickoffArcadeContract {
    fn owner_id(&mut self) -> String {
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
