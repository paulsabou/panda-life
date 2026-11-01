import { HOUSE_SIZE, MAP_SIZE, TILE_H, TILE_W, WORLD_H, WORLD_W, project, projectView, type Rotation } from '../world/iso';
import type { Bridge, Village } from '../world/layout';

export const GROUND_SCALE = Math.min(1.2, 4096 / WORLD_W);
export const SPRITE_SCALE = 2;

/** Where each picture's anchor sits, in world pixels from the top left of its canvas. */
export const HOUSE_CANVAS = { w: 320, h: 330, anchorX: 160, anchorY: 176 };
export const BAMBOO_CANVAS = { w: 140, h: 240, anchorX: 70, anchorY: 225 };
export const TREE_CANVAS = { w: 170, h: 190, anchorX: 85, anchorY: 175 };

const INK_SHADOW = 'rgba(70,90,60,.18)';

const PALETTE = {
  skyTop: '#e3f7fb',
  skyBottom: '#f3fcef',
  grassA: '#bdeecb',
  grassB: '#b1e8c1',
  path: '#fcebd2',
  water: '#9edcf1',
  plank: '#d9a877',
  plankLine: '#b98757',
  sideLeft: '#cfae8d',
  sideRight: '#bb9976',
  flower: '#ffd257',
};

/** Old country houses: each has its own weathered tile colour and curtain. */
const HOUSE_STYLES = [
  { roof: '#7f9a8f', roofDark: '#6a8479', ridge: '#465a53', noren: '#6fbfa8' },
  { roof: '#a48a7e', roofDark: '#8d7468', ridge: '#5e4a41', noren: '#ff9f93' },
  { roof: '#a39a78', roofDark: '#8b8262', ridge: '#5f5840', noren: '#ffd166' },
  { roof: '#7f8fab', roofDark: '#6a7a96', ridge: '#465470', noren: '#8fa9f0' },
  { roof: '#c07a62', roofDark: '#a8654f', ridge: '#6e3e30', noren: '#ff7fa8' },
];
const SHOP_STYLE_INDEX = 4;
const STONE = '#c9c4b8';
const STONE_DARK = '#aca698';
const PLASTER = '#fbf5e6';
const PLASTER_SHADE = '#ece3cd';
const TIMBER = '#6b4a35';
const TIMBER_DARK = '#533826';
const BOARDS = '#8a6548';
const BOARDS_SHADE = '#775539';
const BOARD_LINE = '#5f4230';

const ROUND_TREES = [
  { top: '#ffd0dc', side: '#ffbdd0', face: true },
  { top: '#ffd0dc', side: '#ffbdd0', face: false },
  { top: '#8fdc9a', side: '#79cf88', face: true },
  { top: '#8fdc9a', side: '#79cf88', face: false },
  { top: '#a5e2a0', side: '#8fd68c', face: true },
  { top: '#a5e2a0', side: '#8fd68c', face: false },
];

type Ctx = CanvasRenderingContext2D;
type Point = [number, number];

function newCanvas(w: number, h: number, scale: number): [HTMLCanvasElement, Ctx] {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * scale);
  canvas.height = Math.ceil(h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  return [canvas, ctx];
}

function poly(c: Ctx, points: Point[], fill: string, line?: string): void {
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

function shadow(c: Ctx, x: number, y: number, rx: number): void {
  ellipse(c, x, y, rx, rx * 0.5, 0, INK_SHADOW);
}

function heart(c: Ctx, x: number, y: number, s: number, fill: string): void {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.6, y - s, x, y - s * 0.25);
  c.bezierCurveTo(x + s * 0.6, y - s, x + s * 1.5, y - s * 0.1, x, y + s * 0.9);
  c.fillStyle = fill;
  c.fill();
}

function face(c: Ctx, x: number, y: number, s: number): void {
  circle(c, x - s, y, s * 0.28, '#4a3a3a');
  circle(c, x + s, y, s * 0.28, '#4a3a3a');
  c.beginPath();
  c.arc(x, y + s * 0.15, s * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
  c.strokeStyle = '#4a3a3a';
  c.lineWidth = 1.2;
  c.lineCap = 'round';
  c.stroke();
  ellipse(c, x - s * 1.5, y + s * 0.5, s * 0.42, s * 0.26, 0, 'rgba(255,120,150,.55)');
  ellipse(c, x + s * 1.5, y + s * 0.5, s * 0.42, s * 0.26, 0, 'rgba(255,120,150,.55)');
}

function flower(c: Ctx, x: number, y: number): void {
  const blooms: [number, number, string][] = [
    [-8, -2, PALETTE.flower],
    [6, 3, '#ffffff'],
    [-1, 6, PALETTE.flower],
  ];
  for (const [dx, dy, colour] of blooms) {
    for (let i = 0; i < 5; i++) {
      const a = i * 1.257;
      circle(c, x + dx + Math.cos(a) * 2.4, y + dy + Math.sin(a) * 1.8, 1.7, colour);
    }
    circle(c, x + dx, y + dy, 1.3, '#ffd257');
  }
}

/** Everything flat: grass, paths, river, bridge deck and flowers, for one map rotation. */
export function paintGround(village: Village, r: Rotation): HTMLCanvasElement {
  const [canvas, c] = newCanvas(WORLD_W, WORLD_H, GROUND_SCALE);
  const sky = c.createLinearGradient(0, 0, 0, WORLD_H);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(1, PALETTE.skyBottom);
  c.fillStyle = sky;
  c.fillRect(0, 0, WORLD_W, WORLD_H);

  const side = 16;
  const N = MAP_SIZE;
  poly(c, [projectView(0, N), projectView(N, N), projectView(N, N, -side), projectView(0, N, -side)], PALETTE.sideLeft);
  poly(c, [projectView(N, 0), projectView(N, N), projectView(N, N, -side), projectView(N, 0, -side)], PALETTE.sideRight);

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const tile = village.tiles[y][x];
      const fill =
        tile === 'water' ? PALETTE.water :
        tile === 'path' ? PALETTE.path :
        tile === 'bridge' ? PALETTE.plank :
        (x + y) % 2 ? PALETTE.grassA : PALETTE.grassB;
      poly(c, [project(r, x, y), project(r, x + 1, y), project(r, x + 1, y + 1), project(r, x, y + 1)], fill, fill);
      const [mx, my] = project(r, x + 0.5, y + 0.5);
      if (tile === 'water' && (x * 3 + y * 5) % 4 === 0) {
        c.strokeStyle = 'rgba(255,255,255,.75)';
        c.lineWidth = 1.6;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(mx - 7, my);
        c.quadraticCurveTo(mx, my - 3, mx + 7, my);
        c.stroke();
      }
      if (tile === 'bridge') {
        c.strokeStyle = PALETTE.plankLine;
        c.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          const a = project(r, x + k / 4, y);
          const b = project(r, x + k / 4, y + 1);
          c.beginPath();
          c.moveTo(a[0], a[1]);
          c.lineTo(b[0], b[1]);
          c.stroke();
        }
      }
    }
  }
  for (const f of village.flowers) {
    const [x, y] = project(r, f.x + 0.5, f.y + 0.5);
    flower(c, x, y);
  }
  return canvas;
}

type Face = (u: number, z: number) => Point;

function line(c: Ctx, a: Point, b: Point, colour: string, width: number): void {
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.strokeStyle = colour;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.stroke();
}

function mix(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Stone base, dark boards below, white plaster above, with timbers showing. */
function wall(c: Ctx, face: Face, length: number, wallH: number, boards: string): void {
  const band = (z0: number, z1: number, fill: string) =>
    poly(c, [face(0, z0), face(length, z0), face(length, z1), face(0, z1)], fill);
  band(0, 10, STONE);
  for (let u = 0.4; u < length; u += 0.9) line(c, face(u, 1), face(u, 9), STONE_DARK, 1);
  band(10, 54, boards);
  for (let u = 0.25; u < length; u += 0.25) line(c, face(u, 10), face(u, 54), BOARD_LINE, 0.8);
  band(54, wallH, PLASTER);
  band(52, 57, TIMBER);
  band(wallH - 5, wallH, TIMBER);
  for (const u of [0, length / 2, length]) line(c, face(u, 10), face(u, wallH), TIMBER_DARK, 4);
}

function shoji(c: Ctx, face: Face, u0: number, u1: number, z0: number, z1: number): void {
  poly(c, [face(u0 - 0.06, z0 - 2), face(u1 + 0.06, z0 - 2), face(u1 + 0.06, z1 + 2), face(u0 - 0.06, z1 + 2)], TIMBER_DARK);
  poly(c, [face(u0, z0), face(u1, z0), face(u1, z1), face(u0, z1)], '#fffbe8');
  const panes = 3;
  for (let i = 1; i < panes; i++) {
    const u = u0 + ((u1 - u0) * i) / panes;
    line(c, face(u, z0), face(u, z1), TIMBER, 1.1);
  }
  line(c, face(u0, (z0 + z1) / 2), face(u1, (z0 + z1) / 2), TIMBER, 1.1);
}

/** One side of a tiled roof, with the eave curving up at both ends. */
function roofSide(c: Ctx, a: Point, b: Point, eaveA: Point, eaveB: Point, fill: string, rib: string): void {
  const middle = mix(eaveA, eaveB, 0.5);
  const sag: Point = [middle[0], middle[1] + 9];
  const outline = () => {
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.lineTo(eaveB[0], eaveB[1]);
    c.quadraticCurveTo(sag[0], sag[1], eaveA[0], eaveA[1]);
    c.closePath();
  };
  outline();
  c.fillStyle = fill;
  c.fill();
  c.save();
  outline();
  c.clip();
  for (let t = 0.05; t < 1; t += 0.05) {
    const top = mix(a, b, t);
    const bottom = mix(eaveA, eaveB, t);
    line(c, top, [bottom[0], bottom[1] + 9], rib, 1.2);
  }
  for (let t = 0.14; t < 1; t += 0.14) {
    const from = mix(a, eaveA, t);
    const to = mix(b, eaveB, t);
    line(c, from, to, 'rgba(60,60,55,.14)', 1.4);
  }
  // Soft moss, the way old tiles grow it.
  const moss = 'rgba(133,170,104,.55)';
  for (const [t, u, r] of [[0.8, 0.2, 9], [0.86, 0.72, 7], [0.55, 0.9, 6], [0.7, 0.45, 5]] as const) {
    const [x, y] = mix(mix(a, b, u), mix(eaveA, eaveB, u), t);
    ellipse(c, x, y, r * 1.5, r * 0.8, 0.1, moss);
  }
  c.restore();
  // The curved tile edge along the eave.
  c.beginPath();
  c.moveTo(eaveA[0], eaveA[1]);
  c.quadraticCurveTo(sag[0], sag[1], eaveB[0], eaveB[1]);
  c.strokeStyle = 'rgba(50,50,45,.45)';
  c.lineWidth = 3;
  c.stroke();
}

function paperLantern(c: Ctx, x: number, y: number): void {
  line(c, [x, y - 16], [x, y - 11], TIMBER_DARK, 1.4);
  ellipse(c, x, y, 8, 11, 0, '#fff0d0');
  poly(c, [[x - 5, y - 11], [x + 5, y - 11], [x + 5, y - 9], [x - 5, y - 9]], TIMBER_DARK);
  poly(c, [[x - 5, y + 9], [x + 5, y + 9], [x + 5, y + 11], [x - 5, y + 11]], TIMBER_DARK);
  face(c, x, y - 1, 2.8);
}

/** A house seen from one of the four camera angles. The door is on its +y wall. */
export function paintHouse(styleIndex: number, r: Rotation): HTMLCanvasElement {
  const style = HOUSE_STYLES[styleIndex];
  const [canvas, c] = newCanvas(HOUSE_CANVAS.w, HOUSE_CANVAS.h, SPRITE_SCALE);
  c.translate(HOUSE_CANVAS.anchorX, HOUSE_CANVAS.anchorY);

  const size = HOUSE_SIZE;
  const wallH = 92;
  const roofH = 70;
  const overhang = 0.6;
  const at = (x: number, y: number, z = 0): Point => [
    ((x - y) * TILE_W) / 2,
    ((x + y) * TILE_H) / 2 - z,
  ];
  const left: Face = (u, z) => at(u, size, z);
  const right: Face = (u, z) => at(size, u, z);

  const centre = at(size / 2, size / 2);
  shadow(c, centre[0], centre[1] + 8, 124);

  const ridgeAlongX = r % 2 === 0;
  const lo = -overhang;
  const hi = size + overhang;
  const mid = size / 2;
  const eave = wallH - 12;
  const peak = wallH + roofH;
  const ridgeA = ridgeAlongX ? at(lo, mid, peak) : at(mid, lo, peak);
  const ridgeB = ridgeAlongX ? at(hi, mid, peak) : at(mid, hi, peak);
  const lift = 7;

  if (ridgeAlongX) roofSide(c, ridgeA, ridgeB, at(lo, lo, eave + lift), at(hi, lo, eave + lift), style.roofDark, style.ridge);
  else roofSide(c, ridgeA, ridgeB, at(lo, lo, eave + lift), at(lo, hi, eave + lift), style.roofDark, style.ridge);

  wall(c, right, size, wallH, BOARDS_SHADE);
  wall(c, left, size, wallH, BOARDS);

  // The triangle under the roof at the gable end: plaster with crossed timbers.
  const gableFace = ridgeAlongX ? right : left;
  const gableTop = gableFace(mid, peak - 4);
  poly(c, [gableFace(0, wallH - 2), gableFace(size, wallH - 2), gableTop], ridgeAlongX ? PLASTER_SHADE : PLASTER, TIMBER_DARK);
  line(c, gableFace(mid, wallH), gableTop, TIMBER_DARK, 3);
  line(c, gableFace(mid - 1.4, wallH), gableFace(mid, wallH + 40), TIMBER, 2.4);
  line(c, gableFace(mid + 1.4, wallH), gableFace(mid, wallH + 40), TIMBER, 2.4);

  if (ridgeAlongX) roofSide(c, ridgeA, ridgeB, at(lo, hi, eave + lift), at(hi, hi, eave + lift), style.roof, style.ridge);
  else roofSide(c, ridgeA, ridgeB, at(hi, lo, eave + lift), at(hi, hi, eave + lift), style.roof, style.ridge);

  // The heavy ridge, with a rounded end tile at each end.
  line(c, ridgeA, ridgeB, style.ridge, 7);
  line(c, ridgeA, ridgeB, 'rgba(255,255,255,.14)', 2);
  for (const [x, y] of [ridgeA, ridgeB]) {
    circle(c, x, y - 3, 7, style.ridge);
    circle(c, x, y - 3, 3, 'rgba(255,255,255,.28)');
  }

  // Seen from the back there is no door to draw.
  const door = r === 0 ? left : r === 1 ? right : null;
  if (door) {
    const side = door === left ? right : left;
    shoji(c, door, 0.3, 1.2, 22, 46);
    shoji(c, door, 3.8, 4.7, 22, 46);
    poly(c, [door(1.42, 0), door(3.58, 0), door(3.58, 90), door(1.42, 90)], TIMBER_DARK);
    for (const [a, b] of [[1.5, 2.5], [2.5, 3.5]] as const) {
      poly(c, [door(a, 2), door(b, 2), door(b, 84), door(a, 84)], '#b98a5c', TIMBER_DARK);
      for (let u = a + 0.14; u < b; u += 0.14) line(c, door(u, 30), door(u, 84), TIMBER, 1.1);
      poly(c, [door(a + 0.1, 8), door(b - 0.1, 8), door(b - 0.1, 28), door(a + 0.1, 28)], '#9c6f49');
    }
    const panels = 3;
    for (let i = 0; i < panels; i++) {
      const a = 1.42 + (2.16 * i) / panels + 0.02;
      const b = 1.42 + (2.16 * (i + 1)) / panels - 0.02;
      poly(c, [door(a, 56), door(b, 56), door(b, 90), door(a, 90)], style.noren, 'rgba(70,50,50,.3)');
    }
    const flower = door(2.5, 74);
    if (styleIndex === SHOP_STYLE_INDEX) shopSign(c, flower[0], flower[1]);
    else heart(c, flower[0], flower[1], 5.5, 'rgba(255,255,255,.9)');
    const [lx, ly] = door(4.1, 72);
    paperLantern(c, lx, ly);
    shoji(c, side, 1.1, 3.9, 62, 84);
  } else {
    shoji(c, left, 1.1, 3.9, 62, 84);
    shoji(c, right, 1.1, 3.9, 62, 84);
  }
  if (styleIndex === SHOP_STYLE_INDEX) {
    // Banners and a crate of fruit, so the shop stands out from the homes.
    const corners: [Point, string][] = [
      [at(size + 0.35, 0.5), '#ffd166'],
      [at(0.5, size + 0.35), '#6fbfa8'],
      [at(size + 0.35, size + 0.35), '#ff7fa8'],
    ];
    corners.sort((a, b) => a[0][1] - b[0][1]);
    for (const [spot, colour] of corners) shopBanner(c, spot, colour);
  }
  return canvas;
}

function shopSign(c: Ctx, x: number, y: number): void {
  c.font = '800 19px "Hiragino Sans", "Yu Gothic", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ffffff';
  c.fillText('店', x, y);
}

function shopBanner(c: Ctx, [x, y]: Point, colour: string): void {
  line(c, [x, y], [x, y - 96], TIMBER_DARK, 3);
  poly(c, [[x + 1, y - 92], [x + 19, y - 92], [x + 19, y - 34], [x + 1, y - 34]], colour, 'rgba(70,50,50,.35)');
  c.font = '800 15px "Hiragino Sans", "Yu Gothic", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ffffff';
  c.fillText('店', x + 10, y - 74);
  c.fillText('🍡', x + 10, y - 50);
}

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function paintBamboo(variant: number): HTMLCanvasElement {
  const [canvas, c] = newCanvas(BAMBOO_CANVAS.w, BAMBOO_CANVAS.h, SPRITE_SCALE);
  c.translate(BAMBOO_CANVAS.anchorX, BAMBOO_CANVAS.anchorY);
  const r = seeded(variant * 7919 + 13);
  shadow(c, 0, 3, 34);
  const stalks: [number, number, number][] = [
    [-20, 4, 118],
    [18, 3, 142],
    [-2, -5, 172],
  ];
  stalks.forEach(([bx, by, tall], idx) => {
    const h = tall + r() * 20;
    const sway = 5 + r() * 6;
    c.strokeStyle = '#6fc48a';
    c.lineWidth = 10;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(bx, by);
    c.quadraticCurveTo(bx, by - h / 2, bx + sway, by - h);
    c.stroke();
    c.strokeStyle = '#4fa56d';
    c.lineWidth = 2;
    c.lineCap = 'butt';
    for (let n = 24; n < h; n += 24) {
      const t = n / h;
      const nx = bx + sway * t * t;
      c.beginPath();
      c.moveTo(nx - 5.5, by - n);
      c.lineTo(nx + 5.5, by - n);
      c.stroke();
    }
    const leaf = idx % 2 ? '#8edb8f' : '#7ad18a';
    const tx = bx + sway;
    const ty = by - h;
    const crown: [number, number, number][] = [
      [-0.7, -15, 0],
      [0.5, 15, -2],
      [-1.6, -13, 13],
      [1.3, 13, 15],
      [-0.1, 0, -11],
    ];
    for (const [rot, dx, dy] of crown) ellipse(c, tx + dx, ty + dy, 17, 5.5, rot, leaf);
    [0.5, 0.72].forEach((f, i) => {
      const dir = (i + idx) % 2 ? 1 : -1;
      ellipse(c, bx + sway * f * f + dir * 14, by - h * f - 4, 14, 4.5, dir * 0.45, leaf);
    });
  });
  return canvas;
}

export function paintRoundTree(variant: number): HTMLCanvasElement {
  const look = ROUND_TREES[variant];
  const [canvas, c] = newCanvas(TREE_CANVAS.w, TREE_CANVAS.h, SPRITE_SCALE);
  c.translate(TREE_CANVAS.anchorX, TREE_CANVAS.anchorY);
  shadow(c, 0, 3, 42);
  c.scale(2.6, 2.6);
  poly(c, [[-4, 0], [4, 0], [3, -24], [-3, -24]], '#c1926a');
  circle(c, -12, -32, 13, look.side);
  circle(c, 12, -32, 13, look.side);
  circle(c, 0, -42, 18, look.top);
  circle(c, -5, -49, 5, 'rgba(255,255,255,.35)');
  if (look.face) face(c, 0, -40, 5);
  return canvas;
}

export interface RailPicture {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
}

/** One side rail of the bridge. Positioned in the world, unlike the other pictures. */
export function paintRail(bridge: Bridge, y: number, near: boolean, r: Rotation): RailPicture {
  const height = 28;
  const pad = 44;
  const a = project(r, bridge.x0, y);
  const b = project(r, bridge.x1, y);
  const minX = Math.min(a[0], b[0]) - pad;
  const minY = Math.min(a[1], b[1]) - pad;
  const w = Math.abs(a[0] - b[0]) + pad * 2;
  const h = Math.abs(a[1] - b[1]) + pad * 2;
  const [canvas, c] = newCanvas(w, h, SPRITE_SCALE);
  c.translate(-minX, -minY);
  const edge = (r < 2) === near;
  if (edge) poly(c, [project(r, bridge.x0, y), project(r, bridge.x1, y), project(r, bridge.x1, y, -9), project(r, bridge.x0, y, -9)], '#b98757');
  poly(c, [project(r, bridge.x0, y, height - 7), project(r, bridge.x1, y, height - 7), project(r, bridge.x1, y, height), project(r, bridge.x0, y, height)], '#d99a6c', '#a86f48');
  for (let x = bridge.x0; x <= bridge.x1; x += 2) {
    const [px, py] = project(r, x, y);
    poly(c, [[px - 3.5, py], [px + 3.5, py], [px + 3.5, py - height - 3], [px - 3.5, py - height - 3]], '#c98a5e', '#a86f48');
    circle(c, px, py - height - 5, 5, '#ffd0dc');
  }
  return { canvas, x: minX, y: minY };
}

export function paintShadow(): HTMLCanvasElement {
  const [canvas, c] = newCanvas(44, 24, SPRITE_SCALE);
  shadow(c, 22, 12, 19);
  return canvas;
}

export function paintNameTag(name: string): HTMLCanvasElement {
  const scale = 3;
  const font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const w = Math.ceil(measure.measureText(name).width) + 18;
  const [canvas, c] = newCanvas(w, 22, scale);
  c.fillStyle = 'rgba(255,255,255,.94)';
  c.beginPath();
  c.roundRect(0, 0, w, 22, 11);
  c.fill();
  c.font = font;
  c.fillStyle = '#5a4a6a';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(name, w / 2, 11.5);
  return canvas;
}

/** The bobbing marker above a bamboo tree that has a stick to pick. */
export function paintStickMarker(): HTMLCanvasElement {
  const [canvas, c] = newCanvas(44, 44, 3);
  c.fillStyle = 'rgba(255,255,255,.95)';
  c.beginPath();
  c.arc(22, 22, 20, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#ffd166';
  c.lineWidth = 3;
  c.stroke();
  c.save();
  c.translate(22, 22);
  c.rotate(0.6);
  c.strokeStyle = '#6fc48a';
  c.lineWidth = 7;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, -13);
  c.lineTo(0, 13);
  c.stroke();
  c.strokeStyle = '#4fa56d';
  c.lineWidth = 1.6;
  c.lineCap = 'butt';
  for (const y of [-5, 5]) {
    c.beginPath();
    c.moveTo(-3.5, y);
    c.lineTo(3.5, y);
    c.stroke();
  }
  c.restore();
  ellipse(c, 13, 13, 8, 3, -0.6, '#8edb8f');
  return canvas;
}

/** A little speech bubble showing what a friend is busy with. */
export function paintBubble(icon: string): HTMLCanvasElement {
  const [canvas, c] = newCanvas(40, 42, 3);
  c.fillStyle = 'rgba(255,255,255,.96)';
  c.beginPath();
  c.arc(20, 18, 17, 0, Math.PI * 2);
  c.fill();
  poly(c, [[15, 32], [25, 32], [20, 41]], 'rgba(255,255,255,.96)');
  c.font = '19px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(icon, 20, 19);
  return canvas;
}

export function paintPlusOne(): HTMLCanvasElement {
  const [canvas, c] = newCanvas(60, 34, 3);
  c.font = '800 26px -apple-system, BlinkMacSystemFont, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 5;
  c.strokeStyle = '#ffffff';
  c.strokeText('+1', 30, 18);
  c.fillStyle = '#4fa56d';
  c.fillText('+1', 30, 18);
  return canvas;
}

export function paintTapRing(): HTMLCanvasElement {
  const [canvas, c] = newCanvas(50, 26, SPRITE_SCALE);
  c.strokeStyle = 'rgba(255,127,168,.9)';
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(25, 13, 22, 10.5, 0, 0, Math.PI * 2);
  c.stroke();
  return canvas;
}
