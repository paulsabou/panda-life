import * as Phaser from 'phaser';
import type { Ground } from '../world/collision';
import { unrotateDelta, type Pair, type Rotation } from '../world/iso';
import type { Walker } from '../world/walker';

const STUCK_SECONDS = 0.5;

/** Moves Sushi from the keyboard or along a tapped route, in the village or indoors. */
export class PlayerDriver {
  /**
   * Doors only work once any key held on the way through has been let go, so
   * holding Up doesn't bounce Sushi straight back out.
   */
  readyForDoors = false;
  private keys: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key[]>;
  private stuckFor = 0;

  constructor(
    private scene: Phaser.Scene,
    private walker: Walker,
    private ground: Ground,
    private others: () => Walker[],
  ) {
    const keyboard = scene.input.keyboard!;
    const { UP, DOWN, LEFT, RIGHT, W, A, S, D } = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: [keyboard.addKey(UP), keyboard.addKey(W)],
      down: [keyboard.addKey(DOWN), keyboard.addKey(S)],
      left: [keyboard.addKey(LEFT), keyboard.addKey(A)],
      right: [keyboard.addKey(RIGHT), keyboard.addKey(D)],
    };
  }

  walkTo(to: Pair): void {
    this.walker.walkTo(this.ground, to);
    this.stuckFor = 0;
    this.readyForDoors = true;
  }

  /** Forget anything held down before the scene was asleep. */
  reset(): void {
    this.scene.input.keyboard!.resetKeys();
    this.readyForDoors = false;
  }

  /** Returns the way the keys are pushing, as a world direction. */
  update(r: Rotation, seconds: number): Pair {
    const held = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((k) => k.isDown);
    let vx = 0;
    let vy = 0;
    if (held(this.keys.up)) { vx -= 1; vy -= 1; }
    if (held(this.keys.down)) { vx += 1; vy += 1; }
    if (held(this.keys.left)) { vx -= 1; vy += 1; }
    if (held(this.keys.right)) { vx += 1; vy -= 1; }

    const walker = this.walker;
    if (vx || vy) {
      walker.stopRoute();
      const [wx, wy] = unrotateDelta(r, vx, vy);
      walker.step(this.ground, this.others(), wx, wy, seconds);
      return [wx, wy];
    }
    this.readyForDoors = true;
    if (!walker.walkingARoute) {
      walker.moving = false;
      return [0, 0];
    }
    if (walker.followRoute(this.ground, this.others(), seconds)) this.stuckFor = 0;
    else {
      this.stuckFor += seconds;
      if (this.stuckFor > STUCK_SECONDS) walker.stopRoute();
    }
    return [0, 0];
  }
}
