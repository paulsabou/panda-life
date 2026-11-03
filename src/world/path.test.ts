import { describe, expect, it } from 'vitest';
import type { Ground } from './collision';
import type { Pair } from './iso';
import { findPath } from './path';

/** A field with a wall along x = 10, open only where `gapAt` says. */
const wall = (gapAt: (y: number) => boolean): Ground => ({
  blocked: (x, y) => x < 0.5 || y < 0.5 || x > 19.5 || y > 19.5 || (Math.abs(x - 10.5) < 1 && !gapAt(y)),
});

function crossesWallAt(from: Pair, path: Pair[]): number[] {
  const crossings: number[] = [];
  let [x, y] = from;
  for (const [nx, ny] of path) {
    if ((x - 10.5) * (nx - 10.5) < 0) crossings.push(y + ((ny - y) * (10.5 - x)) / (nx - x));
    [x, y] = [nx, ny];
  }
  return crossings;
}

describe('findPath', () => {
  it('goes through the gap in a wall, never through anything solid', () => {
    const ground = wall((y) => y > 14 && y < 18);
    const from: Pair = [3.5, 3.5];
    const path = findPath(ground, from, [17.5, 3.5]);
    expect(path.at(-1)).toEqual([17.5, 3.5]);
    for (const y of crossesWallAt(from, path)) expect(y).toBeGreaterThan(14);
    let [x, y] = from;
    for (const [nx, ny] of path) {
      for (let t = 0; t <= 1; t += 0.05) expect(ground.blocked(x + (nx - x) * t, y + (ny - y) * t)).toBe(false);
      [x, y] = [nx, ny];
    }
  });

  it('walks straight when nothing is in the way', () => {
    expect(findPath(wall(() => true), [3.5, 3.5], [17.5, 3.5])).toEqual([[17.5, 3.5]]);
  });

  it('gets as close as it can when the goal is walled off', () => {
    const path = findPath(wall(() => false), [3.5, 3.5], [17.5, 3.5]);
    expect(path.at(-1)).toEqual([9.5, 3.5]);
  });

  it('plans over each ground separately, even after planning over another', () => {
    const from: Pair = [3.5, 3.5];
    const to: Pair = [17.5, 3.5];
    const nearGap = wall((y) => y < 6);
    const farGap = wall((y) => y > 14 && y < 18);
    expect(crossesWallAt(from, findPath(nearGap, from, to))[0]).toBeLessThan(6);
    expect(crossesWallAt(from, findPath(farGap, from, to))[0]).toBeGreaterThan(14);
    expect(crossesWallAt(from, findPath(nearGap, from, to))[0]).toBeLessThan(6);
  });
});
