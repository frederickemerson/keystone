import { beforeEach, describe, expect, it } from 'vitest';
import { check, consume, SlidingWindow } from '../sliding-window';
import {
  clientIp, LIMITS, recordSignInFailure, resetAllLimits, signInLockout, takeJevCall, takeLlmCall,
} from '../policies';

const T0 = 1_700_000_000_000;

describe('SlidingWindow', () => {
  it('allows `limit` events per window, then reports when the oldest expires', () => {
    const w = new SlidingWindow({ name: 't', limit: 3, windowMs: 1_000 });
    for (const dt of [0, 100, 200]) expect(consume([[w, 'k']], T0 + dt).ok).toBe(true);
    const blocked = consume([[w, 'k']], T0 + 300);
    expect(blocked).toEqual({ ok: false, retryAfterSeconds: 1, window: 't' });
    // Sliding, not fixed: at T0+1000 the first event has left the window.
    expect(consume([[w, 'k']], T0 + 1_000).ok).toBe(true);
    expect(consume([[w, 'k']], T0 + 1_050).ok).toBe(false);
    expect(consume([[w, 'k']], T0 + 1_100).ok).toBe(true);
  });

  it('keys are independent', () => {
    const w = new SlidingWindow({ name: 't', limit: 1, windowMs: 1_000 });
    expect(consume([[w, 'a']], T0).ok).toBe(true);
    expect(consume([[w, 'b']], T0).ok).toBe(true);
    expect(consume([[w, 'a']], T0).ok).toBe(false);
  });

  it('is all-or-nothing: a request blocked by one window consumes no other window', () => {
    const tight = new SlidingWindow({ name: 'tight', limit: 1, windowMs: 1_000 });
    const loose = new SlidingWindow({ name: 'loose', limit: 2, windowMs: 1_000 });
    expect(consume([[tight, 'k'], [loose, 'k']], T0).ok).toBe(true);
    for (let i = 0; i < 5; i++) expect(consume([[tight, 'k'], [loose, 'k']], T0).ok).toBe(false);
    expect(consume([[loose, 'k']], T0).ok).toBe(true); // still had room: blocked calls did not count
  });

  it('check() never records', () => {
    const w = new SlidingWindow({ name: 't', limit: 1, windowMs: 1_000 });
    for (let i = 0; i < 3; i++) expect(check([[w, 'k']], T0).ok).toBe(true);
  });

  it('bounds memory: a flood of distinct keys evicts instead of growing', () => {
    const w = new SlidingWindow({ name: 't', limit: 1, windowMs: 60_000 }, 100);
    for (let i = 0; i < 1_000; i++) consume([[w, `k${i}`]], T0);
    expect((w as unknown as { events: Map<string, number[]> }).events.size).toBeLessThanOrEqual(100);
  });

  it('rejects nonsense limits', () => {
    expect(() => new SlidingWindow({ name: 'bad', limit: 0, windowMs: 1 })).toThrow();
  });
});

describe('Keystone limits', () => {
  beforeEach(() => resetAllLimits());

  it(`LLM: ${LIMITS.llm.sessionPerMinute}/min and ${LIMITS.llm.sessionPerDay}/day per session`, () => {
    const caller = { sessionId: 's1', ip: '203.0.113.1' };
    for (let i = 0; i < LIMITS.llm.sessionPerMinute; i++) expect(takeLlmCall(caller, T0).ok).toBe(true);
    expect(takeLlmCall(caller, T0)).toMatchObject({ ok: false, window: 'llm:sessionMinute' });
    // Spread over the day: the daily quota caps the session even at a polite rate.
    let allowed = LIMITS.llm.sessionPerMinute;
    for (let m = 1; m < 24 * 60; m += 2) if (takeLlmCall(caller, T0 + m * 60_000).ok) allowed++;
    expect(allowed).toBe(LIMITS.llm.sessionPerDay);
  });

  it('LLM: re-signing in (a new session id) does not escape the per-IP limit', () => {
    let allowed = 0;
    for (let i = 0; i < 100; i++) if (takeLlmCall({ sessionId: `fresh-${i}`, ip: '203.0.113.2' }, T0).ok) allowed++;
    expect(allowed).toBe(LIMITS.llm.ipPerMinute);
  });

  it('LLM: a per-instance global ceiling holds across many IPs and sessions', () => {
    let allowed = 0;
    for (let i = 0; i < 500; i++) if (takeLlmCall({ sessionId: `s${i}`, ip: `198.51.100.${i % 250}` }, T0).ok) allowed++;
    expect(allowed).toBe(LIMITS.llm.globalPerMinute);
  });

  it(`Jev: ${LIMITS.jev.sessionPerMinute}/min per session`, () => {
    const caller = { sessionId: 'j1', ip: '203.0.113.3' };
    for (let i = 0; i < LIMITS.jev.sessionPerMinute; i++) expect(takeJevCall(caller, T0).ok).toBe(true);
    expect(takeJevCall(caller, T0).ok).toBe(false);
    expect(takeJevCall(caller, T0 + 60_001).ok).toBe(true);
  });

  it(`sign-in: locks an IP after ${LIMITS.signIn.ipFailuresPerMinute} failures/min and ${LIMITS.signIn.ipFailuresPerHour}/hour`, () => {
    const ip = '203.0.113.4';
    for (let i = 0; i < LIMITS.signIn.ipFailuresPerMinute; i++) {
      expect(signInLockout(ip, T0).ok).toBe(true);
      recordSignInFailure(ip, T0);
    }
    expect(signInLockout(ip, T0).ok).toBe(false);
    expect(signInLockout('203.0.113.5', T0).ok).toBe(true);
    // Hourly cap: 10 failures every 61 s reaches 50 within the hour.
    let t = T0;
    for (let i = 0; i < 4; i++) {
      t += 61_000;
      for (let j = 0; j < LIMITS.signIn.ipFailuresPerMinute; j++) recordSignInFailure(ip, t);
    }
    expect(signInLockout(ip, t + 61_000)).toMatchObject({ ok: false, window: 'sign-in:ipHour' });
  });

  it('clientIp takes the first x-forwarded-for hop', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe('203.0.113.9');
    expect(clientIp(new Headers({ 'x-real-ip': '203.0.113.8' }))).toBe('203.0.113.8');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
