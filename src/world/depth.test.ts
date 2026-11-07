import { describe, expect, it } from 'vitest';
import { depthAmong, railFootprints } from './depth';
import { rotate, type Rotation } from './iso';

const box = (x: number, y: number, w: number, d: number) => ({ x, y, w, d, depth: x + y + (w + d) / 2 });

describe('who is drawn in front', () => {
  it('draws someone in front of a thing they have walked past', () => {
    const table = box(5, 5, 4, 4);
    expect(depthAmong(7, 9.5, 16.5, [table])).toBeGreaterThan(table.depth);
    expect(depthAmong(9.5, 7, 16.5, [table])).toBeGreaterThan(table.depth);
  });

  it('draws someone behind a thing they have not reached', () => {
    const table = box(5, 5, 4, 4);
    expect(depthAmong(7, 4, 11, [table])).toBeLessThan(table.depth);
    expect(depthAmong(4, 7, 11, [table])).toBeLessThan(table.depth);
    expect(depthAmong(4, 8, 15, [table])).toBeLessThan(table.depth);
  });

  it('is not pushed around by something far off to one side', () => {
    // past the crate along x, but the crate is much closer along y
    const crate = box(4.6, 10.2, 2, 1.3);
    expect(depthAmong(7.2, 2.2, 9.4, [crate])).toBe(9.4);
  });

  it('stays behind a nearby shelf despite a crate on the far side of the room', () => {
    const crate = box(4.6, 10.2, 2, 1.3);
    const shelf = box(8.6, 3, 1.1, 3.4);
    expect(depthAmong(7.2, 2.2, 9.4, [crate, shelf])).toBeLessThan(shelf.depth);
  });
});

describe('bridge railings', () => {
  const bridge = { x0: 61, x1: 72, y0: 68, y1: 72 };

  it.each([0, 1, 2, 3] as Rotation[])('keep anyone on the deck between them, all along it, at rotation %i', (r) => {
    const rails = railFootprints(bridge, r, 0);
    const depths = rails.map((f) => f.depth);
    for (const x of [61.5, 64, 66.5, 69, 71.5]) {
      for (const y of [68.6, 70, 71.4]) {
        const [vx, vy] = rotate(r, x, y);
        const depth = depthAmong(vx, vy, vx + vy, rails);
        expect(depth, `${x},${y}`).toBeGreaterThan(Math.min(...depths));
        expect(depth, `${x},${y}`).toBeLessThan(Math.max(...depths));
      }
    }
  });

  it('leave anyone well off the bridge alone', () => {
    const [vx, vy] = rotate(0, 40, 70);
    expect(depthAmong(vx, vy, vx + vy, railFootprints(bridge, 0, 0))).toBe(vx + vy);
  });
});
