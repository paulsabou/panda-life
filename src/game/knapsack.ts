import type { FriendId } from './friends';
import { FRIENDS } from './friends';

export type KnapsackOwner = 'sushi' | FriendId;

export interface KnapsackItem {
  id: string;
  name: string;
  count: number;
}

export type Knapsacks = Record<KnapsackOwner, KnapsackItem[]>;

/** How many items a knapsack shows at once. */
export const KNAPSACK_SLOTS = 12;

export function emptyKnapsacks(): Knapsacks {
  const knapsacks = { sushi: [] } as unknown as Knapsacks;
  for (const friend of FRIENDS) knapsacks[friend.id] = [];
  return knapsacks;
}

/** Coins each friend starts with. Sushi's coins are kept separately. */
export const STARTING_FRIEND_COINS = 10;

export type Purses = Record<FriendId, number>;

export function startingPurses(): Purses {
  const purses = {} as Purses;
  for (const friend of FRIENDS) purses[friend.id] = STARTING_FRIEND_COINS;
  return purses;
}

export function restorePurses(saved: unknown): Purses {
  const purses = startingPurses();
  if (typeof saved !== 'object' || saved === null) return purses;
  for (const friend of FRIENDS) {
    const coins = (saved as Partial<Purses>)[friend.id];
    if (typeof coins === 'number') purses[friend.id] = coins;
  }
  return purses;
}

/** Keeps whatever a save holds, and gives anyone missing from it an empty knapsack. */
export function restoreKnapsacks(saved: unknown): Knapsacks {
  const knapsacks = emptyKnapsacks();
  if (typeof saved !== 'object' || saved === null) return knapsacks;
  for (const owner of Object.keys(knapsacks) as KnapsackOwner[]) {
    const items = (saved as Partial<Knapsacks>)[owner];
    if (Array.isArray(items)) knapsacks[owner] = items;
  }
  return knapsacks;
}
