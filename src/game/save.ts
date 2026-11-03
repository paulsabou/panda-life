import { CHARACTER_IDS, type CharacterId } from '../art/characters';
import { restoreDiscovered, restoreFriendship } from './friendship';
import { emptyKnapsacks, restoreKnapsacks, restorePurses, startingPurses } from './knapsack';
import type { Progress } from './missions';

const SAVE_KEY = 'panda-life-save-v1';
const ANIMAL_KEY = 'panda-life-animal-v1';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function freshProgress(): Progress {
  return {
    coins: 0,
    nextId: 1,
    inbox: [],
    active: null,
    knapsacks: emptyKnapsacks(),
    friendCoins: startingPurses(),
    friendship: {},
    discovered: [],
  };
}

export function hasSavedGame(storage: Store): boolean {
  return storage.getItem(SAVE_KEY) !== null;
}

export function loadProgress(storage: Store): Progress {
  try {
    const saved = JSON.parse(storage.getItem(SAVE_KEY) ?? 'null');
    if (typeof saved?.coins === 'number' && typeof saved.nextId === 'number' && Array.isArray(saved.inbox)) {
      return {
        coins: saved.coins,
        nextId: saved.nextId,
        inbox: saved.inbox,
        active: saved.active ?? null,
        knapsacks: restoreKnapsacks(saved.knapsacks),
        friendCoins: restorePurses(saved.friendCoins),
        friendship: restoreFriendship(saved.friendship),
        discovered: restoreDiscovered(saved.discovered),
      };
    }
  } catch {
    // a damaged save just means starting again
  }
  return freshProgress();
}

export function saveProgress(progress: Progress, storage: Store): void {
  storage.setItem(SAVE_KEY, JSON.stringify(progress));
}

/** The animal Sushi is. Games from before there was a choice are the panda. */
export function loadAnimal(storage: Store): CharacterId {
  const saved = storage.getItem(ANIMAL_KEY);
  return CHARACTER_IDS.find((id) => id === saved) ?? 'sushi';
}

/** Throws the old game away and starts again from nothing as the chosen animal. */
export function startNewGame(storage: Store, animal: CharacterId): Progress {
  const progress = freshProgress();
  saveProgress(progress, storage);
  storage.setItem(ANIMAL_KEY, animal);
  return progress;
}
