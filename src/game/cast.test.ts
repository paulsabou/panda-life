import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS } from '../art/characters';
import { ANIMAL_NAMES, castFor } from './cast';

describe('castFor', () => {
  it('leaves everyone as they are when Sushi stays a panda', () => {
    const cast = castFor('sushi');
    for (const id of CHARACTER_IDS) expect(cast[id]).toBe(id);
  });

  it('swaps Sushi with the friend who was the chosen animal', () => {
    const cast = castFor('cat');
    expect(cast.sushi).toBe('cat');
    expect(cast.cat).toBe('sushi');
    expect(cast.fox).toBe('fox');
    expect(cast.tanuki).toBe('tanuki');
  });

  it('can make the shopkeeper the panda', () => {
    expect(castFor('tanuki')).toMatchObject({ sushi: 'tanuki', tanuki: 'sushi' });
  });

  it('never draws two characters the same', () => {
    for (const chosen of CHARACTER_IDS) {
      expect(new Set(Object.values(castFor(chosen))).size).toBe(CHARACTER_IDS.length);
    }
  });

  it('has a name for every animal', () => {
    expect(Object.keys(ANIMAL_NAMES).sort()).toEqual([...CHARACTER_IDS].sort());
  });
});
