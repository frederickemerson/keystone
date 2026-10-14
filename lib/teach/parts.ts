// What a rule is made of — the contract the whole exercise is keyed off.
//
// The interview used to be a sequence: 31 probes, asked in order, and the
// viewer watched them go by. Nothing on screen said what was still MISSING,
// because nothing in the code knew. "Missing" needs something to be missing
// FROM, and the honest answer was already in the repo: an engine Rule has a
// fixed set of fields, and a rule that cannot be written is one whose fields
// are still blank.
//
// So coverage here is not a progress bar over a question list. It is "which
// fields of a Rule do we now have", and every key below is a real key of
// `Rule` in lib/engine/types. __tests__/parts.test.ts asserts exactly that
// against the type, so a part invented here, or a rule field that stops
// existing, fails the build rather than quietly showing a full board.

import type { Rule } from '@/lib/engine/types';

/**
 * The fields of a Rule the exercise elicits, in the order a person naturally
 * gives them up: what happened, when it applies, how near is too near, what
 * you do, what must be true first, what you must not do, who decides, by when,
 * and when the default is wrong.
 *
 * `trigger` and `exceptions` are where the two halves of a contradiction live,
 * which is why both are elicited rather than inferred.
 */
export const RULE_PARTS = [
  'trigger',
  'decision',
  'required_evidence',
  'allowed_actions',
  'forbidden_actions',
  'escalate_to',
  'deadline_minutes',
  'exceptions',
] as const;

export type RulePart = (typeof RULE_PARTS)[number];

/**
 * Compile-time proof that every part names a field of Rule. A typo here is a
 * type error, not a runtime surprise.
 */
export type RulePartsAreRuleFields = RulePart extends keyof Rule ? true : never;
const _partsAreRuleFields: RulePartsAreRuleFields = true;
void _partsAreRuleFields;

const PART_SET: ReadonlySet<string> = new Set<string>(RULE_PARTS);

export function isRulePart(value: string): value is RulePart {
  return PART_SET.has(value);
}

/**
 * What each part is called on screen, and the question behind it.
 *
 * These are the words a technician reads, so they are plain: nobody on a
 * rooftop asks themselves about their "action class".
 */
export const PART_LABELS: Record<RulePart, { label: string; asks: string }> = {
  trigger: { label: 'When it applies', asks: 'What has to be true for this to be the right rule?' },
  decision: { label: 'What to do', asks: 'What is the call?' },
  required_evidence: { label: 'What must be confirmed', asks: 'What has to be checked before acting?' },
  allowed_actions: { label: 'What you may do', asks: 'What is in bounds?' },
  forbidden_actions: { label: 'What you must not do', asks: 'What is out of bounds, whatever the pressure?' },
  escalate_to: { label: 'Who decides', asks: 'Whose sign-off does this need?' },
  deadline_minutes: { label: 'By when', asks: 'How long is too long?' },
  exceptions: { label: 'When it is different', asks: 'When does the default answer become the wrong one?' },
};

/**
 * Parts without which a rule cannot be drafted at all. The exercise keeps
 * asking while one of these is blank and lets the rest go, because a rule
 * missing its deadline is still a rule and a rule missing its decision is not.
 */
export const ESSENTIAL_PARTS: readonly RulePart[] = [
  'trigger',
  'decision',
  'required_evidence',
  'escalate_to',
];
