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
  power: number;
  targetAngle: number;
  spin?: number;
}

export class GamePhysics {
  world: planck.World;
  ball: planck.Body;
  players: Map<string, planck.Body> = new Map();
  playerStamina: Map<string, number> = new Map();
  ballOwner: string | null = null;
  lastBallOwner: string | null = null;
  private kickCooldown = 0;
  private goalScored = false;

  onGoal?: (team: "home" | "away") => void;
  onCollision?: (type: "kick" | "bounce" | "tackle") => void;
  onFoul?: (foulingPlayer: string) => void;
  onOutOfBounds?: (type: "throw-in" | "corner" | "goal-kick", team: "home" | "away", x: number, y: number) => void;
  
  private outOfBoundsCooldown = 0;

  constructor() {
    this.world = new planck.World({ gravity: planck.Vec2(0, 0) });
    this.createWalls();
    this.ball = this.createBall();
  }

  private createBall(): planck.Body {
    const ball = this.world.createDynamicBody({
      position: planck.Vec2(FIELD_WIDTH / 2 / SCALE, FIELD_HEIGHT / 2 / SCALE),
      bullet: true,
      linearDamping: 1.5,
      angularDamping: 0.8,
    });
    ball.createFixture({
      shape: new planck.Circle(BALL_RADIUS / SCALE),
      density: 0.3,
      friction: 0.3,
      restitution: 0.6,
      userData: { type: "ball" },
    });
    return ball;
  }

  private createWalls(): void {
    const goalWidth = FIELD_HEIGHT * 0.28;
    const goalTop = (FIELD_HEIGHT - goalWidth) / 2;
    const goalBottom = goalTop + goalWidth;

    // Top and bottom walls (full width)
    this.createWall(FIELD_WIDTH / 2, 0, FIELD_WIDTH + 10, 2);
    this.createWall(FIELD_WIDTH / 2, FIELD_HEIGHT, FIELD_WIDTH + 10, 2);
    
    // Left wall segments (above and below goal)
    this.createWall(0, goalTop / 2, 2, goalTop);
    this.createWall(0, FIELD_HEIGHT - (FIELD_HEIGHT - goalBottom) / 2, 2, FIELD_HEIGHT - goalBottom);
    
    // Right wall segments (above and below goal)
    this.createWall(FIELD_WIDTH, goalTop / 2, 2, goalTop);
    this.createWall(FIELD_WIDTH, FIELD_HEIGHT - (FIELD_HEIGHT - goalBottom) / 2, 2, FIELD_HEIGHT - goalBottom);

    // Goal posts (visual bounce)
    [[0, goalTop], [0, goalBottom], [FIELD_WIDTH, goalTop], [FIELD_WIDTH, goalBottom]].forEach(([x, y]) => {
      const post = this.world.createBody({ position: planck.Vec2(x / SCALE, y / SCALE) });
      post.createFixture({ shape: new planck.Circle(1 / SCALE), restitution: 0.8, userData: { type: "post" } });
    });

    // Goal back nets (to stop ball)
    this.createWall(-4, FIELD_HEIGHT / 2, 2, goalWidth);
    this.createWall(FIELD_WIDTH + 4, FIELD_HEIGHT / 2, 2, goalWidth);
  }

  private createWall(x: number, y: number, w: number, h: number): void {
    const wall = this.world.createBody({ position: planck.Vec2(x / SCALE, y / SCALE) });
    wall.createFixture({
      shape: new planck.Box(w / 2 / SCALE, h / 2 / SCALE),
      friction: 0.3,
      restitution: 0.4,
      userData: { type: "wall" },
    });
  }

  addPlayer(id: string, x: number, y: number, team: "home" | "away"): void {
    const body = this.world.createDynamicBody({
      position: planck.Vec2(x / SCALE, y / SCALE),
      linearDamping: 4,
      fixedRotation: true,
    });
    body.createFixture({
      shape: new planck.Circle(PLAYER_RADIUS / SCALE),
      density: 2,
      friction: 0.3,
      restitution: 0.1,
      userData: { type: "player", id, team },
    });
    this.players.set(id, body);
    this.playerStamina.set(id, 100);
  }

  movePlayer(id: string, targetVx: number, targetVy: number, isSprinting: boolean, hasBall: boolean): void {
    const body = this.players.get(id);
    if (!body) return;

    const currentVel = body.getLinearVelocity();
    let stamina = this.playerStamina.get(id) || 100;

    if (isSprinting && (targetVx !== 0 || targetVy !== 0)) {
      stamina = Math.max(0, stamina - 0.25);
    } else {
      stamina = Math.min(100, stamina + 0.2);
    }
    this.playerStamina.set(id, stamina);

    let speedMod = 1;
    if (hasBall) speedMod *= 0.88;
    if (isSprinting && stamina > 15) speedMod *= 1.35;
    if (stamina < 25) speedMod *= 0.75;

    const finalVx = targetVx * speedMod;
    const finalVy = targetVy * speedMod;

    const accel = 0.18;
    const newVx = currentVel.x + (finalVx - currentVel.x) * accel;
    const newVy = currentVel.y + (finalVy - currentVel.y) * accel;

    body.setLinearVelocity(planck.Vec2(newVx, newVy));
  }

  dribbleBall(playerId: string, playerVx: number, playerVy: number): void {
    const playerBody = this.players.get(playerId);
    if (!playerBody) return;

    const playerPos = playerBody.getPosition();
    const speed = Math.sqrt(playerVx * playerVx + playerVy * playerVy);

    const aheadDist = (PLAYER_RADIUS + BALL_RADIUS + 1) / SCALE;
    let targetX: number, targetY: number;

    if (speed > 0.1) {
      const angle = Math.atan2(playerVy, playerVx);
      targetX = playerPos.x + Math.cos(angle) * aheadDist;
      targetY = playerPos.y + Math.sin(angle) * aheadDist;
    } else {
      const facing = playerId.startsWith("h") ? 1 : -1;
      targetX = playerPos.x + facing * aheadDist * 0.7;
      targetY = playerPos.y;
    }

    const margin = 5 / SCALE;
    targetX = Math.max(margin, Math.min((FIELD_WIDTH / SCALE) - margin, targetX));
    targetY = Math.max(margin, Math.min((FIELD_HEIGHT / SCALE) - margin, targetY));

    const ballPos = this.ball.getPosition();
    const dx = targetX - ballPos.x;
    const dy = targetY - ballPos.y;

    this.ball.setLinearVelocity(planck.Vec2(dx * 12, dy * 12));
    this.ballOwner = playerId;
    this.lastBallOwner = playerId;
  }

  kick(options: KickOptions): void {
    const { type, power, targetAngle, spin = 0 } = options;

    let force: number;
    let accuracy: number;

    switch (type) {
      case "pass":
        force = 0.18 + power * 0.22;
        accuracy = 0.92;
        break;
      case "shoot":
        force = 0.35 + power * 0.55;
        accuracy = 0.7 + power * 0.15;
        break;
      case "through":
        force = 0.28 + power * 0.3;
        accuracy = 0.85;
        break;
      case "tackle":
        force = 0.12 + power * 0.12;
        accuracy = 0.55;
        break;
      default:
        force = 0.25;
        accuracy = 0.8;
    }

    const variance = (1 - accuracy) * (Math.random() - 0.5) * 0.6;
    const finalAngle = targetAngle + variance;

    const impulse = planck.Vec2(Math.cos(finalAngle) * force, Math.sin(finalAngle) * force);
    this.ball.applyLinearImpulse(impulse, this.ball.getWorldCenter(), true);

    if (spin !== 0) {
      this.ball.setAngularVelocity(spin * 15);
    }

    if (this.ballOwner) this.lastBallOwner = this.ballOwner;
    this.ballOwner = null;
    this.kickCooldown = 12;
  }

  slideTackle(playerId: string, targetAngle: number): { success: boolean; foul: boolean } {
    const body = this.players.get(playerId);
    if (!body) return { success: false, foul: false };

    const lungeForce = planck.Vec2(Math.cos(targetAngle) * 0.6, Math.sin(targetAngle) * 0.6);
    body.applyLinearImpulse(lungeForce, body.getWorldCenter(), true);

    const ballPos = this.ball.getPosition();
    const playerPos = body.getPosition();
    const distToBall = Math.sqrt(Math.pow(ballPos.x - playerPos.x, 2) + Math.pow(ballPos.y - playerPos.y, 2)) * SCALE;

    if (distToBall < PLAYER_RADIUS + BALL_RADIUS + 5) {
      this.kick({ type: "tackle", power: 0.4, targetAngle });
      this.onCollision?.("tackle");
      return { success: true, foul: false };
    }

    return { success: false, foul: false };
  }

  standingTackle(playerId: string): boolean {
    const body = this.players.get(playerId);
    if (!body || !this.ballOwner || this.ballOwner === playerId) return false;

    const ownerBody = this.players.get(this.ballOwner);
    if (!ownerBody) return false;

    const playerPos = body.getPosition();
    const ownerPos = ownerBody.getPosition();
    const dist = Math.sqrt(Math.pow(ownerPos.x - playerPos.x, 2) + Math.pow(ownerPos.y - playerPos.y, 2)) * SCALE;

    if (dist < PLAYER_RADIUS * 2 + 3) {
      if (Math.random() < 0.45) {
        const angle = Math.atan2(ownerPos.y - playerPos.y, ownerPos.x - playerPos.x);
        this.kick({ type: "tackle", power: 0.25, targetAngle: angle + Math.PI });
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
    this.goalScored = false;
  }

  placeBall(x: number, y: number): void {
    this.ball.setPosition(planck.Vec2(x / SCALE, y / SCALE));
    this.ball.setLinearVelocity(planck.Vec2(0, 0));
    this.ball.setAngularVelocity(0);
    this.ballOwner = null;
    this.outOfBoundsCooldown = 60;
    this.goalScored = false;
  }

  resetPlayer(id: string, x: number, y: number): void {
    const body = this.players.get(id);
    if (body) {
      body.setPosition(planck.Vec2(x / SCALE, y / SCALE));
      body.setLinearVelocity(planck.Vec2(0, 0));
    }
    this.playerStamina.set(id, 100);
  }

  checkGoal(): "home" | "away" | null {
    if (this.goalScored) return null;
    
    const ballPos = this.ball.getPosition();
    const ballX = ballPos.x * SCALE;
    const ballY = ballPos.y * SCALE;
    
    const goalWidth = FIELD_HEIGHT * 0.28;
    const goalTop = (FIELD_HEIGHT - goalWidth) / 2;
    const goalBottom = goalTop + goalWidth;
    
    // Ball crossed left goal line (away team scores)
    if (ballX < 0 && ballY > goalTop && ballY < goalBottom) {
      this.goalScored = true;
      this.ball.setLinearVelocity(planck.Vec2(0, 0));
      return "away";
    }
    
    // Ball crossed right goal line (home team scores)
    if (ballX > FIELD_WIDTH && ballY > goalTop && ballY < goalBottom) {
      this.goalScored = true;
      this.ball.setLinearVelocity(planck.Vec2(0, 0));
      return "home";
    }
    
    return null;
  }

  step(dt: number): void {
    // Spin curve effect
    const angVel = this.ball.getAngularVelocity();
    if (Math.abs(angVel) > 0.5) {
      const vel = this.ball.getLinearVelocity();
      const speed = vel.length();
      if (speed > 0.5) {
        const curveForce = angVel * 0.0008 * speed;
        const perpX = -vel.y / speed * curveForce;
        const perpY = vel.x / speed * curveForce;
        this.ball.applyForce(planck.Vec2(perpX, perpY), this.ball.getWorldCenter(), true);
      }
      this.ball.setAngularVelocity(angVel * 0.97);
    }

    this.world.step(dt, 8, 3);

    if (this.outOfBoundsCooldown > 0) this.outOfBoundsCooldown--;
    if (this.kickCooldown > 0) this.kickCooldown--;

    // Check for goal
    const goal = this.checkGoal();
    if (goal) {
      this.onGoal?.(goal);
      return;
    }

    const ballPos = this.ball.getPosition();
    const ballX = ballPos.x * SCALE;
    const ballY = ballPos.y * SCALE;

    // Out of bounds check
    const margin = 3;
    const goalWidth = FIELD_HEIGHT * 0.28;
    const goalTop = (FIELD_HEIGHT - goalWidth) / 2;
    const goalBottom = goalTop + goalWidth;
    
    if (this.outOfBoundsCooldown === 0 && !this.goalScored) {
      const lastTouchTeam = this.lastBallOwner ? 
        (this.players.get(this.lastBallOwner)?.getFixtureList()?.getUserData() as any)?.team : null;
      
      const nearTop = ballY <= margin;
      const nearBottom = ballY >= FIELD_HEIGHT - margin;
      const nearLeft = ballX <= margin;
      const nearRight = ballX >= FIELD_WIDTH - margin;
      const inGoalArea = ballY > goalTop && ballY < goalBottom;

      if ((nearTop || nearBottom) && !nearLeft && !nearRight) {
        this.outOfBoundsCooldown = 90;
        const throwTeam = lastTouchTeam === "home" ? "away" : "home";
        this.onOutOfBounds?.("throw-in", throwTeam, Math.max(15, Math.min(FIELD_WIDTH - 15, ballX)), nearTop ? 6 : FIELD_HEIGHT - 6);
      } else if (nearLeft && !inGoalArea) {
        this.outOfBoundsCooldown = 90;
        const isCorner = lastTouchTeam === "home";
        this.onOutOfBounds?.(isCorner ? "corner" : "goal-kick", isCorner ? "away" : "home", isCorner ? 4 : 18, nearTop ? 6 : FIELD_HEIGHT - 6);
      } else if (nearRight && !inGoalArea) {
        this.outOfBoundsCooldown = 90;
        const isCorner = lastTouchTeam === "away";
        this.onOutOfBounds?.(isCorner ? "corner" : "goal-kick", isCorner ? "home" : "away", isCorner ? FIELD_WIDTH - 4 : FIELD_WIDTH - 18, nearTop ? 6 : FIELD_HEIGHT - 6);
      }
    }

    // Ball ownership
    if (this.kickCooldown === 0 && !this.goalScored) {
      let closestPlayer: string | null = null;
      let closestDist = Infinity;

      this.players.forEach((body, id) => {
        const pos = body.getPosition();
        const dist = Math.sqrt(Math.pow(pos.x - ballPos.x, 2) + Math.pow(pos.y - ballPos.y, 2));
        if (dist < (PLAYER_RADIUS + BALL_RADIUS + 0.5) / SCALE && dist < closestDist) {
          closestDist = dist;
          closestPlayer = id;
        }
      });

      if (closestPlayer && closestPlayer !== this.ballOwner) {
        if (this.ballOwner) this.lastBallOwner = this.ballOwner;
        this.ballOwner = closestPlayer;
      }
    }
  }

  destroy(): void {
    this.players.forEach((body) => this.world.destroyBody(body));
    this.players.clear();
    this.playerStamina.clear();
  }
}
