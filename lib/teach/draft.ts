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
// Nothing is inferred. A claim with no entry in CLAIM_MAPPING produces
// nothing and is reported as unmapped, rather than being pattern-matched into
// a field it looks like it might belong to.

import type { Condition, Rule } from '@/lib/engine/types';
import type { RulePart } from './parts';
import type { Claim, Exercise, Answer } from './exercise';
import { claimsFrom } from './exercise';

/**
 * What each claim token means, in the pill's own vocabulary.
 *
 * Authored, not derived: `ev:lew_signoff` maps to the evidence key
 * `lew_signoff` because that key is declared in the pill's evidence.yaml, and
 * __tests__/draft.test.ts checks every key named here still exists there. A
 * token whose meaning is not written down here has no meaning.
 */
export const CLAIM_MAPPING: Readonly<Record<string, ClaimMeaning>> = {
  // decision
  'isolate:riser': { part: 'decision', text: 'Isolate the whole chilled-water riser.' },
  'isolate:floor': { part: 'decision', text: 'Isolate at the floor valve.' },
  'isolate:sub_valve': { part: 'decision', text: 'Isolate at the nearest branch sub-valve and leave the riser open.' },
  'isolate:trace_first': { part: 'decision', text: 'Trace the source before isolating anything.' },

  // required_evidence — each names a key declared in the pill's evidence.yaml
  'ev:lew_signoff': { part: 'required_evidence', evidenceKey: 'lew_signoff' },
  'ev:insulation_resistance_ok': { part: 'required_evidence', evidenceKey: 'insulation_resistance_ok' },
  'ev:area_dry': { part: 'required_evidence', evidenceKey: 'area_dry' },
  'ev:visual_inspection': { part: 'required_evidence', evidenceKey: 'visual_inspection' },
  // Telling the tenant is a courtesy, not evidence of electrical safety. It is
  // mapped to nothing on purpose, so picking it adds no gate.
  'ev:tenant_notified': { part: 'required_evidence' },

  // escalate_to
  'signoff:duty_lew': { part: 'escalate_to', role: 'duty_lew' },
  'signoff:chief_engineer': { part: 'escalate_to', role: 'chief_engineer' },
  'signoff:duty_manager': { part: 'escalate_to', role: 'duty_manager' },
  'signoff:technical_services_lead': { part: 'escalate_to', role: 'technical_services_lead' },

  // forbidden_actions — the chosen wording is the action
  'forbid:reset_breaker_before_ir': { part: 'forbidden_actions', text: 'Reset a tripped breaker before the LEW tests insulation resistance' },
  'forbid:reenergise_on_visual': { part: 'forbidden_actions', text: 'Re-energise on visual inspection alone' },
  'forbid:open_wet_cupboard': { part: 'forbidden_actions', text: 'Open the electrical riser cupboard to check whether it is wet inside' },
  'forbid:photograph': { part: 'forbidden_actions', text: 'Photograph standing water from outside the threshold' },
  'forbid:cordon': { part: 'forbidden_actions', text: 'Cordon the area and put up signage' },

  // deadline_minutes
  'deadline:15': { part: 'deadline_minutes', minutes: 15 },
  'deadline:30': { part: 'deadline_minutes', minutes: 30 },
  'deadline:60': { part: 'deadline_minutes', minutes: 60 },
  'deadline:none': { part: 'deadline_minutes', minutes: null },

  // trigger — a distance threshold on a declared numeric evidence key
  'near_electrical:0.5m': { part: 'trigger', metres: 0.5 },
  'near_electrical:1m': { part: 'trigger', metres: 1 },
  'near_electrical:2m': { part: 'trigger', metres: 2 },
  'near_electrical:5m': { part: 'trigger', metres: 5 },
  'near_electrical:contact': { part: 'trigger', metres: 0 },
};

export interface ClaimMeaning {
  part: RulePart;
  /** Free text for a decision or a forbidden action. */
  text?: string;
  /** An evidence key declared in the pill's evidence.yaml. */
  evidenceKey?: string;
  /** A role, for escalate_to. */
  role?: string;
  minutes?: number | null;
  /** Metres, for the "how near is too near" threshold. */
  metres?: number;
}

/** The evidence key the distance threshold is written against. Declared in evidence.yaml. */
export const DISTANCE_EVIDENCE_KEY = 'distance_to_electrical_m';

export interface DraftedRule {
  /** Only the fields the answers actually settled. Everything else is absent, not defaulted. */
  patch: Partial<Omit<Rule, 'id'>>;
  /** Parts the answers filled, in the order the parts are defined. */
  filled: RulePart[];
  /** Claims whose token has no declared meaning, reported rather than ignored. */
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
    const meaning = CLAIM_MAPPING[claim.claim];
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
        patch.deadline_minutes = meaning.minutes ?? null;
        filled.add('deadline_minutes');
        break;
      case 'trigger':
        if (typeof meaning.metres === 'number') {
          // Structured, like every other condition the engine reads: no string
          // expression, nothing for a model to interpret at evaluation time.
          conditions.length = 0;
          conditions.push({ path: `evidence.${DISTANCE_EVIDENCE_KEY}`, op: 'lte', value: meaning.metres });
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
    patch.trigger = { incident_type: 'water_ingress', all: conditions, any: [] };
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
  return claimsFrom(exercise, answers).filter((claim) => CLAIM_MAPPING[claim.claim]);
}
