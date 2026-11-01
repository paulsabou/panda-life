import { describe, expect, it } from 'vitest';
import { CATALOGUE, CATEGORIES, itemById } from './catalogue';
import { KNAPSACK_SLOTS, STARTING_FRIEND_COINS, emptyKnapsacks, startingPurses } from './knapsack';
import type { Progress } from './missions';
import { buy, sell, sellPrice } from './shop';

const wallet = (coins: number): Progress => ({
  coins,
  nextId: 1,
  inbox: [],
  active: null,
  knapsacks: emptyKnapsacks(),
  friendCoins: startingPurses(),
});

describe('the catalogue', () => {
  it('has exactly 100 objects', () => {
    expect(CATALOGUE).toHaveLength(100);
  });

  it('has no two objects the same', () => {
    expect(new Set(CATALOGUE.map((i) => i.id)).size).toBe(100);
    expect(new Set(CATALOGUE.map((i) => i.name)).size).toBe(100);
  });

  it('prices everything in whole coins, at a reachable price', () => {
    for (const item of CATALOGUE) {
      expect(Number.isInteger(item.price)).toBe(true);
      expect(item.price).toBeGreaterThanOrEqual(1);
      expect(item.price).toBeLessThanOrEqual(60);
    }
  });

  it('gives everything a picture and a known category', () => {
    for (const item of CATALOGUE) {
      expect(item.icon.length).toBeGreaterThan(0);
      expect(CATEGORIES).toContain(item.category);
    }
  });

  it('is mostly food, cooking tools and books', () => {
    const everyday = CATALOGUE.filter((i) => ['Food', 'Kitchen', 'Books & study'].includes(i.category));
    expect(everyday.length).toBeGreaterThan(50);
  });

  it('charges more for big things than small things', () => {
    expect(itemById('rice-cooker')!.price).toBeGreaterThan(itemById('rice-ball')!.price);
    expect(itemById('futon')!.price).toBeGreaterThan(itemById('pillow')!.price);
  });
});

describe('buying', () => {
  it('takes the coins and puts the object in the knapsack', () => {
    const p = wallet(10);
    expect(buy(p, 'sushi', 'rice-ball')).toBe('done');
    expect(p.coins).toBe(7);
    expect(p.knapsacks.sushi).toEqual([{ id: 'rice-ball', name: 'Rice ball', count: 1 }]);
  });

  it('stacks the same object in one slot', () => {
    const p = wallet(10);
    buy(p, 'sushi', 'rice-ball');
    buy(p, 'sushi', 'rice-ball');
    expect(p.knapsacks.sushi).toHaveLength(1);
    expect(p.knapsacks.sushi[0].count).toBe(2);
  });

  it('refuses without enough coins and changes nothing', () => {
    const p = wallet(2);
    expect(buy(p, 'sushi', 'rice-ball')).toBe('not-enough-coins');
    expect(p.coins).toBe(2);
    expect(p.knapsacks.sushi).toEqual([]);
  });

  it('allows spending the very last coin', () => {
    const p = wallet(3);
    expect(buy(p, 'sushi', 'rice-ball')).toBe('done');
    expect(p.coins).toBe(0);
  });

  it('refuses a new object when every slot is taken, but still stacks', () => {
    const p = wallet(1000);
    CATALOGUE.slice(0, KNAPSACK_SLOTS).forEach((i) => buy(p, 'sushi', i.id));
    const coins = p.coins;
    expect(buy(p, 'sushi', CATALOGUE[KNAPSACK_SLOTS].id)).toBe('knapsack-full');
    expect(p.coins).toBe(coins);
    expect(buy(p, 'sushi', CATALOGUE[0].id)).toBe('done');
  });

  it('refuses something the shop does not sell', () => {
    expect(buy(wallet(100), 'sushi', 'dragon')).toBe('not-available');
  });
});

describe('selling', () => {
  it('pays half, rounded down, in whole coins', () => {
    for (const item of CATALOGUE) {
      expect(Number.isInteger(sellPrice(item))).toBe(true);
      expect(sellPrice(item)).toBeGreaterThanOrEqual(1);
    }
    expect(sellPrice(itemById('rice-ball')!)).toBe(1);
    expect(sellPrice(itemById('rice-cooker')!)).toBe(30);
  });

  it('never lets you make coins by buying and selling the same thing', () => {
    for (const item of CATALOGUE) expect(sellPrice(item)).toBeLessThanOrEqual(item.price);
  });

  it('pays the coins and takes one object out', () => {
    const p = wallet(20);
    p.knapsacks.sushi = [{ id: 'teapot', name: 'Teapot', count: 2 }];
    expect(sell(p, 'sushi', 'teapot')).toBe('done');
    expect(p.coins).toBe(29);
    expect(p.knapsacks.sushi[0].count).toBe(1);
  });

  it('frees the slot when the last one is sold', () => {
    const p = wallet(0);
    p.knapsacks.sushi = [{ id: 'teapot', name: 'Teapot', count: 1 }];
    sell(p, 'sushi', 'teapot');
    expect(p.knapsacks.sushi).toEqual([]);
  });

  it('refuses to sell what is not in the knapsack', () => {
    const p = wallet(5);
    expect(sell(p, 'sushi', 'teapot')).toBe('not-available');
    expect(p.coins).toBe(5);
  });

  it('works for any character\'s knapsack', () => {
    const p = wallet(10);
    expect(buy(p, 'maguro', 'can-of-tuna')).toBe('done');
    expect(p.knapsacks.maguro).toHaveLength(1);
    expect(p.knapsacks.sushi).toEqual([]);
    expect(p.friendCoins.maguro).toBe(STARTING_FRIEND_COINS - 4);
    expect(p.coins).toBe(10);
    expect(sell(p, 'maguro', 'can-of-tuna')).toBe('done');
    expect(p.friendCoins.maguro).toBe(STARTING_FRIEND_COINS - 2);
    expect(p.coins).toBe(10);
  });
});
