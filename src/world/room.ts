import type { Ground } from './collision';
import type { Pair } from './iso';

/** Every house has the same one-room layout, drawn in the colours of that house. */
export const ROOM_W = 14;
export const ROOM_D = 12;

export type FurnitureKind =
  | 'kitchen'
  | 'fridge'
  | 'bench'
  | 'bookshelf'
  | 'table'
  | 'chair'
  | 'plant'
  | 'counter'
  | 'wallShelf'
  | 'shelf'
  | 'crate';

export interface Furniture {
  kind: FurnitureKind;
  x: number;
  y: number;
  w: number;
  d: number;
  /** Which side a chair's back is on. */
  back?: 'x-' | 'x+' | 'y-' | 'y+';
}

export const FURNITURE: readonly Furniture[] = [
  { kind: 'kitchen', x: 0, y: 1, w: 1.8, d: 6.4 },
  { kind: 'fridge', x: 0, y: 7.6, w: 1.8, d: 1.7 },
  { kind: 'bench', x: 2.4, y: 0, w: 3.2, d: 1.1 },
  { kind: 'bookshelf', x: 9.2, y: 0, w: 3.6, d: 1 },
  { kind: 'table', x: 8, y: 6, w: 3, d: 2.4 },
  { kind: 'chair', x: 8.9, y: 4.6, w: 1.2, d: 1.2, back: 'y-' },
  { kind: 'chair', x: 8.9, y: 8.6, w: 1.2, d: 1.2, back: 'y+' },
  { kind: 'chair', x: 6.6, y: 6.6, w: 1.2, d: 1.2, back: 'x-' },
  { kind: 'chair', x: 11.2, y: 6.6, w: 1.2, d: 1.2, back: 'x+' },
  { kind: 'plant', x: 13, y: 0.2, w: 0.9, d: 0.9 },
  { kind: 'plant', x: 0.2, y: 10.8, w: 0.9, d: 0.9 },
  { kind: 'plant', x: 13, y: 10.9, w: 0.9, d: 0.9 },
];

/**
 * The shop: a long counter with the shopkeeper behind it, closed in by the wall
 * of goods and a crate so nobody can wander round the back.
 */
export const SHOP_FURNITURE: readonly Furniture[] = [
  { kind: 'wallShelf', x: 0, y: 0, w: 0.9, d: 12 },
  { kind: 'counter', x: 2.4, y: 0, w: 1.2, d: 9.4 },
  { kind: 'crate', x: 0.9, y: 9.4, w: 2.7, d: 1.3 },
  { kind: 'shelf', x: 8.6, y: 3, w: 1.1, d: 3.4 },
  { kind: 'shelf', x: 8.6, y: 7.6, w: 1.1, d: 3.4 },
  { kind: 'shelf', x: 12, y: 1.4, w: 1.1, d: 4 },
  { kind: 'shelf', x: 12, y: 6.6, w: 1.1, d: 4 },
  { kind: 'plant', x: 13, y: 10.9, w: 0.9, d: 0.9 },
  { kind: 'crate', x: 4.6, y: 10.2, w: 2, d: 1.3 },
];

/** Where the shopkeeper stands, behind the counter. */
export const SHOPKEEPER_SPOT: Pair = [1.65, 5];

/** Stand here, in front of the counter, to trade. */
const COUNTER_FRONT = { x0: 3.6, x1: 4.75, y0: 2.5, y1: 7.5 };

export function atCounter(x: number, y: number): boolean {
  const { x0, x1, y0, y1 } = COUNTER_FRONT;
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

/** Walkable, flat on the floor. */
export const CARPET = { x: 6, y: 4, w: 7, d: 7 };

/** The doorway in the back wall, which runs along y = 0. */
export const ROOM_DOOR = { x0: 6.2, x1: 8.2, y: 0 };
export const ROOM_SPAWN: Pair = [7.2, 2.2];
const DOOR_REACH = 0.75;
const FOOT_RADIUS = 0.45;

export class RoomCollision implements Ground {
  constructor(private furniture: readonly Furniture[] = FURNITURE) {}

  blocked(x: number, y: number): boolean {
    if (x < FOOT_RADIUS || y < FOOT_RADIUS || x > ROOM_W - FOOT_RADIUS || y > ROOM_D - FOOT_RADIUS) return true;
    return this.furniture.some(
      (f) =>
        x > f.x - FOOT_RADIUS &&
        x < f.x + f.w + FOOT_RADIUS &&
        y > f.y - FOOT_RADIUS &&
        y < f.y + f.d + FOOT_RADIUS,
    );
  }
}

/** True when standing right at the door, ready to walk out. */
export function atRoomDoor(x: number, y: number): boolean {
  return x >= ROOM_DOOR.x0 - 0.1 && x <= ROOM_DOOR.x1 + 0.1 && y <= DOOR_REACH;
}

/** The spot to stand on when asked to leave by tapping the door. */
export function roomDoorSpot(): Pair {
  return [(ROOM_DOOR.x0 + ROOM_DOOR.x1) / 2, 0.6];
}
