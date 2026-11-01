import { describe, expect, it } from 'vitest';
import { Collision } from './collision';
import { HOUSE_SIZE, MAP_SIZE, type Pair } from './iso';
import { buildVillage, doorSpot, houseAt, houseAtDoor } from './layout';
import { findPath } from './path';
import {
  CARPET,
  FURNITURE,
  ROOM_D,
  ROOM_SPAWN,
  ROOM_W,
  RoomCollision,
  SHOPKEEPER_SPOT,
  SHOP_FURNITURE,
  atCounter,
  atRoomDoor,
  roomDoorSpot,
} from './room';

const room = new RoomCollision();

describe('inside a house', () => {
  it('has everything a home needs', () => {
    const kinds = new Set(FURNITURE.map((f) => f.kind));
    for (const kind of ['kitchen', 'bench', 'bookshelf', 'table', 'chair', 'plant'] as const) {
      expect(kinds.has(kind)).toBe(true);
    }
    expect(FURNITURE.filter((f) => f.kind === 'chair').length).toBeGreaterThanOrEqual(2);
    expect(CARPET.w).toBeGreaterThan(0);
  });

  it('keeps all the furniture inside the room and apart', () => {
    FURNITURE.forEach((a, i) => {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.x + a.w).toBeLessThanOrEqual(ROOM_W);
      expect(a.y + a.d).toBeLessThanOrEqual(ROOM_D);
      FURNITURE.slice(i + 1).forEach((b) => {
        const overlaps = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
        expect(overlaps).toBe(false);
      });
    });
  });

  it('starts Sushi on open floor, clear of the door', () => {
    expect(room.blocked(...ROOM_SPAWN)).toBe(false);
    expect(atRoomDoor(...ROOM_SPAWN)).toBe(false);
  });

  it('does not let Sushi walk through furniture or walls', () => {
    for (const f of FURNITURE) expect(room.blocked(f.x + f.w / 2, f.y + f.d / 2)).toBe(true);
    expect(room.blocked(7, 0.1)).toBe(true);
    expect(room.blocked(-1, 5)).toBe(true);
    expect(room.blocked(ROOM_W, 5)).toBe(true);
    expect(room.blocked(5, ROOM_D)).toBe(true);
  });

  it('lets Sushi walk on the carpet', () => {
    expect(room.blocked(CARPET.x + 0.7, CARPET.y + 0.7)).toBe(false);
  });

  it('lets Sushi reach every piece of furniture and get back to the door', () => {
    for (const f of FURNITURE) {
      const target: Pair = [f.x + f.w / 2, f.y + f.d / 2];
      const path = findPath(room, ROOM_SPAWN, target);
      const end = path[path.length - 1];
      expect(end).toBeDefined();
      expect(Math.hypot(end[0] - target[0], end[1] - target[1])).toBeLessThan(Math.max(f.w, f.d) / 2 + 1.5);
    }
    const out = findPath(room, [12.5, 11], roomDoorSpot());
    const end = out[out.length - 1];
    expect(Math.hypot(end[0] - roomDoorSpot()[0], end[1] - roomDoorSpot()[1])).toBeLessThan(1);
  });

  it('counts as leaving when standing at the door', () => {
    expect(atRoomDoor(...roomDoorSpot())).toBe(true);
    expect(atRoomDoor(3, 0.6)).toBe(false);
  });
});

describe('inside the shop', () => {
  const shop = new RoomCollision(SHOP_FURNITURE);

  it('keeps all the furniture inside the room and apart', () => {
    SHOP_FURNITURE.forEach((a, i) => {
      expect(a.x + a.w).toBeLessThanOrEqual(ROOM_W);
      expect(a.y + a.d).toBeLessThanOrEqual(ROOM_D);
      SHOP_FURNITURE.slice(i + 1).forEach((b) => {
        expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d).toBe(false);
      });
    });
  });

  it('starts Sushi on open floor', () => {
    expect(shop.blocked(...ROOM_SPAWN)).toBe(false);
    expect(atCounter(...ROOM_SPAWN)).toBe(false);
  });

  it('lets Sushi walk up to the counter and back out of the door', () => {
    const toCounter = findPath(shop, ROOM_SPAWN, [4.5, 5.5]);
    const end = toCounter[toCounter.length - 1];
    expect(atCounter(end[0], end[1])).toBe(true);
    const out = findPath(shop, [4.5, 5.5], roomDoorSpot());
    expect(atRoomDoor(...out[out.length - 1])).toBe(true);
  });

  it('keeps Sushi out from behind the counter', () => {
    const path = findPath(shop, ROOM_SPAWN, SHOPKEEPER_SPOT);
    const end = path[path.length - 1];
    expect(end[0]).toBeGreaterThan(3);
  });
});

describe('front doors', () => {
  const village = buildVillage();
  const collision = new Collision(village);

  it('has a spot Sushi can stand on in front of every door', () => {
    for (const house of village.houses) {
      expect(collision.blocked(...doorSpot(house))).toBe(false);
      expect(houseAtDoor(village, ...doorSpot(house))).toBe(house);
    }
  });

  it('can be reached from where Sushi starts', () => {
    for (const house of village.houses) {
      const path = findPath(collision, village.start, doorSpot(house));
      const end = path[path.length - 1];
      expect(Math.hypot(end[0] - doorSpot(house)[0], end[1] - doorSpot(house)[1])).toBeLessThan(1);
    }
  });

  it('only counts in front of the door, not along the rest of the wall', () => {
    const house = village.houses[0];
    expect(houseAtDoor(village, house.x + 0.4, house.y + HOUSE_SIZE + 0.5)).toBeNull();
    expect(houseAtDoor(village, house.x + 2.5, house.y + HOUSE_SIZE + 3)).toBeNull();
  });

  it('knows which house a tap landed on', () => {
    const house = village.houses[2];
    expect(houseAt(village, house.x + 1, house.y + 1)).toBe(house);
    expect(houseAt(village, MAP_SIZE - 0.5, MAP_SIZE - 0.5)).toBeNull();
  });
});
