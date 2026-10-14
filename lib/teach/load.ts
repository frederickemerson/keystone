// Loading an exercise.
//
// Validated at the boundary like every other authored content file: an
// exercise whose question covers a part that is not a Rule field, or whose
// choice ids collide, fails here rather than rendering a board that cannot be
// trusted. __tests__/load.test.ts parses the shipped file, so a typo in the
// JSON is a failing test and not a broken screen.

import raw from '@/data/teach/chilled-water-leak.json';
import { exerciseSchema, type Exercise } from './exercise';

/** The exercise ids that have authored content, keyed by pill id. */
const BY_PILL: Record<string, unknown> = {
  'technical-services-chilled-water-leak': raw,
};

export function loadExercise(pillId: string): Exercise | null {
  const found = BY_PILL[pillId];
  if (!found) return null;
  const parsed = exerciseSchema.safeParse(found);
  return parsed.success ? parsed.data : null;
}

/** Which pills can be taught this way. */
export function exercisePillIds(): string[] {
  return Object.keys(BY_PILL);
}
