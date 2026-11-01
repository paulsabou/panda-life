export interface Footprint {
  x: number;
  y: number;
  w: number;
  d: number;
  depth: number;
}

/**
 * How far from the camera to draw someone standing at (x, y) among things with a
 * square footprint. Distance alone goes wrong beside anything big, so check which
 * side of each footprint they are on. Someone past a footprint on one axis while
 * it is past them on the other is off to its side, and neither covers the other.
 */
export function depthAmong(x: number, y: number, base: number, footprints: readonly Footprint[]): number {
  let lowest = -Infinity;
  let highest = Infinity;
  for (const f of footprints) {
    const pastIt = x >= f.x + f.w || y >= f.y + f.d;
    const itIsPast = f.x >= x || f.y >= y;
    if (pastIt && !itIsPast) lowest = Math.max(lowest, f.depth);
    if (itIsPast && !pastIt) highest = Math.min(highest, f.depth);
  }
  if (base < lowest) return lowest + 0.05;
  if (base > highest) return highest - 0.05;
  return base;
}
