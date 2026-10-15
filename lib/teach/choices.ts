// What this screen can teach, described well enough to choose between.
//
// Why this exists. The row of pills it replaces was true and useless: it named
// the other pill and said where its questions came from, which is a fact about
// the implementation, not an answer to "what am I about to spend ten minutes
// on". Someone choosing wants the situation, who it involves, and what the
// session will ask them.
//
// None of that is new copy. The drawn scenario is in data/teach/scenario.json,
// the expert is in the pill's provenance.json, the roles are the `owner` and
// `escalate_to` of the pill's own rules, and the question count is the
// exercise. Describing a choice is assembling what the pill already says about
// itself — so a pill that changes changes its own description, and nothing
// here can drift into a claim the repository does not support.

import { listPillRefs, loadPill } from '@/lib/pills/load';
import { roleLabel } from '@/lib/governance/access';
import type { Rule } from '@/lib/engine/types';
import { loadExercise, type ExerciseOrigin } from './load';
import { scenarioStages, type ScenarioStageData } from './scenario';

/** The expert a pill was elicited from, as provenance.json names them. */
export interface TeachChoiceExpert {
  name: string;
  role: string;
  years?: number;
}

/** One pill this screen can teach, with enough about it to pick. */
export interface TeachChoiceData {
  id: string;
  /** Hand-written questions, or questions derived from the pill's own rules. */
  origin: ExerciseOrigin;
  /** Whose knowledge this is, when provenance.json names them. */
  expert: TeachChoiceExpert | null;
  /** The rule the exercise elicits, when it is about one in particular. */
  rule: { id: string; title: string } | null;
  /** How many rules the pill holds — the size of what the session adds to. */
  ruleCount: number;
  /** Every role the pill's rules route a decision to, labelled, in rule order. */
  roles: string[];
  /** Questions the session can ask without a contradiction, the opening one included. */
  questionCount: number;
  /** The drawn situation, or null where nobody has drawn one for this pill. */
  stages: readonly ScenarioStageData[] | null;
}

/**
 * Every role the pill's own rules name: who owns the call, and who it goes to
 * when it leaves them. Asset overrides count — at a data centre the same rule
 * escalates to the Critical Facilities Manager, and that is a different person
 * being involved, not a footnote.
 */
function rolesInvolved(rules: readonly Rule[]): string[] {
  const seen = new Set<string>();
  for (const rule of rules) {
    for (const role of [rule.owner, rule.escalate_to.role, rule.escalate_to.fallback]) {
      if (role) seen.add(role);
    }
    for (const override of Object.values(rule.asset_overrides)) {
      const role = override.escalate_to?.role;
      if (role) seen.add(role);
    }
    for (const exception of rule.exceptions) {
      const role = exception.escalate_to?.role;
      if (role) seen.add(role);
    }
  }
  return [...seen].map(roleLabel);
}

/**
 * Describe one pill as a choice, or null when it cannot be taught at all —
 * the same condition `loadExercise` already decides, so the chooser can never
 * offer a pill the screen would then fail to open.
 */
export function teachChoice(pillId: string): TeachChoiceData | null {
  const loaded = loadExercise(pillId);
  const bundle = loadPill(pillId);
  if (!loaded || !bundle) return null;

  const { exercise, origin } = loaded;
  const rule = exercise.ruleId
    ? (bundle.pill.rules.find((candidate) => candidate.id === exercise.ruleId) ?? null)
    : null;

  return {
    id: pillId,
    origin,
    expert: bundle.expert
      ? { name: bundle.expert.name, role: bundle.expert.role, years: bundle.expert.years_experience }
      : null,
    rule: rule ? { id: rule.id, title: rule.title } : null,
    ruleCount: bundle.pill.rules.length,
    roles: rolesInvolved(bundle.pill.rules),
    // The contradiction question is not counted: it is raised only when two
    // answers disagree, so promising it up front would be promising an
    // argument the person may never have.
    questionCount: 1 + exercise.questions.filter((question) => !question.onContradictionOnly).length,
    stages: scenarioStages(exercise.scenarioId),
  };
}

/** Every pill this screen can teach, described. Same order as the registry. */
export function teachChoices(): TeachChoiceData[] {
  return listPillRefs()
    .map((ref) => teachChoice(ref.id))
    .filter((choice): choice is TeachChoiceData => choice !== null);
}
