import { CATALOGUE, itemById, type ShopItem } from './catalogue';
import { FRIENDS, friendById } from './friends';
import { hasRoomFor, putIn, takeOut, type KnapsackOwner } from './knapsack';
import type { Progress } from './missions';
import { coinsOf } from './shop';

/** Everyone who can give and receive gifts: Sushi and the friends. */
export type Character = KnapsackOwner;

export const CHARACTERS: readonly Character[] = ['sushi', ...FRIENDS.map((f) => f.id)];

export function nameOf(who: Character): string {
  return who === 'sushi' ? 'Sushi' : friendById(who).name;
}

/** A gift of a favourite counts for much more than any other gift. */
export const GIFT_POINTS = 5;
export const FAVOURITE_POINTS = 20;
export const MAX_FRIENDSHIP = 100;
const HEART_POINTS = 20;

/** Five things each character loves, all sold at the shop. */
export const FAVOURITES: Record<Character, readonly string[]> = {
  sushi: ['dango', 'mochi', 'rice-ball', 'picture-book', 'kite'],
  maguro: ['taiyaki', 'can-of-tuna', 'salmon-fillet', 'fish-cake', 'lucky-cat'],
  inari: ['tofu', 'novel', 'calligraphy-set', 'diary', 'brush-pen'],
  unagi: ['cutting-board', 'bento-box', 'sushi-rolling-mat', 'teapot', 'chopsticks'],
  tamago: ['daikon-radish', 'cabbage', 'punnet-of-strawberries', 'box-of-eggs', 'mochi'],
  ikura: ['flower-vase', 'bonsai-tree', 'wind-chime', 'paper-lantern', 'rice-cracker'],
  ebi: ['kendama', 'folding-fan', 'origami-paper', 'kite', 'dango'],
  nori: ['mikan-orange', 'umbrella', 'radio', 'dictionary', 'kite'],
  toro: ['diary', 'photo-frame', 'bag-of-rice', 'sweet-potato', 'bath-towel'],
  ume: ['pickled-plum', 'blanket', 'floor-cushion', 'green-tea-leaves', 'teacup'],
  tako: ['bar-of-soap', 'dish-sponge', 'torch', 'scissors', 'melon-bread'],
  mochi: ['dorayaki', 'chocolate-sticks', 'pillow', 'futon', 'box-of-crayons'],
  saba: ['apple', 'ramune-soda', 'alarm-clock', 'house-slippers', 'school-bag'],
};

/** Friendship belongs to a pair, whichever way round they are named. */
function pairKey(a: Character, b: Character): string {
  return [a, b].sort().join('|');
}

function discoveryKey(who: Character, id: string): string {
  return `${who}:${id}`;
}

export function friendship(progress: Progress, a: Character, b: Character): number {
  return progress.friendship[pairKey(a, b)] ?? 0;
}

/** Full hearts out of five. */
export function hearts(points: number): number {
  return Math.floor(points / HEART_POINTS);
}

export function isFavourite(who: Character, id: string): boolean {
  return FAVOURITES[who].includes(id);
}

/** Each favourite once someone has given it, or null while it is still a secret. */
export function knownFavourites(progress: Progress, who: Character): (string | null)[] {
  return FAVOURITES[who].map((id) => (progress.discovered.includes(discoveryKey(who, id)) ? id : null));
}

/** Whoever this character is fondest of, if they have had any gifts at all. */
export function bestFriend(progress: Progress, who: Character): Character | null {
  let best: Character | null = null;
  for (const other of CHARACTERS) {
    if (other !== who && friendship(progress, who, other) > (best ? friendship(progress, who, best) : 0)) best = other;
  }
  return best;
}

export interface Gift {
  item: ShopItem;
  favourite: boolean;
  /** How much friendship this gift added. */
  points: number;
  /** The pair's friendship now. */
  total: number;
}

export type GiftRefusal = 'to-self' | 'not-held' | 'knapsack-full';

/** Hands one object over, and the pair grow fonder of each other. */
export function give(progress: Progress, from: Character, to: Character, id: string): Gift | GiftRefusal {
  if (from === to) return 'to-self';
  const item = itemById(id);
  if (!item || !progress.knapsacks[from].some((k) => k.id === id)) return 'not-held';
  if (!hasRoomFor(progress.knapsacks, to, id)) return 'knapsack-full';
  takeOut(progress.knapsacks, from, id);
  putIn(progress.knapsacks, to, id, item.name);

  const favourite = isFavourite(to, id);
  const before = friendship(progress, from, to);
  const total = Math.min(MAX_FRIENDSHIP, before + (favourite ? FAVOURITE_POINTS : GIFT_POINTS));
  progress.friendship[pairKey(from, to)] = total;
  if (favourite && !progress.discovered.includes(discoveryKey(to, id))) progress.discovered.push(discoveryKey(to, id));
  return { item, favourite, points: total - before, total };
}

function pick<T>(list: readonly T[], rng: () => number): T | undefined {
  return list[Math.floor(rng() * list.length)];
}

/**
 * A friend's rule for giving: a favourite of someone's if they hold one,
 * otherwise anything to anyone. They keep the things they love themselves.
 */
export function chooseGift(
  progress: Progress,
  from: Character,
  candidates: readonly Character[],
  rng: () => number,
): { to: Character; item: string } | undefined {
  const spare = progress.knapsacks[from].map((k) => k.id).filter((id) => !isFavourite(from, id));
  const possible = candidates
    .filter((to) => to !== from)
    .flatMap((to) => spare.filter((id) => hasRoomFor(progress.knapsacks, to, id)).map((item) => ({ to, item })));
  const loved = possible.filter(({ to, item }) => isFavourite(to, item));
  return pick(loved.length > 0 ? loved : possible, rng);
}

/** Something another character loves, to give them later. */
export function chooseGiftToBuy(progress: Progress, from: Character, rng: () => number): string | undefined {
  const coins = coinsOf(progress, from);
  const wanted = CATALOGUE.filter(
    (item) =>
      item.price <= coins &&
      !isFavourite(from, item.id) &&
      CHARACTERS.some((who) => who !== from && isFavourite(who, item.id)),
  );
  return pick(wanted, rng)?.id;
}

export function restoreFriendship(saved: unknown): Record<string, number> {
  if (typeof saved !== 'object' || saved === null) return {};
  return Object.fromEntries(
    Object.entries(saved).filter(([, points]) => typeof points === 'number' && Number.isFinite(points) && points >= 0),
  );
}

export function restoreDiscovered(saved: unknown): string[] {
  return Array.isArray(saved) ? saved.filter((key): key is string => typeof key === 'string') : [];
}
