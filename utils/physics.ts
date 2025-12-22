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

export class GamePhysics {
  world: planck.World;
  ball: planck.Body;
  players: Map<string, planck.Body> = new Map();

  onGoal?: (team: "home" | "away") => void;
  onCollision?: (type: "kick" | "bounce") => void;

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
      linearDamping: 1.8,
    });
    ball.createFixture({
      shape: new planck.Circle(BALL_RADIUS / SCALE),
      density: 0.5,
      friction: 0.3,
      restitution: 0.6,
      userData: { type: "ball" },
    });
    return ball;
  }

  private createWalls(): void {
    const goalWidth = FIELD_HEIGHT * 0.3;
    const goalTop = (FIELD_HEIGHT - goalWidth) / 2;
    const goalBottom = goalTop + goalWidth;

    // Walls
    this.createWall(FIELD_WIDTH / 2, 1, FIELD_WIDTH, 2); // Top
    this.createWall(FIELD_WIDTH / 2, FIELD_HEIGHT - 1, FIELD_WIDTH, 2); // Bottom
    this.createWall(1, goalTop / 2, 2, goalTop); // Left top
    this.createWall(1, FIELD_HEIGHT - (FIELD_HEIGHT - goalBottom) / 2, 2, FIELD_HEIGHT - goalBottom); // Left bottom
    this.createWall(FIELD_WIDTH - 1, goalTop / 2, 2, goalTop); // Right top
    this.createWall(FIELD_WIDTH - 1, FIELD_HEIGHT - (FIELD_HEIGHT - goalBottom) / 2, 2, FIELD_HEIGHT - goalBottom); // Right bottom

    // Goal posts
    [0, FIELD_WIDTH].forEach(x => {
      [goalTop, goalBottom].forEach(y => {
        const post = this.world.createBody({ position: planck.Vec2(x / SCALE, y / SCALE) });
        post.createFixture({ shape: new planck.Circle(1 / SCALE), restitution: 0.8, userData: { type: "post" } });
      });
    });
  }

  private createWall(x: number, y: number, w: number, h: number): void {
    const wall = this.world.createBody({ position: planck.Vec2(x / SCALE, y / SCALE) });
    wall.createFixture({
      shape: new planck.Box(w / 2 / SCALE, h / 2 / SCALE),
      friction: 0.3,
      restitution: 0.5,
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
      restitution: 0.2,
      userData: { type: "player", id, team },
    });
    this.players.set(id, body);
  }

  movePlayer(id: string, vx: number, vy: number): void {
    const body = this.players.get(id);
    if (body) {
      // Apply velocity directly in world units
      body.setLinearVelocity(planck.Vec2(vx, vy));
    }
  }

  applyKick(force: number, angle: number): void {
    const impulse = planck.Vec2(Math.cos(angle) * force, Math.sin(angle) * force);
    this.ball.applyLinearImpulse(impulse, this.ball.getWorldCenter(), true);
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

  resetBall(): void {
    this.ball.setPosition(planck.Vec2(FIELD_WIDTH / 2 / SCALE, FIELD_HEIGHT / 2 / SCALE));
    this.ball.setLinearVelocity(planck.Vec2(0, 0));
  }

  resetPlayer(id: string, x: number, y: number): void {
    const body = this.players.get(id);
    if (body) {
      body.setPosition(planck.Vec2(x / SCALE, y / SCALE));
      body.setLinearVelocity(planck.Vec2(0, 0));
    }
  }

  step(dt: number): void {
    this.world.step(dt, 6, 2);
  }

  destroy(): void {
    this.players.forEach((body) => this.world.destroyBody(body));
    this.players.clear();
  }
}
