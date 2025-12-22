import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGame } from "../context/GameContext";
import { ScreenName } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Joystick } from "../components/Joystick";
import { PixelPlayer } from "../components/PixelPlayer";
import { sounds } from "../utils/sounds";
import { GamePhysics, KickOptions } from "../utils/physics";
import {
  Timer,
  Trophy,
  Users,
  Zap,
  Pause,
  Play,
  RefreshCw,
  LogOut,
  Target,
} from "lucide-react";

// --- Game Engine Constants ---
const FIELD_WIDTH = 200;
const FIELD_HEIGHT = 120;
const PLAYER_RADIUS = 3.5;
const BALL_RADIUS = 2;
const PLAYER_SPEED = 5;
const AI_SPEED_FACTOR = 0.92;

// Formation positions (4-3-3)
const FORMATIONS = {
  "4-3-3": {
    home: [
      { role: "gk", x: 0.08, y: 0.5 },
      { role: "def", x: 0.22, y: 0.2 },
      { role: "def", x: 0.22, y: 0.4 },
      { role: "def", x: 0.22, y: 0.6 },
      { role: "def", x: 0.22, y: 0.8 },
      { role: "mid", x: 0.4, y: 0.25 },
      { role: "mid", x: 0.4, y: 0.5 },
      { role: "mid", x: 0.4, y: 0.75 },
      { role: "att", x: 0.6, y: 0.2 },
      { role: "att", x: 0.6, y: 0.5 },
      { role: "att", x: 0.6, y: 0.8 },
    ],
    away: [
      { role: "gk", x: 0.92, y: 0.5 },
      { role: "def", x: 0.78, y: 0.2 },
      { role: "def", x: 0.78, y: 0.4 },
      { role: "def", x: 0.78, y: 0.6 },
      { role: "def", x: 0.78, y: 0.8 },
      { role: "mid", x: 0.6, y: 0.25 },
      { role: "mid", x: 0.6, y: 0.5 },
      { role: "mid", x: 0.6, y: 0.75 },
      { role: "att", x: 0.4, y: 0.2 },
      { role: "att", x: 0.4, y: 0.5 },
      { role: "att", x: 0.4, y: 0.8 },
    ],
  },
};

interface GameObject {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: "player" | "ball";
  team?: "home" | "away";
  role?: "gk" | "def" | "mid" | "att";
  rating?: number;
  speed?: number;
  shooting?: number;
  passing?: number;
  defending?: number;
  isUser?: boolean;
  color?: string;
  hasBall?: boolean;
  targetX?: number;
  targetY?: number;
  stamina?: number;
}

export const MatchScreen: React.FC = () => {
  const { setScreen, finishMatch, squad, selectedTeam, matchDuration } =
    useGame();

  // Game State Refs
  const gameState = useRef<{
    players: GameObject[];
    ball: GameObject;
    score: { home: number; away: number };
    timeLeft: number;
    isPlaying: boolean;
    lastScored: "home" | "away" | null;
  }>({
    players: [],
    ball: {
      id: "ball",
      x: FIELD_WIDTH / 2,
      y: FIELD_HEIGHT / 2,
      vx: 0,
      vy: 0,
      type: "ball",
    },
    score: { home: 0, away: 0 },
    timeLeft: matchDuration,
    isPlaying: true,
    lastScored: null,
  });

  const joystickRef = useRef({ x: 0, y: 0 });
  const sprintRef = useRef(false);
  const activeKeys = useRef<Set<string>>(new Set());
  const requestRef = useRef<number>(0);
  const playerDivsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const ballDivRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const possessionRef = useRef({ home: 0, away: 0 });
  const physicsRef = useRef<GamePhysics | null>(null);
  
  // Kick charging state
  const kickChargeRef = useRef({ charging: false, startTime: 0, type: "pass" as "pass" | "shoot" });
  const tackleRef = useRef({ sliding: false, cooldown: 0 });
  
  const uiRefs = useRef({
    activePlayerId: "h_att1",
    activeOpponentId: "",
    timeLeft: matchDuration,
  });

  const [uiState, setUiState] = useState({
    homeScore: 0,
    awayScore: 0,
    timeLeft: matchDuration,
    eventText: "",
    isPaused: false,
    activePlayerId: "h_att1",
    activeOpponentId: "",
    kickPower: 0,
    stamina: 100,
  });

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const scaleX = width / FIELD_WIDTH;
    const scaleY = height / FIELD_HEIGHT;
    scaleRef.current = Math.min(scaleX, scaleY) * 0.95;
  }, []);

  const togglePause = () => {
    setUiState((prev) => {
      const nextPaused = !prev.isPaused;
      gameState.current.isPlaying = !nextPaused;
      return { ...prev, isPaused: nextPaused };
    });
  };

  const handleRestart = () => {
    const state = gameState.current;
    state.score = { home: 0, away: 0 };
    state.timeLeft = matchDuration;
    uiRefs.current.timeLeft = matchDuration;
    uiRefs.current.activePlayerId = "h_att1";
    uiRefs.current.activeOpponentId = "";
    resetPositions(null);
    setUiState({
      homeScore: 0,
      awayScore: 0,
      timeLeft: matchDuration,
      isPaused: false,
      eventText: "RESTART!",
      activePlayerId: "h_att1",
      activeOpponentId: "",
      kickPower: 0,
      stamina: 100,
    });
    state.isPlaying = true;
    setTimeout(() => setUiState((prev) => ({ ...prev, eventText: "" })), 1000);
  };

  const handleQuit = () => {
    setScreen(ScreenName.HOME);
  };

  const resetPositions = (lastScorer: "home" | "away" | null) => {
    const state = gameState.current;
    const physics = physicsRef.current;

    state.players.forEach((p) => {
      p.vx = 0;
      p.vy = 0;
      if (p.team === "home") {
        // Home starts on Left
        if (p.role === "gk") {
          p.x = 15;
          p.y = FIELD_HEIGHT / 2;
        } else if (p.role === "def") {
          p.x = 45;
          p.y = p.id.includes("1") ? FIELD_HEIGHT * 0.3 : FIELD_HEIGHT * 0.7;
        } else if (p.role === "mid") {
          p.x = 75;
          p.y = p.id.includes("1") ? FIELD_HEIGHT * 0.35 : FIELD_HEIGHT * 0.65;
        } else {
          p.x = 95;
          p.y = p.id.includes("1") ? FIELD_HEIGHT * 0.4 : FIELD_HEIGHT * 0.6;
        }
      } else {
        // Away starts on Right
        if (p.role === "gk") {
          p.x = FIELD_WIDTH - 15;
          p.y = FIELD_HEIGHT / 2;
        } else if (p.role === "def") {
          p.x = FIELD_WIDTH - 45;
          p.y = p.id.includes("1") ? FIELD_HEIGHT * 0.3 : FIELD_HEIGHT * 0.7;
        } else if (p.role === "mid") {
          p.x = FIELD_WIDTH - 75;
          p.y = p.id.includes("1") ? FIELD_HEIGHT * 0.35 : FIELD_HEIGHT * 0.65;
        } else {
          p.x = FIELD_WIDTH - 95;
          p.y = p.id.includes("1") ? FIELD_HEIGHT * 0.4 : FIELD_HEIGHT * 0.6;
        }
      }
      // Sync to physics
      if (physics) physics.resetPlayer(p.id, p.x, p.y);
    });

    state.ball.x = FIELD_WIDTH / 2;
    state.ball.y = FIELD_HEIGHT / 2;
    state.ball.vx = 0;
    state.ball.vy = 0;
    if (physics) physics.resetBall();
    joystickRef.current = { x: 0, y: 0 };
  };

  const handleGoal = (team: "home" | "away") => {
    const state = gameState.current;
    if (!state.isPlaying) return;

    if (team === "home") state.score.home++;
    else state.score.away++;

    state.isPlaying = false;
    state.ball.vx = 0;
    state.ball.vy = 0;

    sounds.goal();

    setUiState((prev) => ({
      ...prev,
      homeScore: state.score.home,
      awayScore: state.score.away,
      eventText: team === "home" ? "GOAL!" : "CONCEDED!",
    }));

    setTimeout(() => {
      resetPositions(team);
      setUiState((prev) => {
        // Only resume if the user hasn't opened the pause menu during the goal celebration
        if (!prev.isPaused) {
          setTimeout(() => {
            state.isPlaying = true;
          }, 100);
        }
        return { ...prev, eventText: "" };
      });
    }, 1500);
  };

  const handleOutOfBounds = (type: "throw-in" | "corner" | "goal-kick", team: "home" | "away", x: number, y: number) => {
    const state = gameState.current;
    const physics = physicsRef.current;
    if (!state.isPlaying || !physics) return;

    state.isPlaying = false;
    sounds.bounce();

    const eventLabels = { "throw-in": "THROW IN", "corner": "CORNER", "goal-kick": "GOAL KICK" };
    setUiState((prev) => ({ ...prev, eventText: `${eventLabels[type]} - ${team.toUpperCase()}` }));

    setTimeout(() => {
      physics.placeBall(x, y);
      state.ball.x = x;
      state.ball.y = y;
      state.ball.vx = 0;
      state.ball.vy = 0;
      setUiState((prev) => ({ ...prev, eventText: "" }));
      state.isPlaying = true;
    }, 800);
  };

  const handleMatchEnd = () => {
    gameState.current.isPlaying = false;
    const { home, away } = gameState.current.score;
    const outcome = home > away ? "WIN" : home < away ? "LOSS" : "DRAW";
    const totalPossession = possessionRef.current.home + possessionRef.current.away;
    const possession = totalPossession > 0 ? Math.round((possessionRef.current.home / totalPossession) * 100) : 50;

    sounds.whistle();
    setUiState((prev) => ({ ...prev, eventText: "FULL TIME!" }));

    setTimeout(() => {
      finishMatch({
        homeScore: home,
        awayScore: away,
        possession,
        xpEarned: outcome === "WIN" ? 100 : outcome === "DRAW" ? 50 : 20,
        outcome,
      });
      setScreen(ScreenName.MATCH_RESULT);
    }, 2000);
  };

  // Start charging a kick
  const startKickCharge = (type: "pass" | "shoot") => {
    kickChargeRef.current = { charging: true, startTime: Date.now(), type };
  };

  // Release kick with charged power
  const releaseKick = () => {
    const state = gameState.current;
    const physics = physicsRef.current;
    const charge = kickChargeRef.current;
    
    if (!state.isPlaying || !physics || !charge.charging) return;
    kickChargeRef.current.charging = false;
    
    const user = state.players.find((p) => p.isUser);
    if (!user) return;

    const ballOwner = physics.getBallOwner();
    if (ballOwner !== user.id) return;

    // Calculate power (0-1) based on charge time (max 1 second)
    const chargeTime = Math.min(Date.now() - charge.startTime, 1000);
    const power = chargeTime / 1000;

    // Get kick angle from joystick or ball direction
    let angle: number;
    const joyMag = Math.sqrt(joystickRef.current.x ** 2 + joystickRef.current.y ** 2);
    if (joyMag > 0.1) {
      angle = Math.atan2(joystickRef.current.y, joystickRef.current.x);
    } else {
      // Default: kick towards opponent goal
      angle = user.team === "home" ? 0 : Math.PI;
    }

    // Add spin based on perpendicular joystick movement
    const spin = joystickRef.current.y * 0.5;

    const kickOptions: KickOptions = {
      type: charge.type,
      power,
      targetAngle: angle,
      spin,
    };

    physics.kick(kickOptions);
    charge.type === "shoot" ? sounds.kick() : sounds.pass();
    setUiState(prev => ({ ...prev, kickPower: 0 }));
  };

  // Slide tackle
  const performSlideTackle = () => {
    const state = gameState.current;
    const physics = physicsRef.current;
    if (!state.isPlaying || !physics) return;
    if (tackleRef.current.cooldown > 0) return;

    const user = state.players.find((p) => p.isUser);
    if (!user) return;

    const joyMag = Math.sqrt(joystickRef.current.x ** 2 + joystickRef.current.y ** 2);
    const angle = joyMag > 0.1 
      ? Math.atan2(joystickRef.current.y, joystickRef.current.x)
      : (user.team === "home" ? 0 : Math.PI);

    const result = physics.slideTackle(user.id, angle);
    tackleRef.current = { sliding: true, cooldown: 60 }; // 1 second cooldown

    if (result.foul) {
      setUiState(prev => ({ ...prev, eventText: "FOUL!" }));
      setTimeout(() => setUiState(prev => ({ ...prev, eventText: "" })), 1500);
    } else if (result.success) {
      sounds.kick();
    }
  };

  // Through ball (leads the target)
  const performThroughBall = () => {
    const state = gameState.current;
    const physics = physicsRef.current;
    if (!state.isPlaying || !physics) return;

    const user = state.players.find((p) => p.isUser);
    if (!user || physics.getBallOwner() !== user.id) return;

    // Find best teammate to pass to
    const teammates = state.players.filter(p => p.team === user.team && p.id !== user.id && p.role !== "gk");
    const bestTarget = teammates.reduce((best, p) => {
      const dist = Math.sqrt((p.x - user.x) ** 2 + (p.y - user.y) ** 2);
      const forwardBonus = user.team === "home" ? p.x - user.x : user.x - p.x;
      const score = forwardBonus * 2 - dist * 0.5;
      return score > (best?.score || -Infinity) ? { player: p, score } : best;
    }, null as { player: GameObject; score: number } | null);

    if (bestTarget) {
      // Lead the pass ahead of the target
      const leadDist = 15;
      const targetX = bestTarget.player.x + (user.team === "home" ? leadDist : -leadDist);
      const targetY = bestTarget.player.y;
      const angle = Math.atan2(targetY - user.y, targetX - user.x);

      physics.kick({ type: "through", power: 0.7, targetAngle: angle });
      sounds.pass();
    }
  };

  // AI State Refs
  const aiState = useRef<{ [playerId: string]: { tackleCooldown: number; decisionTimer: number; targetId?: string } }>({});

  const moveAI = (
    p: GameObject,
    ball: GameObject,
    allPlayers: GameObject[],
    physics: GamePhysics,
  ) => {
    // Initialize AI state
    if (!aiState.current[p.id]) {
      aiState.current[p.id] = { tackleCooldown: 0, decisionTimer: 0 };
    }
    const ai = aiState.current[p.id];
    if (ai.tackleCooldown > 0) ai.tackleCooldown--;

    const distToBall = Math.sqrt((ball.x - p.x) ** 2 + (ball.y - p.y) ** 2);
    const hasBall = physics.getBallOwner() === p.id;
    let tx = p.x;
    let ty = p.y;
    let shouldSprint = false;

    if (p.role === "gk") {
      // Goalkeeper AI - diving saves
      const goalX = p.team === "home" ? 8 : FIELD_WIDTH - 8;
      tx = goalX;
      
      // Track ball Y position
      const targetY = Math.max(FIELD_HEIGHT * 0.35, Math.min(FIELD_HEIGHT * 0.65, ball.y));
      ty = targetY;

      // Dive if ball is coming fast towards goal
      const ballVelTowardsGoal = p.team === "home" ? -ball.vx : ball.vx;
      if (ballVelTowardsGoal > 2 && distToBall < 25) {
        tx = ball.x;
        ty = ball.y;
        shouldSprint = true;
      }
      
      // Charge out if ball is very close
      if (distToBall < 15 && Math.abs(ball.x - goalX) < 30) {
        tx = ball.x;
        ty = ball.y;
        shouldSprint = true;
      }
    } else if (hasBall) {
      // AI with ball - smart attacking
      const goalX = p.team === "home" ? FIELD_WIDTH : 0;
      const goalY = FIELD_HEIGHT / 2;
      
      // Check for nearby defenders
      const nearbyDefenders = allPlayers.filter(
        (other) => other.team !== p.team &&
          Math.sqrt((other.x - p.x) ** 2 + (other.y - p.y) ** 2) < 25
      );

      if (nearbyDefenders.length > 0) {
        // Look for pass
        const teammates = allPlayers.filter(t => t.team === p.team && t.id !== p.id && t.role !== "gk");
        const bestPass = teammates.reduce((best, t) => {
          const dist = Math.sqrt((t.x - p.x) ** 2 + (t.y - p.y) ** 2);
          const forwardBonus = p.team === "home" ? t.x - p.x : p.x - t.x;
          // Check if pass lane is clear
          const blocked = nearbyDefenders.some(d => {
            const passAngle = Math.atan2(t.y - p.y, t.x - p.x);
            const defAngle = Math.atan2(d.y - p.y, d.x - p.x);
            return Math.abs(passAngle - defAngle) < 0.3 && 
              Math.sqrt((d.x - p.x) ** 2 + (d.y - p.y) ** 2) < dist;
          });
          const score = blocked ? -100 : forwardBonus * 2 + (100 - dist) * 0.5;
          return score > (best?.score || -Infinity) ? { player: t, score } : best;
        }, null as { player: GameObject; score: number } | null);

        if (bestPass && bestPass.score > 20 && Math.random() < 0.03) {
          // One-two pass
          const angle = Math.atan2(bestPass.player.y - p.y, bestPass.player.x - p.x);
          physics.kick({ type: "pass", power: 0.5 + Math.random() * 0.3, targetAngle: angle });
          sounds.pass();
          return;
        }
      }

      // Shooting range check
      const distToGoal = Math.sqrt((goalX - p.x) ** 2 + (goalY - p.y) ** 2);
      if (distToGoal < 50 && Math.random() < 0.04) {
        const angle = Math.atan2(goalY - p.y + (Math.random() - 0.5) * 20, goalX - p.x);
        physics.kick({ type: "shoot", power: 0.8 + Math.random() * 0.2, targetAngle: angle, spin: (Math.random() - 0.5) * 0.5 });
        sounds.kick();
        return;
      }

      // Dribble towards goal, avoiding defenders
      tx = goalX;
      ty = goalY;
      if (nearbyDefenders.length > 0) {
        const closest = nearbyDefenders[0];
        // Move away from closest defender
        ty = closest.y > p.y ? p.y - 20 : p.y + 20;
      }
      shouldSprint = distToGoal < 60;
      
    } else if (p.targetX !== undefined) {
      // Chasing ball
      tx = ball.x;
      ty = ball.y;
      shouldSprint = distToBall < 40;
      
      // DEFENSIVE LOGIC
      if (p.team !== physics.getBallOwner()?.charAt(0)) {
        // Opponent has ball
        const ballOwnerId = physics.getBallOwner();
        const ballOwner = allPlayers.find(pl => pl.id === ballOwnerId);

        if (ballOwner) {
            // Intercept path
            const goalX = p.team === "home" ? 0 : FIELD_WIDTH;
            // Lead the interception point slightly
            tx = ball.x + (goalX - ball.x) * 0.2 + ball.vx * 0.5; 
            ty = ball.y + ball.vy * 0.5;

            // Attempt Tackle if close
            if (ai.tackleCooldown === 0 && distToBall < 12) {
                // Standing Tackle
                if (distToBall < 6) {
                    if (physics.standingTackle(p.id)) {
                        ai.tackleCooldown = 60; // 1s cooldown
                        sounds.kick(); // sound for successful tackle bump
                    }
                } 
                // Slide Tackle (Only if behind or desperate)
                else if (Math.random() < 0.05) { // Low probability per frame to avoid spam
                    const angle = Math.atan2(ball.y - p.y, ball.x - p.x);
                    const result = physics.slideTackle(p.id, angle);
                    if (result.success || result.foul) {
                        ai.tackleCooldown = 120; // 2s cooldown
                        if (result.foul) {
                            setUiState(prev => ({ ...prev, eventText: "FOUL!" }));
                            setTimeout(() => setUiState(prev => ({ ...prev, eventText: "" })), 1500);
                        } else {
                            sounds.kick();
                        }
                    }
                }
            }
        }
      }
    } else {
      // Off-ball positioning with formation awareness
      const ballZone = ball.x / FIELD_WIDTH;
      const isAttacking = (p.team === "home" && ballZone > 0.5) || (p.team === "away" && ballZone < 0.5);
      
      // Base position from formation
      const formationShift = isAttacking ? 0.15 : -0.1;
      
      if (p.team === "home") {
        if (p.role === "def") {
          tx = 20 + ballZone * 35 + formationShift * FIELD_WIDTH;
          ty = p.id.includes("1") ? FIELD_HEIGHT * 0.25 : FIELD_HEIGHT * 0.75;
        } else if (p.role === "mid") {
          tx = 50 + ballZone * 50 + formationShift * FIELD_WIDTH;
          ty = p.id.includes("1") ? FIELD_HEIGHT * 0.3 : FIELD_HEIGHT * 0.7;
          // Off-ball run
          if (isAttacking && Math.random() < 0.01) {
            tx += 30;
          }
        } else {
          tx = 90 + ballZone * 60 + formationShift * FIELD_WIDTH;
          ty = p.id.includes("1") ? FIELD_HEIGHT * 0.2 : FIELD_HEIGHT * 0.8;
          // Striker runs
          if (isAttacking) {
            ty += (ball.y - ty) * 0.4;
          }
        }
      } else {
        if (p.role === "def") {
          tx = FIELD_WIDTH - (20 + (1 - ballZone) * 35 + formationShift * FIELD_WIDTH);
          ty = p.id.includes("1") ? FIELD_HEIGHT * 0.25 : FIELD_HEIGHT * 0.75;
        } else if (p.role === "mid") {
          tx = FIELD_WIDTH - (50 + (1 - ballZone) * 50 + formationShift * FIELD_WIDTH);
          ty = p.id.includes("1") ? FIELD_HEIGHT * 0.3 : FIELD_HEIGHT * 0.7;
        } else {
          tx = FIELD_WIDTH - (90 + (1 - ballZone) * 60 + formationShift * FIELD_WIDTH);
          ty = p.id.includes("1") ? FIELD_HEIGHT * 0.2 : FIELD_HEIGHT * 0.8;
        }
      }
      
      // Follow ball Y slightly
      ty += (ball.y - ty) * 0.15;
    }

    // Clamp positions
    tx = Math.max(5, Math.min(FIELD_WIDTH - 5, tx));
    ty = Math.max(5, Math.min(FIELD_HEIGHT - 5, ty));

    const angle = Math.atan2(ty - p.y, tx - p.x);
    const dist = Math.sqrt((tx - p.x) ** 2 + (ty - p.y) ** 2);
    const baseSpeed = PLAYER_SPEED * AI_SPEED_FACTOR;
    const speedMultiplier = p.speed ? (0.7 + (p.speed / 100) * 0.5) : 1;
    const speed = dist > 2 ? baseSpeed * speedMultiplier : 0;

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    physics.movePlayer(p.id, vx, vy, shouldSprint, hasBall);
    
    // Dribble if has ball
    if (hasBall) {
      physics.dribbleBall(p.id, vx, vy);
    }
  };

  const gameLoop = () => {
    const state = gameState.current;
    const physics = physicsRef.current;
    requestRef.current = requestAnimationFrame(gameLoop);

    if (!state.isPlaying || !physics) {
      const scale = scaleRef.current;
      state.players.forEach((p) => {
        const el = playerDivsRef.current[p.id];
        if (el) {
          el.style.transform = `translate(${p.x * scale}px, ${p.y * scale}px)`;
          el.style.zIndex = Math.floor(p.y).toString();
        }
      });
      if (ballDivRef.current) {
        ballDivRef.current.style.transform = `translate(${state.ball.x * scale}px, ${state.ball.y * scale}px)`;
      }
      return;
    }

    // 1. Inputs
    if (activeKeys.current.size > 0) {
      let kx = 0, ky = 0;
      if (activeKeys.current.has("KeyW") || activeKeys.current.has("ArrowUp")) ky -= 1;
      if (activeKeys.current.has("KeyS") || activeKeys.current.has("ArrowDown")) ky += 1;
      if (activeKeys.current.has("KeyA") || activeKeys.current.has("ArrowLeft")) kx -= 1;
      if (activeKeys.current.has("KeyD") || activeKeys.current.has("ArrowRight")) kx += 1;
      if (kx !== 0 || ky !== 0) {
        const mag = Math.sqrt(kx * kx + ky * ky);
        joystickRef.current = { x: kx / mag, y: ky / mag };
      }
    }

    // Update kick charge UI
    if (kickChargeRef.current.charging) {
      const chargeTime = Math.min(Date.now() - kickChargeRef.current.startTime, 1000);
      const power = chargeTime / 1000;
      setUiState(prev => prev.kickPower !== power ? { ...prev, kickPower: power } : prev);
    }

    // Update tackle cooldown
    if (tackleRef.current.cooldown > 0) {
      tackleRef.current.cooldown--;
      if (tackleRef.current.cooldown === 0) tackleRef.current.sliding = false;
    }

    // 2. Step physics
    physics.step(1 / 60);

    // Sync ball from physics
    const ballState = physics.getBallState();
    state.ball.x = ballState.x;
    state.ball.y = ballState.y;
    state.ball.vx = ballState.vx;
    state.ball.vy = ballState.vy;

    // 3. Time management
    state.timeLeft -= 1 / 60;
    if (state.timeLeft <= 0) {
      handleMatchEnd();
      return;
    }

    const currentTime = Math.max(0, Math.floor(state.timeLeft));
    if (currentTime !== uiRefs.current.timeLeft) {
      uiRefs.current.timeLeft = currentTime;
      setUiState((prev) => ({ ...prev, timeLeft: currentTime }));
    }

    // Get ball owner
    const ballOwner = physics.getBallOwner();

    // Logic to find closest players for each team
    let closestHomePlayer: GameObject | null = null;
    let closestAwayPlayer: GameObject | null = null;
    let minHomeDist = Infinity;
    let minAwayDist = Infinity;

    state.players.forEach((p) => {
      let d = Math.sqrt((p.x - state.ball.x) ** 2 + (p.y - state.ball.y) ** 2);
      if (p.isUser) d *= 0.85;

      p.hasBall = ballOwner === p.id;
      p.stamina = physics.getStamina(p.id);
      p.targetX = undefined;
      p.targetY = undefined;

      if (p.role !== "gk") {
        if (p.team === "home") {
          if (d < minHomeDist) {
            minHomeDist = d;
            closestHomePlayer = p;
          }
        } else {
          if (d < minAwayDist) {
            minAwayDist = d;
            closestAwayPlayer = p;
          }
        }
      }
    });

    // Update active players
    state.players.forEach((p) => {
      if (p.team === "home") {
        p.isUser = p === closestHomePlayer;
        if (p.isUser) {
          p.targetX = state.ball.x;
          p.targetY = state.ball.y;
          if (uiRefs.current.activePlayerId !== p.id) {
            uiRefs.current.activePlayerId = p.id;
            setUiState((prev) => ({ ...prev, activePlayerId: p.id }));
          }
        }
      } else {
        if (p === closestAwayPlayer) {
          p.targetX = state.ball.x;
          p.targetY = state.ball.y;
          if (uiRefs.current.activeOpponentId !== p.id) {
            uiRefs.current.activeOpponentId = p.id;
            setUiState((prev) => ({ ...prev, activeOpponentId: p.id }));
          }
        }
      }
    });

    // Player Movement via Physics
    state.players.forEach((p) => {
      const hasBall = ballOwner === p.id;
      
      if (p.isUser) {
        const speedMultiplier = p.speed ? (0.7 + (p.speed / 100) * 0.5) : 1;
        const playerSpeed = PLAYER_SPEED * speedMultiplier;
        const vx = joystickRef.current.x * playerSpeed;
        const vy = joystickRef.current.y * playerSpeed;
        
        physics.movePlayer(p.id, vx, vy, sprintRef.current, hasBall);
        
        // Dribble ball if we have it
        if (hasBall) {
          physics.dribbleBall(p.id, vx, vy);
        }
        
        // Update stamina UI
        const stamina = physics.getStamina(p.id);
        if (Math.abs(stamina - uiState.stamina) > 1) {
          setUiState(prev => ({ ...prev, stamina }));
        }
      } else {
        moveAI(p, state.ball, state.players, physics);
      }

      // Sync position from physics
      const physState = physics.getPlayerState(p.id);
      if (physState) {
        p.x = physState.x;
        p.y = physState.y;
        p.vx = physState.vx;
        p.vy = physState.vy;
      }

      // Track possession
      if (hasBall) {
        if (p.team === "home") possessionRef.current.home++;
        else possessionRef.current.away++;
      }
    });

    // Visual Updates
    const scale = scaleRef.current;
    state.players.forEach((p) => {
      const el = playerDivsRef.current[p.id];
      if (el) {
        el.style.transform = `translate(${p.x * scale}px, ${p.y * scale}px)`;
        el.style.zIndex = Math.floor(p.y).toString();
      }
    });

    if (ballDivRef.current) {
      ballDivRef.current.style.transform = `translate(${state.ball.x * scale}px, ${state.ball.y * scale}px)`;
      const speed = Math.sqrt(state.ball.vx ** 2 + state.ball.vy ** 2);
      ballDivRef.current.style.boxShadow = `0 ${speed * 2}px ${speed * 3}px rgba(0,0,0,0.3)`;
    }
  };

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);

    const handleKeyDown = (e: KeyboardEvent) => {
      activeKeys.current.add(e.code);
      
      // Kick controls - hold to charge
      if (e.code === "Space" && !kickChargeRef.current.charging) {
        startKickCharge("pass");
      }
      if (e.code === "Enter" && !kickChargeRef.current.charging) {
        startKickCharge("shoot");
      }
      // Through ball
      if (e.code === "KeyQ") {
        performThroughBall();
      }
      // Slide tackle
      if (e.code === "KeyE") {
        performSlideTackle();
      }
      if (e.code === "Escape") togglePause();
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") sprintRef.current = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.current.delete(e.code);
      if (activeKeys.current.size === 0) joystickRef.current = { x: 0, y: 0 };
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") sprintRef.current = false;
      
      // Release kick
      if (e.code === "Space" || e.code === "Enter") {
        releaseKick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Initialize physics engine
    const physics = new GamePhysics();
    physicsRef.current = physics;

    // Physics collision callbacks
    physics.onGoal = (team) => handleGoal(team);
    physics.onCollision = (type) => {
      if (type === "bounce") sounds.bounce();
    };
    physics.onOutOfBounds = (type, team, x, y) => handleOutOfBounds(type, team, x, y);

    // Init Players
    const homeTeam = [
      { id: "h_gk", role: "gk", ...squad[0] },
      { id: "h_def1", role: "def", ...squad[1] },
      { id: "h_def2", role: "def", ...squad[2] },
      { id: "h_mid1", role: "mid", ...squad[3] },
      { id: "h_mid2", role: "mid", ...squad[4] },
      { id: "h_att1", role: "att", ...squad[5], isUser: true },
      { id: "h_att2", role: "att", ...squad[6] },
    ].map((p) => ({
      ...p,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      type: "player",
      team: "home",
      color: selectedTeam?.primaryColor || p.color,
    })) as GameObject[];

    const awayTeam = [
      { id: "a_gk", role: "gk", speed: 55, shooting: 40, passing: 60, defending: 75 },
      { id: "a_def1", role: "def", speed: 62, shooting: 45, passing: 58, defending: 72 },
      { id: "a_def2", role: "def", speed: 60, shooting: 42, passing: 55, defending: 70 },
      { id: "a_mid1", role: "mid", speed: 70, shooting: 65, passing: 72, defending: 58 },
      { id: "a_mid2", role: "mid", speed: 72, shooting: 68, passing: 75, defending: 55 },
      { id: "a_att1", role: "att", speed: 78, shooting: 75, passing: 62, defending: 32 },
      { id: "a_att2", role: "att", speed: 80, shooting: 78, passing: 60, defending: 30 },
    ].map((p) => ({
      ...p,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      type: "player",
      team: "away",
      color: "#ef4444",
    })) as GameObject[];

    gameState.current.players = [...homeTeam, ...awayTeam];
    resetPositions(null);

    // Add players to physics world
    gameState.current.players.forEach((p) => {
      physics.addPlayer(p.id, p.x, p.y, p.team as "home" | "away");
    });

    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(requestRef.current);
      physics.destroy();
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [squad, selectedTeam, updateScale]);

  return (
    <div className="flex flex-col h-full bg-slate-950 relative select-none touch-none overflow-hidden font-arcade">
      {/* Scoreboard & Timer Overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-6 z-30 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border-2 border-white/10 shadow-2xl">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-white"
            style={{ backgroundColor: selectedTeam?.primaryColor || "#3b82f6" }}
          ></div>
          <span className="text-2xl font-black text-white">
            {uiState.homeScore}
          </span>
        </div>

        <div className="flex flex-col items-center min-w-[80px]">
          <div className="flex items-center gap-1 text-yellow-400">
            <Timer className="w-4 h-4" />
            <span className="text-xl font-bold tabular-nums">
              {Math.floor(uiState.timeLeft / 60)}:
              {(uiState.timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
          <div className="text-[8px] text-white/40 font-black uppercase tracking-widest mt-0.5">
            {matchDuration / 60}m Match
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-white">
            {uiState.awayScore}
          </span>
          <div className="w-8 h-8 rounded-full border-2 border-white bg-red-500"></div>
        </div>

        <button
          onClick={togglePause}
          className="ml-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20 group"
        >
          {uiState.isPaused ? (
            <Play className="w-5 h-5 text-white fill-white" />
          ) : (
            <Pause className="w-5 h-5 text-white fill-white" />
          )}
        </button>
      </div>

      {/* Main Pitch View */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center"
      >
        {/* Field */}
        <div
          style={{
            width: FIELD_WIDTH * scaleRef.current,
            height: FIELD_HEIGHT * scaleRef.current,
          }}
          className="relative bg-emerald-600 rounded-lg shadow-[0_0_100px_rgba(0,0,0,0.5)] border-4 border-white/20 overflow-hidden"
        >
          {/* Grass Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(90deg,transparent,transparent_50px,#000_50px,#000_100px)]"></div>
          <div className="absolute inset-0 opacity-5 bg-[repeating-linear-gradient(0deg,transparent,transparent_50px,#000_50px,#000_100px)]"></div>

          {/* Pitch Markings */}
          <div className="absolute inset-0 pointer-events-none border-2 border-white/20">
            {/* Center Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2"></div>
            {/* Center Circle */}
            <div className="absolute left-1/2 top-1/2 w-40 h-40 border-2 border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>

            {/* Penalty Arcs */}
            <div className="absolute left-20 top-1/2 -translate-y-1/2 w-20 h-28 border-2 border-white/10 rounded-full"></div>
            <div className="absolute right-20 top-1/2 -translate-y-1/2 w-20 h-28 border-2 border-white/10 rounded-full"></div>

            {/* Penalty Areas */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-32 h-[70%] border-r-2 border-y-2 border-white/20"></div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-[70%] border-l-2 border-y-2 border-white/20"></div>

            {/* Goal Boxes */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-[35%] border-r-2 border-y-2 border-white/20"></div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-[35%] border-l-2 border-y-2 border-white/20"></div>

            {/* Goals */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-4 h-[30%] bg-white/5 border-2 border-white/40 flex items-center justify-center">
              <div className="w-full h-full opacity-20 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:4px_4px]"></div>
            </div>
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-4 h-[30%] bg-white/5 border-2 border-white/40 flex items-center justify-center">
              <div className="w-full h-full opacity-20 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:4px_4px]"></div>
            </div>
          </div>

          {/* Game Objects Wrapper */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Players */}
            {gameState.current.players.map((p) => (
              <div
                key={p.id}
                ref={(el) => { playerDivsRef.current[p.id] = el; }}
                className="absolute -ml-5 -mt-12"
              >
                <PixelPlayer
                  id={p.id}
                  color={p.color || "#444"}
                  role={p.role}
                  isActive={p.id === uiState.activePlayerId}
                  isOpponent={p.id === uiState.activeOpponentId}
                />
              </div>
            ))}

            {/* Ball */}
            <div
              ref={ballDivRef}
              className="absolute w-7 h-7 -ml-3.5 -mt-3.5 bg-white rounded-full shadow-md z-40 flex items-center justify-center border-2 border-slate-400"
            >
              <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff,#ddd_60%,#999)] shadow-inner"></div>
            </div>
          </div>
        </div>

        {/* Event Text Overlay */}
        <AnimatePresence>
          {uiState.eventText && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1.5, opacity: 1, y: 0 }}
              exit={{ scale: 2, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <h1 className="text-8xl font-black text-yellow-400 drop-shadow-[0_8px_0_rgba(0,0,0,1)] italic tracking-tighter">
                {uiState.eventText}
              </h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pause Menu Overlay */}
      <AnimatePresence>
        {uiState.isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border-2 border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col gap-6 w-full max-w-sm relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 blur-[80px]"></div>
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 blur-[80px]"></div>

              <div className="text-center relative">
                <h2 className="text-4xl font-black text-white italic tracking-tighter mb-1">
                  GAME PAUSED
                </h2>
                <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold">
                  Match Interrupted
                </p>
              </div>

              {/* Controls Guide */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 relative">
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Zap className="w-3 h-3 text-blue-400" /> Controls Guide
                </p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-white/20 uppercase font-black">Movement</span>
                    <span className="text-[10px] text-white/80 font-bold">WASD / ARROWS</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-white/20 uppercase font-black">Pass (Hold)</span>
                    <span className="text-[10px] text-white/80 font-bold">SPACE</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-white/20 uppercase font-black">Shoot (Hold)</span>
                    <span className="text-[10px] text-white/80 font-bold">ENTER</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-white/20 uppercase font-black">Through Ball</span>
                    <span className="text-[10px] text-white/80 font-bold">Q</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-white/20 uppercase font-black">Slide Tackle</span>
                    <span className="text-[10px] text-white/80 font-bold">E</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-white/20 uppercase font-black">Sprint</span>
                    <span className="text-[10px] text-white/80 font-bold">SHIFT</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 relative">
                <button
                  onClick={togglePause}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black italic text-lg shadow-lg shadow-blue-900/40 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                >
                  <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
                  RESUME GAME
                </button>

                <button
                  onClick={handleRestart}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black italic text-lg border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                >
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  RESTART MATCH
                </button>

                <button
                  onClick={handleQuit}
                  className="w-full py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl font-black italic text-lg border border-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                >
                  <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  QUIT TO MENU
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Landscape Controls: Side Overlays */}
      <div className="absolute bottom-6 left-6 z-40 md:left-12">
        <div className="p-2 bg-black/30 backdrop-blur-sm rounded-full border border-white/10">
          <Joystick
            size={120}
            onMove={(vec) => {
              if (activeKeys.current.size === 0) joystickRef.current = vec;
            }}
          />
        </div>
      </div>

      {/* Power meter */}
      {uiState.kickPower > 0 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50">
          <div className="w-32 h-3 bg-black/50 rounded-full overflow-hidden border border-white/20">
            <div 
              className={`h-full transition-all ${uiState.kickPower > 0.7 ? 'bg-red-500' : uiState.kickPower > 0.4 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${uiState.kickPower * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Stamina bar */}
      <div className="absolute top-20 left-4 z-30">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-yellow-400" />
          <div className="w-16 h-2 bg-black/50 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${uiState.stamina < 30 ? 'bg-red-500' : 'bg-yellow-400'}`}
              style={{ width: `${uiState.stamina}%` }}
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-40 md:right-12 flex gap-3">
        {/* Tackle button */}
        <div className="flex flex-col items-center">
          <button
            className="w-14 h-14 rounded-full bg-orange-600 border-b-6 border-orange-900 shadow-xl active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center"
            onPointerDown={performSlideTackle}
          >
            <Target className="w-5 h-5 text-white" />
          </button>
          <span className="text-[8px] text-white/50 mt-1">TACKLE</span>
        </div>
        
        {/* Sprint button */}
        <div className="flex flex-col items-center">
          <button
            className={`w-14 h-14 rounded-full border-b-6 shadow-xl active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center ${sprintRef.current ? 'bg-green-400 border-green-700' : 'bg-green-600 border-green-900'}`}
            onPointerDown={() => sprintRef.current = true}
            onPointerUp={() => sprintRef.current = false}
            onPointerLeave={() => sprintRef.current = false}
          >
            <Zap className="w-5 h-5 text-white fill-white" />
          </button>
          <span className="text-[8px] text-white/50 mt-1">SPRINT</span>
        </div>
        
        {/* Pass button - hold to charge */}
        <div className="flex flex-col items-center">
          <button
            className="w-16 h-16 rounded-full bg-blue-600 border-b-6 border-blue-900 shadow-xl active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center"
            onPointerDown={() => startKickCharge("pass")}
            onPointerUp={releaseKick}
            onPointerLeave={releaseKick}
          >
            <Zap className="w-6 h-6 text-white" />
          </button>
          <span className="text-[8px] text-white/50 mt-1">PASS</span>
        </div>
        
        {/* Shoot button - hold to charge */}
        <div className="flex flex-col items-center">
          <button
            className="w-20 h-20 rounded-full bg-red-600 border-b-8 border-red-900 shadow-2xl active:translate-y-2 active:border-b-0 transition-all flex items-center justify-center"
            onPointerDown={() => startKickCharge("shoot")}
            onPointerUp={releaseKick}
            onPointerLeave={releaseKick}
          >
            <Trophy className="w-8 h-8 text-white" />
          </button>
          <span className="text-[8px] text-white/50 mt-1">SHOOT</span>
        </div>
      </div>

      {/* Stats Bar (Bottom) */}
      <div className="h-10 bg-black/40 border-t border-white/5 flex items-center justify-center gap-8 text-[10px] text-white/40 uppercase tracking-[0.2em]">
        <div className="flex items-center gap-2">
          <Users className="w-3 h-3" /> 7 vs 7 Arcade
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3" /> {selectedTeam?.name}
        </div>
        <div className="hidden sm:block">
          Hold SPACE/ENTER to charge • Q=Through Ball • E=Tackle • Shift=Sprint
        </div>
      </div>
    </div>
  );
};
