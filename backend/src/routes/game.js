import { Router } from "express";

const router = Router();

// Get matchmaking queue status
router.get("/status", (req, res) => {
  const status = req.app.get("matchmaking")?.getQueueStatus() || { playersInQueue: 0, activeMatches: 0 };
  res.json(status);
});

// Get match details
router.get("/match/:matchId", (req, res) => {
  const { matchId } = req.params;
  const match = req.app.get("matchmaking")?.getMatch(matchId);
  if (!match) {
    return res.status(404).json({ error: "Match not found" });
  }
  res.json(match);
});

export default router;
