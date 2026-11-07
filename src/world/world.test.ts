import { describe, expect, it } from 'vitest';
import { FRIENDS } from '../game/friends';
import { Collision } from './collision';
import {
  HOUSE_SIZE,
  MAP_SIZE,
  project,
  rotate,
  rotateDelta,
  screenToWorld,
  unrotate,
  unrotateDelta,
  type Pair,
  type Rotation,
} from './iso';
import { NEW_HOUSE_SPOTS, buildVillage, doorSpot, houseAtDoor } from './layout';
import { findPath } from './path';

const village = buildVillage();
const collision = new Collision(village);
const ROTATIONS: Rotation[] = [0, 1, 2, 3];

describe('projection', () => {
  it.each(ROTATIONS)('turns a point and back at rotation %i', (r) => {
    expect(unrotate(r, ...rotate(r, 12.5, 30))).toEqual([12.5, 30]);
    expect(unrotateDelta(r, ...rotateDelta(r, 1, -2))).toEqual([1, -2]);
  });

  it.each(ROTATIONS)('finds the spot on the map that was tapped at rotation %i', (r) => {
    const [x, y] = screenToWorld(r, ...project(r, 20.25, 7.5));
    expect(x).toBeCloseTo(20.25);
    expect(y).toBeCloseTo(7.5);
  });
});

describe('the village', () => {
  it('has one shop, reachable from where Sushi starts', () => {
    const shops = village.houses.filter((h) => h.isShop);
    expect(shops).toHaveLength(1);
    const [shop] = shops;
    const path = findPath(collision, village.start, doorSpot(shop));
    expect(path.length).toBeGreaterThan(0);
    expect(houseAtDoor(village, ...doorSpot(shop))).toBe(shop);
  });

  it('keeps houses far apart', () => {
    for (const a of village.houses) {
      for (const b of village.houses) {
        if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(12);
      }
    }
  });

  it('keeps trees well apart', () => {
    for (const a of village.trees) {
      for (const b of village.trees) {
        if (a !== b) expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBeGreaterThanOrEqual(11);
      }
    }
  });

  it('gives every friend their own house, plus one for Sushi', () => {
    expect(FRIENDS).toHaveLength(12);
    expect(village.houses.find((h) => h.owner?.id === 'saba')).toMatchObject({ x: 98, y: 100 });
    const homes = village.houses.filter((h) => !h.isShop);
    expect(homes).toHaveLength(FRIENDS.length + 1);
    expect(homes[0].owner).toBeNull();
    expect(new Set(village.residents.map((r) => r.friend.id)).size).toBe(FRIENDS.length);
    const owners = village.houses.flatMap((h) => (h.owner ? [h.owner.id] : []));
    expect(new Set(owners).size).toBe(FRIENDS.length);
  });

  it('puts every friend next to their house', () => {
    for (const r of village.residents) {
      const home = village.houses.find((h) => h.owner?.id === r.friend.id)!;
      expect(Math.abs(r.y - (home.y + HOUSE_SIZE))).toBeLessThan(3);
    }
  });

  it('keeps houses out of the river and off the map edge', () => {
    for (const h of village.houses) {
      for (let y = 0; y < HOUSE_SIZE; y++) {
        for (let x = 0; x < HOUSE_SIZE; x++) expect(village.tiles[h.y + y][h.x + x]).not.toBe('water');
      }
      expect(h.x + HOUSE_SIZE).toBeLessThanOrEqual(MAP_SIZE);
      expect(h.y + HOUSE_SIZE).toBeLessThanOrEqual(MAP_SIZE);
    }
  });

  it('has plenty of bamboo to collect', () => {
    expect(village.trees.filter((t) => t.kind === 'bamboo').length).toBeGreaterThanOrEqual(12);
  });

  it('is twice as wide and tall as before', () => {
    expect(MAP_SIZE).toBe(140);
    expect(village.tiles).toHaveLength(140);
  });

  it('keeps the old village in the middle, in the same shape', () => {
    const old = [[8, 8], [20, 6], [52, 7], [57, 20], [7, 50], [22, 54], [50, 53]];
    old.forEach(([x, y], i) => expect([village.houses[i].x, village.houses[i].y]).toEqual([x + 35, y + 35]));
    const shop = village.houses.find((h) => h.isShop)!;
    expect([shop.x, shop.y]).toEqual([18 + 35, 21 + 35]);
  });

  it('has two bridges, each crossing the whole river', () => {
    expect(village.bridges).toHaveLength(2);
    for (const b of village.bridges) {
      for (let y = b.y0; y < b.y1; y++) {
        village.tiles[y].forEach((tile, x) => {
          if (x >= b.x0 - 3 && x <= b.x1 + 3) expect(tile).not.toBe('water');
        });
      }
    }
  });

  it('crosses by the south bridge in the south', () => {
    const south = village.bridges[1];
    const from: Pair = [south.x0 - 4, (south.y0 + south.y1) / 2];
    const to: Pair = [south.x1 + 4, (south.y0 + south.y1) / 2];
    const path = findPath(collision, from, to);
    expect(path.length).toBeGreaterThan(0);
    expect(Math.hypot(path.at(-1)![0] - to[0], path.at(-1)![1] - to[1])).toBeLessThan(1);
    expect(path.every(([, y]) => y > village.bridges[0].y1)).toBe(true);
  });

  // In the old village one path already ran on under the shop, and the old village keeps its shape.
  it('never puts a new house on the road or the river', () => {
    for (const [hx, hy] of NEW_HOUSE_SPOTS) {
      for (let y = 0; y < HOUSE_SIZE; y++) {
        for (let x = 0; x < HOUSE_SIZE; x++) expect(village.tiles[hy + y][hx + x], `${hx},${hy}`).toBe('grass');
      }
    }
  });

  it('plans routes across the whole village quickly', () => {
    const started = performance.now();
    for (const h of village.houses) findPath(collision, village.start, doorSpot(h));
    expect(performance.now() - started).toBeLessThan(1500);
  });

  it('starts Sushi somewhere free', () => {
    expect(collision.blocked(...village.start)).toBe(false);
  });
});

describe('collision', () => {
  it('blocks water, houses and trees', () => {
    const tree = village.trees[0];
    const water = village.tiles[85].indexOf('water');
    expect(collision.blocked(water + 2.5, 85.5)).toBe(true);
    expect(collision.blocked(village.houses[0].x + 2, village.houses[0].y + 2)).toBe(true);
    expect(collision.blocked(tree.x + 0.5, tree.y + 0.5)).toBe(true);
  });

  it('blocks exactly where a tree-by-tree check would', () => {
    const near = (x: number, y: number) =>
      village.trees.some((t) => Math.hypot(t.x + 0.5 - x, t.y + 0.5 - y) < (t.kind === 'bamboo' ? 0.9 : 0.65) + 0.45);
    for (const t of village.trees.slice(0, 20)) {
      for (let dy = -2; dy <= 2; dy += 0.25) {
        for (let dx = -2; dx <= 2; dx += 0.25) {
          const x = t.x + 0.5 + dx;
          const y = t.y + 0.5 + dy;
          if (near(x, y)) expect(collision.blocked(x, y)).toBe(true);
        }
      }
    }
  });

  it('keeps every friend on open ground at the start', () => {
    for (const r of village.residents) expect(collision.blocked(r.x, r.y)).toBe(false);
  });

  it('lets Sushi cross the bridges but not their railings', () => {
    for (const { x0, x1, y0, y1 } of village.bridges) {
      const mid = (x0 + x1) / 2;
      expect(collision.blocked(mid, (y0 + y1) / 2)).toBe(false);
      expect(collision.blocked(mid, y1)).toBe(true);
      expect(collision.blocked(mid, y0)).toBe(true);
    }
  });
});

describe('finding a route', () => {
  const reaches = (to: [number, number], slack = 2.5) => {
    const path = findPath(collision, village.start, to);
    const end = path[path.length - 1];
    expect(end).toBeDefined();
    expect(Math.hypot(end[0] - to[0], end[1] - to[1])).toBeLessThan(slack);
  };

  it('reaches every friend', () => {
    for (const r of village.residents) reaches([r.x, r.y]);
  });

  it('reaches every bamboo tree', () => {
    for (const t of village.trees.filter((tree) => tree.kind === 'bamboo')) reaches([t.x + 0.5, t.y + 0.5]);
  });

  it('never leads through anything solid', () => {
    const path = findPath(collision, village.start, [99.5, 69.5]);
    let [x, y] = village.start;
    for (const [nx, ny] of path) {
      for (let t = 0; t <= 1; t += 0.05) expect(collision.blocked(x + (nx - x) * t, y + (ny - y) * t)).toBe(false);
      [x, y] = [nx, ny];
    }
  });

  it('crosses the river by the bridge', () => {
    const { x0, x1, y0, y1 } = village.bridges[0];
    const path = findPath(collision, village.start, [99.5, 69.5]);
    let [x, y] = village.start;
    let onBridge = false;
    for (const [nx, ny] of path) {
      for (let t = 0; t <= 1; t += 0.05) {
        const px = x + (nx - x) * t;
        const py = y + (ny - y) * t;
        if (px > x0 + 2 && px < x1 - 2 && py > y0 && py < y1) onBridge = true;
      }
      [x, y] = [nx, ny];
    }
    expect(onBridge).toBe(true);
  });
});
