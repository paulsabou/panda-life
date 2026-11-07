import { describe, expect, it } from 'vitest';
import { itemById } from '../game/catalogue';
import { TASTES, chooseToBuy, chooseToSell, newJob, SHOP_AT } from '../game/botRules';
import { FRIENDS } from '../game/friends';
import { KNAPSACK_SLOTS, emptyKnapsacks, startingPurses } from '../game/knapsack';
import type { Progress } from '../game/missions';
import { Collision } from './collision';
import { buildVillage } from './layout';
import { VillageLife } from './life';
import { PERSONAL_SPACE, Walker } from './walker';

function seeded(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

const progress = (): Progress => ({
  coins: 0,
  nextId: 1,
  inbox: [],
  active: null,
  knapsacks: emptyKnapsacks(),
  friendCoins: startingPurses(),
  friendship: {},
  discovered: [],
});

const village = buildVillage();
const collision = new Collision(village);
const STEP = 1 / 15;

function live(minutes: number, seed = 5) {
  const p = progress();
  const life = new VillageLife(village, collision, p, seeded(seed));
  const news: string[] = [];
  life.subscribe((e) => {
    if (e.type === 'news') news.push(e.text);
  });
  return {
    p,
    life,
    news,
    run(each?: () => void) {
      for (let i = 0; i < (minutes * 60) / STEP; i++) {
        life.update(STEP);
        each?.();
      }
    },
  };
}

describe('the rules', () => {
  it('asks for 3 to 6 sticks at 2 coins each', () => {
    for (const roll of [0, 0.5, 0.999]) {
      const job = newJob('inari', () => roll);
      expect(job.sticks).toBeGreaterThanOrEqual(3);
      expect(job.sticks).toBeLessThanOrEqual(6);
      expect(job.reward).toBe(job.sticks * 2);
    }
  });

  it('buys only what they can afford', () => {
    const p = progress();
    p.friendCoins.ebi = 3;
    for (const roll of [0, 0.3, 0.6, 0.99]) {
      expect(chooseToBuy(p, 'ebi', () => roll)!.price).toBeLessThanOrEqual(3);
    }
  });

  it('buys nothing when they have no coins', () => {
    const p = progress();
    p.friendCoins.ebi = 0;
    expect(chooseToBuy(p, 'ebi', seeded(1))).toBeUndefined();
  });

  it('mostly buys what they like', () => {
    const p = progress();
    const roll = seeded(9);
    let liked = 0;
    for (let i = 0; i < 400; i++) if (chooseToBuy(p, 'inari', roll)!.category === TASTES.inari) liked += 1;
    expect(liked).toBeGreaterThan(200);
  });

  it('only sells to make room, and sells the cheapest', () => {
    const p = progress();
    expect(chooseToSell(p, 'ebi')).toBeUndefined();
    p.knapsacks.ebi = Array.from({ length: KNAPSACK_SLOTS }, (_, i) => {
      const id = ['teapot', 'futon', 'pencil', 'radio', 'kite', 'novel', 'broom', 'umbrella', 'diary', 'apron', 'ruler', 'torch'][i];
      return { id, name: id, count: 1 };
    });
    expect(chooseToSell(p, 'ebi')!.id).toBe('pencil');
    expect(itemById('pencil')).toBeDefined();
  });
});

describe('friends living their lives', () => {
  it('give each other jobs, finish them, get paid and go shopping', () => {
    const world = live(10);
    world.run();
    expect(world.news.some((t) => t.includes('bamboo sticks'))).toBe(true);
    expect(world.news.some((t) => t.includes('earned'))).toBe(true);
    expect(world.news.some((t) => t.includes(' bought: '))).toBe(true);
  });

  it('never ask themselves', () => {
    const world = live(10);
    world.run();
    for (const line of world.news.filter((t) => t.includes(' asked '))) {
      const [giver, rest] = line.split(' asked ');
      expect(rest.startsWith(giver)).toBe(false);
    }
  });

  it('all take part, not just one or two', () => {
    const world = live(25);
    world.run();
    for (const friend of FRIENDS) {
      const mentioned = world.news.filter((t) => t.startsWith(friend.name) && t.includes('finished')).length;
      expect(mentioned).toBeGreaterThan(0);
    }
  }, 30000);

  it('end up with things in their knapsacks', () => {
    const world = live(25);
    world.run();
    const owned = FRIENDS.filter((f) => world.p.knapsacks[f.id].length > 0);
    expect(owned.length).toBeGreaterThanOrEqual(4);
  }, 30000);

  it('keep to whole coins and never go below zero', () => {
    const world = live(15);
    world.run(() => {
      for (const friend of FRIENDS) {
        const coins = world.p.friendCoins[friend.id];
        expect(Number.isInteger(coins)).toBe(true);
        expect(coins).toBeGreaterThanOrEqual(0);
      }
    });
  }, 30000);

  it('keep their feet on open ground the whole time', () => {
    const world = live(10);
    world.run(() => {
      for (const v of world.life.villagers) {
        if (!v.hidden) expect(collision.blocked(v.x, v.y)).toBe(false);
      }
    });
  });

  it('do not walk through each other', () => {
    const world = live(10);
    world.run(() => {
      const here = world.life.villagers.filter((v) => !v.hidden);
      here.forEach((a, i) => {
        here.slice(i + 1).forEach((b) => {
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(PERSONAL_SPACE * 0.7);
        });
      });
    });
  });

  it('do not walk through Sushi', () => {
    const world = live(10);
    const sushi = new Walker(village.bridges[0].x0 + 3, (village.bridges[0].y0 + village.bridges[0].y1) / 2, 6);
    world.life.setSushi(sushi);
    world.run(() => {
      for (const v of world.life.villagers) {
        if (!v.hidden) expect(Math.hypot(v.x - sushi.x, v.y - sushi.y)).toBeGreaterThan(PERSONAL_SPACE * 0.7);
      }
    });
  });

  it('give each other presents and grow fonder', () => {
    const world = live(25);
    world.run();
    const gifts = world.news.filter((t) => t.includes(' gave '));
    expect(gifts.length).toBeGreaterThan(0);
    for (const line of gifts) {
      const [giver, rest] = line.split(' gave ');
      expect(rest.startsWith(giver)).toBe(false);
    }
    expect(Object.values(world.p.friendship).some((points) => points > 0)).toBe(true);
  }, 30000);

  it('walk over to Sushi with presents too', () => {
    const world = live(25);
    const sushi = new Walker(village.start[0], village.start[1], 6);
    world.life.setSushi(sushi);
    const handed: number[] = [];
    world.life.subscribe((e) => {
      if (e.type === 'gift' && e.to === 'sushi') {
        const giver = world.life.villagers.find((v) => v.id === e.from)!;
        handed.push(Math.hypot(giver.x - sushi.x, giver.y - sushi.y));
      }
    });
    world.run();
    expect(handed.length).toBeGreaterThan(0);
    for (const distance of handed) expect(distance).toBeLessThan(2);
    expect(world.p.knapsacks.sushi.length).toBeGreaterThan(0);
  }, 30000);

  it('bring Sushi nothing while Sushi is indoors', () => {
    const world = live(10);
    world.life.setSushi(new Walker(village.start[0], village.start[1], 6));
    world.life.sushiAway = true;
    world.run();
    expect(world.p.knapsacks.sushi).toEqual([]);
  });

  it('do not take Sushi\'s coins', () => {
    const world = live(10);
    world.p.coins = 42;
    world.run();
    expect(world.p.coins).toBe(42);
    expect(world.p.knapsacks.sushi).toEqual([]);
  });

  it('take bamboo from the same trees as Sushi', () => {
    const world = live(10);
    let picked = 0;
    world.life.subscribe((e) => {
      if (e.type === 'picked') picked += 1;
    });
    world.run();
    expect(picked).toBeGreaterThan(0);
  });

  it.each([5, 23, 71])('never get stuck for good (village %i)', (seed) => {
    const world = live(20, seed);
    let lastBusy = 0;
    let stalest = 0;
    let tick = 0;
    world.life.subscribe(() => {
      stalest = Math.max(stalest, tick - lastBusy);
      lastBusy = tick;
    });
    world.run(() => {
      tick += 1;
    });
    expect(stalest * STEP).toBeLessThan(120);
  }, 30000);

  it('shop only when they have saved up', () => {
    expect(SHOP_AT).toBeGreaterThan(startingPurses().maguro);
  });
});
