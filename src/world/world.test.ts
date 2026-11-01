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
  type Rotation,
} from './iso';
import { buildVillage, doorSpot, houseAtDoor } from './layout';
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

  it('gives each of the six friends their own house, plus one for Sushi', () => {
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

  it('starts Sushi somewhere free', () => {
    expect(collision.blocked(...village.start)).toBe(false);
  });
});

describe('collision', () => {
  it('blocks water, houses and trees', () => {
    const tree = village.trees[0];
    const water = village.tiles[50].indexOf('water');
    expect(collision.blocked(water + 2.5, 50.5)).toBe(true);
    expect(collision.blocked(village.houses[0].x + 2, village.houses[0].y + 2)).toBe(true);
    expect(collision.blocked(tree.x + 0.5, tree.y + 0.5)).toBe(true);
  });

  it('keeps every friend on open ground at the start', () => {
    for (const r of village.residents) expect(collision.blocked(r.x, r.y)).toBe(false);
  });

  it('lets Sushi cross the bridge but not its railings', () => {
    const { x0, x1, y0, y1 } = village.bridge;
    const mid = (x0 + x1) / 2;
    expect(collision.blocked(mid, (y0 + y1) / 2)).toBe(false);
    expect(collision.blocked(mid, y1)).toBe(true);
    expect(collision.blocked(mid, y0)).toBe(true);
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
    const path = findPath(collision, village.start, [64.5, 34.5]);
    let [x, y] = village.start;
    for (const [nx, ny] of path) {
      for (let t = 0; t <= 1; t += 0.05) expect(collision.blocked(x + (nx - x) * t, y + (ny - y) * t)).toBe(false);
      [x, y] = [nx, ny];
    }
  });

  it('crosses the river by the bridge', () => {
    const { x0, x1, y0, y1 } = village.bridge;
    const path = findPath(collision, village.start, [64.5, 34.5]);
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
