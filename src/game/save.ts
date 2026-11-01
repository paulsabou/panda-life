import { emptyKnapsacks, restoreKnapsacks } from './knapsack';
import type { Progress } from './missions';

const SAVE_KEY = 'panda-life-save-v1';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

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
      };
    }
  } catch {
    // a damaged save just means starting again
  }
  return { coins: 0, nextId: 1, inbox: [], active: null, knapsacks: emptyKnapsacks() };
}

export function saveProgress(progress: Progress, storage: Store): void {
  storage.setItem(SAVE_KEY, JSON.stringify(progress));
}
