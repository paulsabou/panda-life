import { MAP_SIZE } from './iso';
import type { Village } from './layout';

const FOOT_RADIUS = 0.45;
const BAMBOO_RADIUS = 0.9;
const TREE_RADIUS = 0.65;
const RAIL_THICKNESS = 0.15;

interface Solid {
  x: number;
  y: number;
  r: number;
}

/** Anything characters walk around on: the village, or the inside of a house. */
export interface Ground {
  blocked(x: number, y: number): boolean;
}

export class Collision implements Ground {
  /** Each tile lists the trees close enough to block feet standing on it. */
  private solidsByTile = new Map<number, Solid[]>();

  constructor(private village: Village) {
    for (const t of village.trees) {
      const solid = { x: t.x + 0.5, y: t.y + 0.5, r: t.kind === 'bamboo' ? BAMBOO_RADIUS : TREE_RADIUS };
      const reach = solid.r + FOOT_RADIUS;
      for (let ty = Math.floor(solid.y - reach); ty <= Math.floor(solid.y + reach); ty++) {
        for (let tx = Math.floor(solid.x - reach); tx <= Math.floor(solid.x + reach); tx++) {
          const key = ty * MAP_SIZE + tx;
          const list = this.solidsByTile.get(key);
          if (list) list.push(solid);
          else this.solidsByTile.set(key, [solid]);
        }
      }
    }
  }

  /** True if a character's feet can't stand here. Characters also avoid each other, see `Walker`. */
  blocked(x: number, y: number): boolean {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      if (this.groundSolid(x + Math.cos(a) * FOOT_RADIUS, y + Math.sin(a) * FOOT_RADIUS)) return true;
    }
    if (this.groundSolid(x, y)) return true;
    const nearby = this.solidsByTile.get(Math.floor(y) * MAP_SIZE + Math.floor(x));
    return !!nearby && nearby.some((s) => Math.hypot(s.x - x, s.y - y) < s.r + FOOT_RADIUS);
  }

  private groundSolid(x: number, y: number): boolean {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE) return true;
    if (this.village.tiles[ty][tx] === 'water' || this.village.houseTiles.has(`${tx},${ty}`)) return true;
    return this.village.bridges.some(
      ({ x0, x1, y0, y1 }) => x >= x0 && x <= x1 && (Math.abs(y - y0) < RAIL_THICKNESS || Math.abs(y - y1) < RAIL_THICKNESS),
    );
  }
}
