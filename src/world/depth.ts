import { depthOf, rotate, type Rotation } from './iso';
import type { Bridge } from './layout';

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

const RAIL_HALF_THICKNESS = 0.05;

/**
 * A bridge's two railings as long thin footprints at this map angle, so anyone
 * on the deck is drawn in front of the far railing and behind the near one.
 * `base` is added to each railing's depth, as it is to everything standing.
 */
export function railFootprints(bridge: Bridge, r: Rotation, base: number): Footprint[] {
  return [bridge.y0, bridge.y1].map((y) => {
    const a = rotate(r, bridge.x0, y - RAIL_HALF_THICKNESS);
    const b = rotate(r, bridge.x1, y + RAIL_HALF_THICKNESS);
    return {
      x: Math.min(a[0], b[0]),
      y: Math.min(a[1], b[1]),
      w: Math.abs(a[0] - b[0]),
      d: Math.abs(a[1] - b[1]),
      depth: base + depthOf(r, (bridge.x0 + bridge.x1) / 2, y),
    };
  });
}
