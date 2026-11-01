import { describe, expect, it } from 'vitest';
import { FRIENDS } from './friends';
import { STARTING_FRIEND_COINS, emptyKnapsacks, startingPurses } from './knapsack';
import { loadProgress, saveProgress } from './save';

function memoryStorage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
}

describe('saving progress', () => {
  it('starts fresh with nothing saved', () => {
    expect(loadProgress(memoryStorage())).toEqual({
      coins: 0,
      nextId: 1,
      inbox: [],
      active: null,
      knapsacks: emptyKnapsacks(),
      friendCoins: startingPurses(),
    });
  });

  it('brings back what was saved', () => {
    const storage = memoryStorage();
    const progress = {
      coins: 24,
      nextId: 5,
      inbox: [{ id: 4, friend: 'inari' as const, sticks: 3, reward: 6 }],
      active: { mission: { id: 3, friend: 'ebi' as const, sticks: 5, reward: 10 }, collected: 2 },
      knapsacks: { ...emptyKnapsacks(), sushi: [{ id: 'bamboo', name: 'Bamboo stick', count: 2 }] },
      friendCoins: { ...startingPurses(), inari: 31 },
    };
    saveProgress(progress, storage);
    expect(loadProgress(storage)).toEqual(progress);
  });

  it('gives everyone an empty knapsack to begin with', () => {
    const { knapsacks } = loadProgress(memoryStorage());
    expect(knapsacks.sushi).toEqual([]);
    for (const friend of FRIENDS) expect(knapsacks[friend.id]).toEqual([]);
  });

  it('keeps old saves, adding the knapsacks they never had', () => {
    const old = JSON.stringify({ coins: 40, nextId: 9, inbox: [], active: null });
    const progress = loadProgress(memoryStorage(old));
    expect(progress.coins).toBe(40);
    expect(progress.knapsacks).toEqual(emptyKnapsacks());
    expect(progress.friendCoins.ebi).toBe(STARTING_FRIEND_COINS);
  });

  it('starts fresh if the save is damaged', () => {
    expect(loadProgress(memoryStorage('not json')).coins).toBe(0);
    expect(loadProgress(memoryStorage('{"coins":"lots"}')).coins).toBe(0);
  });
});
