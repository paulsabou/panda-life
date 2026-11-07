import type { CharacterId } from '../art/characters';

/** What each animal is called on the new-game screen. */
export const ANIMAL_NAMES: Record<CharacterId, string> = {
  sushi: 'Panda',
  tanuki: 'Tanuki',
  cat: 'Cat',
  fox: 'Fox',
  beaver: 'Beaver',
  rabbit: 'Rabbit',
  deer: 'Deer',
  dog: 'Dog',
  giraffe: 'Giraffe',
  elephant: 'Elephant',
  redPanda: 'Red panda',
  raccoon: 'Raccoon',
  hamster: 'Hamster',
  horse: 'Horse',
};

/**
 * Which animal is drawn for each part. Sushi is drawn as the chosen animal,
 * and whoever was that animal is drawn as the panda, so nobody has a twin.
 */
export function castFor(chosen: CharacterId): Record<CharacterId, CharacterId> {
  const ids = Object.keys(ANIMAL_NAMES) as CharacterId[];
  const cast = Object.fromEntries(ids.map((id) => [id, id])) as Record<CharacterId, CharacterId>;
  cast.sushi = chosen;
  cast[chosen] = 'sushi';
  return cast;
}
