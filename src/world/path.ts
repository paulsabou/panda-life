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

const indexOf = (x: number, y: number) => y * MAP_SIZE + x;
const centre = (i: number): Pair => [(i % MAP_SIZE) + 0.5, Math.floor(i / MAP_SIZE) + 0.5];

function clearLine(ground: Ground, a: Pair, b: Pair): boolean {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (ground.blocked(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
  }
  return true;
}

function nearestOpen(ground: Ground, x: number, y: number): number | null {
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
        if (distance < bestDistance && !ground.blocked(cx + 0.5, cy + 0.5)) {
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
 * Route from one spot to another, going round anything in the way. A tap on
 * something solid, or somewhere that can't be reached, walks as close as Sushi
 * can get.
 */
export function findPath(ground: Ground, from: Pair, to: Pair): Pair[] {
  const start = nearestOpen(ground, from[0], from[1]);
  const goal = nearestOpen(ground, to[0], to[1]);
  if (start === null || goal === null) return [];

  const cameFrom = new Map<number, number>([[start, start]]);
  const queue = [start];
  for (let head = 0; head < queue.length && !cameFrom.has(goal); head++) {
    const current = queue[head];
    const cx = current % MAP_SIZE;
    const cy = Math.floor(current / MAP_SIZE);
    for (const [dx, dy] of STEPS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_SIZE || ny >= MAP_SIZE) continue;
      const next = indexOf(nx, ny);
      if (cameFrom.has(next) || ground.blocked(nx + 0.5, ny + 0.5)) continue;
      if (dx && dy && (ground.blocked(nx + 0.5, cy + 0.5) || ground.blocked(cx + 0.5, ny + 0.5))) continue;
      cameFrom.set(next, current);
      queue.push(next);
    }
  }
  const end = cameFrom.has(goal) ? goal : closestTo(to, cameFrom.keys());

  const route: Pair[] = [];
  for (let at = end; at !== start; at = cameFrom.get(at)!) route.unshift(centre(at));

  // Skip corners where Sushi can simply walk straight.
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
