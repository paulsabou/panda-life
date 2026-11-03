import type { Ground } from './collision';
import { MAP_SIZE, type Pair } from './iso';

const STEPS: Pair[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const TILES = MAP_SIZE * MAP_SIZE;
const UNKNOWN = 0;
const OPEN = 1;
const BLOCKED = 2;

const indexOf = (x: number, y: number) => y * MAP_SIZE + x;
const centre = (i: number): Pair => [(i % MAP_SIZE) + 0.5, Math.floor(i / MAP_SIZE) + 0.5];

function clearLine(ground: Ground, a: Pair, b: Pair): boolean {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4);
  // Look from the far end back: smoothing has just seen the line to the point
  // before, so anything in the way is most likely near the far end.
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    if (ground.blocked(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
  }
  return true;
}

// Checking the ground is the slow part of planning, and every route asks about
// the same tiles again. Grounds don't change once made (a room with other
// furniture gets a new one), so remember the answer for each ground's tiles.
const knownTiles = new WeakMap<Ground, Uint8Array>();

/** Whether the middle of each tile is open, asking the ground only the first time. */
function tileChecker(ground: Ground): (x: number, y: number) => boolean {
  const tiles = knownTiles.get(ground) ?? new Uint8Array(TILES);
  knownTiles.set(ground, tiles);
  return (x, y) => {
    const i = indexOf(x, y);
    if (tiles[i] === UNKNOWN) tiles[i] = ground.blocked(x + 0.5, y + 0.5) ? BLOCKED : OPEN;
    return tiles[i] === OPEN;
  };
}

function nearestOpen(open: (x: number, y: number) => boolean, x: number, y: number): number | null {
  const tx = Math.max(0, Math.min(MAP_SIZE - 1, Math.floor(x)));
  const ty = Math.max(0, Math.min(MAP_SIZE - 1, Math.floor(y)));
  for (let radius = 0; radius < MAP_SIZE; radius++) {
    let best: number | null = null;
    let bestDistance = Infinity;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const cx = tx + dx;
        const cy = ty + dy;
        if (cx < 0 || cy < 0 || cx >= MAP_SIZE || cy >= MAP_SIZE) continue;
        const distance = Math.hypot(dx, dy);
        if (distance < bestDistance && open(cx, cy)) {
          best = indexOf(cx, cy);
          bestDistance = distance;
        }
      }
    }
    if (best !== null) return best;
  }
  return null;
}

function closestTo(to: Pair, tiles: Iterable<number>): number {
  let best = 0;
  let bestDistance = Infinity;
  for (const tile of tiles) {
    const [x, y] = centre(tile);
    const distance = Math.hypot(x - to[0], y - to[1]);
    if (distance < bestDistance) {
      best = tile;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * The tiles to walk through, after `start`, to reach `goal`, spreading out one
 * step at a time in every direction. If the goal can't be reached, ends at the
 * reachable tile closest to `to`.
 */
function tileRoute(open: (x: number, y: number) => boolean, start: number, goal: number, to: Pair): number[] {
  const cameFrom = new Int32Array(TILES).fill(-1);
  // Each tile joins the queue once at most, so a fixed-size array will do.
  const queue = new Int32Array(TILES);
  let tail = 0;
  cameFrom[start] = start;
  queue[tail++] = start;
  for (let head = 0; head < tail && cameFrom[goal] === -1; head++) {
    const current = queue[head];
    const cx = current % MAP_SIZE;
    const cy = Math.floor(current / MAP_SIZE);
    for (const [dx, dy] of STEPS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_SIZE || ny >= MAP_SIZE) continue;
      const next = indexOf(nx, ny);
      if (cameFrom[next] !== -1 || !open(nx, ny)) continue;
      // Don't cut a corner past something solid.
      if (dx && dy && (!open(nx, cy) || !open(cx, ny))) continue;
      cameFrom[next] = current;
      queue[tail++] = next;
    }
  }

  const end = cameFrom[goal] !== -1 ? goal : closestTo(to, queue.subarray(0, tail));
  const route: number[] = [];
  for (let at = end; at !== start; at = cameFrom[at]) route.push(at);
  return route.reverse();
}

/** Skip corners where Sushi can simply walk straight. */
function smoothRoute(ground: Ground, from: Pair, route: Pair[]): Pair[] {
  const smooth: Pair[] = [];
  let anchor: Pair = from;
  for (let i = 0; i < route.length; i++) {
    const next = route[i + 1];
    if (next === undefined || !clearLine(ground, anchor, next)) {
      smooth.push(route[i]);
      anchor = route[i];
    }
  }
  return smooth;
}

/**
 * Route from one spot to another, going round anything in the way. A tap on
 * something solid, or somewhere that can't be reached, walks as close as Sushi
 * can get.
 */
export function findPath(ground: Ground, from: Pair, to: Pair): Pair[] {
  const open = tileChecker(ground);
  const start = nearestOpen(open, from[0], from[1]);
  const goal = nearestOpen(open, to[0], to[1]);
  if (start === null || goal === null) return [];
  return smoothRoute(ground, from, tileRoute(open, start, goal, to).map(centre));
}
