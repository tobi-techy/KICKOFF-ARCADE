import * as planck from "planck";

const SCALE = 10;
const FIELD_WIDTH = 200;
const FIELD_HEIGHT = 120;
const PLAYER_RADIUS = 3.5;
const BALL_RADIUS = 2;

export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface KickOptions {
  type: "pass" | "shoot" | "through" | "tackle";
  power: number; // 0-1 charge amount
  targetAngle: number;
  spin?: number; // -1 to 1 for curve
}

export class GamePhysics {
  world: planck.World;
  ball: planck.Body;
  players: Map<string, planck.Body> = new Map();
  playerStamina: Map<string, number> = new Map();
  ballOwner: string | null = null;
  lastBallOwner: string | null = null;

  onGoal?: (team: "home" | "away") => void;
  onCollision?: (type: "kick" | "bounce" | "tackle") => void;
  onFoul?: (foulingPlayer: string) => void;
  onOutOfBounds?: (type: "throw-in" | "corner" | "goal-kick", team: "home" | "away", x: number, y: number) => void;

  constructor() {
    this.world = new planck.World({ gravity: planck.Vec2(0, 0) });
    this.createWalls();
    this.createGoals();
    this.ball = this.createBall();
  }

  private createBall(): planck.Body {
    const ball = this.world.createDynamicBody({
      position: planck.Vec2(FIELD_WIDTH / 2 / SCALE, FIELD_HEIGHT / 2 / SCALE),
      bullet: true,
      linearDamping: 1.2, // Reduced for better roll
      angularDamping: 0.8,
    });
    ball.createFixture({
      shape: new planck.Circle(BALL_RADIUS / SCALE),
      density: 0.4,
      friction: 0.4,
      restitution: 0.65,
      userData: { type: "ball" },
    });
    return ball;
  }

  private createWalls(): void {
    const goalWidth = FIELD_HEIGHT * 0.3;
    const goalTop = (FIELD_HEIGHT - goalWidth) / 2;
    const goalBottom = goalTop + goalWidth;

    this.createWall(FIELD_WIDTH / 2, 1, FIELD_WIDTH, 2);
    this.createWall(FIELD_WIDTH / 2, FIELD_HEIGHT - 1, FIELD_WIDTH, 2);
    this.createWall(1, goalTop / 2, 2, goalTop);
    this.createWall(1, FIELD_HEIGHT - (FIELD_HEIGHT - goalBottom) / 2, 2, FIELD_HEIGHT - goalBottom);
    this.createWall(FIELD_WIDTH - 1, goalTop / 2, 2, goalTop);
    this.createWall(FIELD_WIDTH - 1, FIELD_HEIGHT - (FIELD_HEIGHT - goalBottom) / 2, 2, FIELD_HEIGHT - goalBottom);

    // Goal posts
    [0, FIELD_WIDTH].forEach(x => {
      [goalTop, goalBottom].forEach(y => {
        const post = this.world.createBody({ position: planck.Vec2(x / SCALE, y / SCALE) });
        post.createFixture({ shape: new planck.Circle(1.2 / SCALE), restitution: 0.9, userData: { type: "post" } });
      });
    });
  }

  private createWall(x: number, y: number, w: number, h: number): void {
    const wall = this.world.createBody({ position: planck.Vec2(x / SCALE, y / SCALE) });
    wall.createFixture({
      shape: new planck.Box(w / 2 / SCALE, h / 2 / SCALE),
      friction: 0.5,
      restitution: 0.4,
      userData: { type: "wall" },
    });
  }

  private createGoals(): void {
    const goalWidth = FIELD_HEIGHT * 0.3;
    const goalY = FIELD_HEIGHT / 2;

    const homeGoal = this.world.createBody({ position: planck.Vec2(-3 / SCALE, goalY / SCALE) });
    homeGoal.createFixture({
      shape: new planck.Box(3 / SCALE, goalWidth / 2 / SCALE),
      isSensor: true,
      userData: { type: "goal", team: "away" },
    });

    const awayGoal = this.world.createBody({ position: planck.Vec2((FIELD_WIDTH + 3) / SCALE, goalY / SCALE) });
    awayGoal.createFixture({
      shape: new planck.Box(3 / SCALE, goalWidth / 2 / SCALE),
      isSensor: true,
      userData: { type: "goal", team: "home" },
    });

    this.world.on("begin-contact", (contact) => {
      const a = contact.getFixtureA().getUserData() as any;
      const b = contact.getFixtureB().getUserData() as any;

      if ((a?.type === "goal" && b?.type === "ball") || (b?.type === "goal" && a?.type === "ball")) {
        this.onGoal?.(a?.team || b?.team);
      }
      if ((a?.type === "player" && b?.type === "ball") || (b?.type === "player" && a?.type === "ball")) {
        this.onCollision?.("kick");
      }
      if ((a?.type === "wall" || a?.type === "post") && b?.type === "ball" ||
          (b?.type === "wall" || b?.type === "post") && a?.type === "ball") {
        this.onCollision?.("bounce");
      }
      // Player-player collision for tackling
      if (a?.type === "player" && b?.type === "player") {
        this.onCollision?.("tackle");
      }
    });
  }

  addPlayer(id: string, x: number, y: number, team: "home" | "away"): void {
    const body = this.world.createDynamicBody({
      position: planck.Vec2(x / SCALE, y / SCALE),
      linearDamping: 3,
      fixedRotation: true,
    });
    body.createFixture({
      shape: new planck.Circle(PLAYER_RADIUS / SCALE),
      density: 2.5,
      friction: 0.4,
      restitution: 0.15,
      userData: { type: "player", id, team },
    });
    this.players.set(id, body);
    this.playerStamina.set(id, 100);
  }

  // Smooth acceleration-based movement
  movePlayer(id: string, targetVx: number, targetVy: number, isSprinting: boolean, hasBall: boolean): void {
    const body = this.players.get(id);
    if (!body) return;

    const currentVel = body.getLinearVelocity();
    let stamina = this.playerStamina.get(id) || 100;

    // Stamina management
    if (isSprinting && (targetVx !== 0 || targetVy !== 0)) {
      stamina = Math.max(0, stamina - 0.3);
    } else {
      stamina = Math.min(100, stamina + 0.15);
    }
    this.playerStamina.set(id, stamina);

    // Speed modifiers
    let speedMod = 1;
    if (hasBall) speedMod *= 0.85; // Slower with ball
    if (isSprinting && stamina > 10) speedMod *= 1.4;
    if (stamina < 20) speedMod *= 0.7; // Tired

    const finalVx = targetVx * speedMod;
    const finalVy = targetVy * speedMod;

    // Acceleration (smooth transition)
    const accel = 0.15;
    const newVx = currentVel.x + (finalVx - currentVel.x) * accel;
    const newVy = currentVel.y + (finalVy - currentVel.y) * accel;

    body.setLinearVelocity(planck.Vec2(newVx, newVy));
  }

  // Ball dribbling - call every frame when player has ball
  dribbleBall(playerId: string, playerVx: number, playerVy: number): void {
    const playerBody = this.players.get(playerId);
    if (!playerBody) return;

    const playerPos = playerBody.getPosition();
    const speed = Math.sqrt(playerVx * playerVx + playerVy * playerVy);

    if (speed > 0.1) {
      // Ball slightly ahead of player in movement direction
      const angle = Math.atan2(playerVy, playerVx);
      const aheadDist = (PLAYER_RADIUS + BALL_RADIUS + 1) / SCALE;

      // Add wobble for realism
      const wobble = (Math.random() - 0.5) * 0.02;
      const rawTargetX = playerPos.x + Math.cos(angle + wobble) * aheadDist;
      const rawTargetY = playerPos.y + Math.sin(angle + wobble) * aheadDist;

      // Clamp target within field boundaries to prevent sticking in corners
      // Add margin to keep ball slightly off walls (4 units / SCALE)
      const margin = 4 / SCALE;
      const targetX = Math.max(margin, Math.min((FIELD_WIDTH / SCALE) - margin, rawTargetX));
      const targetY = Math.max(margin, Math.min((FIELD_HEIGHT / SCALE) - margin, rawTargetY));

      // Move ball towards target position (sticky dribble)
      const ballPos = this.ball.getPosition();
      const dx = targetX - ballPos.x;
      const dy = targetY - ballPos.y;

      // Ball follows at 90% of player speed
      this.ball.setLinearVelocity(planck.Vec2(
        playerVx * 0.9 + dx * 8,
        playerVy * 0.9 + dy * 8
      ));
    } else {
      // Standing still - ball stays close
      const ballVel = this.ball.getLinearVelocity();
      this.ball.setLinearVelocity(planck.Vec2(ballVel.x * 0.9, ballVel.y * 0.9));
    }

    this.ballOwner = playerId;
    this.lastBallOwner = playerId;
  }

  // Advanced kick with type, power, and spin
  kick(options: KickOptions): void {
    const { type, power, targetAngle, spin = 0 } = options;

    let force: number;
    let accuracy: number;
    let curve: number;

    switch (type) {
      case "pass":
        force = 0.25 + power * 0.2; // 0.25-0.45
        accuracy = 0.95;
        curve = spin * 0.1;
        break;
      case "shoot":
        force = 0.4 + power * 0.5; // 0.4-0.9
        accuracy = 0.75 + power * 0.1;
        curve = spin * 0.3;
        break;
      case "through":
        force = 0.35 + power * 0.25; // 0.35-0.6
        accuracy = 0.85;
        curve = spin * 0.15;
        break;
      case "tackle":
        force = 0.15 + power * 0.15;
        accuracy = 0.6;
        curve = 0;
        break;
      default:
        force = 0.3;
        accuracy = 0.8;
        curve = 0;
    }

    // Apply accuracy variance
    const variance = (1 - accuracy) * (Math.random() - 0.5) * 0.5;
    const finalAngle = targetAngle + variance;

    // Apply impulse
    const impulse = planck.Vec2(
      Math.cos(finalAngle) * force,
      Math.sin(finalAngle) * force
    );
    this.ball.applyLinearImpulse(impulse, this.ball.getWorldCenter(), true);

    // Apply spin (angular velocity for curve)
    if (curve !== 0) {
      this.ball.setAngularVelocity(curve * 20);
    }

    this.ballOwner = null;
  }

  // Slide tackle - risky but effective
  slideTackle(playerId: string, targetAngle: number): { success: boolean; foul: boolean } {
    const body = this.players.get(playerId);
    if (!body) return { success: false, foul: false };

    const playerData = body.getFixtureList()?.getUserData() as any;
    const playerTeam = playerData?.team;

    // Lunge forward
    const lungeForce = planck.Vec2(Math.cos(targetAngle) * 0.8, Math.sin(targetAngle) * 0.8);
    body.applyLinearImpulse(lungeForce, body.getWorldCenter(), true);

    // Check if we hit the ball or a player
    const ballPos = this.ball.getPosition();
    const playerPos = body.getPosition();
    const distToBall = Math.sqrt(
      Math.pow(ballPos.x - playerPos.x, 2) + Math.pow(ballPos.y - playerPos.y, 2)
    ) * SCALE;

    // Check for foul (tackling from behind)
    if (this.ballOwner && this.ballOwner !== playerId) {
      const ownerBody = this.players.get(this.ballOwner);
      if (ownerBody) {
        const ownerData = ownerBody.getFixtureList()?.getUserData() as any;
        if (ownerData?.team !== playerTeam) {
          const ownerPos = ownerBody.getPosition();
          const ownerVel = ownerBody.getLinearVelocity();
          const ownerAngle = Math.atan2(ownerVel.y, ownerVel.x);
          const tackleAngle = Math.atan2(playerPos.y - ownerPos.y, playerPos.x - ownerPos.x);
          const angleDiff = Math.abs(ownerAngle - tackleAngle);

          // Foul if tackling from behind (angle > 120 degrees)
          if (angleDiff > 2.1 && Math.random() < 0.6) {
            this.onFoul?.(playerId);
            return { success: false, foul: true };
          }
        }
      }
    }

    // Success if close to ball
    if (distToBall < PLAYER_RADIUS + BALL_RADIUS + 4) {
      this.kick({ type: "tackle", power: 0.5, targetAngle });
      this.onCollision?.("tackle");
      return { success: true, foul: false };
    }

    return { success: false, foul: false };
  }

  // Standing tackle (shoulder charge)
  standingTackle(playerId: string): boolean {
    const body = this.players.get(playerId);
    if (!body || !this.ballOwner || this.ballOwner === playerId) return false;

    const ownerBody = this.players.get(this.ballOwner);
    if (!ownerBody) return false;

    const playerPos = body.getPosition();
    const ownerPos = ownerBody.getPosition();
    const dist = Math.sqrt(
      Math.pow(ownerPos.x - playerPos.x, 2) + Math.pow(ownerPos.y - playerPos.y, 2)
    ) * SCALE;

    if (dist < PLAYER_RADIUS * 2 + 2) {
      // 50% chance to win the ball
      if (Math.random() < 0.5) {
        // Knock ball loose
        const angle = Math.atan2(ownerPos.y - playerPos.y, ownerPos.x - playerPos.x);
        this.kick({ type: "tackle", power: 0.3, targetAngle: angle + Math.PI });
        this.ballOwner = null;
        return true;
      }
    }
    return false;
  }

  getStamina(id: string): number {
    return this.playerStamina.get(id) || 100;
  }

  getPlayerState(id: string): PhysicsState | null {
    const body = this.players.get(id);
    if (!body) return null;
    const pos = body.getPosition();
    const vel = body.getLinearVelocity();
    return { x: pos.x * SCALE, y: pos.y * SCALE, vx: vel.x * SCALE, vy: vel.y * SCALE };
  }

  getBallState(): PhysicsState {
    const pos = this.ball.getPosition();
    const vel = this.ball.getLinearVelocity();
    return { x: pos.x * SCALE, y: pos.y * SCALE, vx: vel.x * SCALE, vy: vel.y * SCALE };
  }

  getBallOwner(): string | null {
    return this.ballOwner;
  }

  resetBall(): void {
    this.ball.setPosition(planck.Vec2(FIELD_WIDTH / 2 / SCALE, FIELD_HEIGHT / 2 / SCALE));
    this.ball.setLinearVelocity(planck.Vec2(0, 0));
    this.ball.setAngularVelocity(0);
    this.ballOwner = null;
  }

  placeBall(x: number, y: number): void {
    this.ball.setPosition(planck.Vec2(x / SCALE, y / SCALE));
    this.ball.setLinearVelocity(planck.Vec2(0, 0));
    this.ball.setAngularVelocity(0);
    this.ballOwner = null;
  }

  resetPlayer(id: string, x: number, y: number): void {
    const body = this.players.get(id);
    if (body) {
      body.setPosition(planck.Vec2(x / SCALE, y / SCALE));
      body.setLinearVelocity(planck.Vec2(0, 0));
    }
    this.playerStamina.set(id, 100);
  }

  step(dt: number): void {
    // Apply spin curve effect to ball
    const angVel = this.ball.getAngularVelocity();
    if (Math.abs(angVel) > 0.5) {
      const vel = this.ball.getLinearVelocity();
      const speed = vel.length();
      if (speed > 0.5) {
        // Curve perpendicular to velocity
        const curveForce = angVel * 0.001 * speed;
        const perpX = -vel.y / speed * curveForce;
        const perpY = vel.x / speed * curveForce;
        this.ball.applyForce(planck.Vec2(perpX, perpY), this.ball.getWorldCenter(), true);
      }
      // Decay spin
      this.ball.setAngularVelocity(angVel * 0.98);
    }

    this.world.step(dt, 8, 3);

    // Check ball ownership
    const ballPos = this.ball.getPosition();
    const ballX = ballPos.x * SCALE;
    const ballY = ballPos.y * SCALE;

    // Check for out of bounds (ball touching walls)
    const margin = 3;
    const goalWidth = FIELD_HEIGHT * 0.3;
    const goalTop = (FIELD_HEIGHT - goalWidth) / 2;
    const goalBottom = goalTop + goalWidth;
    const lastTouchTeam = this.lastBallOwner ? 
      (this.players.get(this.lastBallOwner)?.getFixtureList()?.getUserData() as any)?.team : null;

    // Top/bottom walls = throw-in
    if (ballY <= margin || ballY >= FIELD_HEIGHT - margin) {
      const throwTeam = lastTouchTeam === "home" ? "away" : "home";
      this.onOutOfBounds?.("throw-in", throwTeam, ballX, ballY <= margin ? 2 : FIELD_HEIGHT - 2);
    }
    // Left/right walls (outside goal area) = corner or goal-kick
    else if (ballX <= margin && (ballY < goalTop || ballY > goalBottom)) {
      const isCorner = lastTouchTeam === "home";
      this.onOutOfBounds?.(isCorner ? "corner" : "goal-kick", isCorner ? "away" : "home", 
        isCorner ? 2 : 15, ballY < goalTop ? 2 : FIELD_HEIGHT - 2);
    }
    else if (ballX >= FIELD_WIDTH - margin && (ballY < goalTop || ballY > goalBottom)) {
      const isCorner = lastTouchTeam === "away";
      this.onOutOfBounds?.(isCorner ? "corner" : "goal-kick", isCorner ? "home" : "away",
        isCorner ? FIELD_WIDTH - 2 : FIELD_WIDTH - 15, ballY < goalTop ? 2 : FIELD_HEIGHT - 2);
    }

    let closestPlayer: string | null = null;
    let closestDist = Infinity;

    this.players.forEach((body, id) => {
      const pos = body.getPosition();
      const dist = Math.sqrt(Math.pow(pos.x - ballPos.x, 2) + Math.pow(pos.y - ballPos.y, 2));
      if (dist < (PLAYER_RADIUS + BALL_RADIUS) / SCALE && dist < closestDist) {
        closestDist = dist;
        closestPlayer = id;
      }
    });

    if (closestPlayer && !this.ballOwner) {
      this.ballOwner = closestPlayer;
    } else if (!closestPlayer || closestDist > (PLAYER_RADIUS + BALL_RADIUS + 2) / SCALE) {
      if (this.ballOwner) this.lastBallOwner = this.ballOwner;
      this.ballOwner = null;
    }
  }

  destroy(): void {
    this.players.forEach((body) => this.world.destroyBody(body));
    this.players.clear();
    this.playerStamina.clear();
  }
}
