import { describe, expect, it } from 'vitest';
import { emptyKnapsacks } from './knapsack';
import {
  FIRST_CALL_SECONDS,
  MAX_INBOX,
  MissionBoard,
  RING_SECONDS,
  type MissionEvent,
  type Progress,
} from './missions';

const fresh = (): Progress => ({ coins: 0, nextId: 1, inbox: [], active: null, knapsacks: emptyKnapsacks() });

function ringing(progress = fresh()) {
  const events: MissionEvent[] = [];
  const board = new MissionBoard(progress, () => 0.5);
  board.subscribe((e) => events.push(e));
  board.tick(FIRST_CALL_SECONDS + 0.1);
  return { board, events };
}

const mission = (id: number, sticks = 4) => ({ id, friend: 'maguro' as const, sticks, reward: sticks * 2 });

describe('calls', () => {
  it('rings a friend after the first delay', () => {
    const { board } = ringing();
    expect(board.call?.stage).toBe('ringing');
  });

  it('does not ring before the first delay', () => {
    const board = new MissionBoard(fresh(), () => 0.5);
    board.tick(FIRST_CALL_SECONDS - 1);
    expect(board.call).toBeNull();
  });

  it('explains the mission once answered, then accepting starts it', () => {
    const { board } = ringing();
    board.answer();
    expect(board.call?.stage).toBe('talking');
    board.accept();
    expect(board.call).toBeNull();
    expect(board.progress.active?.collected).toBe(0);
    expect(board.progress.inbox).toHaveLength(0);
  });

  it('sends a declined call to the inbox', () => {
    const { board } = ringing();
    board.decline();
    expect(board.call).toBeNull();
    expect(board.progress.inbox).toHaveLength(1);
    expect(board.progress.active).toBeNull();
  });

  it('sends a mission refused after answering to the inbox', () => {
    const { board } = ringing();
    board.answer();
    board.decline();
    expect(board.progress.inbox).toHaveLength(1);
    expect(board.progress.active).toBeNull();
  });

  it('sends an ignored call to the inbox when it stops ringing', () => {
    const { board, events } = ringing();
    board.tick(RING_SECONDS + 0.1);
    expect(board.call).toBeNull();
    expect(board.progress.inbox).toHaveLength(1);
    expect(events).toContainEqual(expect.objectContaining({ type: 'inboxed', why: 'ignored' }));
  });

  it('keeps talking for as long as the player needs to read', () => {
    const { board } = ringing();
    board.answer();
    board.tick(RING_SECONDS * 3);
    expect(board.call?.stage).toBe('talking');
  });

  it('goes straight to the inbox while Sushi is busy', () => {
    const { board, events } = ringing({ ...fresh(), active: { mission: mission(9), collected: 1 } });
    expect(board.call).toBeNull();
    expect(board.progress.inbox).toHaveLength(1);
    expect(events).toContainEqual(expect.objectContaining({ type: 'inboxed', why: 'busy' }));
  });

  it('stops calling while the inbox is full', () => {
    const inbox = Array.from({ length: MAX_INBOX }, (_, i) => mission(i + 1));
    const { board } = ringing({ ...fresh(), nextId: MAX_INBOX + 1, inbox });
    expect(board.call).toBeNull();
    expect(board.progress.inbox).toHaveLength(MAX_INBOX);
  });

  it('never has the same friend call twice in a row', () => {
    let roll = 0;
    const board = new MissionBoard(fresh(), () => (roll = (roll + 0.37) % 1));
    const callers: string[] = [];
    board.subscribe((e) => {
      if (e.type === 'ringing') callers.push(e.mission.friend);
    });
    for (let i = 0; i < 40; i++) {
      board.tick(60);
      board.decline();
      for (const m of [...board.progress.inbox]) board.refuseFromInbox(m.id);
    }
    expect(callers.length).toBeGreaterThan(10);
    callers.slice(1).forEach((c, i) => expect(c).not.toBe(callers[i]));
  });

  it('pays 2 coins per stick and asks for 3 to 8 sticks', () => {
    for (const roll of [0, 0.5, 0.999]) {
      const board = new MissionBoard(fresh(), () => roll);
      board.tick(FIRST_CALL_SECONDS + 0.1);
      const m = board.call!.mission;
      expect(m.sticks).toBeGreaterThanOrEqual(3);
      expect(m.sticks).toBeLessThanOrEqual(8);
      expect(m.reward).toBe(m.sticks * 2);
    }
  });
});

describe('inbox', () => {
  it('accepts a mission from the inbox', () => {
    const board = new MissionBoard({ ...fresh(), inbox: [mission(1), mission(2)] }, () => 0.5);
    expect(board.acceptFromInbox(2)).toBe(true);
    expect(board.progress.active?.mission.id).toBe(2);
    expect(board.progress.inbox.map((m) => m.id)).toEqual([1]);
  });

  it('allows only one mission at a time', () => {
    const board = new MissionBoard(
      { ...fresh(), inbox: [mission(1)], active: { mission: mission(2), collected: 0 } },
      () => 0.5,
    );
    expect(board.acceptFromInbox(1)).toBe(false);
    expect(board.progress.active?.mission.id).toBe(2);
    expect(board.progress.inbox).toHaveLength(1);
  });

  it('refusing from the inbox removes the mission for good', () => {
    const board = new MissionBoard({ ...fresh(), inbox: [mission(1)] }, () => 0.5);
    board.refuseFromInbox(1);
    expect(board.progress.inbox).toHaveLength(0);
    expect(board.progress.active).toBeNull();
  });
});

describe('collecting', () => {
  it('ignores sticks when there is no mission', () => {
    const board = new MissionBoard(fresh(), () => 0.5);
    expect(board.collectStick()).toBe(false);
    expect(board.progress.coins).toBe(0);
  });

  it('counts sticks without paying until the last one', () => {
    const board = new MissionBoard({ ...fresh(), active: { mission: mission(1, 3), collected: 0 } }, () => 0.5);
    board.collectStick();
    board.collectStick();
    expect(board.progress.active?.collected).toBe(2);
    expect(board.progress.coins).toBe(0);
  });

  it('pays the reward the moment the last stick is collected', () => {
    const board = new MissionBoard(
      { ...fresh(), coins: 10, active: { mission: mission(1, 3), collected: 2 } },
      () => 0.5,
    );
    const events: MissionEvent[] = [];
    board.subscribe((e) => events.push(e));
    board.collectStick();
    expect(board.progress.coins).toBe(16);
    expect(board.progress.active).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({ type: 'completed' }));
  });

  it('can take a new mission straight after finishing one', () => {
    const board = new MissionBoard(
      { ...fresh(), inbox: [mission(2)], active: { mission: mission(1, 3), collected: 2 } },
      () => 0.5,
    );
    board.collectStick();
    expect(board.acceptFromInbox(2)).toBe(true);
  });
});

describe('knapsacks', () => {
  it('stays empty while Sushi collects sticks for a mission', () => {
    const board = new MissionBoard({ ...fresh(), active: { mission: mission(1, 3), collected: 0 } }, () => 0.5);
    board.collectStick();
    board.collectStick();
    board.collectStick();
    expect(board.progress.knapsacks.sushi).toEqual([]);
  });
});

describe('saving', () => {
  it('moves a call in progress into the saved inbox', () => {
    const { board } = ringing();
    const saved = board.toSave();
    expect(saved.inbox).toHaveLength(1);
    expect(board.call).not.toBeNull();
  });
});
