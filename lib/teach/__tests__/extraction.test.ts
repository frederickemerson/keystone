// The one rule that matters here: a recorded fixture is never shown as a
// reading of something a person just typed.

import { describe, expect, it } from 'vitest';
import {
  accountExtractionOutcome,
  NOT_LIVE_REASON,
  OVER_QUOTA_REASON,
  UNREACHABLE_REASON,
} from '../extraction';

const parse = { candidates: [], rejected: [] };

describe('accountExtractionOutcome', () => {
  it('shows live candidates', () => {
    const outcome = accountExtractionOutcome({
      status: 200, source: 'live', provider: 'tokenhub', model: 'hy4-preview', data: parse,
    });
    expect(outcome).toEqual({ kind: 'candidates', parse, provider: 'tokenhub', model: 'hy4-preview' });
  });

  it('refuses the recorded fixture, even when it arrives with a 200', () => {
    const outcome = accountExtractionOutcome({
      status: 200,
      source: 'recorded',
      provider: 'fixtures',
      model: 'recorded',
      data: { candidates: [{ rule: { id: 'TS-07' } }, { rule: { id: 'TS-02' } }] as never, rejected: [] },
    });
    expect(outcome.kind).toBe('unavailable');
  });

  it('says why, when the route explains itself', () => {
    const outcome = accountExtractionOutcome({ status: 200, source: 'recorded', reason: 'Provider chain exhausted.' });
    expect(outcome).toEqual({ kind: 'unavailable', reason: 'Provider chain exhausted.' });
  });

  it('has its own reason when the route gives none', () => {
    expect(accountExtractionOutcome({ status: 200, source: 'recorded' })).toEqual({
      kind: 'unavailable',
      reason: NOT_LIVE_REASON,
    });
  });

  it('explains the quota case without offering a substitute', () => {
    const outcome = accountExtractionOutcome({ status: 429, source: 'recorded', data: parse });
    expect(outcome).toEqual({ kind: 'unavailable', reason: OVER_QUOTA_REASON });
    expect(OVER_QUOTA_REASON).toMatch(/not of what you just wrote/);
  });

  it('treats any other status as unreachable', () => {
    for (const status of [401, 500, 502, 503]) {
      expect(accountExtractionOutcome({ status }).kind).toBe('unavailable');
    }
    expect(accountExtractionOutcome({ status: 500 })).toEqual({ kind: 'unavailable', reason: UNREACHABLE_REASON });
  });

  it('refuses a live answer with no body rather than rendering nothing confidently', () => {
    expect(accountExtractionOutcome({ status: 200, source: 'live' }).kind).toBe('unavailable');
  });

  it('defaults both lists, so a partial body cannot crash the panel', () => {
    const outcome = accountExtractionOutcome({ status: 200, source: 'live', data: {} as never });
    expect(outcome).toEqual({
      kind: 'candidates',
      parse: { candidates: [], rejected: [] },
      provider: 'unknown',
      model: 'unknown',
    });
  });
});
