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

export default router;
