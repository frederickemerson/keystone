// Resuming an exercise, and the three ways stored state can lie.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, exerciseShape, lastClock, readSession, writeSession } from '../session';
import type { Answer, Exercise } from '../exercise';

const EXERCISE: Exercise = {
  pillId: 'p1',
  scenarioId: 's1',
  incidentType: 'water_ingress',
  opening: { id: 'open', kind: 'open', covers: 'trigger', prompt: 'Walk me through it.' },
  questions: [
    {
      id: 'q1',
      kind: 'single_choice',
      covers: 'decision',
      prompt: 'What do you do?',
      choices: [
        { id: 'a', label: 'A', claim: 'x:a' },
        { id: 'b', label: 'B', claim: 'x:b' },
      ],
    },
  ],
};

const SAVED = { answers: [{ questionId: 'q1', choiceIds: ['a'], at: 2 }], stageAt: 3, phase: 'questions' as const };

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
});

describe('a round trip', () => {
  it('gives back what was stored', () => {
    writeSession(EXERCISE, SAVED);
    expect(readSession(EXERCISE)).toEqual({ ...SAVED, shape: exerciseShape(EXERCISE) });
  });

  it('has nothing before anything is stored', () => {
    expect(readSession(EXERCISE)).toBeNull();
  });

  it('clears', () => {
    writeSession(EXERCISE, SAVED);
    clearSession(EXERCISE);
    expect(readSession(EXERCISE)).toBeNull();
  });

  it('keeps each pill separate', () => {
    writeSession(EXERCISE, SAVED);
    expect(readSession({ ...EXERCISE, pillId: 'p2' })).toBeNull();
  });
});

describe('the ways stored state can lie', () => {
  it('drops a session whose exercise has changed shape', () => {
    writeSession(EXERCISE, SAVED);
    const regenerated: Exercise = {
      ...EXERCISE,
      questions: [{ ...EXERCISE.questions[0], id: 'q1-renamed' }],
    };
    expect(readSession(regenerated)).toBeNull();
  });

  it('drops an answer to a question this exercise does not contain', () => {
    writeSession(EXERCISE, { ...SAVED, answers: [...SAVED.answers, { questionId: 'ghost', choiceIds: ['z'], at: 9 }] });
    // The shape check catches a regenerated exercise; this catches a hand-edited entry.
    const stored = JSON.parse(store.get('keystone.teach.v1.p1')!);
    stored.answers.push({ questionId: 'ghost2', choiceIds: ['z'], at: 10 });
    store.set('keystone.teach.v1.p1', JSON.stringify(stored));
    expect(readSession(EXERCISE)!.answers.map((a) => a.questionId)).toEqual(['q1']);
  });

  it('starts fresh on corrupted JSON rather than throwing into a render', () => {
    store.set('keystone.teach.v1.p1', '{not json');
    expect(readSession(EXERCISE)).toBeNull();
  });

  it('starts fresh when the stored shape is not a session at all', () => {
    store.set('keystone.teach.v1.p1', JSON.stringify({ answers: 'all of them' }));
    expect(readSession(EXERCISE)).toBeNull();
  });

  it('stores no identity — who is acting comes from the signed session', () => {
    writeSession(EXERCISE, SAVED);
    const raw = store.get('keystone.teach.v1.p1')!;
    for (const word of ['role', 'name', 'chief_engineer', 'technician', 'sessionId']) {
      expect(raw).not.toContain(word);
    }
  });

  it('survives storage being blocked, rather than failing the exercise', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => { throw new Error('blocked'); },
        setItem: () => { throw new Error('blocked'); },
        removeItem: () => { throw new Error('blocked'); },
      },
    });
    expect(() => writeSession(EXERCISE, SAVED)).not.toThrow();
    expect(readSession(EXERCISE)).toBeNull();
    expect(() => clearSession(EXERCISE)).not.toThrow();
  });
});

describe('lastClock', () => {
  it('is zero for nothing', () => {
    expect(lastClock([])).toBe(0);
  });

  it('keeps ordering monotonic across a resume', () => {
    const answers: Answer[] = [
      { questionId: 'a', choiceIds: [], at: 4 },
      { questionId: 'b', choiceIds: [], at: 2 },
    ];
    expect(lastClock(answers)).toBe(4);
  });
});
