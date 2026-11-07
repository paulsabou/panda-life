import { describe, expect, it } from 'vitest';
import { MAP_SIZE, WORLD_H, WORLD_W, project, type Rotation } from '../world/iso';
import { GROUND_PIECE, groundPieces } from './painters';

describe('ground pieces', () => {
  it.each([0, 1, 2, 3] as Rotation[])('cover every tile corner at rotation %i', (r) => {
    const pieces = groundPieces(r);
    for (let y = 0; y <= MAP_SIZE; y += 5) {
      for (let x = 0; x <= MAP_SIZE; x += 5) {
        const [px, py] = project(r, x, y);
        expect(pieces.some((p) => px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h)).toBe(true);
      }
    }
  });

  it('never makes a piece bigger than a phone can hold', () => {
    for (const p of groundPieces(0)) expect(Math.max(p.w, p.h)).toBeLessThanOrEqual(GROUND_PIECE);
  });

  it('skips the empty sky in the corners', () => {
    const grid = Math.ceil(WORLD_W / GROUND_PIECE) * Math.ceil(WORLD_H / GROUND_PIECE);
    expect(groundPieces(0).length).toBeLessThan(grid);
  });
});
