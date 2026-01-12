import { Router } from "express";
import { lineraService } from "../services/linera.js";

const router = Router();

// Register player
router.post("/register", async (req, res) => {
  try {
    const { chainId } = req.body;
    const result = await lineraService.registerPlayer(chainId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record match result
router.post("/match", async (req, res) => {
  try {
    const { homeScore, awayScore } = req.body;
    const result = await lineraService.recordMatch(homeScore, awayScore);
    
    // Calculate rewards
    let xpEarned, coinsEarned;
    if (homeScore > awayScore) {
      xpEarned = 100; coinsEarned = 50;
    } else if (homeScore < awayScore) {
      xpEarned = 25; coinsEarned = 10;
    } else {
      xpEarned = 50; coinsEarned = 20;
    }
    
    res.json({ success: true, data: result, rewards: { xpEarned, coinsEarned } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get player profile
router.get("/profile/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const result = await lineraService.getPlayerProfile(address);
    res.json({ success: true, data: result.data?.playerProfile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get player cards
router.get("/cards/:owner", async (req, res) => {
  try {
    const { owner } = req.params;
    const result = await lineraService.getPlayerCards(owner);
    res.json({ success: true, data: result.data?.playerCards || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 10;
    const result = await lineraService.getLeaderboard(count);
    res.json({ success: true, data: result.data?.leaderboard || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mint player card
router.post("/mint", async (req, res) => {
  try {
    const { name, position, speed, shooting, passing, defending, rarity } = req.body;
    const result = await lineraService.mintPlayerCard(
      name, position, speed, shooting, passing, defending, rarity
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get wallet info
router.get("/wallet", async (req, res) => {
  try {
    const info = await lineraService.getWalletInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get network status (verify testnet connection)
router.get("/status", async (req, res) => {
  try {
    const status = await lineraService.getNetworkStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create wager
router.post("/wager/create", async (req, res) => {
  try {
    const { lobbyId, amount } = req.body;
    const result = await lineraService.createWager(lobbyId, amount);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Accept wager
router.post("/wager/accept", async (req, res) => {
  try {
    const { lobbyId } = req.body;
    const result = await lineraService.acceptWager(lobbyId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel wager
router.post("/wager/cancel", async (req, res) => {
  try {
    const { lobbyId } = req.body;
    const result = await lineraService.cancelWager(lobbyId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resolve wager
router.post("/wager/resolve", async (req, res) => {
  try {
    const { lobbyId, winner, homeScore, awayScore } = req.body;
    const result = await lineraService.resolveWager(lobbyId, winner, homeScore, awayScore);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get wager
router.get("/wager/:lobbyId", async (req, res) => {
  try {
    const { lobbyId } = req.params;
    const result = await lineraService.getWager(lobbyId);
    res.json({ success: true, data: result.data?.wager });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Forfeit any match (XP + coin penalty)
router.post("/forfeit", async (req, res) => {
  try {
    const result = await lineraService.forfeitMatch();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Claim daily reward
router.post("/daily-reward", async (req, res) => {
  try {
    const result = await lineraService.claimDailyReward();
    res.json({ success: true, data: result, rewards: { xp: 50, coins: 100 } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Forfeit wager match (loses stake + XP penalty)
router.post("/wager/forfeit", async (req, res) => {
  try {
    const { lobbyId } = req.body;
    const result = await lineraService.forfeitWager(lobbyId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
