import { CATALOGUE, itemById, type Category, type ShopItem } from './catalogue';
import type { FriendId } from './friends';
import { KNAPSACK_SLOTS } from './knapsack';
import type { Progress } from './missions';
import { coinsOf, sellPrice } from './shop';

/** Friends save up to this many coins before going shopping. */
export const SHOP_AT = 12;
const MIN_STICKS = 3;
const STICK_CHOICES = 4;
const COINS_PER_STICK = 2;
const FAVOURITE_CHANCE = 0.7;

/** What each friend likes to buy, most of the time. */
export const TASTES: Record<FriendId, Category> = {
  maguro: 'Food',
  inari: 'Books & study',
  unagi: 'Kitchen',
  tamago: 'Food',
  ikura: 'Home',
  ebi: 'Play & wear',
  nori: 'Books & study',
  toro: 'Food',
  ume: 'Home',
  tako: 'Kitchen',
  mochi: 'Food',
  saba: 'Play & wear',
};

export interface Job {
  giver: FriendId;
  sticks: number;
  reward: number;
  collected: number;
}

export function newJob(giver: FriendId, rng: () => number): Job {
  const sticks = MIN_STICKS + Math.floor(rng() * STICK_CHOICES);
  return { giver, sticks, reward: sticks * COINS_PER_STICK, collected: 0 };
}

function pick<T>(list: readonly T[], rng: () => number): T | undefined {
  return list[Math.floor(rng() * list.length)];
}

/** With a full knapsack, make room by selling what's worth least. */
export function chooseToSell(progress: Progress, id: FriendId): ShopItem | undefined {
  const knapsack = progress.knapsacks[id];
  if (knapsack.length < KNAPSACK_SLOTS) return undefined;
  const held = knapsack.flatMap((k) => itemById(k.id) ?? []);
  return [...held].sort((a, b) => sellPrice(a) - sellPrice(b))[0];
}

/** Something affordable, usually to their taste, or anything they can afford. */
export function chooseToBuy(progress: Progress, id: FriendId, rng: () => number): ShopItem | undefined {
  const coins = coinsOf(progress, id);
  const affordable = CATALOGUE.filter((item) => item.price <= coins);
  const favourites = affordable.filter((item) => item.category === TASTES[id]);
  if (favourites.length > 0 && rng() < FAVOURITE_CHANCE) return pick(favourites, rng);
  return pick(affordable, rng);
}
