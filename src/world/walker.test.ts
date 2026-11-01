import { describe, expect, it } from 'vitest';
import { Collision } from './collision';
import { buildVillage } from './layout';
import { PERSONAL_SPACE, Walker, Wanderer, facing } from './walker';

const village = buildVillage();
const collision = new Collision(village);

function seeded(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

describe('facing', () => {
  it('shows the side view walking right and mirrors it walking left', () => {
    expect(facing(0, 1, -1)).toEqual(['side', false]);
    expect(facing(0, -1, 1)).toEqual(['side', true]);
  });

  it('shows the front walking down the screen and the back walking up', () => {
    expect(facing(0, 1, 1)).toEqual(['front', false]);
    expect(facing(0, -1, -1)).toEqual(['back', false]);
  });

  it('follows the map when it turns', () => {
    expect(facing(1, 1, 1)[0]).toBe('side');
    expect(facing(2, 1, 1)).toEqual(['back', false]);
  });
});

describe('friends wandering', () => {
  const wanderers = () => village.residents.map((r, i) => new Wanderer(r.x, r.y, seeded(i + 1)));

  it('actually walk, and keep their feet on open ground the whole time', () => {
    const friends = wanderers();
    const startedAt = friends.map((f) => [f.x, f.y]);
    let walkedFrames = 0;
    for (let frame = 0; frame < 3000; frame++) {
      for (const f of friends) {
        f.update(collision, friends, 1 / 30);
        if (f.moving) walkedFrames++;
        expect(collision.blocked(f.x, f.y)).toBe(false);
      }
    }
    expect(walkedFrames).toBeGreaterThan(1000);
    friends.forEach((f, i) => expect(Math.hypot(f.x - startedAt[i][0], f.y - startedAt[i][1])).toBeGreaterThan(0));
  });

  it('stay near their own house', () => {
    const friends = wanderers();
    for (let frame = 0; frame < 3000; frame++) {
      for (const f of friends) {
        f.update(collision, friends, 1 / 30);
        expect(Math.hypot(f.x - f.homeX, f.y - f.homeY)).toBeLessThan(10);
      }
    }
  });

  it('never walk into Sushi', () => {
    const friend = new Wanderer(village.residents[0].x, village.residents[0].y, seeded(7));
    const sushi = new Walker(friend.x + 2, friend.y, 6);
    for (let frame = 0; frame < 3000; frame++) {
      friend.update(collision, [friend, sushi], 1 / 30);
      expect(Math.hypot(friend.x - sushi.x, friend.y - sushi.y)).toBeGreaterThanOrEqual(PERSONAL_SPACE - 0.01);
    }
  });
});

describe('meeting someone on the path', () => {
  it('lets two walkers coming straight at each other get past', () => {
    const y = village.start[1];
    const a = new Walker(12.5, y, 3);
    const b = new Walker(16.5, y, 3);
    const both = [a, b];
    a.walkTo(collision, [16.5, y]);
    b.walkTo(collision, [12.5, y]);
    for (let frame = 0; frame < 300 && (a.walkingARoute || b.walkingARoute); frame++) {
      a.followRoute(collision, both, 1 / 30);
      b.followRoute(collision, both, 1 / 30);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(PERSONAL_SPACE * 0.9);
    }
    expect(a.walkingARoute).toBe(false);
    expect(b.walkingARoute).toBe(false);
  });
});

describe('Sushi bumping into a friend', () => {
  it('stops at the friend instead of walking through', () => {
    const friend = new Wanderer(village.residents[0].x, village.residents[0].y, seeded(3));
    const sushi = new Walker(friend.x - 3, friend.y, 6);
    for (let frame = 0; frame < 120; frame++) sushi.step(collision, [sushi, friend], 1, 0, 1 / 30);
    expect(Math.hypot(friend.x - sushi.x, friend.y - sushi.y)).toBeGreaterThanOrEqual(PERSONAL_SPACE - 0.01);
  });

  it('can always walk away again', () => {
    const friend = new Wanderer(village.residents[0].x, village.residents[0].y, seeded(3));
    const sushi = new Walker(friend.x - 0.5, friend.y, 6);
    expect(sushi.step(collision, [sushi, friend], -1, 0, 1 / 30)).toBe(true);
  });
});
