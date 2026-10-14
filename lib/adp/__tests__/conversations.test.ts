// The thread store behind follow-up questions.
//
// What these pin down is the part that is easy to get quietly wrong: a turn
// must only count once ADP has actually answered, a thread must not outlive
// its idle window, and one session must never be handed another's thread.

import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_THREAD_TURNS } from '../ask';
import { THREAD_IDLE_MS, commitTurn, newThreadId, resetThreads, threadFor } from '../conversations';

const T0 = 1_760_000_000_000;

beforeEach(() => {
  resetThreads();
});

describe('threadFor', () => {
  it('has nothing for a session that has not asked', () => {
    expect(threadFor('session-A', T0)).toBeNull();
  });

  it('returns the thread a committed turn opened', () => {
    const id = newThreadId();
    commitTurn('session-A', id, 'what must be confirmed first?', T0);
    expect(threadFor('session-A', T0)).toEqual({
      conversationId: id,
      turns: 1,
      lastQuestion: 'what must be confirmed first?',
    });
  });

  it('keeps each session on its own thread', () => {
    const a = newThreadId();
    const b = newThreadId();
    commitTurn('session-A', a, 'what must be confirmed first?', T0);
    commitTurn('session-B', b, 'what must be confirmed first?', T0);
    expect(threadFor('session-A', T0)?.conversationId).toBe(a);
    expect(threadFor('session-B', T0)?.conversationId).toBe(b);
    expect(a).not.toBe(b);
  });

  it('forgets a thread that has gone idle', () => {
    const id = newThreadId();
    commitTurn('session-A', id, 'what must be confirmed first?', T0);
    expect(threadFor('session-A', T0 + THREAD_IDLE_MS)).not.toBeNull();
    expect(threadFor('session-A', T0 + THREAD_IDLE_MS + 1)).toBeNull();
  });

  it('counts a continuing turn and keeps the same conversation', () => {
    const id = newThreadId();
    commitTurn('session-A', id, 'what must be confirmed first?', T0);
    commitTurn('session-A', id, 'what must be confirmed first?', T0 + 1_000);
    expect(threadFor('session-A', T0 + 1_000)).toEqual({
      conversationId: id,
      turns: 2,
      lastQuestion: 'what must be confirmed first?',
    });
  });

  it('restarts the count when a new conversation replaces the old one', () => {
    const first = newThreadId();
    commitTurn('session-A', first, 'what must be confirmed first?', T0);
    commitTurn('session-A', first, 'what must be confirmed first?', T0 + 1_000);
    const second = newThreadId();
    commitTurn('session-A', second, 'what must be confirmed first?', T0 + 2_000);
    expect(threadFor('session-A', T0 + 2_000)).toEqual({
      conversationId: second,
      turns: 1,
      lastQuestion: 'what must be confirmed first?',
    });
  });

  it('refreshes the idle window on every committed turn', () => {
    const id = newThreadId();
    commitTurn('session-A', id, 'what must be confirmed first?', T0);
    const late = T0 + THREAD_IDLE_MS;
    commitTurn('session-A', id, 'what must be confirmed first?', late);
    expect(threadFor('session-A', late + THREAD_IDLE_MS)).toEqual({
      conversationId: id,
      turns: 2,
      lastQuestion: 'what must be confirmed first?',
    });
  });

  it('reaches the cap after exactly MAX_THREAD_TURNS answers', () => {
    const id = newThreadId();
    for (let i = 0; i < MAX_THREAD_TURNS; i++) commitTurn('session-A', id, 'what must be confirmed first?', T0 + i);
    expect(threadFor('session-A', T0 + MAX_THREAD_TURNS)?.turns).toBe(MAX_THREAD_TURNS);
  });

  it('remembers the latest question, so a follow-up resolves against the right one', () => {
    const id = newThreadId();
    commitTurn('session-A', id, 'who must approve re-energising?', T0);
    commitTurn('session-A', id, 'does that change if the area is wet?', T0 + 1_000);
    expect(threadFor('session-A', T0 + 1_000)?.lastQuestion).toBe('does that change if the area is wet?');
  });

  it('issues a distinct conversation id each time', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newThreadId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});
