import { describe, expect, it } from 'vitest';
import { FRIENDS } from '../game/friends';
import { THEMES, compose, nextTheme, type Theme, type ThemeId } from './compose';

const ids = Object.keys(THEMES) as ThemeId[];
const leadLine = (theme: Theme, pass = 0) =>
  compose(theme, pass)
    .notes.filter((n) => n.instrument === theme.lead && n.level > 0.6)
    .map((n) => `${n.beat}:${n.midi}`)
    .join(' ');

describe('the music', () => {
  it('has a tune for the village, the shop, Sushi and every friend', () => {
    expect(ids).toHaveLength(FRIENDS.length + 3);
    expect(THEMES.shop).toBeDefined();
    for (const friend of FRIENDS) expect(THEMES[friend.id]).toBeDefined();
  });

  it('gives every home a tune that sounds different', () => {
    const fingerprints = ids.map((id) => {
      const t = THEMES[id];
      return `${t.scale.join()}|${t.root}|${t.bpm}|${t.lead}|${t.accompaniment}`;
    });
    expect(new Set(fingerprints).size).toBe(ids.length);
    expect(new Set(ids.map((id) => leadLine(THEMES[id]))).size).toBe(ids.length);
  });

  it.each(ids)('only uses notes of the scale in %s', (id) => {
    const theme = THEMES[id];
    for (const note of compose(theme).notes) {
      const degree = (((note.midi - theme.root) % 12) + 12) % 12;
      expect(theme.scale).toContain(degree);
    }
  });

  it.each(ids)('stays calm and in a comfortable range in %s', (id) => {
    const theme = THEMES[id];
    expect(theme.bpm).toBeLessThanOrEqual(92);
    for (const note of compose(theme).notes) {
      expect(note.midi).toBeGreaterThanOrEqual(36);
      expect(note.midi).toBeLessThanOrEqual(100);
      expect(note.level).toBeGreaterThan(0);
      expect(note.level).toBeLessThanOrEqual(1);
    }
  });

  it.each(ids)('keeps every note inside the piece in %s', (id) => {
    const piece = compose(THEMES[id]);
    for (const note of piece.notes) {
      expect(note.beat).toBeGreaterThanOrEqual(0);
      expect(note.beat).toBeLessThan(piece.beats);
      expect(note.length).toBeGreaterThan(0);
    }
  });

  it('gives every tune its own name', () => {
    expect(new Set(ids.map((id) => THEMES[id].title)).size).toBe(ids.length);
  });

  it('goes round every tune with the Next tune button', () => {
    const heard = new Set<ThemeId>();
    let id: ThemeId = 'village';
    for (let i = 0; i < ids.length; i++) {
      heard.add(id);
      id = nextTheme(id);
    }
    expect(heard.size).toBe(ids.length);
    expect(id).toBe('village');
  });

  it('plays the same each time for a given pass', () => {
    expect(compose(THEMES.village, 3)).toEqual(compose(THEMES.village, 3));
  });

  it('lets the melody wander each time round, keeping the same harmony', () => {
    const theme = THEMES.village;
    expect(leadLine(theme, 0)).not.toBe(leadLine(theme, 1));
    const pads = (pass: number) => compose(theme, pass).notes.filter((n) => n.instrument === 'pad');
    expect(pads(0)).toEqual(pads(1));
  });
});
