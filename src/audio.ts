import { MusicPlayer } from './music/player';
import { THEMES, nextTheme, type ThemeId } from './music/compose';

const MUTE_KEY = 'panda-life-muted';
const MUSIC_OFF_KEY = 'panda-life-music-off';

/** Small cheerful sounds made in the browser, so the game ships no audio files. */
export class Sounds {
  muted = localStorage.getItem(MUTE_KEY) === '1';
  private context: AudioContext | null = null;
  private ringTimer: number | null = null;
  private music: MusicPlayer | null = null;
  private theme: ThemeId = 'village';
  musicOff = localStorage.getItem(MUSIC_OFF_KEY) === '1';

  /** Browsers only allow sound after the player has touched something. */
  unlock(): void {
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
    this.music ??= new MusicPlayer(this.context, !this.musicOff, this.theme);
  }

  /** Each place has its own tune. It crossfades when Sushi walks through a door. */
  playMusic(theme: ThemeId): void {
    this.theme = theme;
    this.music?.play(theme);
  }

  /** Skips to the next tune, turning the music on if it was off. Returns its name. */
  nextTune(): string {
    if (this.musicOff) this.toggleMusic();
    this.unlock();
    this.playMusic(nextTheme(this.theme));
    return THEMES[this.theme].title;
  }

  toggleMusic(): boolean {
    this.musicOff = !this.musicOff;
    localStorage.setItem(MUSIC_OFF_KEY, this.musicOff ? '1' : '0');
    this.music?.setEnabled(!this.musicOff);
    return this.musicOff;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    return this.muted;
  }

  startRinging(): void {
    this.stopRinging();
    this.ringOnce();
    this.ringTimer = window.setInterval(() => this.ringOnce(), 1600);
  }

  stopRinging(): void {
    if (this.ringTimer !== null) window.clearInterval(this.ringTimer);
    this.ringTimer = null;
  }

  pick(): void {
    this.tone(784, 0, 0.09);
    this.tone(1047, 0.07, 0.12);
  }

  tap(): void {
    this.tone(660, 0, 0.06, 0.05);
  }

  door(): void {
    this.tone(523, 0, 0.1);
    this.tone(698, 0.09, 0.14);
  }

  coins(): void {
    [988, 1319, 1568, 1976].forEach((pitch, i) => this.tone(pitch, i * 0.09, 0.2));
  }

  private ringOnce(): void {
    [659, 880, 659, 880].forEach((pitch, i) => this.tone(pitch, i * 0.12, 0.11));
  }

  private tone(pitch: number, delay: number, length: number, volume = 0.09): void {
    if (this.muted || !this.context) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = pitch;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + length + 0.02);
  }
}
