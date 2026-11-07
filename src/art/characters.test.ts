import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS, POSES, characterSvg } from './characters';

const CHARACTERS = CHARACTER_IDS;

describe('knapsacks', () => {
  it.each(CHARACTERS)('%s carries one in every pose and step', (id) => {
    for (const pose of POSES) {
      for (const phase of [null, 0, 1.5]) {
        const svg = characterSvg(id, pose, phase);
        expect(svg.includes('id="straps"') || svg.includes('id="knapsack"')).toBe(true);
      }
    }
  });

  it.each(CHARACTERS)('%s only shows thin straps from the front', (id) => {
    const svg = characterSvg(id, 'front', null);
    expect(svg).toContain('id="straps"');
    expect(svg).not.toContain('id="knapsack"');
  });

  it.each(CHARACTERS)('%s shows the pack from behind and from the side', (id) => {
    for (const pose of ['back', 'backSide', 'side', 'frontSide'] as const) {
      expect(characterSvg(id, pose, null)).toContain('id="knapsack"');
    }
  });

  it('draws the pack on top of the body from behind, so tails do not hide it', () => {
    for (const id of CHARACTERS) {
      const svg = characterSvg(id, 'back', null);
      expect(svg.indexOf('id="knapsack"')).toBeGreaterThan(svg.indexOf('M90 168Q120 182'));
    }
  });

  it('draws the pack over the arms from behind', () => {
    for (const id of CHARACTERS) {
      for (const pose of ['back', 'backSide'] as const) {
        const svg = characterSvg(id, pose, null);
        expect(svg.lastIndexOf('cy="208"')).toBeLessThan(svg.indexOf('id="knapsack"'));
      }
    }
  });

  it('keeps the pack behind the body from the side', () => {
    for (const id of CHARACTERS) {
      const svg = characterSvg(id, 'side', null);
      expect(svg.indexOf('id="knapsack"')).toBeLessThan(svg.indexOf('M90 168Q120 182'));
    }
  });
});

describe('the newer animals', () => {
  it.each([
    ['giraffe', 'ossicones'],
    ['elephant', 'trunk'],
    ['redPanda', 'ringed-tail'],
    ['raccoon', 'mask'],
    ['hamster', 'cheeks'],
    ['horse', 'mane'],
  ] as const)('draws the %s with its %s', (id, feature) => {
    expect(characterSvg(id, 'front', null)).toContain(`id="${feature}"`);
  });
});
