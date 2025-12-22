import { GamePhysics } from "./physics";

const FIELD_WIDTH = 200;
const FIELD_HEIGHT = 120;

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
  tackleCooldown: number;
  actionDelay: number;
}

const aiStates: Map<string, AIState> = new Map();

const getAIState = (id: string): AIState => {
  if (!aiStates.has(id)) aiStates.set(id, { tackleCooldown: 0, actionDelay: 0 });
  return aiStates.get(id)!;
};

// Base formation positions (x as % of field width, y as % of field height)
const getFormationPosition = (team: "home" | "away", role: string, playerId: string): { x: number; y: number } => {
  const isFirst = playerId.includes("1");
  const positions: Record<string, { x: number; y: number }> = {
    gk: { x: 0.07, y: 0.5 },
    def1: { x: 0.22, y: 0.3 },
    def2: { x: 0.22, y: 0.7 },
    mid1: { x: 0.42, y: 0.35 },
    mid2: { x: 0.42, y: 0.65 },
    att1: { x: 0.7, y: 0.35 },
    att2: { x: 0.7, y: 0.65 },
  };
  
  const key = role === "gk" ? "gk" : `${role}${isFirst ? "1" : "2"}`;
  const pos = positions[key] || { x: 0.5, y: 0.5 };
  
  // Mirror for away team
  if (team === "away") {
    return { x: (1 - pos.x) * FIELD_WIDTH, y: pos.y * FIELD_HEIGHT };
  }
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
  if (ai.tackleCooldown > 0) ai.tackleCooldown--;
  if (ai.actionDelay > 0) ai.actionDelay--;

  const ballOwner = physics.getBallOwner();
  const hasBall = ballOwner === p.id;
  const myTeamHasBall = ballOwner?.startsWith(p.team === "home" ? "h" : "a") || false;
  const opponentHasBall = ballOwner !== null && !myTeamHasBall;
  
  const distToBall = Math.hypot(ball.x - p.x, ball.y - p.y);
  const basePos = getFormationPosition(p.team, p.role, p.id);
  
  // Ball zone: 0 = home goal, 1 = away goal
  const ballZone = ball.x / FIELD_WIDTH;
  const inDefensiveThird = (p.team === "home" && ballZone < 0.35) || (p.team === "away" && ballZone > 0.65);
  const inAttackingThird = (p.team === "home" && ballZone > 0.65) || (p.team === "away" && ballZone < 0.35);
  
  let tx = basePos.x;
  let ty = basePos.y;
  let sprint = false;

  // ============ GOALKEEPER ============
  if (p.role === "gk") {
    const goalX = p.team === "home" ? 8 : FIELD_WIDTH - 8;
    
    // Stay on goal line, track ball Y
    tx = goalX;
    ty = Math.max(FIELD_HEIGHT * 0.3, Math.min(FIELD_HEIGHT * 0.7, ball.y));
    
    // Check if any defender is already close to the ball
    const defenders = allPlayers.filter(o => o.team === p.team && o.role === "def");
    const defenderNearBall = defenders.some(d => Math.hypot(ball.x - d.x, ball.y - d.y) < 20);
    
    // Only come out if ball is VERY close, no defender is handling it, and it's dangerous
    const ballInBox = (p.team === "home" && ball.x < 25) || (p.team === "away" && ball.x > FIELD_WIDTH - 25);
    const ballApproaching = (p.team === "home" && ball.vx < -3) || (p.team === "away" && ball.vx > 3);
    const noBallOwner = !ballOwner; // Loose ball
    
    if (ballInBox && distToBall < 15 && !defenderNearBall && noBallOwner) {
      // Rush to intercept loose ball only
      tx = ball.x;
      ty = ball.y;
      sprint = true;
    } else if (ballApproaching && ballInBox) {
      // Position to save - stay on line but track predicted ball position
      const predictedY = ball.y + ball.vy * 0.4;
      ty = Math.max(FIELD_HEIGHT * 0.25, Math.min(FIELD_HEIGHT * 0.75, predictedY));
    }
    
    // GK has ball - kick it out
    if (hasBall && ai.actionDelay === 0) {
      const teammates = allPlayers.filter(t => t.team === p.team && t.role !== "gk");
      const target = teammates.find(t => t.role === "def") || teammates[0];
      if (target) {
        const angle = Math.atan2(target.y - p.y, target.x - p.x);
        physics.kick({ type: "pass", power: 0.7, targetAngle: angle });
        onPass();
        ai.actionDelay = 60;
      }
    }
  }
  
  // ============ DEFENDER ============
  else if (p.role === "def") {
    const isFirstDef = p.id.includes("1");
    
    // Defensive line position - shift based on ball but stay disciplined
    const defLineX = p.team === "home" 
      ? Math.min(45, basePos.x + (ballZone - 0.3) * 40)
      : Math.max(FIELD_WIDTH - 45, basePos.x - ((1 - ballZone) - 0.3) * 40);
    
    tx = defLineX;
    ty = basePos.y + (ball.y - FIELD_HEIGHT / 2) * 0.2;
    
    // Find teammates to coordinate
    const otherDef = allPlayers.find(o => o.team === p.team && o.role === "def" && o.id !== p.id);
    const gk = allPlayers.find(o => o.team === p.team && o.role === "gk");
    const gkDist = gk ? Math.hypot(ball.x - gk.x, ball.y - gk.y) : Infinity;
    
    // Only chase ball if: in defensive third, closest defender, and GK isn't handling it
    if (inDefensiveThird && distToBall < 35 && gkDist > 20) {
      const otherDefDist = otherDef ? Math.hypot(ball.x - otherDef.x, ball.y - otherDef.y) : Infinity;
      
      if (distToBall < otherDefDist) {
        // This defender chases
        tx = ball.x;
        ty = ball.y;
        sprint = distToBall < 20;
      } else {
        // Other defender is closer - hold position and cover
        tx = defLineX;
        ty = isFirstDef ? FIELD_HEIGHT * 0.35 : FIELD_HEIGHT * 0.65;
      }
    }
    
    // Separation from other defender and GK
    if (otherDef) {
      const distToOther = Math.hypot(otherDef.x - p.x, otherDef.y - p.y);
      if (distToOther < 20) {
        ty += isFirstDef ? -10 : 10;
      }
    }
    if (gk) {
      const distToGK = Math.hypot(gk.x - p.x, gk.y - p.y);
      if (distToGK < 15) {
        // Move away from GK
        tx += p.team === "home" ? 10 : -10;
      }
    }
    
    // Mark nearest attacker when opponent has ball (only if not chasing ball)
    if (opponentHasBall && inDefensiveThird && distToBall > 25) {
      const attackers = allPlayers.filter(o => o.team !== p.team && (o.role === "att" || o.role === "mid"));
      // Each defender marks different attacker
      const sortedAttackers = attackers.sort((a, b) => a.y - b.y);
      const myMark = isFirstDef ? sortedAttackers[0] : sortedAttackers[sortedAttackers.length - 1];
      
      if (myMark && Math.hypot(myMark.x - p.x, myMark.y - p.y) < 50) {
        const goalX = p.team === "home" ? 0 : FIELD_WIDTH;
        tx = (myMark.x + goalX) / 2;
        ty = myMark.y;
      }
    }
    
    // Has ball - pass to midfielder or clear
    if (hasBall && ai.actionDelay === 0) {
      const midfielders = allPlayers.filter(t => t.team === p.team && t.role === "mid");
      const target = findOpenTeammate(p, midfielders, allPlayers);
      
      if (target && Math.random() < 0.06) {
        const angle = Math.atan2(target.y - p.y, target.x - p.x);
        physics.kick({ type: "pass", power: 0.55, targetAngle: angle });
        onPass();
        ai.actionDelay = 45;
      }
    }
    
    // Tackle
    if (opponentHasBall && distToBall < 8 && ai.tackleCooldown === 0) {
      if (physics.standingTackle(p.id)) {
        ai.tackleCooldown = 60;
        onTackle(true, false);
      }
    }
  }
  
  // ============ MIDFIELDER ============
  else if (p.role === "mid") {
    const isFirstMid = p.id.includes("1");
    
    // Midfield zone - shift with play but maintain shape
    const midShift = (ballZone - 0.5) * 50;
    tx = basePos.x + (p.team === "home" ? midShift : -midShift);
    ty = basePos.y + (ball.y - FIELD_HEIGHT / 2) * 0.3;
    
    // Clamp to midfield zone
    if (p.team === "home") {
      tx = Math.max(35, Math.min(130, tx));
    } else {
      tx = Math.max(70, Math.min(165, tx));
    }
    
    // Find other midfielder to avoid clustering
    const otherMid = allPlayers.find(o => o.team === p.team && o.role === "mid" && o.id !== p.id);
    
    // Only ONE midfielder presses - the closest one
    const inMiddleThird = ballZone > 0.35 && ballZone < 0.65;
    if (opponentHasBall && inMiddleThird && distToBall < 30) {
      const otherMidDist = otherMid ? Math.hypot(ball.x - otherMid.x, ball.y - otherMid.y) : Infinity;
      
      if (distToBall < otherMidDist) {
        tx = ball.x + ball.vx * 0.3;
        ty = ball.y + ball.vy * 0.3;
        sprint = distToBall < 18;
      }
    }
    
    // Separation from other midfielder
    if (otherMid) {
      const distToOther = Math.hypot(otherMid.x - p.x, otherMid.y - p.y);
      if (distToOther < 18) {
        ty += isFirstMid ? -8 : 8;
      }
    }
    
    // Support attack when team has ball
    if (myTeamHasBall && inAttackingThird) {
      // Move forward to receive pass
      tx = p.team === "home" ? Math.min(tx + 25, 140) : Math.max(tx - 25, 60);
    }
    
    // Has ball - look for forward pass or shoot
    if (hasBall && ai.actionDelay === 0) {
      const goalX = p.team === "home" ? FIELD_WIDTH : 0;
      const goalY = FIELD_HEIGHT / 2;
      const distToGoal = Math.hypot(goalX - p.x, goalY - p.y);
      
      // Shoot if in range
      if (distToGoal < 55 && Math.random() < 0.03) {
        const angle = Math.atan2(goalY - p.y + (Math.random() - 0.5) * 12, goalX - p.x);
        physics.kick({ type: "shoot", power: 0.8, targetAngle: angle });
        onShoot();
        ai.actionDelay = 45;
        return { vx: 0, vy: 0, sprint: false };
      }
      
      // Pass to attacker
      const attackers = allPlayers.filter(t => t.team === p.team && t.role === "att");
      const target = findOpenTeammate(p, attackers, allPlayers);
      
      if (target && Math.random() < 0.05) {
        // Lead the pass slightly
        const leadX = p.team === "home" ? 8 : -8;
        const angle = Math.atan2(target.y - p.y, target.x + leadX - p.x);
        physics.kick({ type: "pass", power: 0.6, targetAngle: angle });
        onPass();
        ai.actionDelay = 45;
      }
    }
    
    // Tackle
    if (opponentHasBall && distToBall < 8 && ai.tackleCooldown === 0) {
      if (physics.standingTackle(p.id)) {
        ai.tackleCooldown = 60;
        onTackle(true, false);
      }
    }
  }
  
  // ============ ATTACKER ============
  else if (p.role === "att") {
    const isFirstAtt = p.id.includes("1");
    
    // Stay high up the pitch
    const attackLine = p.team === "home" ? 130 : 70;
    tx = attackLine + (ballZone - 0.5) * 30 * (p.team === "home" ? 1 : -1);
    ty = basePos.y + (ball.y - FIELD_HEIGHT / 2) * 0.25;
    
    // Find other attacker to avoid clustering
    const otherAtt = allPlayers.find(o => o.team === p.team && o.role === "att" && o.id !== p.id);
    
    // Separation from other attacker
    if (otherAtt) {
      const distToOther = Math.hypot(otherAtt.x - p.x, otherAtt.y - p.y);
      if (distToOther < 25) {
        ty += isFirstAtt ? -12 : 12;
      }
    }
    
    // Make runs when team has ball
    if (myTeamHasBall && !hasBall) {
      // Drift to create space
      if (Math.random() < 0.02) {
        ty += isFirstAtt ? -15 : 15;
      }
      // Run into space behind defense
      if (inAttackingThird) {
        tx = p.team === "home" ? Math.min(180, tx + 15) : Math.max(20, tx - 15);
      }
    }
    
    // Light press - don't track back too deep
    if (opponentHasBall) {
      const pressLimit = p.team === "home" ? 60 : FIELD_WIDTH - 60;
      if ((p.team === "home" && ball.x > pressLimit) || (p.team === "away" && ball.x < pressLimit)) {
        tx = ball.x + (p.team === "home" ? -15 : 15);
        ty = ball.y;
      }
    }
    
    // Has ball - shoot or dribble toward goal
    if (hasBall) {
      const goalX = p.team === "home" ? FIELD_WIDTH : 0;
      const goalY = FIELD_HEIGHT / 2;
      const distToGoal = Math.hypot(goalX - p.x, goalY - p.y);
      
      // Shoot!
      if (distToGoal < 50 && ai.actionDelay === 0 && Math.random() < 0.04) {
        const angle = Math.atan2(goalY - p.y + (Math.random() - 0.5) * 10, goalX - p.x);
        physics.kick({ type: "shoot", power: 0.9, targetAngle: angle, spin: (Math.random() - 0.5) * 0.3 });
        onShoot();
        ai.actionDelay = 45;
        return { vx: 0, vy: 0, sprint: false };
      }
      
      // Dribble toward goal
      tx = goalX;
      ty = goalY;
      sprint = distToGoal < 45;
      
      // Pass if pressured
      const nearbyDefs = allPlayers.filter(o => o.team !== p.team && Math.hypot(o.x - p.x, o.y - p.y) < 15);
      if (nearbyDefs.length > 0 && ai.actionDelay === 0 && Math.random() < 0.06) {
        const teammates = allPlayers.filter(t => t.team === p.team && t.id !== p.id && t.role !== "gk");
        const target = findOpenTeammate(p, teammates, allPlayers);
        if (target) {
          const angle = Math.atan2(target.y - p.y, target.x - p.x);
          physics.kick({ type: "pass", power: 0.5, targetAngle: angle });
          onPass();
          ai.actionDelay = 45;
        }
      }
    }
  }

  // Clamp to field
  tx = Math.max(8, Math.min(FIELD_WIDTH - 8, tx));
  ty = Math.max(8, Math.min(FIELD_HEIGHT - 8, ty));

  // Calculate velocity
  const dist = Math.hypot(tx - p.x, ty - p.y);
  if (dist < 2) return { vx: 0, vy: 0, sprint: false };

  const angle = Math.atan2(ty - p.y, tx - p.x);
  const baseSpeed = 4.2 * (p.speed ? 0.75 + (p.speed / 100) * 0.4 : 1);
  const speed = sprint ? baseSpeed * 1.3 : baseSpeed;
  
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    sprint,
  };
};

// Find an open teammate to pass to
const findOpenTeammate = (
  passer: AIPlayer,
  candidates: AIPlayer[],
  allPlayers: AIPlayer[]
): AIPlayer | null => {
  const opponents = allPlayers.filter(o => o.team !== passer.team);
  
  let best: AIPlayer | null = null;
  let bestScore = -Infinity;

  for (const t of candidates) {
    const dist = Math.hypot(t.x - passer.x, t.y - passer.y);
    if (dist < 15 || dist > 80) continue;

    // Check if pass lane is clear
    const passAngle = Math.atan2(t.y - passer.y, t.x - passer.x);
    const blocked = opponents.some(o => {
      const oDist = Math.hypot(o.x - passer.x, o.y - passer.y);
      if (oDist > dist) return false;
      const oAngle = Math.atan2(o.y - passer.y, o.x - passer.x);
      return Math.abs(passAngle - oAngle) < 0.3;
    });

    if (blocked) continue;

    // Score: prefer forward passes
    const forward = passer.team === "home" ? t.x - passer.x : passer.x - t.x;
    const score = forward * 1.5 + (60 - dist) * 0.3;
    
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  return best;
};

export const resetAIStates = () => aiStates.clear();
