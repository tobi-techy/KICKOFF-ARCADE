import { GamePhysics } from "./physics";

const FIELD_WIDTH = 200;
const FIELD_HEIGHT = 120;

export type Difficulty = "easy" | "medium" | "hard";

// Difficulty settings
const DIFFICULTY_CONFIG = {
  easy: { speed: 0.7, shootChance: 0.02, passChance: 0.03, tackleChance: 0.3, reactionDelay: 0.6 },
  medium: { speed: 0.85, shootChance: 0.05, passChance: 0.05, tackleChance: 0.5, reactionDelay: 0.8 },
  hard: { speed: 1.0, shootChance: 0.08, passChance: 0.07, tackleChance: 0.7, reactionDelay: 1.0 },
};

let currentDifficulty: Difficulty = "medium";

export const setAIDifficulty = (diff: Difficulty) => {
  currentDifficulty = diff;
};

export interface AIPlayer {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: "home" | "away";
  role: "gk" | "def" | "mid" | "att";
  speed?: number;
  isUser?: boolean;
}

interface AIState {
  actionCooldown: number;
}

const aiStates: Map<string, AIState> = new Map();

const getAIState = (id: string): AIState => {
  if (!aiStates.has(id)) aiStates.set(id, { actionCooldown: 0 });
  return aiStates.get(id)!;
};

// Formation positions (% of field)
const FORMATIONS = {
  home: {
    gk: { x: 0.06, y: 0.5 },
    def1: { x: 0.2, y: 0.3 },
    def2: { x: 0.2, y: 0.7 },
    mid1: { x: 0.4, y: 0.35 },
    mid2: { x: 0.4, y: 0.65 },
    att1: { x: 0.65, y: 0.35 },
    att2: { x: 0.65, y: 0.65 },
  },
  away: {
    gk: { x: 0.94, y: 0.5 },
    def1: { x: 0.8, y: 0.3 },
    def2: { x: 0.8, y: 0.7 },
    mid1: { x: 0.6, y: 0.35 },
    mid2: { x: 0.6, y: 0.65 },
    att1: { x: 0.35, y: 0.35 },
    att2: { x: 0.35, y: 0.65 },
  },
};

const getBasePosition = (p: AIPlayer): { x: number; y: number } => {
  const formation = FORMATIONS[p.team];
  const key = p.role === "gk" ? "gk" : `${p.role}${p.id.includes("1") ? "1" : "2"}`;
  const pos = (formation as any)[key] || { x: 0.5, y: 0.5 };
  return { x: pos.x * FIELD_WIDTH, y: pos.y * FIELD_HEIGHT };
};

export const computeAIMove = (
  p: AIPlayer,
  ball: { x: number; y: number; vx: number; vy: number },
  allPlayers: AIPlayer[],
  physics: GamePhysics,
  onPass: () => void,
  onShoot: () => void,
  onTackle: (success: boolean, foul: boolean) => void
): { vx: number; vy: number; sprint: boolean } => {
  const ai = getAIState(p.id);
  if (ai.actionCooldown > 0) ai.actionCooldown--;

  const diff = DIFFICULTY_CONFIG[currentDifficulty];
  const ballOwner = physics.getBallOwner();
  const hasBall = ballOwner === p.id;
  const myTeamHasBall = ballOwner?.startsWith(p.team === "home" ? "h" : "a") || false;
  const opponentHasBall = ballOwner !== null && !myTeamHasBall;
  
  const distToBall = Math.hypot(ball.x - p.x, ball.y - p.y);
  const basePos = getBasePosition(p);
  
  // Ball zone (0 = home side, 1 = away side)
  const ballZone = ball.x / FIELD_WIDTH;
  
  let tx = basePos.x;
  let ty = basePos.y;
  let sprint = false;

  // ========== GOALKEEPER ==========
  if (p.role === "gk") {
    const goalX = p.team === "home" ? 8 : FIELD_WIDTH - 8;
    const goalWidth = FIELD_HEIGHT * 0.28;
    const goalTop = (FIELD_HEIGHT - goalWidth) / 2;
    const goalBottom = goalTop + goalWidth;
    
    // Predict ball trajectory
    const ballSpeed = Math.hypot(ball.vx, ball.vy);
    const predictedBallY = ball.y + ball.vy * 0.5;
    
    // Check if ball is coming toward goal
    const ballComingToGoal = (p.team === "home" && ball.vx < -1) || (p.team === "away" && ball.vx > 1);
    const ballInDangerZone = (p.team === "home" && ball.x < 50) || (p.team === "away" && ball.x > FIELD_WIDTH - 50);
    
    // Base position - track ball Y with prediction
    tx = goalX;
    const trackY = ballComingToGoal ? predictedBallY : ball.y;
    ty = Math.max(goalTop + 5, Math.min(goalBottom - 5, trackY));
    
    // Dive for shots
    if (ballComingToGoal && ballSpeed > 3 && ballInDangerZone) {
      const timeToGoal = Math.abs((goalX - ball.x) / ball.vx);
      const interceptY = ball.y + ball.vy * timeToGoal;
      
      if (interceptY > goalTop && interceptY < goalBottom) {
        ty = Math.max(goalTop, Math.min(goalBottom, interceptY));
        if (distToBall < 25) {
          tx = p.team === "home" ? Math.min(goalX + 12, ball.x - 5) : Math.max(goalX - 12, ball.x + 5);
          sprint = true;
        }
      }
    }
    
    // Rush for loose balls in box
    const looseBall = !ballOwner;
    const ballInBox = (p.team === "home" && ball.x < 30) || (p.team === "away" && ball.x > FIELD_WIDTH - 30);
    
    if (looseBall && ballInBox && distToBall < 20) {
      tx = ball.x;
      ty = ball.y;
      sprint = true;
    }
    
    // GK has ball - quick distribution
    if (hasBall && ai.actionCooldown === 0) {
      const clearAngle = p.team === "home" ? 0 : Math.PI;
      const teammates = allPlayers.filter(t => t.team === p.team && t.role !== "gk");
      const target = teammates.find(t => t.role === "def") || teammates.find(t => t.role === "mid") || teammates[0];
      
      if (target) {
        const angle = Math.atan2(target.y - p.y, target.x - p.x);
        physics.kick({ type: "shoot", power: 0.7, targetAngle: angle }); // Use shoot for more force
      } else {
        physics.kick({ type: "shoot", power: 0.8, targetAngle: clearAngle + (Math.random() - 0.5) * 0.3 });
      }
      onPass();
      ai.actionCooldown = 60; // Long cooldown to prevent re-acquiring ball
      return { vx: 0, vy: 0, sprint: false };
    }
  }

  // ========== WHEN MY TEAM HAS BALL ==========
  else if (myTeamHasBall && !hasBall) {
    // Move to receive pass - spread out and get open
    const attackDir = p.team === "home" ? 1 : -1;
    
    // Shift formation forward
    const shiftAmount = ballZone * 30 * attackDir;
    tx = basePos.x + shiftAmount;
    
    // Spread vertically based on ball position
    const verticalSpread = (ball.y - FIELD_HEIGHT / 2) * 0.15;
    ty = basePos.y + verticalSpread;
    
    // Attackers make runs ahead of ball
    if (p.role === "att") {
      tx = basePos.x + 20 * attackDir;
      // Stay wide to stretch defense
      ty = p.id.includes("1") ? FIELD_HEIGHT * 0.25 : FIELD_HEIGHT * 0.75;
    }
    
    // Midfielders support
    if (p.role === "mid") {
      // One mid stays back, one pushes forward
      if (p.id.includes("1")) {
        tx = ball.x - 15 * attackDir; // Support behind ball
      } else {
        tx = ball.x + 10 * attackDir; // Push ahead
      }
    }
    
    // Defenders hold line
    if (p.role === "def") {
      tx = Math.min(Math.max(basePos.x, 20), FIELD_WIDTH - 60);
    }
  }

  // ========== WHEN I HAVE BALL ==========
  else if (hasBall) {
    const goalX = p.team === "home" ? FIELD_WIDTH : 0;
    const goalY = FIELD_HEIGHT / 2;
    const distToGoal = Math.hypot(goalX - p.x, goalY - p.y);
    
    // Shoot if in range
    if (distToGoal < 50 && ai.actionCooldown === 0) {
      const shootChance = (p.role === "att" ? diff.shootChance * 1.2 : diff.shootChance);
      if (Math.random() < shootChance) {
        const angle = Math.atan2(goalY - p.y + (Math.random() - 0.5) * 15, goalX - p.x);
        physics.kick({ type: "shoot", power: 0.85, targetAngle: angle });
        onShoot();
        ai.actionCooldown = 40;
        return { vx: 0, vy: 0, sprint: false };
      }
    }
    
    // Look for pass
    if (ai.actionCooldown === 0) {
      const passChance = (p.role === "def" ? diff.passChance * 1.5 : diff.passChance);
      if (Math.random() < passChance) {
        const target = findBestPass(p, allPlayers);
        if (target) {
          const leadAmount = p.team === "home" ? 8 : -8;
          const angle = Math.atan2(target.y - p.y, target.x + leadAmount - p.x);
          physics.kick({ type: "pass", power: 0.5, targetAngle: angle });
          onPass();
          ai.actionCooldown = 35;
          return { vx: 0, vy: 0, sprint: false };
        }
      }
    }
    
    // Dribble toward goal
    tx = goalX;
    ty = goalY;
    sprint = distToGoal < 40;
  }

  // ========== WHEN OPPONENT HAS BALL ==========
  else if (opponentHasBall) {
    // Defensive positioning
    const defendDir = p.team === "home" ? -1 : 1;
    
    // Fall back toward own goal
    const retreatAmount = (1 - ballZone) * 25 * defendDir;
    tx = basePos.x + retreatAmount;
    ty = basePos.y;
    
    // Track ball vertically
    ty += (ball.y - FIELD_HEIGHT / 2) * 0.25;
    
    // Only closest player to ball presses
    const myTeamPlayers = allPlayers.filter(o => o.team === p.team && o.role !== "gk");
    const closestToBall = myTeamPlayers.sort((a, b) => 
      Math.hypot(ball.x - a.x, ball.y - a.y) - Math.hypot(ball.x - b.x, ball.y - b.y)
    )[0];
    
    if (closestToBall?.id === p.id && distToBall < 30 * diff.reactionDelay) {
      // Press the ball
      tx = ball.x;
      ty = ball.y;
      sprint = distToBall < 15;
      
      // Attempt tackle
      if (distToBall < 8 && ai.actionCooldown === 0 && Math.random() < diff.tackleChance) {
        const success = physics.standingTackle(p.id);
        if (success) {
          onTackle(true, false);
          ai.actionCooldown = 45;
        }
      }
    }
    
    // Defenders mark attackers
    if (p.role === "def") {
      const opponents = allPlayers.filter(o => o.team !== p.team && o.role === "att");
      const myMark = p.id.includes("1") ? opponents[0] : opponents[opponents.length - 1];
      if (myMark) {
        const ownGoalX = p.team === "home" ? 0 : FIELD_WIDTH;
        tx = (myMark.x + ownGoalX) / 2;
        ty = myMark.y;
      }
    }
  }

  // ========== LOOSE BALL ==========
  else {
    // Chase loose ball - closest player goes
    const myTeamPlayers = allPlayers.filter(o => o.team === p.team && o.role !== "gk");
    const closestToBall = myTeamPlayers.sort((a, b) => 
      Math.hypot(ball.x - a.x, ball.y - a.y) - Math.hypot(ball.x - b.x, ball.y - b.y)
    )[0];
    
    if (closestToBall?.id === p.id) {
      tx = ball.x + ball.vx * 0.2;
      ty = ball.y + ball.vy * 0.2;
      sprint = distToBall < 25;
    }
  }

  // Clamp to field
  tx = Math.max(6, Math.min(FIELD_WIDTH - 6, tx));
  ty = Math.max(6, Math.min(FIELD_HEIGHT - 6, ty));

  // Calculate movement
  const dist = Math.hypot(tx - p.x, ty - p.y);
  if (dist < 1.5) return { vx: 0, vy: 0, sprint: false };

  const angle = Math.atan2(ty - p.y, tx - p.x);
  const baseSpeed = 3.8 * (p.speed ? 0.8 + (p.speed / 100) * 0.35 : 1) * diff.speed;
  const speed = sprint ? baseSpeed * 1.25 : baseSpeed;
  
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    sprint,
  };
};

// Find best passing option
const findBestPass = (passer: AIPlayer, allPlayers: AIPlayer[]): AIPlayer | null => {
  const teammates = allPlayers.filter(t => t.team === passer.team && t.id !== passer.id && t.role !== "gk");
  const opponents = allPlayers.filter(o => o.team !== passer.team);
  
  let best: AIPlayer | null = null;
  let bestScore = -Infinity;

  for (const t of teammates) {
    const dist = Math.hypot(t.x - passer.x, t.y - passer.y);
    if (dist < 12 || dist > 70) continue;

    // Check if pass lane is clear
    const passAngle = Math.atan2(t.y - passer.y, t.x - passer.x);
    const blocked = opponents.some(o => {
      const oDist = Math.hypot(o.x - passer.x, o.y - passer.y);
      if (oDist > dist) return false;
      const oAngle = Math.atan2(o.y - passer.y, o.x - passer.x);
      return Math.abs(passAngle - oAngle) < 0.25;
    });

    if (blocked) continue;

    // Score: prefer forward passes
    const forward = passer.team === "home" ? t.x - passer.x : passer.x - t.x;
    const score = forward * 2 + (50 - dist) * 0.5;
    
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  return best;
};

export const resetAIStates = () => aiStates.clear();
