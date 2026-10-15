// Loading an exercise for a pill — authored where one exists, generated where
// one does not.
//
// The first version only ever returned the single hand-written exercise, and
// null for everything else, which made "teach any skill" a claim the code
// could not support. Now a pill that nobody has written questions for gets
// them derived from its own rules and evidence catalogue
// (lib/teach/generate), so pointing this screen at a new pill is not a
// content-authoring job.
//
// Authoring still wins where it exists. The chilled-water exercise asks
// "the tenant is calling every ten minutes and it is 03:40 — which of these
// must still not happen?", and no generator is going to write that sentence.
// Authored content is better content; the generator is what makes its absence
// survivable rather than fatal.

import raw from '@/data/teach/chilled-water-leak.json';
import { loadPill } from '@/lib/pills/load';
import { exerciseSchema, type Exercise } from './exercise';
import { exerciseFromPill } from './generate';

/** Pills with hand-written questions, keyed by pill id. */
const AUTHORED: Record<string, unknown> = {
  'technical-services-chilled-water-leak': raw,
};

/** The scenario a generated exercise is set against when none is authored. */
const GENERIC_SCENARIO = 'pill-rule';

/** Where an exercise came from, so the screen can say so rather than implying authorship. */
export type ExerciseOrigin = 'authored' | 'generated';

export interface LoadedExercise {
  exercise: Exercise;
  origin: ExerciseOrigin;
}

/**
 * The rule a generated exercise teaches: the first one that can carry a
 * contradiction (it has an exception with a note), else the first rule that
 * gates on evidence, else the first rule. Deterministic, so the same pill
 * always teaches the same rule.
 */
function ruleToTeach(rules: readonly import('@/lib/engine/types').Rule[]) {
  return (
    rules.find((rule) => rule.exceptions.some((exception) => exception.note?.trim())) ??
    rules.find((rule) => rule.required_evidence.length > 0) ??
    rules[0]
  );
}

export function loadExercise(pillId: string): LoadedExercise | null {
  const authored = AUTHORED[pillId];
  if (authored) {
    const parsed = exerciseSchema.safeParse(authored);
    if (parsed.success) return { exercise: parsed.data, origin: 'authored' };
    return null;
  }

  const bundle = loadPill(pillId);
  if (!bundle) return null;
  const rules = bundle.pill.rules;
  const rule = ruleToTeach(rules);
  if (!rule) return null;

  const generated = exerciseFromPill({
    pillId,
    rule,
    siblings: rules.filter((sibling) => sibling.id !== rule.id),
    evidence: bundle.pill.evidenceCatalog,
    scenarioId: GENERIC_SCENARIO,
  });
  if (!generated) return null;

  // Generated content goes through the same gate as authored content: a
  // generator that emits something the schema refuses is a bug, not a
  // special case.
  const parsed = exerciseSchema.safeParse(generated);
  return parsed.success ? { exercise: parsed.data, origin: 'generated' } : null;
}
