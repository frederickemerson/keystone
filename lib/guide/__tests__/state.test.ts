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

describe('guide state', () => {
  it('starts, moves within bounds and never mutates', () => {
    const started = guideReducer(null, { type: 'start' });
    expect(started).toEqual({ step: 0, open: true });
    expect(guideReducer(started, { type: 'back' })).toEqual({ step: 0, open: true });
    expect(guideReducer(started, { type: 'next' })).toEqual({ step: 1, open: true });
    expect(started?.step).toBe(0);
    const last = guideReducer(null, { type: 'goto', step: 999 });
    expect(last?.step).toBe(DEMO_PATH.length - 1);
    expect(guideReducer(last, { type: 'next' })?.step).toBe(DEMO_PATH.length - 1);
  });

  it('closes without losing the step and resumes where it was', () => {
    const at3: GuideState = { step: 3, open: true };
    const closed = guideReducer(at3, { type: 'close' });
    expect(closed).toEqual({ step: 3, open: false });
    expect(guideReducer(closed, { type: 'resume' })).toEqual({ step: 3, open: true });
    expect(guideReducer(closed, { type: 'end' })).toBeNull();
    expect(guideReducer(null, { type: 'next' })).toBeNull();
  });

  it('survives a reload through storage', () => {
    const storage = memoryStorage();
    expect(writeGuideState(storage, { step: 4, open: false })).toBe(true);
    expect(readGuideState(storage)).toEqual({ step: 4, open: false });
    writeGuideState(storage, null);
    expect(storage.data.has(GUIDE_STORAGE_KEY)).toBe(false);
    expect(readGuideState(storage)).toBeNull();
  });

  it('treats missing, throwing or malformed storage as no tour', () => {
    expect(readGuideState(undefined)).toBeNull();
    expect(readGuideState(throwing)).toBeNull();
    expect(writeGuideState(throwing, { step: 1, open: true })).toBe(false);
    expect(writeGuideState(undefined, { step: 1, open: true })).toBe(false);
    const bad = ['', 'not json', 'null', '[]', '{"step":"2","open":true}', '{"step":-1,"open":true}', `{"step":${DEMO_PATH.length},"open":true}`, '{"step":1}'];
    for (const raw of bad) expect(parseGuideState(raw), raw).toBeNull();
  });
});
