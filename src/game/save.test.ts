import { describe, expect, it } from 'vitest';
import { FRIENDS } from './friends';
import { STARTING_FRIEND_COINS, emptyKnapsacks, startingPurses } from './knapsack';
import { hasSavedGame, loadAnimal, loadProgress, saveProgress, startNewGame } from './save';

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set('panda-life-save-v1', initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, next: string) => {
      values.set(key, next);
    },
  };
}

describe('saving progress', () => {
  it('loads a save from before the new friends, keeping the old friends as they were', () => {
    const store = memoryStorage(
      JSON.stringify({
        coins: 7,
        nextId: 3,
        inbox: [],
        active: null,
        knapsacks: { sushi: [], maguro: [{ id: 'apple', name: 'Apple', count: 2 }], inari: [], unagi: [], tamago: [], ikura: [], ebi: [] },
        friendCoins: { maguro: 30, inari: 10, unagi: 10, tamago: 10, ikura: 10, ebi: 4 },
        friendship: { 'maguro|sushi': 40 },
        discovered: ['maguro:taiyaki'],
      }),
    );
    const p = loadProgress(store);
    expect(p.friendCoins).toMatchObject({ maguro: 30, ebi: 4, nori: 10, toro: 10, ume: 10, tako: 10, mochi: 10, saba: 10 });
    expect(p.knapsacks.maguro).toEqual([{ id: 'apple', name: 'Apple', count: 2 }]);
    expect(p.knapsacks.saba).toEqual([]);
    expect(p.friendship['maguro|sushi']).toBe(40);
  });

  it('starts fresh with nothing saved', () => {
    expect(loadProgress(memoryStorage())).toEqual({
      coins: 0,
      nextId: 1,
      inbox: [],
      active: null,
      knapsacks: emptyKnapsacks(),
      friendCoins: startingPurses(),
      friendship: {},
      discovered: [],
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
      friendship: { 'inari|sushi': 25 },
      discovered: ['inari:tofu'],
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
    expect(progress.friendship).toEqual({});
    expect(progress.discovered).toEqual([]);
  });

  it('starts fresh if the save is damaged', () => {
    expect(loadProgress(memoryStorage('not json')).coins).toBe(0);
    expect(loadProgress(memoryStorage('{"coins":"lots"}')).coins).toBe(0);
  });
});

describe('new and saved games', () => {
  it('knows when there is a game to continue', () => {
    expect(hasSavedGame(memoryStorage())).toBe(false);
    const storage = memoryStorage();
    saveProgress(loadProgress(storage), storage);
    expect(hasSavedGame(storage)).toBe(true);
  });

  it('plays the panda in games saved before animals could be chosen', () => {
    expect(loadAnimal(memoryStorage())).toBe('sushi');
  });

  it('starts a new game from nothing, as the chosen animal', () => {
    const storage = memoryStorage();
    saveProgress({ ...loadProgress(storage), coins: 99 }, storage);
    const progress = startNewGame(storage, 'fox');
    expect(progress.coins).toBe(0);
    expect(loadProgress(storage).coins).toBe(0);
    expect(loadAnimal(storage)).toBe('fox');
  });

  it('ignores an animal it does not know', () => {
    const storage = memoryStorage();
    storage.setItem('panda-life-animal-v1', 'dragon');
    expect(loadAnimal(storage)).toBe('sushi');
  });
});
