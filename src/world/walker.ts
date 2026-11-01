import type { Ground } from './collision';
import { rotateDelta, type Pair, type Rotation } from './iso';
import { findPath } from './path';

export type Pose = 'front' | 'frontSide' | 'side' | 'backSide' | 'back';

const POSE_BY_OCTANT: Record<string, [Pose, boolean]> = {
  '0': ['side', false],
  '1': ['frontSide', false],
  '2': ['front', false],
  '3': ['frontSide', true],
  '4': ['side', true],
  '-4': ['side', true],
  '-3': ['backSide', true],
  '-2': ['back', false],
  '-1': ['backSide', false],
};

/** The picture to show for a walking direction, and whether to mirror it. */
export function facing(r: Rotation, dx: number, dy: number): [Pose, boolean] {
  const [vx, vy] = rotateDelta(r, dx, dy);
  return POSE_BY_OCTANT[String(Math.round(Math.atan2((vx + vy) / 2, vx - vy) / (Math.PI / 4)))];
}

/** How close two characters can get before they count as bumping. */
export const PERSONAL_SPACE = 1.05;
const LOOK_AHEAD = 2;
const AHEAD_COSINE = 0.5;
const BEAR_RIGHT = 1.2;

export class Walker {
  /** Last direction walked, in world terms, so the picture can follow map turns. */
  dx = 1;
  dy = 1;
  moving = false;
  private route: Pair[] = [];

  constructor(
    public x: number,
    public y: number,
    public speed: number,
  ) {}

  get walkingARoute(): boolean {
    return this.route.length > 0;
  }

  /** Step directly, sliding along anything solid. Returns false if completely stuck. */
  step(ground: Ground, others: Walker[], wx: number, wy: number, seconds: number): boolean {
    const length = Math.hypot(wx, wy);
    this.moving = false;
    if (!length) return false;
    const distance = (this.speed * seconds) / length;
    const fromX = this.x;
    const fromY = this.y;
    if (this.canStand(ground, others, this.x + wx * distance, this.y)) this.x += wx * distance;
    if (this.canStand(ground, others, this.x, this.y + wy * distance)) this.y += wy * distance;
    if (this.x === fromX && this.y === fromY) return false;
    this.moving = true;
    this.dx = this.x - fromX;
    this.dy = this.y - fromY;
    return true;
  }

  walkTo(ground: Ground, to: Pair): void {
    this.route = findPath(ground, [this.x, this.y], to);
  }

  stopRoute(): void {
    this.route = [];
  }

  /** Follow the current route. Returns false if something is in the way. */
  followRoute(ground: Ground, others: Walker[], seconds: number): boolean {
    this.moving = false;
    const next = this.route[0];
    if (!next) return true;
    const wx = next[0] - this.x;
    const wy = next[1] - this.y;
    const left = Math.hypot(wx, wy);
    if (left < 0.15) {
      this.route.shift();
      return true;
    }
    const [dx, dy] = this.keepRight(others, wx / left, wy / left);
    return this.step(ground, others, dx, dy, Math.min(seconds, left / this.speed));
  }

  /** Like people on a path: seeing someone just ahead, bear right so you both get past. */
  private keepRight(others: Walker[], ux: number, uy: number): Pair {
    for (const o of others) {
      if (o === this) continue;
      const dx = o.x - this.x;
      const dy = o.y - this.y;
      const near = Math.hypot(dx, dy);
      if (near > 0 && near < LOOK_AHEAD && (dx * ux + dy * uy) / near > AHEAD_COSINE) {
        return [ux + uy * BEAR_RIGHT, uy - ux * BEAR_RIGHT];
      }
    }
    return [ux, uy];
  }

  private canStand(ground: Ground, others: Walker[], x: number, y: number): boolean {
    if (ground.blocked(x, y)) return false;
    return others.every((o) => {
      if (o === this) return true;
      const near = Math.hypot(o.x - x, o.y - y);
      // Allow stepping away from someone already too close, so nobody gets stuck.
      return near >= PERSONAL_SPACE || near > Math.hypot(o.x - this.x, o.y - this.y);
    });
  }
}

const WANDER_RANGE = 7;
export const STROLL_SPEED = 2.4;

/** A friend pottering around near home. */
export class Wanderer extends Walker {
  protected pause: number;
  private stuckFor = 0;

  constructor(
    public homeX: number,
    public homeY: number,
    protected rng: () => number,
  ) {
    super(homeX, homeY, STROLL_SPEED);
    this.pause = 1 + rng() * 4;
  }

  update(ground: Ground, others: Walker[], seconds: number): void {
    if (!this.walkingARoute) {
      this.moving = false;
      this.pause -= seconds;
      if (this.pause <= 0) this.chooseStroll(ground);
      return;
    }
    if (this.followRoute(ground, others, seconds)) {
      this.stuckFor = 0;
      if (!this.walkingARoute) this.pause = 2 + this.rng() * 5;
      return;
    }
    // Wait politely, then give up and potter somewhere else.
    this.stuckFor += seconds;
    if (this.stuckFor > 1.5) {
      this.stuckFor = 0;
      this.stopRoute();
      this.pause = 1 + this.rng() * 2;
    }
  }

  private chooseStroll(ground: Ground): void {
    const angle = this.rng() * Math.PI * 2;
    const reach = 2 + this.rng() * (WANDER_RANGE - 2);
    const to: Pair = [this.homeX + Math.cos(angle) * reach, this.homeY + Math.sin(angle) * reach];
    if (ground.blocked(to[0], to[1])) {
      this.pause = 0.5;
      return;
    }
    this.walkTo(ground, to);
    this.pause = 1 + this.rng() * 2;
  }
}
