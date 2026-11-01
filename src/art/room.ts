import { TILE_H, TILE_W, type Pair } from '../world/iso';
import { CARPET, ROOM_D, ROOM_DOOR, ROOM_W, type Furniture } from '../world/room';

/** The room picture, in world pixels. Its back corner is at (ROOM_X, ROOM_Y). */
export const ROOM_CANVAS = { w: 900, h: 660 };
const ROOM_X = 427;
const ROOM_Y = 240;
const WALL_H = 150;
const SCALE = 2;
const PAD = 30;

const WOOD = { top: '#b98a5c', left: '#a0744a', right: '#8f653f', line: '#6f4c2e' };
const TIMBER = '#5f4230';
const PLASTER_L = '#fbf5e6';
const PLASTER_R = '#f1e8d3';
const TATAMI = '#dcdca2';
const TATAMI_LINE = '#c9cb8e';
const TATAMI_EDGE = '#5f7a5a';
const BOARD = '#b98f63';
const BOARD_LINE = '#9c7650';
const INK = '#4a3a3a';

export const ROOM_STYLES = [
  { accent: '#6fbfa8', carpet: '#7fae9e', carpetInner: '#cfe3d4' },
  { accent: '#ff9f93', carpet: '#c98a7c', carpetInner: '#f3d9cf' },
  { accent: '#ffd166', carpet: '#c9a860', carpetInner: '#f3e6bf' },
  { accent: '#8fa9f0', carpet: '#7f8fbe', carpetInner: '#d6def2' },
  { accent: '#ff7fa8', carpet: '#c97f9a', carpetInner: '#f8dfe6' },
];

type Ctx = CanvasRenderingContext2D;
type Place = (x: number, y: number, z?: number) => Pair;

/** A spot in the room, as a position in the world. */
export const roomAt: Place = (x, y, z = 0) => [
  ROOM_X + ((x - y) * TILE_W) / 2,
  ROOM_Y + ((x + y) * TILE_H) / 2 - z,
];

export function worldToRoom(sx: number, sy: number): Pair {
  const u = (sx - ROOM_X) / (TILE_W / 2);
  const w = (sy - ROOM_Y) / (TILE_H / 2);
  return [(u + w) / 2, (w - u) / 2];
}

/** The doorway on screen, so tapping the door walks out. */
export function roomDoorBox(): { left: number; right: number; top: number; bottom: number } {
  const a = roomAt(ROOM_DOOR.x0, 0, 106);
  const b = roomAt(ROOM_DOOR.x1, 0, 0);
  return { left: a[0], right: b[0], top: a[1], bottom: b[1] };
}

function poly(c: Ctx, points: Pair[], fill: string, line?: string): void {
  c.beginPath();
  points.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (line) {
    c.strokeStyle = line;
    c.lineWidth = 1.2;
    c.lineJoin = 'round';
    c.stroke();
  }
}

function circle(c: Ctx, x: number, y: number, r: number, fill: string): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
}

function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, rot: number, fill: string): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
}

function stroke(c: Ctx, points: Pair[], colour: string, width: number): void {
  c.beginPath();
  points.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.strokeStyle = colour;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.stroke();
}

function smile(c: Ctx, x: number, y: number, s: number): void {
  circle(c, x - s, y, s * 0.3, INK);
  circle(c, x + s, y, s * 0.3, INK);
  c.beginPath();
  c.arc(x, y + s * 0.15, s * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
  c.strokeStyle = INK;
  c.lineWidth = 1.1;
  c.stroke();
  ellipse(c, x - s * 1.5, y + s * 0.5, s * 0.42, s * 0.26, 0, 'rgba(255,120,150,.6)');
  ellipse(c, x + s * 1.5, y + s * 0.5, s * 0.42, s * 0.26, 0, 'rgba(255,120,150,.6)');
}

function blossom(c: Ctx, x: number, y: number, s: number): void {
  for (let i = 0; i < 5; i++) {
    const a = i * 1.257 - 1.57;
    ellipse(c, x + Math.cos(a) * s * 0.62, y + Math.sin(a) * s * 0.62, s * 0.55, s * 0.42, a, '#ffc1d6');
  }
  circle(c, x, y, s * 0.26, '#ffd257');
}

function box(
  c: Ctx,
  at: Place,
  x: number,
  y: number,
  w: number,
  d: number,
  z0: number,
  z1: number,
  colours: { top: string; left: string; right: string; line?: string },
): void {
  const { top, left, right, line } = colours;
  poly(c, [at(x + w, y, z0), at(x + w, y + d, z0), at(x + w, y + d, z1), at(x + w, y, z1)], right, line);
  poly(c, [at(x, y + d, z0), at(x + w, y + d, z0), at(x + w, y + d, z1), at(x, y + d, z1)], left, line);
  poly(c, [at(x, y, z1), at(x + w, y, z1), at(x + w, y + d, z1), at(x, y + d, z1)], top, line);
}

/** A kawaii paper lantern hanging on a wall. */
function lantern(c: Ctx, x: number, y: number): void {
  stroke(c, [[x, y - 24], [x, y - 16]], '#a8784c', 1.6);
  ellipse(c, x, y, 13, 16, 0, '#ff8f9e');
  for (const dx of [-7, 0, 7]) {
    c.beginPath();
    c.ellipse(x, y, Math.abs(dx) + 1, 15.5, 0, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(255,255,255,.35)';
    c.lineWidth = 1;
    c.stroke();
  }
  poly(c, [[x - 7, y - 17], [x + 7, y - 17], [x + 7, y - 13], [x - 7, y - 13]], '#3a2f4a');
  poly(c, [[x - 7, y + 13], [x + 7, y + 13], [x + 7, y + 17], [x - 7, y + 17]], '#3a2f4a');
  stroke(c, [[x, y + 17], [x, y + 28]], '#ffd166', 2);
  smile(c, x, y - 1, 3.4);
}

function crane(c: Ctx, x: number, y: number): void {
  poly(c, [[x - 9, y - 3], [x, y], [x + 9, y - 3], [x, y + 6]], '#ffffff', '#e5dcef');
  poly(c, [[x, y], [x + 4, y - 7], [x + 2, y + 2]], '#ffd0dc');
}

function paintFloor(c: Ctx, accent: string, isShop: boolean): void {
  const at = roomAt;
  // The thickness of the floor along the two open sides.
  poly(c, [at(0, ROOM_D), at(ROOM_W, ROOM_D), at(ROOM_W, ROOM_D, -14), at(0, ROOM_D, -14)], '#8f653f');
  poly(c, [at(ROOM_W, 0), at(ROOM_W, ROOM_D), at(ROOM_W, ROOM_D, -14), at(ROOM_W, 0, -14)], '#7a5535');

  // Tatami mats in a brick pattern, each with a dark cloth edge.
  poly(c, [at(0, 0), at(ROOM_W, 0), at(ROOM_W, ROOM_D), at(0, ROOM_D)], TATAMI);
  for (let y = 0.25; y < ROOM_D; y += 0.25) stroke(c, [at(0, y), at(ROOM_W, y)], TATAMI_LINE, 0.6);
  for (let row = 0; row * 3 <= ROOM_D; row++) {
    const y = row * 3;
    stroke(c, [at(0, y), at(ROOM_W, y)], TATAMI_EDGE, 2);
    for (let x = row % 2 ? 3 : 0; x < ROOM_W; x += 6) {
      if (x > 0) stroke(c, [at(x, y), at(x, Math.min(y + 3, ROOM_D))], TATAMI_EDGE, 2);
    }
  }

  // Wooden boards where the kitchen and the doorway are. The shop is all boards.
  const boards = (x0: number, x1: number, y0: number, y1: number) => {
    poly(c, [at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1)], BOARD);
    for (let x = x0 + 0.5; x < x1; x += 0.5) stroke(c, [at(x, y0), at(x, y1)], BOARD_LINE, 0.8);
  };
  boards(0, isShop ? ROOM_W : 2.6, 0, ROOM_D);
  boards(5.8, 8.6, 0, 1.6);
  stroke(c, [at(5.8, 1.6), at(8.6, 1.6)], TIMBER, 2.4);
  // A mat in the house's colour to wipe your paws on.
  poly(c, [at(ROOM_DOOR.x0, 0.2), at(ROOM_DOOR.x1, 0.2), at(ROOM_DOOR.x1, 1.3), at(ROOM_DOOR.x0, 1.3)], accent);
}

function paintCarpet(c: Ctx, style: (typeof ROOM_STYLES)[number]): void {
  const at = roomAt;
  const { x, y, w, d } = CARPET;
  const rect = (inset: number, fill: string) =>
    poly(c, [at(x + inset, y + inset), at(x + w - inset, y + inset), at(x + w - inset, y + d - inset), at(x + inset, y + d - inset)], fill);
  rect(0, style.carpet);
  rect(0.35, style.carpetInner);
  rect(0.6, style.carpet);
  rect(0.75, style.carpetInner);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const [px, py] = at(x + 1.3 + i * 1.5, y + 1.3 + j * 1.5);
      if ((i + j) % 2) circle(c, px, py, 3.2, '#ffffff');
      else blossom(c, px, py, 5);
    }
  }
}

/** Plaster between dark posts, with a beam along the top and boards along the bottom. */
function timberWall(c: Ctx, wall: (u: number, z: number) => Pair, length: number, plaster: string, posts: number[]): void {
  poly(c, [wall(0, 0), wall(length, 0), wall(length, WALL_H), wall(0, WALL_H)], plaster);
  poly(c, [wall(0, 0), wall(length, 0), wall(length, 22), wall(0, 22)], '#a0744a');
  for (let u = 0.3; u < length; u += 0.3) stroke(c, [wall(u, 0), wall(u, 22)], '#8a6240', 0.7);
  poly(c, [wall(0, 22), wall(length, 22), wall(length, 26), wall(0, 26)], TIMBER);
  poly(c, [wall(0, 130), wall(length, 130), wall(length, 138), wall(0, 138)], TIMBER);
  poly(c, [wall(0, WALL_H - 6), wall(length, WALL_H - 6), wall(length, WALL_H), wall(0, WALL_H)], TIMBER);
  for (const u of posts) {
    poly(c, [wall(u - 0.09, 0), wall(u + 0.09, 0), wall(u + 0.09, WALL_H), wall(u - 0.09, WALL_H)], TIMBER);
  }
}

function paintBackWall(c: Ctx, style: (typeof ROOM_STYLES)[number]): void {
  const wall = (u: number, z: number) => roomAt(u, 0, z);
  timberWall(c, wall, ROOM_W, PLASTER_R, [0.09, 2.1, 5.9, 8.5, 13.9]);

  // A paper window over the bench.
  const [x0, x1, z0, z1] = [2.6, 5.4, 52, 122];
  poly(c, [wall(x0 - 0.12, z0 - 4), wall(x1 + 0.12, z0 - 4), wall(x1 + 0.12, z1 + 4), wall(x0 - 0.12, z1 + 4)], TIMBER);
  poly(c, [wall(x0, z0), wall(x1, z0), wall(x1, z1), wall(x0, z1)], '#fffbe8');
  for (const u of [0.25, 0.5, 0.75]) stroke(c, [wall(x0 + (x1 - x0) * u, z0), wall(x0 + (x1 - x0) * u, z1)], TIMBER, 1.6);
  for (const u of [1 / 3, 2 / 3]) stroke(c, [wall(x0, z0 + (z1 - z0) * u), wall(x1, z0 + (z1 - z0) * u)], TIMBER, 1.6);
  const flower = wall(4.7, 106);
  blossom(c, flower[0], flower[1], 6);

  // A sliding lattice door, with a little noren curtain across the top.
  const { x0: d0, x1: d1 } = ROOM_DOOR;
  poly(c, [wall(d0 - 0.15, 0), wall(d1 + 0.15, 0), wall(d1 + 0.15, 112), wall(d0 - 0.15, 112)], TIMBER);
  const midDoor = (d0 + d1) / 2;
  for (const [a, b] of [[d0, midDoor], [midDoor, d1]] as const) {
    poly(c, [wall(a, 0), wall(b, 0), wall(b, 104), wall(a, 104)], '#b98a5c', TIMBER);
    for (let u = a + 0.14; u < b; u += 0.14) stroke(c, [wall(u, 30), wall(u, 104)], TIMBER, 1);
    poly(c, [wall(a + 0.08, 6), wall(b - 0.08, 6), wall(b - 0.08, 28), wall(a + 0.08, 28)], '#9c6f49');
  }
  const panels = 3;
  for (let i = 0; i < panels; i++) {
    const a = d0 - 0.15 + ((d1 - d0 + 0.3) * i) / panels + 0.03;
    const b = d0 - 0.15 + ((d1 - d0 + 0.3) * (i + 1)) / panels - 0.03;
    poly(c, [wall(a, 64), wall(b, 64), wall(b, 112), wall(a, 112)], style.accent, 'rgba(70,50,50,.3)');
    const [mx, my] = wall((a + b) / 2, 90);
    blossom(c, mx, my, 5.5);
  }

  // Paper lanterns and a string of folded cranes.
  for (const u of [1.2, 13.2]) {
    const [x, y] = wall(u, 104);
    lantern(c, x, y);
  }
  for (const [u, z] of [[9.8, 122], [10.9, 116], [12, 122]] as const) {
    const [x, y] = wall(u, z);
    crane(c, x, y);
  }
  stroke(c, [wall(9.6, 126), wall(10.9, 120), wall(12.2, 126)], '#f1c9d6', 1);
}

function paintSideWall(c: Ctx, isShop: boolean): void {
  const wall = (u: number, z: number) => roomAt(0, u, z);
  timberWall(c, wall, ROOM_D, PLASTER_L, [0.09, 8.9, 11.9]);
  if (isShop) return;

  // Kitchen cupboards on the wall, in old dark wood.
  for (let i = 0; i < 3; i++) {
    const a = 1.4 + i * 1.75;
    poly(c, [wall(a, 84), wall(a + 1.65, 84), wall(a + 1.65, 124), wall(a, 124)], '#a0744a', TIMBER);
    for (let u = a + 0.3; u < a + 1.6; u += 0.3) stroke(c, [wall(u, 88), wall(u, 120)], '#8a6240', 0.9);
    const [kx, ky] = wall(a + 1.45, 94);
    circle(c, kx, ky, 2.4, '#e9c08e');
  }

  // A display alcove with a raised wooden ledge, holding a hanging scroll.
  poly(c, [wall(9, 26), wall(11.8, 26), wall(11.8, 130), wall(9, 130)], '#e7dcc2');
  poly(c, [wall(9, 22), wall(11.8, 22), wall(11.8, 34), wall(9, 34)], '#8f653f', TIMBER);
  const [y0, y1] = [9.6, 11.2];
  stroke(c, [wall(y0 - 0.15, 124), wall(y1 + 0.15, 124)], TIMBER, 4);
  poly(c, [wall(y0, 44), wall(y1, 44), wall(y1, 124), wall(y0, 124)], '#fffbee', '#e7d6b4');
  stroke(c, [wall(y0 - 0.15, 44), wall(y1 + 0.15, 44)], TIMBER, 4);
  const sun = wall(10.5, 98);
  circle(c, sun[0], sun[1], 13, '#ff8f9e');
  smile(c, sun[0], sun[1] - 1, 3.4);
  stroke(c, [wall(9.8, 50), wall(10.4, 64), wall(11, 76)], '#a8784c', 2.4);
  for (const [u, z] of [[10.1, 58], [10.65, 66], [10.95, 78], [10.25, 74]] as const) {
    const [x, y] = wall(u, z);
    blossom(c, x, y, 4.4);
  }
}

/** The floor, walls and everything fixed to them. Standing furniture is separate. */
export function paintRoom(styleIndex: number, isShop: boolean): HTMLCanvasElement {
  const style = ROOM_STYLES[styleIndex];
  const canvas = document.createElement('canvas');
  canvas.width = ROOM_CANVAS.w * SCALE;
  canvas.height = ROOM_CANVAS.h * SCALE;
  const c = canvas.getContext('2d')!;
  c.scale(SCALE, SCALE);
  paintBackWall(c, style);
  paintSideWall(c, isShop);
  paintFloor(c, style.accent, isShop);
  if (!isShop) paintCarpet(c, style);
  return canvas;
}

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function manekiNeko(c: Ctx, x: number, y: number): void {
  ellipse(c, x, y - 9, 8, 9.5, 0, '#ffffff');
  circle(c, x, y - 20, 8.5, '#ffffff');
  poly(c, [[x - 8, y - 24], [x - 7, y - 32], [x - 2, y - 27]], '#ffffff');
  poly(c, [[x + 8, y - 24], [x + 7, y - 32], [x + 2, y - 27]], '#ffb3c7');
  ellipse(c, x + 9, y - 21, 2.8, 5, 0.2, '#ffffff');
  stroke(c, [[x - 6, y - 14], [x + 6, y - 14]], '#ff6f7f', 2.4);
  circle(c, x, y - 12.6, 1.8, '#ffd166');
  smile(c, x, y - 20, 3);
  circle(c, x, y - 6, 3.4, '#ffd166');
}

function daruma(c: Ctx, x: number, y: number): void {
  ellipse(c, x, y - 11, 10.5, 11.5, 0, '#ff6f7f');
  ellipse(c, x, y - 13, 7, 6.4, 0, '#fff4e6');
  circle(c, x - 3, y - 14, 1.3, INK);
  circle(c, x + 3, y - 14, 1.3, INK);
  circle(c, x, y - 11, 0.8, '#ff6f7f');
}

function paintKitchen(c: Ctx, at: Place, w: number, d: number): void {
  const h = 48;
  box(c, at, 0, 0, w, d, 0, h, { top: '#e9dcc0', left: '#a0744a', right: '#b58a5e', line: '#6f4c2e' });
  for (let i = 0; i < 3; i++) {
    const a = 0.2 + i * 2.05;
    const b = a + 1.9;
    poly(c, [at(w, a, 6), at(w, b, 6), at(w, b, 42), at(w, a, 42)], '#a67a50', '#6f4c2e');
    const [kx, ky] = at(w, b - 0.25, 30);
    circle(c, kx, ky, 2.2, '#e9c08e');
  }
  // Hob with a kettle.
  poly(c, [at(0.25, 0.3, h), at(1.55, 0.3, h), at(1.55, 2, h), at(0.25, 2, h)], '#55506a');
  for (const y of [0.75, 1.55]) {
    const [bx, by] = at(0.9, y, h);
    c.beginPath();
    c.ellipse(bx, by, 11, 5.5, 0, 0, Math.PI * 2);
    c.strokeStyle = '#ff9f93';
    c.lineWidth = 1.6;
    c.stroke();
  }
  const [kx, ky] = at(0.9, 0.75, h);
  ellipse(c, kx, ky - 9, 11, 10, 0, '#ffb3c7');
  circle(c, kx, ky - 19, 2.6, '#ffffff');
  stroke(c, [[kx + 10, ky - 9], [kx + 17, ky - 14]], '#ffb3c7', 3.4);
  smile(c, kx, ky - 9, 3);
  // Sink and tap.
  poly(c, [at(0.3, 2.4, h), at(1.5, 2.4, h), at(1.5, 3.6, h), at(0.3, 3.6, h)], '#b9c3c4', '#8f9a9c');
  const tap = at(0.15, 3, h);
  stroke(c, [tap, [tap[0], tap[1] - 15], [tap[0] + 11, tap[1] - 10]], '#b9c3cf', 3);
  // A plate of tiny sushi.
  const plate = at(1.1, 4.3, h);
  ellipse(c, plate[0], plate[1], 13, 6.5, 0, '#ffffff');
  for (const dx of [-6, 0, 6]) {
    ellipse(c, plate[0] + dx, plate[1] - 2, 3.4, 2.4, 0, '#fff8ec');
    ellipse(c, plate[0] + dx, plate[1] - 3.4, 3.2, 1.6, 0, '#ff9f7a');
  }
}

function paintFridge(c: Ctx, at: Place, w: number, d: number): void {
  const h = 96;
  box(c, at, 0, 0, w, d, 0, h, { top: '#f8f1df', left: '#dcd0b4', right: '#ece2ca', line: '#b5a888' });
  stroke(c, [at(w, 0, 62), at(w, d, 62)], '#b5a888', 1.6);
  stroke(c, [at(w, d - 0.25, 44), at(w, d - 0.25, 56)], '#9c8f70', 3);
  stroke(c, [at(w, d - 0.25, 68), at(w, d - 0.25, 80)], '#9c8f70', 3);
  const [fx, fy] = at(w, d / 2 - 0.1, 80);
  smile(c, fx, fy, 4.4);
}

function paintBench(c: Ctx, at: Place, w: number, d: number): void {
  for (const [x, y] of [[0.1, 0.1], [w - 0.4, 0.1], [0.1, d - 0.35], [w - 0.4, d - 0.35]] as const) {
    box(c, at, x, y, 0.3, 0.25, 0, 24, WOOD);
  }
  box(c, at, 0, 0, w, d, 24, 31, { ...WOOD, line: WOOD.line });
  box(c, at, 0.1, 0.1, w - 0.2, d - 0.2, 31, 37, { top: '#ffc1d6', left: '#ff9fbe', right: '#ffb0c9' });
  const [px, py] = at(w - 0.7, 0.55, 37);
  ellipse(c, px, py - 8, 12, 10, -0.2, '#fff1b8');
  smile(c, px, py - 8, 3);
}

function paintBookshelf(c: Ctx, at: Place, w: number, d: number): void {
  const h = 108;
  box(c, at, 0, 0, w, d, 0, h, { ...WOOD, line: WOOD.line });
  const face = (u: number, z: number) => at(u, d, z);
  const roll = seeded(1234);
  const covers = ['#ff9fb4', '#8fa9f0', '#ffd166', '#6fd0b4', '#c6a7ee', '#ff9f93', '#86cdec', '#fffdf2'];
  for (const [z0, z1] of [[8, 38], [42, 72], [76, 102]] as const) {
    poly(c, [face(0.12, z0), face(w - 0.12, z0), face(w - 0.12, z1), face(0.12, z1)], '#8f6440');
    let u = 0.16;
    while (u < w - 0.5) {
      const thick = 0.14 + roll() * 0.16;
      const tall = (z1 - z0) * (0.62 + roll() * 0.33);
      const cover = covers[Math.floor(roll() * covers.length)];
      poly(c, [face(u, z0), face(u + thick, z0), face(u + thick, z0 + tall), face(u, z0 + tall)], cover, 'rgba(70,50,60,.3)');
      stroke(c, [face(u + thick / 2, z0 + tall * 0.7), face(u + thick / 2, z0 + tall * 0.82)], 'rgba(255,255,255,.75)', 1.2);
      u += thick + 0.015;
      if (roll() < 0.12) u += 0.2;
    }
  }
  const top = at(0.7, d / 2, h);
  daruma(c, top[0], top[1]);
  const cat = at(2.9, d / 2, h);
  manekiNeko(c, cat[0], cat[1]);
}

function paintTable(c: Ctx, at: Place, w: number, d: number): void {
  for (const [x, y] of [[0.15, 0.15], [w - 0.45, 0.15], [0.15, d - 0.45], [w - 0.45, d - 0.45]] as const) {
    box(c, at, x, y, 0.3, 0.3, 0, 30, WOOD);
  }
  box(c, at, 0, 0, w, d, 30, 37, { ...WOOD, line: WOOD.line });
  // A vase of blossom and a teapot with two cups.
  const [vx, vy] = at(w / 2, d / 2, 37);
  ellipse(c, vx, vy - 8, 7, 9.5, 0, '#ffffff');
  poly(c, [[vx - 3, vy - 22], [vx + 3, vy - 22], [vx + 4.5, vy - 15], [vx - 4.5, vy - 15]], '#ffffff');
  stroke(c, [[vx, vy - 20], [vx - 8, vy - 40]], '#a8784c', 1.8);
  stroke(c, [[vx, vy - 20], [vx + 9, vy - 36]], '#a8784c', 1.8);
  for (const [dx, dy] of [[-8, -40], [-3, -33], [9, -36], [3, -44], [13, -29]] as const) blossom(c, vx + dx, vy + dy, 4.6);
  const [tx, ty] = at(0.7, 0.8, 37);
  ellipse(c, tx, ty - 6, 8.5, 7, 0, '#8fd0e8');
  circle(c, tx, ty - 13, 1.8, '#ffffff');
  stroke(c, [[tx + 8, ty - 6], [tx + 13, ty - 9]], '#8fd0e8', 2.4);
  for (const [x, y] of [[2.2, 0.7], [2.3, 1.6]] as const) {
    const [cx, cy] = at(x, y, 37);
    ellipse(c, cx, cy - 2.5, 4.4, 3.4, 0, '#ffffff');
  }
}

function paintChair(c: Ctx, at: Place, w: number, d: number, back: Furniture['back']): void {
  const legs = [[0.1, 0.1], [w - 0.26, 0.1], [0.1, d - 0.26], [w - 0.26, d - 0.26]] as const;
  const backRest = () => {
    if (back === 'y-') box(c, at, 0, 0, w, 0.12, 18, 50, WOOD);
    if (back === 'x-') box(c, at, 0, 0, 0.12, d, 18, 50, WOOD);
    if (back === 'x+') box(c, at, w - 0.12, 0, 0.12, d, 18, 50, WOOD);
    if (back === 'y+') box(c, at, 0, d - 0.12, w, 0.12, 18, 50, WOOD);
  };
  for (const [x, y] of legs) box(c, at, x, y, 0.16, 0.16, 0, 18, WOOD);
  if (back === 'y-' || back === 'x-') backRest();
  box(c, at, 0, 0, w, d, 18, 22, WOOD);
  box(c, at, 0.1, 0.1, w - 0.2, d - 0.2, 22, 26, { top: '#ffc1d6', left: '#ff9fbe', right: '#ffb0c9' });
  if (back === 'y+' || back === 'x+') backRest();
}

function goods(c: Ctx, roll: () => number, x: number, y: number): void {
  const colours = ['#ff9fb4', '#ffd166', '#6fd0b4', '#8fa9f0', '#ff9f93', '#fffdf2', '#c6a7ee'];
  const colour = colours[Math.floor(roll() * colours.length)];
  const kind = roll();
  if (kind < 0.4) {
    poly(c, [[x - 5, y], [x + 5, y], [x + 5, y - 12], [x - 5, y - 12]], colour, 'rgba(70,50,60,.3)');
  } else if (kind < 0.75) {
    ellipse(c, x, y - 6, 6, 7, 0, colour);
  } else {
    poly(c, [[x - 4, y], [x + 4, y], [x + 4, y - 9], [x + 2, y - 15], [x - 2, y - 15], [x - 4, y - 9]], colour, 'rgba(70,50,60,.3)');
  }
}

function shelfRows(c: Ctx, roll: () => number, face: (u: number, z: number) => Pair, length: number, tall: number): void {
  for (const [z0, z1] of [[8, tall * 0.33], [tall * 0.37, tall * 0.63], [tall * 0.67, tall - 6]] as const) {
    poly(c, [face(0.1, z0), face(length - 0.1, z0), face(length - 0.1, z1), face(0.1, z1)], '#8f653f');
    for (let u = 0.32; u < length - 0.2; u += 0.48) {
      const [x, y] = face(u, z0 + 1);
      goods(c, roll, x, y);
    }
  }
}

function paintWallShelf(c: Ctx, at: Place, w: number, d: number): void {
  const h = 112;
  box(c, at, 0, 0, w, d, 0, h, { ...WOOD, line: WOOD.line });
  shelfRows(c, seeded(77), (u, z) => at(w, u, z), d, h);
}

function paintShelf(c: Ctx, at: Place, w: number, d: number): void {
  const h = 82;
  box(c, at, 0, 0, w, d, 0, h, { ...WOOD, line: WOOD.line });
  const roll = seeded(Math.round(d * 100));
  shelfRows(c, roll, (u, z) => at(w, u, z), d, h);
  shelfRows(c, roll, (u, z) => at(u, d, z), w, h);
}

function paintCounter(c: Ctx, at: Place, w: number, d: number): void {
  const h = 44;
  box(c, at, 0, 0, w, d, 0, h, { top: '#d9b184', left: '#a0744a', right: '#b58a5e', line: '#6f4c2e' });
  for (let u = 0.35; u < d; u += 1.1) stroke(c, [at(w, u, 3), at(w, u, h - 3)], '#8a6240', 1.2);
  // A little bell, an abacus and the lucky cat.
  const [bx, by] = at(w / 2, d - 1, h);
  manekiNeko(c, bx, by);
  const [ax, ay] = at(w / 2, 6.6, h);
  poly(c, [[ax - 18, ay - 2], [ax + 18, ay - 2], [ax + 18, ay - 12], [ax - 18, ay - 12]], '#6b4a35');
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 7; i++) circle(c, ax - 14 + i * 4.7, ay - 9.5 + row * 5, 1.9, '#e9c08e');
  }
  const [rx, ry] = at(w / 2, 2.2, h);
  poly(c, [[rx - 14, ry], [rx + 14, ry], [rx + 11, ry - 20], [rx - 11, ry - 20]], '#ff9fb4', '#ec86a0');
  poly(c, [[rx - 8, ry - 14], [rx + 8, ry - 14], [rx + 8, ry - 18], [rx - 8, ry - 18]], '#fffdf2');
}

function paintCrate(c: Ctx, at: Place, w: number, d: number): void {
  const h = 30;
  box(c, at, 0, 0, w, d, 0, h, { top: '#7a5535', left: '#c9a177', right: '#b58a5e', line: '#8a6240' });
  for (const z of [10, 20]) stroke(c, [at(0, d, z), at(w, d, z)], '#8a6240', 1);
  const roll = seeded(Math.round(w * 37));
  const colours = ['#ff8f73', '#ffb347', '#ff6f7f'];
  for (let x = 0.3; x < w - 0.1; x += 0.42) {
    for (let y = 0.3; y < d - 0.1; y += 0.42) {
      const [px, py] = at(x, y, h + 2);
      circle(c, px, py, 5.4, colours[Math.floor(roll() * colours.length)]);
    }
  }
}

function paintPlant(c: Ctx, at: Place, w: number, d: number): void {
  const [mx, my] = at(w / 2, d / 2);
  ellipse(c, mx, my, 16, 8, 0, 'rgba(70,90,60,.16)');
  const leaves: [number, number, number][] = [
    [-11, -52, -0.5],
    [11, -54, 0.5],
    [0, -64, 0],
    [-17, -40, -1],
    [17, -42, 1],
    [-5, -46, -0.2],
    [6, -48, 0.2],
  ];
  stroke(c, [[mx, my - 22], [mx, my - 54]], '#5ba874', 3);
  leaves.forEach(([dx, dy, rot], i) => ellipse(c, mx + dx, my + dy, 7.5, 15, rot, i % 2 ? '#7ad18a' : '#8edb8f'));
  poly(c, [[mx - 14, my - 26], [mx + 14, my - 26], [mx + 10, my], [mx - 10, my]], '#e9e2cf', '#b5a888');
  ellipse(c, mx, my, 10, 4, 0, '#e9e2cf');
  ellipse(c, mx, my - 26, 14, 5, 0, '#6f86ad');
  ellipse(c, mx, my - 26, 11, 3.6, 0, '#7a5535');
  smile(c, mx, my - 13, 3.2);
}

const TALLEST: Record<Furniture['kind'], number> = {
  kitchen: 90,
  fridge: 96,
  bench: 60,
  bookshelf: 145,
  table: 90,
  chair: 54,
  plant: 84,
  counter: 90,
  wallShelf: 120,
  shelf: 90,
  crate: 44,
};

export interface FurniturePicture {
  canvas: HTMLCanvasElement;
  originX: number;
  originY: number;
}

/** A piece of standing furniture. Its origin is the back corner of its footprint. */
export function paintFurniture(f: Furniture): FurniturePicture {
  const tall = TALLEST[f.kind];
  const span = f.w + f.d;
  const w = (span * TILE_W) / 2 + PAD * 2;
  const h = (span * TILE_H) / 2 + tall + PAD * 2;
  const anchorX = (f.d * TILE_W) / 2 + PAD;
  const anchorY = tall + PAD;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * SCALE);
  canvas.height = Math.ceil(h * SCALE);
  const c = canvas.getContext('2d')!;
  c.scale(SCALE, SCALE);
  c.translate(anchorX, anchorY);
  const at: Place = (x, y, z = 0) => [((x - y) * TILE_W) / 2, ((x + y) * TILE_H) / 2 - z];
  if (f.kind === 'kitchen') paintKitchen(c, at, f.w, f.d);
  if (f.kind === 'fridge') paintFridge(c, at, f.w, f.d);
  if (f.kind === 'bench') paintBench(c, at, f.w, f.d);
  if (f.kind === 'bookshelf') paintBookshelf(c, at, f.w, f.d);
  if (f.kind === 'table') paintTable(c, at, f.w, f.d);
  if (f.kind === 'chair') paintChair(c, at, f.w, f.d, f.back);
  if (f.kind === 'plant') paintPlant(c, at, f.w, f.d);
  if (f.kind === 'counter') paintCounter(c, at, f.w, f.d);
  if (f.kind === 'wallShelf') paintWallShelf(c, at, f.w, f.d);
  if (f.kind === 'shelf') paintShelf(c, at, f.w, f.d);
  if (f.kind === 'crate') paintCrate(c, at, f.w, f.d);
  return { canvas, originX: anchorX / w, originY: anchorY / h };
}
