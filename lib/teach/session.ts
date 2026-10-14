// Keeping an exercise across a reload.
//
// Without this, a refresh mid-demo throws away every answer and drops you back
// at the first scenario stage — on stage, in front of judges, with no way back
// to where you were. That is a bad enough failure mode to be worth the small
// amount of state.
//
// Three things it is careful about, all of which are ways stored state can
// quietly lie:
//
//   - It is keyed by pill AND by the exercise's own question ids. A generated
//     exercise changes when the pill changes, and answers to questions that no
//     longer exist would fill a coverage board with things nobody said. A
//     changed exercise discards the old session rather than half-restoring it.
//   - It stores answers only, never identity. Who is acting comes from the
//     signed session, as everywhere else, so localStorage cannot choose a role.
//   - Every read is validated and every failure is silent-but-empty. A
//     corrupted or hand-edited entry starts a fresh exercise; it never throws
//     into a render.

import { z } from '@/lib/zod';
import type { Answer, Exercise } from './exercise';

const KEY_PREFIX = 'keystone.teach.v1';

const answerSchema = z.object({
  questionId: z.string().min(1),
  choiceIds: z.array(z.string().min(1)).max(16),
  text: z.string().max(8_000).optional(),
  at: z.number().int().min(0),
});

const sessionSchema = z.object({
  /** Fingerprint of the exercise these answers belong to. */
  shape: z.string().min(1),
  answers: z.array(answerSchema).max(100),
  stageAt: z.number().int().min(0).max(50),
  phase: z.enum(['scenario', 'questions', 'done']),
});

export type StoredSession = z.infer<typeof sessionSchema>;

/**
 * What the answers are answers TO. Question ids in order: if the exercise is
 * regenerated differently, this changes and the stored answers are dropped.
 */
export function exerciseShape(exercise: Exercise): string {
  return [exercise.pillId, exercise.ruleId ?? '', exercise.opening.id, ...exercise.questions.map((q) => q.id)].join(
    '|',
  );
}

function keyFor(exercise: Exercise): string {
  return `${KEY_PREFIX}.${exercise.pillId}`;
}

export function readSession(exercise: Exercise): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(keyFor(exercise));
    if (!raw) return null;
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    if (parsed.data.shape !== exerciseShape(exercise)) return null;
    // An answer to a question this exercise does not contain is dropped rather
    // than trusted — the same rule claimsFrom already applies.
    const known = new Set([exercise.opening.id, ...exercise.questions.map((q) => q.id)]);
    return { ...parsed.data, answers: parsed.data.answers.filter((a) => known.has(a.questionId)) };
  } catch {
    return null;
  }
}

export function writeSession(exercise: Exercise, session: Omit<StoredSession, 'shape'>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      keyFor(exercise),
      JSON.stringify({ ...session, shape: exerciseShape(exercise) } satisfies StoredSession),
    );
  } catch {
    /* storage full or blocked: the exercise still works, it just will not survive a reload */
  }
}

export function clearSession(exercise: Exercise): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(keyFor(exercise));
  } catch {
    /* nothing to clear */
  }
}

/** The highest `at` already used, so a resumed session keeps ordering monotonic. */
export function lastClock(answers: readonly Answer[]): number {
  return answers.reduce((highest, answer) => Math.max(highest, answer.at), 0);
}
