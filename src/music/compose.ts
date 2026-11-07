import type { FriendId } from '../game/friends';

export type ThemeId = 'village' | 'sushi' | 'shop' | FriendId;

export type Instrument = 'koto' | 'flute' | 'musicbox' | 'marimba' | 'pad' | 'chime';

export interface Note {
  beat: number;
  length: number;
  midi: number;
  instrument: Instrument;
  level: number;
}

export interface Piece {
  notes: Note[];
  beats: number;
}

export interface Theme {
  id: ThemeId;
  title: string;
  /** Semitones above the root. All are five-note scales used in Japanese music. */
  scale: readonly number[];
  root: number;
  bpm: number;
  lead: Instrument;
  accompaniment: Instrument;
  /** Scale steps the harmony moves through, two bars each. */
  chords: readonly number[];
  /** Which chord tone each eighth note of a bar plays. Null is a rest. */
  pattern: readonly (number | null)[];
}

const YO = [0, 2, 5, 7, 9];
const MINYO = [0, 2, 4, 7, 9];
const RYUKYU = [0, 4, 5, 7, 11];
const KUMOI = [0, 2, 3, 7, 9];
const HIRAJOSHI = [0, 2, 3, 7, 8];

const FLOWING = [0, 1, 2, 1, 0, 1, 2, 1];
const SPARSE = [0, null, 2, null, 1, null, 2, null];
const BOUNCY = [0, 2, 1, 2, 0, 2, 1, 2];
const ROLLING = [0, 1, 2, 3, 2, 1, 2, 1];

export const THEMES: Record<ThemeId, Theme> = {
  village: { id: 'village', title: 'Morning in the Village', scale: YO, root: 62, bpm: 72, lead: 'flute', accompaniment: 'koto', chords: [0, 3, 2, 0], pattern: FLOWING },
  sushi: { id: 'sushi', title: "Sushi's Sleepy Tea", scale: MINYO, root: 65, bpm: 66, lead: 'musicbox', accompaniment: 'koto', chords: [0, 4, 3, 0], pattern: SPARSE },
  shop: { id: 'shop', title: 'Wasabi Opens the Shutters', scale: MINYO, root: 62, bpm: 84, lead: 'marimba', accompaniment: 'musicbox', chords: [0, 2, 4, 0], pattern: ROLLING },
  maguro: { id: 'maguro', title: "Maguro's Sunny Porch", scale: RYUKYU, root: 60, bpm: 78, lead: 'koto', accompaniment: 'marimba', chords: [0, 2, 3, 0], pattern: BOUNCY },
  inari: { id: 'inari', title: "Inari's Moonlit Path", scale: KUMOI, root: 64, bpm: 70, lead: 'flute', accompaniment: 'musicbox', chords: [0, 3, 1, 0], pattern: SPARSE },
  unagi: { id: 'unagi', title: 'Unagi by the River', scale: YO, root: 55, bpm: 64, lead: 'marimba', accompaniment: 'koto', chords: [0, 2, 3, 4], pattern: ROLLING },
  tamago: { id: 'tamago', title: "Tamago's Garden Hop", scale: MINYO, root: 69, bpm: 88, lead: 'musicbox', accompaniment: 'marimba', chords: [0, 3, 4, 0], pattern: BOUNCY },
  ikura: { id: 'ikura', title: 'Ikura in the Cedar Woods', scale: HIRAJOSHI, root: 57, bpm: 60, lead: 'flute', accompaniment: 'koto', chords: [0, 3, 2, 0], pattern: FLOWING },
  ebi: { id: 'ebi', title: 'Ebi Chases Butterflies', scale: RYUKYU, root: 67, bpm: 92, lead: 'marimba', accompaniment: 'musicbox', chords: [0, 3, 2, 0], pattern: BOUNCY },
  nori: { id: 'nori', title: 'Nori Above the Treetops', scale: YO, root: 64, bpm: 68, lead: 'flute', accompaniment: 'chime', chords: [0, 2, 4, 0], pattern: FLOWING },
  toro: { id: 'toro', title: "Toro's Big Warm Kitchen", scale: MINYO, root: 53, bpm: 62, lead: 'marimba', accompaniment: 'pad', chords: [0, 3, 2, 0], pattern: ROLLING },
  ume: { id: 'ume', title: 'Ume Under the Plum Blossom', scale: HIRAJOSHI, root: 67, bpm: 58, lead: 'koto', accompaniment: 'musicbox', chords: [0, 2, 3, 0], pattern: SPARSE },
  tako: { id: 'tako', title: "Tako's Secret Workshop", scale: KUMOI, root: 60, bpm: 86, lead: 'marimba', accompaniment: 'koto', chords: [0, 4, 2, 0], pattern: BOUNCY },
  mochi: { id: 'mochi', title: "Mochi's Midnight Snack", scale: RYUKYU, root: 69, bpm: 80, lead: 'musicbox', accompaniment: 'chime', chords: [0, 3, 4, 0], pattern: BOUNCY },
  saba: { id: 'saba', title: 'Saba Gallops the Meadow', scale: YO, root: 59, bpm: 90, lead: 'koto', accompaniment: 'marimba', chords: [0, 2, 3, 4], pattern: ROLLING },
};

/** The tune after this one, going round them all. */
export function nextTheme(id: ThemeId): ThemeId {
  const ids = Object.keys(THEMES) as ThemeId[];
  return ids[(ids.indexOf(id) + 1) % ids.length];
}

const BEATS_PER_BAR = 4;
const BARS_PER_CHORD = 2;
const LEAD_LOW = 5;
const LEAD_HIGH = 13;
const HIGHEST_CHIME = 96;

/** One or two bars of melody rhythm, as [start beat, length]. Lots of air, like a slow breath. */
const RHYTHMS: readonly (readonly [number, number])[][] = [
  [[0, 3], [3, 1], [4, 4]],
  [[0, 1.5], [1.5, 0.5], [2, 2], [4, 3]],
  [[0, 2], [2, 2], [4, 2], [6, 2]],
  [[1, 1], [2, 2], [4, 1], [5, 3]],
  [[0, 4], [5, 1], [6, 2]],
  [[2, 2], [4, 4]],
  [[0, 1], [1, 1], [2, 2], [5, 3]],
];

function seededRandom(text: string): () => number {
  let seed = 2166136261;
  for (const ch of text) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A step of the scale as a note. Steps past the top of the scale go up an octave. */
function pitch(theme: Theme, step: number): number {
  const size = theme.scale.length;
  const octave = Math.floor(step / size);
  return theme.root + octave * 12 + theme.scale[step - octave * size];
}

/** Chimes sit high and clear, but never shrill. */
function chimePitch(midi: number): number {
  let note = midi;
  while (note > HIGHEST_CHIME) note -= 12;
  while (note < HIGHEST_CHIME - 12) note += 12;
  return note;
}

function chordTones(chord: number): number[] {
  return [chord, chord + 2, chord + 3, chord + 5];
}

function clampLead(step: number): number {
  return Math.max(LEAD_LOW, Math.min(LEAD_HIGH, step));
}

/**
 * Writes `pass` of an endless piece. The harmony and the feel stay the same, so
 * it's always recognisably this tune, but the melody wanders a little each time
 * round rather than looping exactly.
 */
export function compose(theme: Theme, pass = 0): Piece {
  const random = seededRandom(`${theme.id}-${pass}`);
  const notes: Note[] = [];
  const motif = RHYTHMS[Math.floor(random() * RHYTHMS.length)];
  const answer = RHYTHMS[Math.floor(random() * RHYTHMS.length)];
  // The tune is sung twice, ending differently the second time.
  const form = [...theme.chords, ...theme.chords];
  let leadStep = 5 + theme.chords[0] + Math.floor(random() * 3);

  form.forEach((chord, section) => {
    const start = section * BARS_PER_CHORD * BEATS_PER_BAR;
    const span = BARS_PER_CHORD * BEATS_PER_BAR;
    const tones = chordTones(chord);

    notes.push({ beat: start, length: span, midi: pitch(theme, chord) - 12, instrument: 'pad', level: 0.5 });
    notes.push({ beat: start, length: span, midi: pitch(theme, chord + 2) - 12, instrument: 'pad', level: 0.4 });

    for (let bar = 0; bar < BARS_PER_CHORD; bar++) {
      const barStart = start + bar * BEATS_PER_BAR;
      notes.push({ beat: barStart, length: 2, midi: pitch(theme, chord) - 12, instrument: 'koto', level: 0.5 });
      theme.pattern.forEach((tone, i) => {
        if (tone === null) return;
        notes.push({
          beat: barStart + i / 2,
          length: 0.5,
          midi: pitch(theme, tones[tone]),
          instrument: theme.accompaniment,
          level: i % 4 === 0 ? 0.42 : 0.3,
        });
      });
    }

    // Every so often the tune stops to breathe and lets the accompaniment carry on.
    const resting = section % 4 === 3 && random() < 0.5;
    if (!resting) {
      const rhythm = section % 2 === 0 ? motif : answer;
      rhythm.forEach(([at, length], i) => {
        const lastOfPhrase = i === rhythm.length - 1;
        if (lastOfPhrase) leadStep = clampLead(chord + 5 + (random() < 0.5 ? 0 : 2));
        else leadStep = clampLead(leadStep + Math.round(random() * 4 - 2));
        notes.push({ beat: start + at, length, midi: pitch(theme, leadStep), instrument: theme.lead, level: 0.8 });
      });
    }

    // A wind chime, now and then, as if from the porch.
    if (random() < 0.35) {
      notes.push({
        beat: start + 6 + Math.floor(random() * 2),
        length: 4,
        midi: chimePitch(pitch(theme, 10 + Math.floor(random() * 5))),
        instrument: 'chime',
        level: 0.3,
      });
    }
  });

  return { notes, beats: form.length * BARS_PER_CHORD * BEATS_PER_BAR };
}
