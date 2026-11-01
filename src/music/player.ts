import { THEMES, compose, type Instrument, type Note, type Piece, type Theme, type ThemeId } from './compose';

const LOOK_AHEAD_SECONDS = 1.2;
const TICK_MS = 300;
const CROSSFADE_SECONDS = 2.2;
const MUSIC_VOLUME = 0.5;
const REVERB_SEND = 0.32;

function frequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function makeReverb(context: BaseAudioContext): ConvolverNode {
  const seconds = 2.6;
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let soft = 0;
    for (let i = 0; i < length; i++) {
      // Filtered noise fading away sounds like a warm wooden room.
      soft += (Math.random() * 2 - 1 - soft) * 0.25;
      data[i] = soft * (1 - i / length) ** 2.6;
    }
  }
  const reverb = context.createConvolver();
  reverb.buffer = impulse;
  return reverb;
}

interface Bus {
  context: BaseAudioContext;
  output: AudioNode;
}

function tone(
  { context, output }: Bus,
  type: OscillatorType,
  pitch: number,
  when: number,
  volume: number,
  attack: number,
  decay: number,
): { oscillator: OscillatorNode; gain: GainNode } {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = pitch;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  oscillator.connect(gain).connect(output);
  oscillator.start(when);
  oscillator.stop(when + attack + decay + 0.05);
  return { oscillator, gain };
}

function koto(bus: Bus, pitch: number, when: number, level: number): void {
  const { context, output } = bus;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3800, when);
  filter.frequency.exponentialRampToValueAtTime(700, when + 1);
  filter.connect(output);
  const plucked = { context, output: filter };
  tone(plucked, 'triangle', pitch, when, 0.2 * level, 0.004, 1.9);
  tone(plucked, 'sine', pitch * 2, when, 0.06 * level, 0.003, 0.7);
  tone(plucked, 'sawtooth', pitch, when, 0.03 * level, 0.002, 0.14);
}

function marimba(bus: Bus, pitch: number, when: number, level: number): void {
  tone(bus, 'sine', pitch, when, 0.24 * level, 0.004, 0.75);
  tone(bus, 'sine', pitch * 4, when, 0.04 * level, 0.002, 0.14);
}

function musicBox(bus: Bus, pitch: number, when: number, level: number): void {
  tone(bus, 'sine', pitch * 2, when, 0.15 * level, 0.003, 1.7);
  tone(bus, 'sine', pitch * 6, when, 0.025 * level, 0.002, 0.5);
}

function chime(bus: Bus, pitch: number, when: number, level: number): void {
  tone(bus, 'sine', pitch, when, 0.12 * level, 0.005, 3);
  tone(bus, 'sine', pitch * 2.76, when, 0.035 * level, 0.003, 1.3);
}

function flute(bus: Bus, pitch: number, when: number, seconds: number, level: number): void {
  const { context, output } = bus;
  const length = Math.max(0.3, seconds);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.13 * level, when + 0.14);
  gain.gain.setValueAtTime(0.13 * level, when + Math.max(0.15, length - 0.22));
  gain.gain.exponentialRampToValueAtTime(0.0001, when + length + 0.3);
  gain.connect(output);
  const vibrato = context.createOscillator();
  const depth = context.createGain();
  vibrato.frequency.value = 4.8;
  depth.gain.setValueAtTime(0, when);
  depth.gain.linearRampToValueAtTime(pitch * 0.006, when + 0.5);
  vibrato.connect(depth);
  for (const [type, volume] of [['sine', 1], ['triangle', 0.18]] as const) {
    const oscillator = context.createOscillator();
    const part = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = pitch;
    part.gain.value = volume;
    depth.connect(oscillator.frequency);
    oscillator.connect(part).connect(gain);
    oscillator.start(when);
    oscillator.stop(when + length + 0.35);
  }
  vibrato.start(when);
  vibrato.stop(when + length + 0.35);
}

function pad(bus: Bus, pitch: number, when: number, seconds: number, level: number): void {
  const { context, output } = bus;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 680;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.1 * level, when + 1.3);
  gain.gain.setValueAtTime(0.1 * level, when + Math.max(1.4, seconds - 0.4));
  gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds + 1.4);
  filter.connect(gain).connect(output);
  for (const detune of [-5, 5]) {
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.value = pitch;
    oscillator.detune.value = detune;
    oscillator.connect(filter);
    oscillator.start(when);
    oscillator.stop(when + seconds + 1.5);
  }
}

function playNote(bus: Bus, note: Note, when: number, beatSeconds: number): void {
  const pitch = frequency(note.midi);
  const seconds = note.length * beatSeconds;
  const players: Record<Instrument, () => void> = {
    koto: () => koto(bus, pitch, when, note.level),
    marimba: () => marimba(bus, pitch, when, note.level),
    musicbox: () => musicBox(bus, pitch, when, note.level),
    chime: () => chime(bus, pitch, when, note.level),
    flute: () => flute(bus, pitch, when, seconds, note.level),
    pad: () => pad(bus, pitch, when, seconds, note.level),
  };
  players[note.instrument]();
}

/** The mix every tune goes through: a little room sound, kept from ever getting loud. */
export function makeMixer(context: BaseAudioContext): { input: GainNode; master: GainNode } {
  const input = context.createGain();
  const master = context.createGain();
  const limiter = context.createDynamicsCompressor();
  const send = context.createGain();
  const reverb = makeReverb(context);
  send.gain.value = REVERB_SEND;
  input.connect(limiter);
  input.connect(send).connect(reverb).connect(limiter);
  limiter.connect(master).connect(context.destination);
  master.gain.value = MUSIC_VOLUME;
  return { input, master };
}

/** Plays one theme for as long as asked, scheduling a little ahead of the clock. */
class Performance {
  private readonly gain: GainNode;
  private readonly bus: Bus;
  private readonly beatSeconds: number;
  private pass = 0;
  private piece: Piece;
  private passStart: number;
  private nextNote = 0;

  constructor(
    private context: BaseAudioContext,
    input: AudioNode,
    private theme: Theme,
    fadeIn: number,
  ) {
    this.gain = context.createGain();
    this.gain.gain.setValueAtTime(fadeIn > 0 ? 0.0001 : 1, context.currentTime);
    if (fadeIn > 0) this.gain.gain.exponentialRampToValueAtTime(1, context.currentTime + fadeIn);
    this.gain.connect(input);
    this.bus = { context, output: this.gain };
    this.beatSeconds = 60 / theme.bpm;
    this.piece = this.nextPiece();
    this.passStart = context.currentTime + 0.1;
  }

  scheduleUntil(time: number): void {
    for (;;) {
      const note = this.piece.notes[this.nextNote];
      if (!note) {
        this.passStart += this.piece.beats * this.beatSeconds;
        this.piece = this.nextPiece();
        this.nextNote = 0;
        continue;
      }
      const when = this.passStart + note.beat * this.beatSeconds;
      if (when > time) return;
      playNote(this.bus, note, when, this.beatSeconds);
      this.nextNote += 1;
    }
  }

  fadeOut(seconds: number): void {
    const now = this.context.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(Math.max(0.0001, this.gain.gain.value), now);
    this.gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    window.setTimeout(() => this.gain.disconnect(), (seconds + 0.2) * 1000);
  }

  private nextPiece(): Piece {
    const piece = compose(this.theme, this.pass++);
    return { ...piece, notes: [...piece.notes].sort((a, b) => a.beat - b.beat) };
  }
}

export class MusicPlayer {
  private mixer: ReturnType<typeof makeMixer>;
  private current: Performance | null = null;
  private timer: number;

  constructor(
    private context: AudioContext,
    private enabled: boolean,
    private themeId: ThemeId,
  ) {
    this.mixer = makeMixer(context);
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
    if (enabled) this.begin(themeId, 0.8);
  }

  play(themeId: ThemeId): void {
    if (themeId === this.themeId) return;
    this.themeId = themeId;
    if (this.enabled) this.begin(themeId, CROSSFADE_SECONDS);
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    if (enabled) this.begin(this.themeId, 0.8);
    else {
      this.current?.fadeOut(0.6);
      this.current = null;
    }
  }

  stop(): void {
    window.clearInterval(this.timer);
  }

  private begin(themeId: ThemeId, fade: number): void {
    this.current?.fadeOut(fade);
    this.current = new Performance(this.context, this.mixer.input, THEMES[themeId], fade);
    this.current.scheduleUntil(this.context.currentTime + LOOK_AHEAD_SECONDS);
  }

  private tick(): void {
    if (this.context.state === 'running') this.current?.scheduleUntil(this.context.currentTime + LOOK_AHEAD_SECONDS);
  }
}

/** Writes a stretch of a theme into an offline context, for checking how it comes out. */
export function renderTheme(context: OfflineAudioContext, themeId: ThemeId, seconds: number): void {
  const { input } = makeMixer(context);
  new Performance(context, input, THEMES[themeId], 0).scheduleUntil(seconds);
}
