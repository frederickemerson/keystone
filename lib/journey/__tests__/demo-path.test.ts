import { describe, expect, it } from 'vitest';
import { DEMO_FINISH, DEMO_PATH, GUIDE_ANCHORS, withAnchor } from '..';
import { anchorIdOf } from '@/lib/guide/anchor';

const VERSION = /v?\d+\.\d+\.\d+/;
const byId = (id: string) => {
  const step = DEMO_PATH.find((s) => s.id === id);
  if (!step) throw new Error(`no step ${id}`);
  return step;
};

describe('guided demo copy and deep links', () => {
  it('never hard-codes a version number (steps and end card)', () => {
    const copy = [...DEMO_PATH.flatMap((s) => [s.title, s.doThis, s.notice]), DEMO_FINISH.title, ...DEMO_FINISH.saw];
    for (const text of copy) expect(text).not.toMatch(VERSION);
  });

  it('links each in-room and canvas step to the element it talks about', () => {
    expect(anchorIdOf(byId('gate-blocks').href)).toBe(GUIDE_ANCHORS.blockedGate);
    expect(anchorIdOf(byId('teach-back').href)).toBe(GUIDE_ANCHORS.captureTask);
    expect(anchorIdOf(byId('propose').href)).toBe(GUIDE_ANCHORS.noteDrafts);
    expect(GUIDE_ANCHORS).toEqual({ blockedGate: 'blocked-gate', captureTask: 'capture-task', noteDrafts: 'note-drafts' });
    // The incident steps keep the gate step; the canvas confirm step keeps its rule focus.
    expect(byId('gate-blocks').href).toMatch(/^\/incident\/INC-2026-1011\?step=10#blocked-gate$/);
    expect(byId('confirm-rule').href).toContain('?rule=TS-07');
  });

  it('step 3 asks for the escalation that creates step 4’s task; step 5 names one draft', () => {
    expect(byId('gate-blocks').doThis).toMatch(/Why\? · Hear the expert/);
    expect(byId('gate-blocks').doThis).toMatch(/Escalate to … Duty Licensed Electrical Worker/);
    expect(byId('gate-blocks').doThis).not.toMatch(/Try to re-energise/);
    expect(byId('teach-back').doThis).toMatch(/Tell us why — 20 seconds/);
    expect(byId('teach-back').doThis).toMatch(/Answer now/);
    expect(byId('propose').doThis).toMatch(/the draft\b/);
    expect(byId('propose').doThis).not.toMatch(/drafts\b(?! from)/);
  });

  it('withAnchor replaces any existing fragment', () => {
    expect(withAnchor('/a?b=1', 'x')).toBe('/a?b=1#x');
    expect(withAnchor('/a#old', 'x')).toBe('/a#x');
  });
});
