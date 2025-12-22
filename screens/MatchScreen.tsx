import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGame } from "../context/GameContext";
import { ScreenName } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Joystick } from "../components/Joystick";
import { PixelPlayer } from "../components/PixelPlayer";
import { sounds } from "../utils/sounds";
import { GamePhysics } from "../utils/physics";
import {
  Timer,
  Trophy,
  Users,
  Zap,
  Pause,
  Play,
  RefreshCw,
  LogOut,
} from "lucide-react";

// --- Game Engine Constants ---
const FIELD_WIDTH = 200;
const FIELD_HEIGHT = 120;
const PLAYER_RADIUS = 3.5;
const BALL_RADIUS = 2;
const PLAYER_SPEED = 5; // Physics velocity
const KICK_FORCE = 0.5; // Physics impulse
const AI_SPEED_FACTOR = 0.9;

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

  const handleMatchEnd = () => {
    gameState.current.isPlaying = false;
    const { home, away } = gameState.current.score;
    const outcome = home > away ? "win" : home < away ? "loss" : "draw";
    const totalPossession = possessionRef.current.home + possessionRef.current.away;
    const possession = totalPossession > 0 ? Math.round((possessionRef.current.home / totalPossession) * 100) : 50;

    sounds.whistle();
    setUiState((prev) => ({ ...prev, eventText: "FULL TIME!" }));

    setTimeout(() => {
      finishMatch({
        homeScore: home,
        awayScore: away,
        possession,
        xpEarned: outcome === "win" ? 100 : outcome === "draw" ? 50 : 20,
      });
      setScreen(ScreenName.MATCH_RESULT);
    }, 2000);
  };

  const handleKick = (force: number) => {
    const state = gameState.current;
    const physics = physicsRef.current;
    if (!state.isPlaying || !physics) return;
    
    const user = state.players.find((p) => p.isUser);
    if (!user) return;

    const ballState = physics.getBallState();
    const dx = ballState.x - user.x;
    const dy = ballState.y - user.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < PLAYER_RADIUS + BALL_RADIUS + 6) {
      let angle = Math.atan2(dy, dx);
      const joyMag = Math.sqrt(joystickRef.current.x ** 2 + joystickRef.current.y ** 2);
      if (joyMag > 0.1) {
        angle = Math.atan2(joystickRef.current.y, joystickRef.current.x);
      }

      const shotStat = force > KICK_FORCE * 0.7 ? (user.shooting || 70) : (user.passing || 70);
      const powerMultiplier = 0.8 + (shotStat / 100) * 0.4;
      const variance = (1 - shotStat / 100) * 0.1;
      const finalAngle = angle + (Math.random() - 0.5) * variance;

      physics.applyKick(force * powerMultiplier, finalAngle);
      force > KICK_FORCE * 0.7 ? sounds.kick() : sounds.pass();
    }
  };

  const moveAI = (
    p: GameObject,
    ball: GameObject,
    allPlayers: GameObject[],
    physics: GamePhysics,
  ) => {
    const distToBall = Math.sqrt((ball.x - p.x) ** 2 + (ball.y - p.y) ** 2);
    let tx = p.x;
    let ty = p.y;

    if (p.role === "gk") {
      // Better GK positioning: Stay on line but track ball
      tx = p.team === "home" ? 8 : FIELD_WIDTH - 8;
      // Follow ball Y but stay within goal posts
      const targetY = Math.max(
        FIELD_HEIGHT * 0.38,
        Math.min(FIELD_HEIGHT * 0.62, ball.y),
      );
      ty = targetY;

      // If ball is very close, charge it
      if (distToBall < 12) {
        tx = ball.x;
        ty = ball.y;
      }
    } else {
      // Determine if this player is the one currently chasing the ball
      const isActiveChaser = p.targetX === ball.x && p.targetY === ball.y;

      if (isActiveChaser) {
        if (p.team === "away" && p.hasBall) {
          // AI Attacking with ball: Head towards goal but avoid nearby defenders
          tx = 0;
          ty = FIELD_HEIGHT / 2;

          const nearbyDefender = allPlayers.find(
            (other) =>
              other.team === "home" &&
              Math.sqrt((other.x - p.x) ** 2 + (other.y - p.y) ** 2) < 20,
          );
          if (nearbyDefender) {
            ty = nearbyDefender.y > p.y ? p.y - 15 : p.y + 15;
          }

          if (p.x < 45) {
            ty =
              ball.y > FIELD_HEIGHT / 2
                ? FIELD_HEIGHT * 0.38
                : FIELD_HEIGHT * 0.62;
          }
        } else {
          // Chasing the ball
          tx = ball.x;
          ty = ball.y;
        }
      } else {
        // Strategic positioning based on ball location
        const ballZone = ball.x / FIELD_WIDTH; // 0 to 1

        if (p.team === "home") {
          const userPlayer = allPlayers.find((u) => u.isUser);
          const userHasBall = userPlayer?.hasBall;

          // Home team positioning
          if (p.role === "def") {
            tx = 25 + ballZone * 40;
            ty = p.id.includes("1") ? FIELD_HEIGHT * 0.3 : FIELD_HEIGHT * 0.7;
          } else if (p.role === "mid") {
            tx = 60 + ballZone * 60;
            if (userHasBall && p.x < userPlayer.x + 40) tx += 20;
            ty = p.id.includes("1") ? FIELD_HEIGHT * 0.25 : FIELD_HEIGHT * 0.75;
          } else {
            tx = 100 + ballZone * 70;
            if (userHasBall) tx += 30;
            ty = p.id.includes("1") ? FIELD_HEIGHT * 0.2 : FIELD_HEIGHT * 0.8;
          }
        } else {
          // Away team positioning
          if (p.role === "def") {
            tx = FIELD_WIDTH - (25 + (1 - ballZone) * 40);
            ty = p.id.includes("1") ? FIELD_HEIGHT * 0.3 : FIELD_HEIGHT * 0.7;
          } else if (p.role === "mid") {
            tx = FIELD_WIDTH - (60 + (1 - ballZone) * 60);
            ty = p.id.includes("1") ? FIELD_HEIGHT * 0.25 : FIELD_HEIGHT * 0.75;
          } else {
            tx = FIELD_WIDTH - (100 + (1 - ballZone) * 70);
            ty = p.id.includes("1") ? FIELD_HEIGHT * 0.2 : FIELD_HEIGHT * 0.8;
          }
        }
        // Slightly follow ball Y
        ty += (ball.y - ty) * 0.2;
      }
    }

    const angle = Math.atan2(ty - p.y, tx - p.x);
    const dist = Math.sqrt((tx - p.x) ** 2 + (ty - p.y) ** 2);
    const baseSpeed = PLAYER_SPEED * AI_SPEED_FACTOR;
    const speedMultiplier = p.speed ? (0.7 + (p.speed / 100) * 0.5) : 1;
    const speed = dist > 2 ? baseSpeed * speedMultiplier : 0;

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    // Move via physics
    physics.movePlayer(p.id, vx, vy);
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
      setUiState((prev) => ({
        ...prev,
        timeLeft: currentTime,
      }));
    }

    // Anti-stuck Corner Logic
    const isInCorner =
      (state.ball.x < 15 || state.ball.x > FIELD_WIDTH - 15) &&
      (state.ball.y < 15 || state.ball.y > FIELD_HEIGHT - 15);
    const isStationary = Math.abs(state.ball.vx) < 1 && Math.abs(state.ball.vy) < 1;
    if (isInCorner && isStationary && state.isPlaying) {
      const angle = Math.atan2(FIELD_HEIGHT / 2 - state.ball.y, FIELD_WIDTH / 2 - state.ball.x);
      physics.applyKick(KICK_FORCE * 0.3, angle);
    }

    // Logic to find closest players for each team
    let closestHomePlayer: GameObject | null = null;
    let closestAwayPlayer: GameObject | null = null;
    let minHomeDist = Infinity;
    let minAwayDist = Infinity;

    state.players.forEach((p) => {
      let d = Math.sqrt((p.x - state.ball.x) ** 2 + (p.y - state.ball.y) ** 2);

      // Bias towards currently controlled player to avoid flickering
      if (p.isUser) d *= 0.85;

      p.hasBall = d < PLAYER_RADIUS + BALL_RADIUS + 1;

      // Clear targets
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

          // AI Away Team Decision Logic
          if (p.hasBall && physics) {
            const inShootingRange = p.x < 75;
            const teammate = state.players.find(
              (other) =>
                other.team === "away" &&
                other.id !== p.id &&
                other.x < p.x - 20 &&
                other.role !== "gk",
            );

            if (inShootingRange && Math.random() < 0.05) {
              const targetY = FIELD_HEIGHT * 0.4 + Math.random() * FIELD_HEIGHT * 0.2;
              const angle = Math.atan2(targetY - p.y, -p.x);
              physics.applyKick(KICK_FORCE * 1.5, angle);
              sounds.kick();
            } else if (teammate && Math.random() < 0.02) {
              const angle = Math.atan2(teammate.y - p.y, teammate.x - p.x);
              physics.applyKick(KICK_FORCE * 0.8, angle);
              sounds.pass();
            }
          }
        }
      }
    });

    // Player Movement via Physics
    state.players.forEach((p) => {
      if (p.isUser) {
        const speedMultiplier = p.speed ? (0.7 + (p.speed / 100) * 0.5) : 1;
        const sprintBoost = sprintRef.current ? 1.4 : 1;
        const playerSpeed = PLAYER_SPEED * speedMultiplier * sprintBoost;
        const vx = joystickRef.current.x * playerSpeed;
        const vy = joystickRef.current.y * playerSpeed;
        physics.movePlayer(p.id, vx, vy);
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
      if (p.hasBall) {
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
      if (e.code === "Space") handleKick(KICK_FORCE * 0.6);
      if (e.code === "Enter") handleKick(KICK_FORCE);
      if (e.code === "Escape") togglePause();
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") sprintRef.current = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.current.delete(e.code);
      if (activeKeys.current.size === 0) joystickRef.current = { x: 0, y: 0 };
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") sprintRef.current = false;
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
      color: selectedTeam?.color || p.color,
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
            style={{ backgroundColor: selectedTeam?.color || "#3b82f6" }}
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
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-white/20 uppercase font-black tracking-tighter">
                      Movement
                    </span>
                    <span className="text-[10px] text-white/80 font-bold">
                      WASD / ARROWS
                    </span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-white/20 uppercase font-black tracking-tighter">
                      Short Pass
                    </span>
                    <span className="text-[10px] text-white/80 font-bold">
                      SPACE / BLUE
                    </span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-white/20 uppercase font-black tracking-tighter">
                      Power Shot
                    </span>
                    <span className="text-[10px] text-white/80 font-bold">
                      ENTER / RED
                    </span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-white/20 uppercase font-black tracking-tighter">
                      Main Menu
                    </span>
                    <span className="text-[10px] text-white/80 font-bold">
                      ESCAPE KEY
                    </span>
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

      <div className="absolute bottom-6 right-6 z-40 md:right-12 flex gap-4">
        <div className="flex flex-col items-center gap-2">
          <button
            className="w-16 h-16 rounded-full bg-green-600 border-b-8 border-green-900 shadow-2xl active:translate-y-2 active:border-b-0 transition-all flex items-center justify-center group"
            onPointerDown={() => sprintRef.current = true}
            onPointerUp={() => sprintRef.current = false}
            onPointerLeave={() => sprintRef.current = false}
          >
            <Zap className="w-6 h-6 text-white group-active:scale-90 fill-white" />
            <div className="absolute -top-10 text-xs text-white/60">SPRINT</div>
          </button>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            className="w-20 h-20 rounded-full bg-blue-600 border-b-8 border-blue-900 shadow-2xl active:translate-y-2 active:border-b-0 transition-all flex items-center justify-center group"
            onPointerDown={() => handleKick(KICK_FORCE * 0.6)}
          >
            <Zap className="w-8 h-8 text-white group-active:scale-90" />
            <div className="absolute -top-10 text-xs text-white/60">PASS</div>
          </button>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            className="w-24 h-24 rounded-full bg-red-600 border-b-8 border-red-900 shadow-2xl active:translate-y-2 active:border-b-0 transition-all flex items-center justify-center group"
            onPointerDown={() => handleKick(KICK_FORCE)}
          >
            <Trophy className="w-10 h-10 text-white group-active:scale-90" />
            <div className="absolute -top-10 text-xs text-white/60 font-black">
              SHOOT
            </div>
          </button>
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
          WASD/Arrows • Space=Pass • Enter=Shoot • Shift=Sprint
        </div>
      </div>
    </div>
  );
};
