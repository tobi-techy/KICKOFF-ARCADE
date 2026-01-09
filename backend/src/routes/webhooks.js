import { Router } from "express";

const router = Router();

// Webhook for match events (can be called by external services)
router.post("/match/started", async (req, res) => {
  const { matchId, players } = req.body;
  console.log(`[Webhook] Match started: ${matchId}`, players);
  // Could trigger notifications, analytics, etc.
  res.json({ received: true });
});

router.post("/match/ended", async (req, res) => {
  const { matchId, score, players } = req.body;
  console.log(`[Webhook] Match ended: ${matchId}`, score);
  // Could update leaderboards, send rewards, etc.
  res.json({ received: true });
});

router.post("/match/goal", async (req, res) => {
  const { matchId, scorer, minute } = req.body;
  console.log(`[Webhook] Goal: ${matchId}`, scorer, minute);
  res.json({ received: true });
});

// Webhook for blockchain events
router.post("/chain/block", async (req, res) => {
  const { chainId, blockHeight, transactions } = req.body;
  console.log(`[Webhook] New block on ${chainId}: height ${blockHeight}`);
  res.json({ received: true });
});

export default router;
