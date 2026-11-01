import { itemById, type ShopItem } from './catalogue';
import { KNAPSACK_SLOTS, type KnapsackOwner } from './knapsack';
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
  const knapsack = progress.knapsacks[owner];
  const held = knapsack.find((k) => k.id === id);
  if (!held && knapsack.length >= KNAPSACK_SLOTS) return 'knapsack-full';
  addCoins(progress, owner, -item.price);
  if (held) held.count += 1;
  else knapsack.push({ id, name: item.name, count: 1 });
  return 'done';
}

export function sell(progress: Progress, owner: KnapsackOwner, id: string): Deal {
  const item = itemById(id);
  const knapsack = progress.knapsacks[owner];
  const held = knapsack.find((k) => k.id === id);
  if (!item || !held) return 'not-available';
  addCoins(progress, owner, sellPrice(item));
  held.count -= 1;
  if (held.count === 0) progress.knapsacks[owner] = knapsack.filter((k) => k !== held);
  return 'done';
}
