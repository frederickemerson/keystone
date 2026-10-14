// Building an exercise out of a pill, with nothing authored.
//
// This exists because of the honest weakness in the first version: the
// questions, and the vocabulary their answers spoke, were hand written for one
// pill. Point the screen at any other pill and it had nothing to ask. "Teach
// any skill" was a claim the code could not support.
//
// A pill already holds everything the questions need, which is the whole point
// of a pill being a compiled artefact rather than a prompt. Every question
// below is derived from `rules.yaml` and `evidence.yaml`:
//
//   - what must be confirmed  <- rule.required_evidence, labelled from the
//     evidence catalogue; the WRONG options are evidence keys other rules of
//     the same pill require, so a distractor is plausible by construction and
//     nobody had to invent one;
//   - what you must not do    <- rule.forbidden_actions, and the distractors
//     are that same rule's allowed_actions. The pill itself is the authority
//     on which is which;
//   - who decides             <- rule.escalate_to.role, against the roles the
//     pill's other rules escalate to;
//   - by when                 <- the distinct deadlines across the pill;
//   - what to do              <- this rule's decision, against its siblings';
//   - when it is different    <- the rule's own exceptions, whose `note` is
//     already a written distinguishing condition.
//
// The last one is what makes a generated exercise able to catch a
// contradiction at all, and it is why a pill with no exceptions produces no
// contradiction beat rather than a faked one.
//
// Everything here is deterministic and ordered: the same pill produces the
// same exercise every time, because a demo that asks different questions on
// the second run is a bug.

import type { EvidenceCatalog, Rule } from '@/lib/engine/types';
import type { Choice, Exercise, Question } from './exercise';
import type { ClaimMeaning } from './meaning';

/** Enough choices to be a question, few enough to read on a phone. */
const MAX_CHOICES = 5;
/** Deadline options offered when the pill itself has few distinct ones. */
const FALLBACK_DEADLINES = [15, 30, 60];

export interface GenerateInput {
  pillId: string;
  /** The rule being elicited. */
  rule: Rule;
  /** The pill's other rules: where every distractor comes from. */
  siblings: readonly Rule[];
  evidence: EvidenceCatalog;
  scenarioId: string;
}

function label(evidence: EvidenceCatalog, key: string): string {
  return evidence[key]?.label ?? key.replace(/_/g, ' ');
}

/** Stable, readable, and unique within a question. */
function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

function choice(id: string, text: string, claim: string, means?: ClaimMeaning): Choice {
  return means ? { id, label: text, claim, means } : { id, label: text, claim };
}

/** First sentence, so a decision reads as an option rather than a paragraph. */
function firstSentence(text: string, cap = 150): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  const stop = collapsed.indexOf('. ');
  const sentence = stop > 20 ? collapsed.slice(0, stop + 1) : collapsed;
  return sentence.length > cap ? `${sentence.slice(0, cap - 1).trimEnd()}…` : sentence;
}

/** Deterministic pick of up to `n` items not already present. */
function distractors<T>(pool: readonly T[], exclude: ReadonlySet<string>, key: (item: T) => string, n: number): T[] {
  const out: T[] = [];
  const seen = new Set(exclude);
  for (const item of pool) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
    if (out.length >= n) break;
  }
  return out;
}

function evidenceQuestion(input: GenerateInput): Question | null {
  const { rule, siblings, evidence } = input;
  const required = rule.required_evidence;
  if (required.length === 0) return null;

  const wrong = distractors(
    siblings.flatMap((sibling) => sibling.required_evidence),
    new Set(required),
    (key) => key,
    Math.max(1, MAX_CHOICES - required.length),
  );

  return {
    id: 'g-evidence',
    kind: 'multi_choice',
    covers: 'required_evidence',
    prompt: 'Before anyone acts on this, what has to be confirmed? Pick everything that must be true.',
    choices: [
      ...required.map((key) =>
        choice(key, label(evidence, key), `ev:${key}`, { part: 'required_evidence', evidenceKey: key }),
      ),
      // A wrong option carries its part but no key, so picking it answers the
      // question and adds no gate — which is exactly what it should do.
      ...wrong.map((key) => choice(key, label(evidence, key), `ev:${key}`, { part: 'required_evidence' })),
    ],
  };
}

function forbiddenQuestion(input: GenerateInput): Question | null {
  const { rule } = input;
  if (rule.forbidden_actions.length === 0) return null;
  const forbidden = rule.forbidden_actions.slice(0, 3);
  const allowed = rule.allowed_actions.slice(0, Math.max(1, MAX_CHOICES - forbidden.length));
  if (allowed.length === 0) return null;

  return {
    id: 'g-forbidden',
    kind: 'multi_choice',
    covers: 'forbidden_actions',
    prompt: 'Under pressure, and late at night. Which of these must still not happen?',
    choices: [
      ...forbidden.map((action) =>
        choice(slug(action), action, `forbid:${slug(action)}`, { part: 'forbidden_actions', text: action }),
      ),
      // The pill says these are allowed, so they are wrong answers here and
      // nobody had to make them up.
      ...allowed.map((action) => choice(slug(action), action, `allow:${slug(action)}`, { part: 'forbidden_actions' })),
    ],
  };
}

function escalateQuestion(input: GenerateInput): Question {
  const { rule, siblings } = input;
  const role = rule.escalate_to.role;
  const others = distractors(
    [
      ...(rule.escalate_to.fallback ? [rule.escalate_to.fallback] : []),
      ...siblings.map((sibling) => sibling.escalate_to.role),
    ],
    new Set([role]),
    (r) => r,
    MAX_CHOICES - 1,
  );
  const roleLabel = (value: string) => value.replace(/_/g, ' ');
  return {
    id: 'g-escalate',
    kind: 'single_choice',
    covers: 'escalate_to',
    prompt: 'Whose sign-off does this need? Not who you would phone — whose name has to be on it.',
    choices: [role, ...others].map((value) =>
      choice(value, roleLabel(value), `signoff:${value}`, { part: 'escalate_to', role: value }),
    ),
  };
}

function deadlineQuestion(input: GenerateInput): Question {
  const { rule, siblings } = input;
  const fromPill = [rule, ...siblings]
    .map((r) => r.deadline_minutes)
    .filter((minutes): minutes is number => typeof minutes === 'number');
  const options = [...new Set([...fromPill, ...FALLBACK_DEADLINES])].sort((a, b) => a - b).slice(0, MAX_CHOICES - 1);
  return {
    id: 'g-deadline',
    kind: 'single_choice',
    covers: 'deadline_minutes',
    prompt: 'How long before this stops being yours and has to go up?',
    choices: [
      ...options.map((minutes) =>
        choice(String(minutes), `${minutes} minutes`, `deadline:${minutes}`, {
          part: 'deadline_minutes',
          minutes,
        }),
      ),
      choice('none', 'No fixed clock — judgement', 'deadline:none', { part: 'deadline_minutes', minutes: null }),
    ],
  };
}

function decisionQuestion(input: GenerateInput): Question {
  const { rule, siblings } = input;
  const wrong = distractors(siblings, new Set([rule.id]), (sibling) => sibling.id, MAX_CHOICES - 1);
  return {
    id: 'g-decision',
    kind: 'single_choice',
    covers: 'decision',
    prompt: 'First call. What do you actually do?',
    choices: [rule, ...wrong].map((candidate) =>
      choice(candidate.id, firstSentence(candidate.decision), `decision:${candidate.id}`, {
        part: 'decision',
        text: firstSentence(candidate.decision, 400),
      }),
    ),
  };
}

/**
 * The refinement that can produce a disagreement: the rule's own exception,
 * whose note is already a written distinguishing condition. Null when the rule
 * has no exceptions — a pill with none gets no contradiction beat, rather than
 * a manufactured one.
 */
function exceptionQuestion(input: GenerateInput): Question | null {
  const exception = input.rule.exceptions.find((candidate) => candidate.note?.trim());
  if (!exception) return null;
  return {
    id: 'g-exception-case',
    kind: 'single_choice',
    covers: 'decision',
    refines: true,
    given: exception.note,
    prompt: 'Different night, and this is true instead. Is it still the same call?',
    choices: [
      choice('same', 'Yes — same call', `decision:${input.rule.id}`, {
        part: 'decision',
        text: firstSentence(input.rule.decision, 400),
      }),
      choice('different', 'No — this one is different', `decision:exception:${input.rule.id}`, {
        part: 'decision',
        text: `${firstSentence(input.rule.decision, 300)} — except where ${exception.note}`,
      }),
    ],
  };
}

/** Asked only once two answers disagree, so it records the condition that keeps both. */
function resolutionQuestionFor(): Question {
  return {
    id: 'g-exception',
    kind: 'open',
    covers: 'exceptions',
    onContradictionOnly: true,
    prompt:
      'Both of those are things you have said, and neither is wrong. What is the condition that tells them apart?',
  };
}

/**
 * The exercise a pill can answer for itself.
 *
 * Returns null when the rule is too thin to ask anything useful about — better
 * an honest absence than four questions nobody can learn from.
 */
export function exerciseFromPill(input: GenerateInput): Exercise | null {
  const questions = [
    decisionQuestion(input),
    evidenceQuestion(input),
    escalateQuestion(input),
    deadlineQuestion(input),
    forbiddenQuestion(input),
    exceptionQuestion(input),
    resolutionQuestionFor(),
  ].filter((question): question is Question => question !== null);

  // Three real questions plus the opening is the floor for this being worth
  // anyone's time; below that the pill has not got enough in it.
  const answerable = questions.filter((question) => !question.onContradictionOnly);
  if (answerable.length < 3) return null;

  return {
    pillId: input.pillId,
    scenarioId: input.scenarioId,
    incidentType: input.rule.trigger.incident_type,
    ruleId: input.rule.id,
    opening: {
      id: 'g-account',
      kind: 'open',
      covers: 'trigger',
      prompt:
        'Walk me through what you do, and why — from the first moment you hear about it. Do not tidy it up; the order you actually did things in is the part I want.',
      given: `This is about ${input.rule.title.toLowerCase()}.`,
    },
    questions,
  };
}
