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

/** Whether one more of this object fits: it stacks on its own kind, or needs a free slot. */
export function hasRoomFor(knapsacks: Knapsacks, owner: KnapsackOwner, id: string): boolean {
  const knapsack = knapsacks[owner];
  return knapsack.some((k) => k.id === id) || knapsack.length < KNAPSACK_SLOTS;
}

/** Puts one in, stacking with the same object. Returns false if there is no room. */
export function putIn(knapsacks: Knapsacks, owner: KnapsackOwner, id: string, name: string): boolean {
  if (!hasRoomFor(knapsacks, owner, id)) return false;
  const held = knapsacks[owner].find((k) => k.id === id);
  if (held) held.count += 1;
  else knapsacks[owner].push({ id, name, count: 1 });
  return true;
}

/** Takes one out, freeing the slot when it was the last. Returns false if there was none. */
export function takeOut(knapsacks: Knapsacks, owner: KnapsackOwner, id: string): boolean {
  const held = knapsacks[owner].find((k) => k.id === id);
  if (!held) return false;
  held.count -= 1;
  if (held.count === 0) knapsacks[owner] = knapsacks[owner].filter((k) => k !== held);
  return true;
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
