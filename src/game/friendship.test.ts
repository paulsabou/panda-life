import { describe, expect, it } from 'vitest';
import { itemById } from './catalogue';
import {
  CHARACTERS,
  FAVOURITE_POINTS,
  FAVOURITES,
  GIFT_POINTS,
  MAX_FRIENDSHIP,
  bestFriend,
  chooseGift,
  chooseGiftToBuy,
  friendship,
  give,
  hearts,
  knownFavourites,
  restoreDiscovered,
  restoreFriendship,
} from './friendship';
import { KNAPSACK_SLOTS, emptyKnapsacks, startingPurses } from './knapsack';
import type { Progress } from './missions';

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

function holding(p: Progress, owner: keyof Progress['knapsacks'], id: string, count = 1): Progress {
  p.knapsacks[owner].push({ id, name: itemById(id)!.name, count });
  return p;
}

describe('favourites', () => {
  it('gives Sushi and every friend five things they love, all sold at the shop', () => {
    for (const who of CHARACTERS) {
      expect(FAVOURITES[who]).toHaveLength(5);
      for (const id of FAVOURITES[who]) expect(itemById(id), `${who}: ${id}`).toBeDefined();
    }
  });

  it('starts with every favourite a secret', () => {
    expect(knownFavourites(progress(), 'maguro')).toEqual([null, null, null, null, null]);
  });
});

describe('giving a gift', () => {
  it('moves the object from one knapsack to the other', () => {
    const p = holding(progress(), 'sushi', 'apple', 2);
    give(p, 'sushi', 'inari', 'apple');
    expect(p.knapsacks.sushi).toEqual([{ id: 'apple', name: 'Apple', count: 1 }]);
    expect(p.knapsacks.inari).toEqual([{ id: 'apple', name: 'Apple', count: 1 }]);
  });

  it('adds a little friendship for any gift', () => {
    const p = holding(progress(), 'sushi', 'apple');
    expect(give(p, 'sushi', 'inari', 'apple')).toMatchObject({ favourite: false, points: GIFT_POINTS });
    expect(friendship(p, 'sushi', 'inari')).toBe(GIFT_POINTS);
  });

  it('adds much more for a favourite, and reveals it', () => {
    const loved = FAVOURITES.maguro[2];
    const p = holding(progress(), 'sushi', loved);
    expect(give(p, 'sushi', 'maguro', loved)).toMatchObject({ favourite: true, points: FAVOURITE_POINTS });
    expect(friendship(p, 'sushi', 'maguro')).toBe(FAVOURITE_POINTS);
    expect(knownFavourites(p, 'maguro')).toEqual([null, null, loved, null, null]);
  });

  it('is the same friendship whichever way round', () => {
    const p = holding(progress(), 'ebi', 'apple');
    give(p, 'ebi', 'tamago', 'apple');
    expect(friendship(p, 'tamago', 'ebi')).toBe(GIFT_POINTS);
    expect(friendship(p, 'ebi', 'tamago')).toBe(GIFT_POINTS);
    expect(friendship(p, 'ebi', 'sushi')).toBe(0);
  });

  it('never goes over the top', () => {
    const loved = FAVOURITES.inari[0];
    const p = holding(progress(), 'sushi', loved, 20);
    for (let i = 0; i < 20; i++) give(p, 'sushi', 'inari', loved);
    expect(friendship(p, 'sushi', 'inari')).toBe(MAX_FRIENDSHIP);
  });

  it('refuses what the giver does not have, and changes nothing', () => {
    const p = progress();
    expect(give(p, 'sushi', 'inari', 'apple')).toBe('not-held');
    expect(p.friendship).toEqual({});
  });

  it('refuses when the other knapsack is full, and keeps the gift', () => {
    const p = holding(progress(), 'sushi', 'apple');
    for (let i = 0; i < KNAPSACK_SLOTS; i++) p.knapsacks.inari.push({ id: `thing-${i}`, name: 'Thing', count: 1 });
    expect(give(p, 'sushi', 'inari', 'apple')).toBe('knapsack-full');
    expect(p.knapsacks.sushi).toHaveLength(1);
  });

  it('cannot be given to yourself', () => {
    const p = holding(progress(), 'sushi', 'apple');
    expect(give(p, 'sushi', 'sushi', 'apple')).toBe('to-self');
  });
});

describe('hearts', () => {
  it('fills one heart for every fifth of the way', () => {
    expect(hearts(0)).toBe(0);
    expect(hearts(GIFT_POINTS)).toBe(0);
    expect(hearts(FAVOURITE_POINTS)).toBe(1);
    expect(hearts(MAX_FRIENDSHIP)).toBe(5);
  });
});

describe("friends' gift rules", () => {
  it('give someone a favourite when they hold one', () => {
    const loved = FAVOURITES.tamago[0];
    const p = holding(holding(progress(), 'ebi', 'pencil'), 'ebi', loved);
    for (const roll of [0, 0.4, 0.9]) {
      expect(chooseGift(p, 'ebi', ['inari', 'tamago', 'sushi'], () => roll)).toEqual({ to: 'tamago', item: loved });
    }
  });

  it('otherwise give something to someone', () => {
    const p = holding(progress(), 'ebi', 'pencil');
    const gift = chooseGift(p, 'ebi', ['inari', 'tamago'], () => 0.5);
    expect(gift?.item).toBe('pencil');
    expect(['inari', 'tamago']).toContain(gift?.to);
  });

  it('keep their own favourites', () => {
    const p = holding(progress(), 'ebi', FAVOURITES.ebi[0]);
    expect(chooseGift(p, 'ebi', ['inari'], () => 0.5)).toBeUndefined();
  });

  it('have nothing to give with an empty knapsack', () => {
    expect(chooseGift(progress(), 'ebi', ['inari'], () => 0.5)).toBeUndefined();
  });

  it('skip anyone whose knapsack is full', () => {
    const p = holding(progress(), 'ebi', 'pencil');
    for (let i = 0; i < KNAPSACK_SLOTS; i++) p.knapsacks.inari.push({ id: `thing-${i}`, name: 'Thing', count: 1 });
    expect(chooseGift(p, 'ebi', ['inari'], () => 0.5)).toBeUndefined();
  });

  it("buy someone else's favourite that they can afford", () => {
    const p = progress();
    p.friendCoins.ebi = 4;
    for (const roll of [0, 0.5, 0.99]) {
      const item = itemById(chooseGiftToBuy(p, 'ebi', () => roll)!)!;
      expect(item.price).toBeLessThanOrEqual(4);
      expect(CHARACTERS.some((who) => who !== 'ebi' && FAVOURITES[who].includes(item.id))).toBe(true);
    }
  });
});

describe('saving', () => {
  it('keeps only sensible friendship numbers', () => {
    expect(restoreFriendship({ 'inari|sushi': 25, 'ebi|maguro': 'lots' })).toEqual({ 'inari|sushi': 25 });
    expect(restoreFriendship(undefined)).toEqual({});
  });

  it('keeps only real discoveries', () => {
    expect(restoreDiscovered(['maguro:taiyaki', 7])).toEqual(['maguro:taiyaki']);
    expect(restoreDiscovered('nope')).toEqual([]);
  });
});

describe('best friends', () => {
  it('is whoever they are fondest of, or nobody yet', () => {
    const p = holding(holding(progress(), 'ebi', 'apple'), 'inari', FAVOURITES.ebi[0]);
    expect(bestFriend(p, 'ebi')).toBeNull();
    give(p, 'ebi', 'tamago', 'apple');
    expect(bestFriend(p, 'ebi')).toBe('tamago');
    give(p, 'inari', 'ebi', FAVOURITES.ebi[0]);
    expect(bestFriend(p, 'ebi')).toBe('inari');
  });
});
