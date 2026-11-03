import { itemById, type ShopItem } from './catalogue';
import { hasRoomFor, putIn, takeOut, type KnapsackOwner } from './knapsack';
import type { Progress } from './missions';

export type Deal = 'done' | 'not-enough-coins' | 'knapsack-full' | 'not-available';

/** The shop pays half what it charges, rounded down, and always at least 1 coin. */
export function sellPrice(item: ShopItem): number {
  return Math.max(1, Math.floor(item.price / 2));
}

export function coinsOf(progress: Progress, owner: KnapsackOwner): number {
  return owner === 'sushi' ? progress.coins : progress.friendCoins[owner];
}

function addCoins(progress: Progress, owner: KnapsackOwner, amount: number): void {
  if (owner === 'sushi') progress.coins += amount;
  else progress.friendCoins[owner] += amount;
}

export function buy(progress: Progress, owner: KnapsackOwner, id: string): Deal {
  const item = itemById(id);
  if (!item) return 'not-available';
  if (coinsOf(progress, owner) < item.price) return 'not-enough-coins';
  if (!hasRoomFor(progress.knapsacks, owner, id)) return 'knapsack-full';
  addCoins(progress, owner, -item.price);
  putIn(progress.knapsacks, owner, id, item.name);
  return 'done';
}

export function sell(progress: Progress, owner: KnapsackOwner, id: string): Deal {
  const item = itemById(id);
  if (!item || !takeOut(progress.knapsacks, owner, id)) return 'not-available';
  addCoins(progress, owner, sellPrice(item));
  return 'done';
}
