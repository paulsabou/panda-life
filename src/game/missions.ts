import { FRIENDS, type FriendId } from './friends';
import type { Knapsacks, Purses } from './knapsack';

export const FIRST_CALL_SECONDS = 4;
/** One ring, shown on the top bar, then the call waits in the inbox. */
export const RING_SECONDS = 3;
export const MAX_INBOX = 6;
const COINS_PER_STICK = 2;
const MIN_STICKS = 3;
const STICK_CHOICES = 6;

export interface Mission {
  id: number;
  friend: FriendId;
  sticks: number;
  reward: number;
}

export interface ActiveMission {
  mission: Mission;
  collected: number;
}

/** Everything that survives closing the browser. */
export interface Progress {
  coins: number;
  nextId: number;
  inbox: Mission[];
  active: ActiveMission | null;
  knapsacks: Knapsacks;
  friendCoins: Purses;
}

export interface Call {
  mission: Mission;
  stage: 'ringing' | 'talking';
  ringLeft: number;
}

export type InboxReason = 'busy' | 'ignored' | 'declined';

export type MissionEvent =
  | { type: 'ringing'; mission: Mission }
  | { type: 'talking'; mission: Mission }
  | { type: 'call-over' }
  | { type: 'inboxed'; mission: Mission; why: InboxReason }
  | { type: 'accepted'; mission: Mission }
  | { type: 'removed'; mission: Mission }
  | { type: 'stick'; collected: number; needed: number }
  | { type: 'completed'; mission: Mission }
  | { type: 'changed' };

type Listener = (event: MissionEvent) => void;

export class MissionBoard {
  call: Call | null = null;
  private listeners: Listener[] = [];
  private nextCallIn = FIRST_CALL_SECONDS;
  private lastCaller: FriendId | null = null;

  constructor(
    public progress: Progress,
    private rng: () => number = Math.random,
  ) {}

  subscribe(listener: Listener): void {
    this.listeners.push(listener);
  }

  tick(seconds: number): void {
    if (this.call) {
      if (this.call.stage === 'ringing') {
        this.call.ringLeft -= seconds;
        if (this.call.ringLeft <= 0) this.endCallIntoInbox('ignored');
      }
      return;
    }
    this.nextCallIn -= seconds;
    if (this.nextCallIn <= 0) this.friendCalls();
  }

  answer(): void {
    if (this.call?.stage !== 'ringing') return;
    this.call.stage = 'talking';
    this.emit({ type: 'talking', mission: this.call.mission });
  }

  /** Works at either stage: the mission waits in the inbox. */
  decline(): void {
    this.endCallIntoInbox('declined');
  }

  accept(): void {
    if (this.call?.stage !== 'talking') return;
    if (this.progress.active) {
      this.endCallIntoInbox('busy');
      return;
    }
    const { mission } = this.call;
    this.call = null;
    this.emit({ type: 'call-over' });
    this.start(mission);
  }

  acceptFromInbox(id: number): boolean {
    const mission = this.progress.inbox.find((m) => m.id === id);
    if (!mission || this.progress.active) return false;
    this.progress.inbox = this.progress.inbox.filter((m) => m.id !== id);
    this.start(mission);
    return true;
  }

  refuseFromInbox(id: number): void {
    const mission = this.progress.inbox.find((m) => m.id === id);
    if (!mission) return;
    this.progress.inbox = this.progress.inbox.filter((m) => m.id !== id);
    this.emit({ type: 'removed', mission });
  }

  collectStick(): boolean {
    const active = this.progress.active;
    if (!active) return false;
    active.collected += 1;
    this.emit({ type: 'stick', collected: active.collected, needed: active.mission.sticks });
    if (active.collected >= active.mission.sticks) {
      this.progress.coins += active.mission.reward;
      this.progress.active = null;
      this.nextCallIn = this.gap();
      this.emit({ type: 'completed', mission: active.mission });
    }
    return true;
  }

  /** Coins or a knapsack changed outside the mission rules, such as at the shop. */
  changed(): void {
    this.emit({ type: 'changed' });
  }

  /** What to store: a call in progress waits in the inbox for next time. */
  toSave(): Progress {
    const inbox = this.call ? [...this.progress.inbox, this.call.mission] : this.progress.inbox;
    return { ...this.progress, inbox };
  }

  private start(mission: Mission): void {
    this.progress.active = { mission, collected: 0 };
    this.nextCallIn = this.gap();
    this.emit({ type: 'accepted', mission });
  }

  private friendCalls(): void {
    this.nextCallIn = this.gap();
    if (this.progress.inbox.length >= MAX_INBOX) return;
    const mission = this.newMission();
    if (this.progress.active) {
      this.progress.inbox.push(mission);
      this.emit({ type: 'inboxed', mission, why: 'busy' });
      return;
    }
    this.call = { mission, stage: 'ringing', ringLeft: RING_SECONDS };
    this.emit({ type: 'ringing', mission });
  }

  private endCallIntoInbox(why: InboxReason): void {
    if (!this.call) return;
    const { mission } = this.call;
    this.call = null;
    this.progress.inbox.push(mission);
    this.nextCallIn = this.gap();
    this.emit({ type: 'call-over' });
    this.emit({ type: 'inboxed', mission, why });
  }

  private newMission(): Mission {
    const callers = FRIENDS.filter((f) => f.id !== this.lastCaller);
    const friend = callers[Math.floor(this.rng() * callers.length)].id;
    this.lastCaller = friend;
    const sticks = MIN_STICKS + Math.floor(this.rng() * STICK_CHOICES);
    return { id: this.progress.nextId++, friend, sticks, reward: sticks * COINS_PER_STICK };
  }

  /** Friends call less often while Sushi is busy, so the inbox fills slowly. */
  private gap(): number {
    return this.progress.active ? 30 + this.rng() * 20 : 8 + this.rng() * 7;
  }

  private emit(event: MissionEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
