import { FRIENDS, type Friend } from '../game/friends';
import { HOUSE_SIZE, MAP_SIZE, type Pair } from './iso';

export type Tile = 'grass' | 'path' | 'water' | 'bridge';

export interface House {
  x: number;
  y: number;
  style: number;
  owner: Friend | null;
  isShop: boolean;
}

export interface Tree {
  x: number;
  y: number;
  kind: 'bamboo' | 'round';
  variant: number;
}

export interface Flower {
  x: number;
  y: number;
}

export interface Resident {
  friend: Friend;
  x: number;
  y: number;
}

export interface Bridge {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface Village {
  tiles: Tile[][];
  houses: House[];
  residents: Resident[];
  trees: Tree[];
  flowers: Flower[];
  /** The old bridge in the middle, then the one in the south. */
  bridges: Bridge[];
  start: [number, number];
  /** Tiles taken up by a house, as "x,y". */
  houseTiles: Set<string>;
}

export const ROUND_TREE_STYLES = 6;
export const BAMBOO_STYLES = 4;

/** The first village was 70 tiles square. It sits in the middle of today's, moved by this much. */
export const OLD_VILLAGE_OFFSET = 35;
const shift = ([x, y]: [number, number]): [number, number] => [x + OLD_VILLAGE_OFFSET, y + OLD_VILLAGE_OFFSET];

const HOUSE_SPOTS: [number, number][] = (
  [
    [8, 8],
    [20, 6],
    [52, 7],
    [57, 20],
    [7, 50],
    [22, 54],
    [50, 53],
  ] as [number, number][]
).map(shift);
const SHOP_SPOT = shift([18, 21]);
/** Homes around the old village, in the order the newer friends joined: Nori, Toro, Ume, Tako, Mochi, Saba. */
export const NEW_HOUSE_SPOTS: [number, number][] = [
  [48, 26],
  [96, 28],
  [104, 68],
  [56, 102],
  [28, 84],
  [98, 100],
];
/** The shop has its own look, after the four house styles. */
export const SHOP_STYLE = 4;
const DOOR_MIDDLE = HOUSE_SIZE / 2;
const DOOR_HALF_WIDTH = 1.1;
const DOOR_REACH = 0.85;
const RIVER_WIDTH = 6;
interface BridgeSpot {
  rows: [number, number];
  columns: [number, number];
}
const BRIDGE_SPOTS: BridgeSpot[] = [
  { rows: [68, 71], columns: [61, 71] },
  { rows: [110, 113], columns: [71, 81] },
];
const TREE_GAP = 11;
const BAMBOO_CHANCE = 0.16;
const ROUND_TREE_CHANCE = 0.08;
const FLOWER_CHANCE = 0.04;

function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A road wanders across the village but runs straight over its bridge. */
function wanderingRow(x: number, bridgeX: number, centre: number, swing: number): number {
  const fromBridge = x - bridgeX;
  const ease = Math.max(0, Math.min(1, (Math.abs(fromBridge) - 8) / 6));
  return Math.round(centre + swing * Math.sin(fromBridge / 9) * ease);
}

function mainRoadRow(x: number): number {
  return wanderingRow(x, 66, 69, 6);
}

function southRoadRow(x: number): number {
  return wanderingRow(x, 76, 111, 4);
}

const ROADS = [mainRoadRow, southRoadRow];

function riverX(y: number): number {
  return Math.round(68 + 7 * Math.sin((y - 35) / 9));
}

/** A path from each door to a road: the old village's go to the main road as they always did, newer homes to the nearest. */
function layGround(tiles: Tile[][]): void {
  for (let y = 0; y < MAP_SIZE; y++) {
    const x0 = riverX(y);
    for (let i = 0; i < RIVER_WIDTH; i++) tiles[y][x0 + i] = 'water';
  }
  const lay = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE || tiles[y][x] === 'water') return;
    tiles[y][x] = 'path';
  };
  for (const roadRow of ROADS) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const row = roadRow(x);
      lay(x, row);
      lay(x, row + 1);
      if (x > 0) {
        const from = Math.min(row, roadRow(x - 1));
        const to = Math.max(row, roadRow(x - 1)) + 1;
        for (let y = from; y <= to; y++) lay(x, y);
      }
    }
  }
  for (const { rows, columns } of BRIDGE_SPOTS) {
    for (let y = rows[0]; y <= rows[1]; y++) {
      for (let x = columns[0]; x <= columns[1]; x++) tiles[y][x] = 'bridge';
    }
  }
  const homes = [
    ...[...HOUSE_SPOTS, SHOP_SPOT].map((spot) => ({ spot, roads: [mainRoadRow] })),
    ...NEW_HOUSE_SPOTS.map((spot) => ({ spot, roads: ROADS })),
  ];
  for (const { spot, roads } of homes) {
    const [hx, hy] = spot;
    const doorX = hx + 2;
    const doorY = hy + HOUSE_SIZE;
    const road = roads.reduce((best, next) => (Math.abs(next(doorX) - doorY) < Math.abs(best(doorX) - doorY) ? next : best));
    if (road(doorX) >= doorY) {
      for (let y = doorY; y <= road(doorX); y++) lay(doorX, y);
    } else {
      const side = hx - 1;
      for (let x = doorX; x >= side; x--) lay(x, doorY);
      for (let y = doorY; y >= road(side); y--) lay(side, y);
    }
  }
}

export function buildVillage(seed = 40): Village {
  const roll = rng(seed);
  const tiles: Tile[][] = Array.from({ length: MAP_SIZE }, () => Array<Tile>(MAP_SIZE).fill('grass'));
  layGround(tiles);

  // The first house is Sushi's, the rest belong to the friends in order.
  const houses: House[] = HOUSE_SPOTS.map(([x, y], i) => ({
    x,
    y,
    style: i % 4,
    owner: i === 0 ? null : FRIENDS[i - 1],
    isShop: false,
  }));
  NEW_HOUSE_SPOTS.forEach(([x, y], i) => {
    houses.push({ x, y, style: (HOUSE_SPOTS.length + i) % 4, owner: FRIENDS[HOUSE_SPOTS.length - 1 + i], isShop: false });
  });
  houses.push({ x: SHOP_SPOT[0], y: SHOP_SPOT[1], style: SHOP_STYLE, owner: null, isShop: true });
  const residents: Resident[] = houses.flatMap((h) =>
    h.owner ? [{ friend: h.owner, x: h.x + 0.8, y: h.y + HOUSE_SIZE + 1.4 }] : [],
  );

  const houseTiles = new Set<string>();
  const keepClear = new Set<string>();
  const clear = (x0: number, x1: number, y0: number, y1: number) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) keepClear.add(`${x},${y}`);
  };
  for (const h of houses) {
    for (let y = 0; y < HOUSE_SIZE; y++) for (let x = 0; x < HOUSE_SIZE; x++) houseTiles.add(`${h.x + x},${h.y + y}`);
    clear(h.x - 3, h.x + HOUSE_SIZE + 8, h.y - 3, h.y + HOUSE_SIZE + 8);
  }
  const bridges: Bridge[] = BRIDGE_SPOTS.map(({ rows, columns }) => ({
    x0: columns[0],
    x1: columns[1] + 1,
    y0: rows[0],
    y1: rows[1] + 1,
  }));
  for (const bridge of bridges) clear(bridge.x0 - 3, bridge.x1 + 12, bridge.y0 - 3, bridge.y1 + 12);
  const startX = 14 + OLD_VILLAGE_OFFSET;
  const start: [number, number] = [startX + 0.5, mainRoadRow(startX) + 0.5];
  clear(startX - 3, startX + 4, mainRoadRow(startX) - 3, mainRoadRow(startX) + 4);

  const trees: Tree[] = [];
  const flowers: Flower[] = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (tiles[y][x] !== 'grass') continue;
      const v = roll();
      const crowded = trees.some((t) => Math.abs(t.x - x) + Math.abs(t.y - y) < TREE_GAP);
      if (keepClear.has(`${x},${y}`) || crowded) {
        if (v < FLOWER_CHANCE) flowers.push({ x, y });
      } else if (v < BAMBOO_CHANCE) {
        trees.push({ x, y, kind: 'bamboo', variant: Math.floor(roll() * BAMBOO_STYLES) });
      } else if (v < BAMBOO_CHANCE + ROUND_TREE_CHANCE) {
        trees.push({ x, y, kind: 'round', variant: Math.floor(roll() * ROUND_TREE_STYLES) });
      } else if (v < BAMBOO_CHANCE + ROUND_TREE_CHANCE + FLOWER_CHANCE) {
        flowers.push({ x, y });
      }
    }
  }

  return { tiles, houses, residents, trees, flowers, bridges, start, houseTiles };
}

/** Where Sushi stands to walk in: the door is in the middle of a house's +y wall. */
export function doorSpot(house: House): Pair {
  return [house.x + DOOR_MIDDLE, house.y + HOUSE_SIZE + 0.6];
}

/** Where Sushi comes back out, a step clear of the door. */
export function outsideSpot(house: House): Pair {
  return [house.x + DOOR_MIDDLE, house.y + HOUSE_SIZE + 2];
}

export function houseAtDoor(village: Village, x: number, y: number): House | null {
  const house = village.houses.find(
    (h) =>
      Math.abs(x - (h.x + DOOR_MIDDLE)) <= DOOR_HALF_WIDTH &&
      y >= h.y + HOUSE_SIZE &&
      y <= h.y + HOUSE_SIZE + DOOR_REACH,
  );
  return house ?? null;
}

export function houseAt(village: Village, x: number, y: number): House | null {
  const house = village.houses.find(
    (h) => x >= h.x && x < h.x + HOUSE_SIZE && y >= h.y && y < h.y + HOUSE_SIZE,
  );
  return house ?? null;
}
