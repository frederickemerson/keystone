// What the answers would become, if someone approved them.
//
// The end of the exercise used to say "it is a draft with your name on it, and
// someone who may edit this pill has to review each line". That was not true:
// nothing was written anywhere, and the link went to a canvas that had never
// heard of the session. Saying a thing is a draft when no draft exists is the
// exact failure this project is an argument against, so either the sentence
// had to go or the draft had to be real. This is the draft.
//
// What it deliberately does NOT do is propose itself. The answers here span
// more than one rule of the pill — isolation is TS-02, the re-energisation
// gate is TS-07 — and deciding which existing rule a statement amends is a
// judgement with consequences, not a lookup. So this produces a preview and
// names what it could not fill, and a person places it.
//
// Nothing is inferred. A choice that declares no meaning produces nothing and
// is reported as unmapped, rather than being pattern-matched into a field it
// looks like it might belong to. The meaning travels on the choice
// (lib/teach/meaning), so a question generated from a pill carries its own.

import type { Condition, Rule } from '@/lib/engine/types';
import type { RulePart } from './parts';
import type { Claim, Exercise, Answer } from './exercise';
import { claimsFrom } from './exercise';

export interface DraftedRule {
  /** Only the fields the answers actually settled. Everything else is absent, not defaulted. */
  patch: Partial<Omit<Rule, 'id'>>;
  /** Parts the answers filled, in the order the parts are defined. */
  filled: RulePart[];
  /** Claims whose choice declared no meaning, reported rather than ignored. */
  unmapped: string[];
  /** The condition that keeps both halves of a disagreement, once confirmed. */
  exception: string | null;
}

/**
 * Build the patch. Later claims win for single-valued fields, because a
 * refinement comes after the thing it refines; list fields accumulate.
 */
export function draftRuleFrom(exercise: Exercise, answers: readonly Answer[]): DraftedRule {
  const claims = claimsFrom(exercise, answers);
  const patch: Partial<Omit<Rule, 'id'>> = {};
  const filled = new Set<RulePart>();
  const unmapped: string[] = [];

  const evidence: string[] = [];
  const forbidden: string[] = [];
  const conditions: Condition[] = [];

  for (const claim of claims) {
    const meaning = claim.means;
    if (!meaning) {
      unmapped.push(claim.claim);
      continue;
    }
    switch (meaning.part) {
      case 'decision':
        if (meaning.text) {
          patch.decision = meaning.text;
          filled.add('decision');
        }
        break;
      case 'required_evidence':
        // A choice that maps to no key adds no gate; it is still a real answer,
        // so the part counts as answered.
        filled.add('required_evidence');
        if (meaning.evidenceKey && !evidence.includes(meaning.evidenceKey)) evidence.push(meaning.evidenceKey);
        break;
      case 'forbidden_actions':
        if (meaning.text && !forbidden.includes(meaning.text)) forbidden.push(meaning.text);
        filled.add('forbidden_actions');
        break;
      case 'escalate_to':
        if (meaning.role) {
          patch.escalate_to = { role: meaning.role };
          filled.add('escalate_to');
        }
        break;
      case 'deadline_minutes':
        if (meaning.minutes !== undefined) {
          patch.deadline_minutes = meaning.minutes;
          filled.add('deadline_minutes');
        }
        break;
      case 'trigger':
        if (meaning.threshold) {
          // Structured, like every other condition the engine reads: no string
          // expression, nothing for a model to interpret at evaluation time.
          conditions.length = 0;
          conditions.push({
            path: meaning.threshold.path,
            op: meaning.threshold.op,
            value: meaning.threshold.value,
          });
          filled.add('trigger');
        }
        break;
      default:
        break;
    }
  }

  if (evidence.length) patch.required_evidence = evidence;
  if (forbidden.length) patch.forbidden_actions = forbidden;
  if (conditions.length) {
    patch.trigger = { incident_type: exercise.incidentType, all: conditions, any: [] };
  }

  const exceptionAnswer = answers.find((answer) => {
    const question = [exercise.opening, ...exercise.questions].find((q) => q.id === answer.questionId);
    return question?.covers === 'exceptions' && (answer.text ?? '').trim().length > 0;
  });
  if (exceptionAnswer?.text) filled.add('exceptions');

  const order: RulePart[] = [
    'trigger',
    'decision',
    'required_evidence',
    'forbidden_actions',
    'escalate_to',
    'deadline_minutes',
    'exceptions',
  ];

  return {
    patch,
    filled: order.filter((part) => filled.has(part)),
    unmapped,
    exception: exceptionAnswer?.text?.trim() ?? null,
  };
}

/** The claims a drafted rule rests on, for showing the words beside the field. */
export function draftProvenance(exercise: Exercise, answers: readonly Answer[]): Claim[] {
  return claimsFrom(exercise, answers).filter((claim) => claim.means);
}
