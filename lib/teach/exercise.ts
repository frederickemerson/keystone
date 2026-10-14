// The elicitation exercise: one open question, then only what is still missing.
//
// What changed and why. The old shape was a 31-probe script played in order,
// which meant the expert answered questions the system already had answers to,
// and the screen could not say what was still unknown. Here the first question
// is deliberately wide — "walk me through it" — because one unprompted account
// gives up more than ten narrow questions do, and everything after it is
// chosen by what that account did NOT settle (lib/teach/parts).
//
// The second change is the shape of an answer. A choice carries a `claim`: a
// short comparable token saying what picking it asserts about one field of a
// rule. That turns an answer into a structured signal instead of prose to be
// parsed, which has two consequences worth the whole design:
//
//   - a rule drafted from a choice needs no extraction at all, so there is
//     nothing for a model to get wrong; and
//   - a CONTRADICTION becomes arithmetic. Two answers about the same field
//     with different claims disagree, and `findContradiction` finds it by
//     comparing two strings. The recorded call needed a model to notice the
//     riser/sub-valve conflict and a guard to check it had not invented the
//     quotes. Here the engine simply knows.
//
// Free-text answers still need extraction and still go through that guard;
// `claim` is left undefined for them, and an undefined claim never contradicts
// anything, because "he has not said yet" is not disagreement.

import { z } from '@/lib/zod';
import { ESSENTIAL_PARTS, isRulePart, RULE_PARTS, type RulePart } from './parts';

/**
 * How a question is answered.
 *
 * `open` is prose. The other three are a tap, which is the point: an expert on
 * a walkway answers a true/false in two seconds and an essay never.
 */
export const QUESTION_KINDS = ['open', 'single_choice', 'multi_choice', 'true_false'] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const choiceSchema = z.object({
  id: z.string().trim().min(1),
  /** What the person reads. */
  label: z.string().trim().min(1).max(200),
  /**
   * What picking this asserts, as a comparable token (e.g. "isolate:riser").
   * Two different claims about one part are a disagreement; omit it when a
   * choice asserts nothing, such as "it depends".
   */
  claim: z.string().trim().min(1).max(80).optional(),
  /** Shown after answering, never before: why this is or is not the usual call. */
  note: z.string().trim().max(400).optional(),
});

export type Choice = z.infer<typeof choiceSchema>;

export const questionSchema = z
  .object({
    id: z.string().trim().min(1),
    kind: z.enum(QUESTION_KINDS),
    /** The Rule field this closes. */
    covers: z.string().refine(isRulePart, 'not a rule part'),
    prompt: z.string().trim().min(8).max(600),
    /** Scenario detail this question adds, which is often the distinguishing condition. */
    given: z.string().trim().max(400).optional(),
    /** The CDM/ACTA probe this corresponds to, where one does (lib/llm/interview PROBE_IDS). */
    probeId: z.string().trim().max(20).optional(),
    choices: z.array(choiceSchema).max(8).optional(),
    /**
     * Pins a value inside a part the account has already touched, rather than
     * closing an empty part. "Water was near the board" covers the trigger;
     * "how near is too near?" is still unknown, and it is the whole rule. So a
     * refinement is asked AFTER every empty part is closed, and never instead
     * of one.
     */
    refines: z.boolean().optional(),
    /**
     * Never volunteered. Only the contradiction flow raises this one, because
     * asking "what separates the two cases?" before there are two cases is
     * nonsense.
     */
    onContradictionOnly: z.boolean().optional(),
  })
  .superRefine((question, ctx) => {
    const needsChoices = question.kind !== 'open';
    if (needsChoices && (!question.choices || question.choices.length < 2)) {
      ctx.addIssue({ code: 'custom', message: `${question.kind} needs at least two choices`, path: ['choices'] });
    }
    if (!needsChoices && question.choices?.length) {
      ctx.addIssue({ code: 'custom', message: 'an open question has no choices', path: ['choices'] });
    }
    if (question.kind === 'true_false' && question.choices?.length !== 2) {
      ctx.addIssue({ code: 'custom', message: 'true/false has exactly two choices', path: ['choices'] });
    }
    const ids = question.choices?.map((c) => c.id) ?? [];
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'choice ids must be distinct', path: ['choices'] });
    }
    if (question.refines && question.onContradictionOnly) {
      ctx.addIssue({
        code: 'custom',
        message: 'a question is either a refinement the exercise volunteers or one only a contradiction raises, not both',
        path: ['refines'],
      });
    }
  });

export type Question = z.infer<typeof questionSchema>;

export const exerciseSchema = z.object({
  pillId: z.string().trim().min(1),
  /** The situation the whole exercise is about. Judgement only shows up against a case. */
  scenarioId: z.string().trim().min(1),
  /** Asked first, and deliberately wide. */
  opening: questionSchema,
  questions: z.array(questionSchema).min(1),
});

export type Exercise = z.infer<typeof exerciseSchema>;

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

export interface Answer {
  questionId: string;
  /** Chosen choice ids; empty for an open answer. */
  choiceIds: string[];
  /** Prose, for an open answer. */
  text?: string;
  /** When it was given, for ordering a contradiction's two halves. */
  at: number;
}

/** One claim a person has made about one field of a rule. */
export interface Claim {
  part: RulePart;
  questionId: string;
  choiceId: string;
  claim: string;
  /** The words the person actually chose, for showing both halves side by side. */
  label: string;
  /** Scenario detail the question added — usually the condition that separates the cases. */
  given?: string;
  at: number;
}

function questionsById(exercise: Exercise): Map<string, Question> {
  return new Map([exercise.opening, ...exercise.questions].map((q) => [q.id, q]));
}

/**
 * Every claim the answers make, oldest first.
 *
 * An answer to a question nobody asked is dropped rather than trusted: answers
 * can come from a stored session, and a questionId that is not in this
 * exercise is not something a person chose here.
 */
export function claimsFrom(exercise: Exercise, answers: readonly Answer[]): Claim[] {
  const byId = questionsById(exercise);
  const claims: Claim[] = [];
  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    if (!question || !isRulePart(question.covers)) continue;
    for (const choiceId of answer.choiceIds) {
      const choice = question.choices?.find((c) => c.id === choiceId);
      if (!choice?.claim) continue;
      claims.push({
        part: question.covers,
        questionId: question.id,
        choiceId,
        claim: choice.claim,
        label: choice.label,
        given: question.given,
        at: answer.at,
      });
    }
  }
  return claims.sort((a, b) => a.at - b.at);
}

/**
 * Which fields of a rule the answers have settled.
 *
 * An open answer counts as covering its part only when it actually says
 * something — `MIN_OPEN_CHARS` of it. A blank textarea that was submitted is
 * not an account of an incident, and treating it as one is how a coverage
 * board comes to show green over nothing.
 */
export const MIN_OPEN_CHARS = 40;

export function coveredParts(exercise: Exercise, answers: readonly Answer[]): Set<RulePart> {
  const byId = questionsById(exercise);
  const covered = new Set<RulePart>();
  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    if (!question || !isRulePart(question.covers)) continue;
    const said =
      question.kind === 'open'
        ? (answer.text ?? '').trim().length >= MIN_OPEN_CHARS
        : answer.choiceIds.length > 0;
    if (said) covered.add(question.covers);
  }
  return covered;
}

/** A part with nothing against it yet, in RULE_PARTS order so the board never reshuffles. */
export function openParts(exercise: Exercise, answers: readonly Answer[]): RulePart[] {
  const covered = coveredParts(exercise, answers);
  return RULE_PARTS.filter((part) => !covered.has(part));
}

/**
 * The next question worth asking: one that closes a part nothing has answered
 * yet, essentials before the rest, and never one already answered.
 *
 * Returns null when every part a question could close is closed — which is the
 * whole point of the redesign. The exercise ends because there is nothing left
 * to learn, not because the script ran out.
 */
export function nextQuestion(exercise: Exercise, answers: readonly Answer[]): Question | null {
  const answered = new Set(answers.map((a) => a.questionId));
  if (!answered.has(exercise.opening.id)) return exercise.opening;

  const covered = coveredParts(exercise, answers);
  const pending = exercise.questions.filter((q) => !answered.has(q.id) && !q.onContradictionOnly);

  // An empty part first, essentials before the rest; then the refinements.
  const closing = pending.filter((q) => !q.refines && !covered.has(q.covers as RulePart));
  const essential = closing.find((q) => ESSENTIAL_PARTS.includes(q.covers as RulePart));
  if (essential) return essential;
  if (closing[0]) return closing[0];
  return pending.find((q) => q.refines) ?? null;
}

/** The question that asks what separates two cases, raised only once they exist. */
export function resolutionQuestion(exercise: Exercise): Question | null {
  return exercise.questions.find((q) => q.onContradictionOnly && q.covers === 'exceptions') ?? null;
}

/** How far through, for the board. `of` counts only parts some question can close. */
export function progress(exercise: Exercise, answers: readonly Answer[]): { done: number; of: number } {
  const reachable = new Set<RulePart>(
    [exercise.opening, ...exercise.questions]
      .map((q) => q.covers)
      .filter(isRulePart),
  );
  const covered = coveredParts(exercise, answers);
  return {
    done: [...covered].filter((part) => reachable.has(part)).length,
    of: reachable.size,
  };
}

// ---------------------------------------------------------------------------
// Disagreement
// ---------------------------------------------------------------------------

export interface Contradiction {
  part: RulePart;
  /** The earlier claim, generalised by the resolution. */
  earlier: Claim;
  /** The later claim, made specific by the resolution. */
  later: Claim;
  /**
   * The condition that lets both stand, taken from the later question's own
   * `given` when it has one. Null means the exercise has to ask for it —
   * it is never guessed, because guessing it is how one of the two
   * statements quietly gets thrown away.
   */
  distinguishingCondition: string | null;
}

/**
 * The first disagreement among the claims: two answers about the same field of
 * a rule that assert different things.
 *
 * Oldest-first order matters. The resolution keeps BOTH statements by making
 * the earlier one the general case and the later one the special case, so
 * which came first is part of the answer, not a detail.
 */
export function findContradiction(exercise: Exercise, answers: readonly Answer[]): Contradiction | null {
  const claims = claimsFrom(exercise, answers);
  const byPart = new Map<RulePart, Claim[]>();
  for (const claim of claims) byPart.set(claim.part, [...(byPart.get(claim.part) ?? []), claim]);

  for (const part of RULE_PARTS) {
    const forPart = byPart.get(part) ?? [];
    for (let i = 0; i < forPart.length; i++) {
      for (let j = i + 1; j < forPart.length; j++) {
        const earlier = forPart[i];
        const later = forPart[j];
        // Same question answered multi-choice is a list, not a disagreement.
        if (earlier.questionId === later.questionId) continue;
        if (earlier.claim === later.claim) continue;
        return {
          part,
          earlier,
          later,
          distinguishingCondition: later.given ?? null,
        };
      }
    }
  }
  return null;
}
