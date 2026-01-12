//! Kickoff Arcade Contract - handles state mutations

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::{WithContractAbi, ChainId, StreamName},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use kickoff_arcade::{
    calculate_level, calculate_rewards, CrossChainMessage, LeaderboardEntry, MatchEvent,
    Operation, PlayerCard, PlayerProfile, Wager, DAILY_XP, DAILY_COINS, WELCOME_XP, 
    WELCOME_COINS, DAY_MICROS,
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
    type Message = CrossChainMessage;
    type Parameters = ();
    type InstantiationArgument = ();
    type EventValue = MatchEvent;

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
        self.state.subscribed_to.set(None);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        let owner = self.owner_id();
        let timestamp = self.runtime.system_time().micros();

        match operation {
            Operation::RegisterPlayer => {
                if self.state.players.get(&owner).await.unwrap().is_none() {
                    // Welcome bonus for new players
                    let profile = PlayerProfile {
                        xp: WELCOME_XP,
                        coins: WELCOME_COINS,
                        level: 1,
                        last_daily_claim: timestamp,
                        ..Default::default()
                    };
                    self.state.players.insert(&owner, profile.clone()).unwrap();
                    self.update_leaderboard(&owner, &profile).await;
                }
            }

            Operation::ClaimDailyReward => {
                let mut profile = self
                    .state
                    .players
                    .get(&owner)
                    .await
                    .unwrap()
                    .unwrap_or_default();

                // Check if 24 hours have passed
                assert!(
                    timestamp.saturating_sub(profile.last_daily_claim) >= DAY_MICROS,
                    "Daily reward already claimed"
                );

                profile.xp += DAILY_XP;
                profile.coins += DAILY_COINS;
                profile.last_daily_claim = timestamp;
                profile.level = calculate_level(profile.xp);
                self.state.players.insert(&owner, profile.clone()).unwrap();
                self.update_leaderboard(&owner, &profile).await;
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
                let mut profile = self
                    .state
                    .players
                    .get(&owner)
                    .await
                    .unwrap()
                    .unwrap_or_default();

                assert!(profile.coins >= amount, "Insufficient coins for wager");

                profile.coins -= amount;
                self.state.players.insert(&owner, profile).unwrap();

                let wager = Wager {
                    lobby_id: lobby_id.clone(),
                    host: owner.clone(),
                    host_chain: self.runtime.chain_id().to_string(),
                    guest: String::new(),
                    guest_chain: String::new(),
                    amount,
                    status: 0,
                    winner: String::new(),
                    created_at: timestamp,
                };
                self.state.wagers.insert(&lobby_id, wager).unwrap();

                // Emit event for real-time updates
                self.runtime.emit(
                    StreamName::from(format!("match_{}", lobby_id)),
                    &MatchEvent::WagerCreated { lobby_id, host: owner, amount },
                );
            }

            Operation::AcceptWager { lobby_id, host_chain_id } => {
                // Send join request to host chain
                if let Ok(host_chain) = host_chain_id.parse::<ChainId>() {
                    let message = CrossChainMessage::JoinWager {
                        guest_chain_id: self.runtime.chain_id(),
                        guest_address: owner,
                        lobby_id,
                    };
                    self.runtime.send_message(host_chain, message);
                    
                    // Track subscription
                    self.state.subscribed_to.set(Some(host_chain_id));
                }
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

                // Check for timeout (5 minutes)
                let timeout = 300_000_000u64; // 5 min in microseconds
                if timestamp.saturating_sub(wager.created_at) > timeout {
                    // Auto-cancel expired wager
                }

                let mut profile = self
                    .state
                    .players
                    .get(&owner)
                    .await
                    .unwrap()
                    .unwrap_or_default();
                profile.coins += wager.amount;
                self.state.players.insert(&owner, profile).unwrap();

                let mut wager = wager;
                wager.status = 3;
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
                let fee = total_pot / 20;
                let winnings = total_pot - fee;

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

                wager.status = 2;
                wager.winner = winner.clone();
                self.state.wagers.insert(&lobby_id, wager.clone()).unwrap();

                // Notify guest chain
                if let Ok(guest_chain) = wager.guest_chain.parse::<ChainId>() {
                    self.runtime.send_message(guest_chain, CrossChainMessage::MatchEnded {
                        lobby_id: lobby_id.clone(),
                        winner: winner.clone(),
                        home_score,
                        away_score,
                    });
                }

                // Emit event
                self.runtime.emit(
                    StreamName::from(format!("match_{}", lobby_id)),
                    &MatchEvent::MatchEnded { lobby_id, winner, scores: (home_score, away_score) },
                );
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

                let forfeiter = owner.clone();
                let winner = if forfeiter == wager.host { 
                    wager.guest.clone() 
                } else { 
                    wager.host.clone() 
                };

                let xp_penalty: u64 = 50;
                
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

                let total_pot = wager.amount * 2;
                let mut winner_profile = self
                    .state
                    .players
                    .get(&winner)
                    .await
                    .unwrap()
                    .unwrap_or_default();
                winner_profile.coins += total_pot;
                winner_profile.xp += 100;
                winner_profile.matches_played += 1;
                winner_profile.wins += 1;
                winner_profile.level = calculate_level(winner_profile.xp);
                self.state.players.insert(&winner, winner_profile.clone()).unwrap();
                self.update_leaderboard(&winner, &winner_profile).await;

                wager.status = 2;
                wager.winner = winner.clone();
                self.state.wagers.insert(&lobby_id, wager.clone()).unwrap();

                // Notify other player
                let other_chain = if forfeiter == wager.host { &wager.guest_chain } else { &wager.host_chain };
                if let Ok(chain) = other_chain.parse::<ChainId>() {
                    self.runtime.send_message(chain, CrossChainMessage::MatchEnded {
                        lobby_id: lobby_id.clone(),
                        winner,
                        home_score: 0,
                        away_score: 3, // Forfeit score
                    });
                }
            }

            Operation::LeaveMatch { lobby_id } => {
                // Notify host of disconnect
                if let Some(host_chain) = self.state.subscribed_to.get().clone() {
                    if let Ok(chain) = host_chain.parse::<ChainId>() {
                        self.runtime.send_message(chain, CrossChainMessage::PlayerDisconnected {
                            lobby_id,
                            player: owner,
                            timestamp,
                        });
                    }
                }
                self.state.subscribed_to.set(None);
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        match message {
            CrossChainMessage::JoinWager { guest_chain_id, guest_address, lobby_id } => {
                if let Some(mut wager) = self.state.wagers.get(&lobby_id).await.unwrap() {
                    if wager.status == 0 {
                        wager.guest = guest_address.clone();
                        wager.guest_chain = guest_chain_id.to_string();
                        wager.status = 1;
                        self.state.wagers.insert(&lobby_id, wager.clone()).unwrap();

                        let ts = self.runtime.system_time().micros();
                        self.runtime.send_message(guest_chain_id, CrossChainMessage::WagerAccepted {
                            wager: wager.clone(),
                            timestamp: ts,
                        });

                        self.runtime.emit(
                            StreamName::from(format!("match_{}", lobby_id)),
                            &MatchEvent::PlayerJoined { lobby_id: lobby_id.clone(), guest: guest_address.clone() },
                        );
                        self.runtime.emit(
                            StreamName::from(format!("match_{}", lobby_id)),
                            &MatchEvent::MatchStarted { lobby_id, host: wager.host, guest: guest_address },
                        );
                    }
                }
            }

            CrossChainMessage::WagerAccepted { wager, timestamp: _ } => {
                let mut profile = self
                    .state
                    .players
                    .get(&wager.guest)
                    .await
                    .unwrap()
                    .unwrap_or_default();

                if profile.coins >= wager.amount {
                    profile.coins -= wager.amount;
                    self.state.players.insert(&wager.guest, profile).unwrap();
                    let lobby_id = wager.lobby_id.clone();
                    self.state.wagers.insert(&lobby_id, wager).unwrap();
                }
            }

            CrossChainMessage::MatchEnded { lobby_id, winner, home_score: _, away_score: _ } => {
                if let Some(mut wager) = self.state.wagers.get(&lobby_id).await.unwrap() {
                    wager.status = 2;
                    wager.winner = winner;
                    self.state.wagers.insert(&lobby_id, wager).unwrap();
                }
                self.state.subscribed_to.set(None);
            }

            CrossChainMessage::PlayerDisconnected { lobby_id, player: _, timestamp: _ } => {
                if let Some(wager) = self.state.wagers.get(&lobby_id).await.unwrap() {
                    if wager.status == 1 {
                        // Player disconnected during active match - could implement reconnect grace period
                    }
                }
            }

            CrossChainMessage::ScoreUpdate { lobby_id, home_score, away_score, timestamp: _ } => {
                // Emit for real-time UI updates
                self.runtime.emit(
                    StreamName::from(format!("match_{}", lobby_id)),
                    &MatchEvent::GoalScored { 
                        lobby_id, 
                        team: if home_score > away_score { "home".into() } else { "away".into() },
                        score: (home_score, away_score),
                    },
                );
            }
        }
    }

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
