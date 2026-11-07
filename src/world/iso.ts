export const TILE_W = 46;
export const TILE_H = 23;
export const MAP_SIZE = 140;
export const HOUSE_SIZE = 5;
export const WORLD_W = MAP_SIZE * TILE_W + 80;
export const WORLD_H = MAP_SIZE * TILE_H + 180;
const ORIGIN_X = WORLD_W / 2;
const ORIGIN_Y = 120;

/** Quarter turns of the camera. The world never changes, only how it is projected. */
export type Rotation = 0 | 1 | 2 | 3;

export type Pair = [number, number];

export function rotate(r: Rotation, x: number, y: number): Pair {
  if (r === 1) return [y, MAP_SIZE - x];
  if (r === 2) return [MAP_SIZE - x, MAP_SIZE - y];
  if (r === 3) return [MAP_SIZE - y, x];
  return [x, y];
}

export function unrotate(r: Rotation, x: number, y: number): Pair {
  if (r === 1) return [MAP_SIZE - y, x];
  if (r === 2) return [MAP_SIZE - x, MAP_SIZE - y];
  if (r === 3) return [y, MAP_SIZE - x];
  return [x, y];
}

/** Turns a world direction into a view direction. */
export function rotateDelta(r: Rotation, dx: number, dy: number): Pair {
  if (r === 1) return [dy, -dx];
  if (r === 2) return [-dx, -dy];
  if (r === 3) return [-dy, dx];
  return [dx, dy];
}

/** Turns a view direction into a world direction. */
export function unrotateDelta(r: Rotation, dx: number, dy: number): Pair {
  if (r === 1) return [-dy, dx];
  if (r === 2) return [-dx, -dy];
  if (r === 3) return [dy, -dx];
  return [dx, dy];
}

/** Screen position of a point already in view coordinates. */
export function projectView(x: number, y: number, z = 0): Pair {
  return [ORIGIN_X + ((x - y) * TILE_W) / 2, ORIGIN_Y + ((x + y) * TILE_H) / 2 - z];
}

export function project(r: Rotation, x: number, y: number, z = 0): Pair {
  const [vx, vy] = rotate(r, x, y);
  return projectView(vx, vy, z);
}

/** Larger means closer to the camera. */
export function depthOf(r: Rotation, x: number, y: number): number {
  const [vx, vy] = rotate(r, x, y);
  return vx + vy;
}

export function screenToWorld(r: Rotation, sx: number, sy: number): Pair {
  const u = (sx - ORIGIN_X) / (TILE_W / 2);
  const w = (sy - ORIGIN_Y) / (TILE_H / 2);
  return unrotate(r, (u + w) / 2, (w - u) / 2);
}
