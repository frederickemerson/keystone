import { describe, expect, it } from 'vitest';
import { DEMO_PATH } from '@/lib/journey';
import { GUIDE_STORAGE_KEY, guideReducer, parseGuideState, readGuideState, writeGuideState, type GuideState } from '../state';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

const blocked = () => {
  throw new Error('blocked');
};
const throwing = { getItem: blocked, setItem: blocked, removeItem: blocked };

const at = (step: number, extra: Partial<GuideState> = {}): GuideState => ({
  step,
  open: true,
  collapsed: false,
  finished: false,
  ...extra,
});
const lastStep = DEMO_PATH.length - 1;

describe('guide state', () => {
  it('starts, moves within bounds and never mutates', () => {
    const started = guideReducer(null, { type: 'start' });
    expect(started).toEqual(at(0));
    expect(guideReducer(started, { type: 'back' })).toEqual(at(0));
    expect(guideReducer(started, { type: 'next' })).toEqual(at(1));
    expect(started?.step).toBe(0);
    const last = guideReducer(null, { type: 'goto', step: 999 });
    expect(last?.step).toBe(lastStep);
    expect(guideReducer(last, { type: 'next' })?.step).toBe(lastStep);
  });

  it('closes without losing the step and resumes where it was', () => {
    const closed = guideReducer(at(3), { type: 'close' });
    expect(closed).toEqual(at(3, { open: false }));
    expect(guideReducer(closed, { type: 'resume' })).toEqual(at(3));
    expect(guideReducer(closed, { type: 'end' })).toBeNull();
    expect(guideReducer(null, { type: 'next' })).toBeNull();
  });

  it('hides details for the current step only: every step change shows "Do this" again', () => {
    const collapsed = guideReducer(at(2), { type: 'toggleDetails' });
    expect(collapsed).toEqual(at(2, { collapsed: true }));
    expect(guideReducer(collapsed, { type: 'toggleDetails' })).toEqual(at(2));
    // Closing and resuming stays on the same step, so the choice is kept.
    const resumed = guideReducer(guideReducer(collapsed, { type: 'close' }), { type: 'resume' });
    expect(resumed?.collapsed).toBe(true);
    for (const action of [{ type: 'next' }, { type: 'back' }, { type: 'goto', step: 5 }] as const) {
      expect(guideReducer(collapsed, action)?.collapsed, action.type).toBe(false);
    }
  });

  it('finishing shows the end card, survives close, and replay starts over', () => {
    const finished = guideReducer(at(lastStep), { type: 'finish' });
    expect(finished).toEqual(at(lastStep, { finished: true }));
    const closed = guideReducer(finished, { type: 'close' });
    expect(closed).toEqual(at(lastStep, { open: false, finished: true }));
    expect(guideReducer(closed, { type: 'start' })).toEqual(at(0));
    expect(guideReducer(finished, { type: 'goto', step: 2 })).toEqual(at(2));
  });

  it('survives a reload through storage', () => {
    const storage = memoryStorage();
    expect(writeGuideState(storage, at(4, { open: false, collapsed: true }))).toBe(true);
    expect(readGuideState(storage)).toEqual(at(4, { open: false, collapsed: true }));
    writeGuideState(storage, at(lastStep, { finished: true }));
    expect(readGuideState(storage)?.finished).toBe(true);
    writeGuideState(storage, null);
    expect(storage.data.has(GUIDE_STORAGE_KEY)).toBe(false);
    expect(readGuideState(storage)).toBeNull();
  });

  it('resumes a tour saved before collapsed/finished existed', () => {
    expect(parseGuideState('{"step":2,"open":true}')).toEqual(at(2));
  });

  it('treats missing, throwing or malformed storage as no tour', () => {
    expect(readGuideState(undefined)).toBeNull();
    expect(readGuideState(throwing)).toBeNull();
    expect(writeGuideState(throwing, at(1))).toBe(false);
    expect(writeGuideState(undefined, at(1))).toBe(false);
    const bad = ['', 'not json', 'null', '[]', '{"step":"2","open":true}', '{"step":-1,"open":true}', `{"step":${DEMO_PATH.length},"open":true}`, '{"step":1}'];
    for (const raw of bad) expect(parseGuideState(raw), raw).toBeNull();
  });
});
