// The shipped exercise, held to the contract and to the pill it claims to teach.

import { describe, expect, it } from 'vitest';
import { loadPill } from '@/lib/pills/load';
import { PROBE_IDS } from '@/lib/llm/interview';
import { RULE_PARTS } from '../parts';
import { exercisePillIds, loadExercise } from '../load';
import { findContradiction, nextQuestion, progress, resolutionQuestion, type Answer } from '../exercise';

const PILL_ID = 'technical-services-chilled-water-leak';

describe('the shipped exercise', () => {
  it('parses', () => {
    expect(loadExercise(PILL_ID)).not.toBeNull();
  });

  it('derives an exercise for a pill nobody wrote questions for', () => {
    const loaded = loadExercise('tenant-experience-incident-comms');
    expect(loaded?.origin).toBe('generated');
    expect(loaded!.exercise.questions.length).toBeGreaterThan(2);
  });

  it('says the shipped one was authored, so the screen can tell them apart', () => {
    expect(loadExercise(PILL_ID)?.origin).toBe('authored');
  });

  it('is null for a pill that does not exist, rather than a guess', () => {
    expect(loadExercise('no-such-pill')).toBeNull();
  });

  it('can teach every pill in the repository', () => {
    const ids = exercisePillIds();
    expect(ids.length).toBeGreaterThan(1);
    for (const pillId of ids) expect(loadPill(pillId)).toBeDefined();
  });

  it('names only probes the interview library knows', () => {
    const exercise = loadExercise(PILL_ID)!.exercise;
    for (const question of [exercise.opening, ...exercise.questions]) {
      if (!question.probeId) continue;
      expect(PROBE_IDS).toContain(question.probeId);
    }
  });

  it('gives every question a distinct id', () => {
    const exercise = loadExercise(PILL_ID)!.exercise;
    const ids = [exercise.opening, ...exercise.questions].map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('opens with prose, because a tap is not an account', () => {
    expect(loadExercise(PILL_ID)!.exercise.opening.kind).toBe('open');
  });

  it('sets the scene on the opening question — judgement needs a situation', () => {
    expect(loadExercise(PILL_ID)!.exercise.opening.given?.length ?? 0).toBeGreaterThan(80);
  });

  it('reaches the parts without which no rule can be drafted', () => {
    const exercise = loadExercise(PILL_ID)!.exercise;
    const covered = new Set([exercise.opening, ...exercise.questions].map((q) => q.covers));
    for (const part of ['trigger', 'decision', 'required_evidence', 'escalate_to'] as const) {
      expect(covered).toContain(part);
    }
  });

  it('asks about every part it can, and nothing it cannot', () => {
    const exercise = loadExercise(PILL_ID)!.exercise;
    for (const question of [exercise.opening, ...exercise.questions]) {
      expect(RULE_PARTS).toContain(question.covers);
    }
  });

  it('gives each refinement something to pin inside a part it already touches', () => {
    const exercise = loadExercise(PILL_ID)!.exercise;
    const closing = new Set(exercise.questions.filter((q) => !q.refines).map((q) => q.covers));
    closing.add(exercise.opening.covers);
    for (const refinement of exercise.questions.filter((q) => q.refines)) {
      expect(closing).toContain(refinement.covers);
    }
  });
});

describe('walking the shipped exercise end to end', () => {
  const exercise = loadExercise(PILL_ID)!.exercise;

  /** Answers the way the recorded expert actually answered. */
  function answerAll(): Answer[] {
    const answers: Answer[] = [];
    let at = 1;
    const pick: Record<string, string[]> = {
      'q-isolate': ['riser'],
      'q-evidence': ['lew_signoff', 'insulation_resistance_ok', 'area_dry'],
      'q-who': ['duty_lew'],
      'q-forbidden': ['reset_breaker', 'visual_only', 'open_cupboard'],
      'q-deadline': ['30'],
      'q-threshold': ['2'],
      'q-isolate-branch': ['sub'],
    };
    for (let guard = 0; guard < 40; guard++) {
      const question = nextQuestion(exercise, answers);
      if (!question) break;
      answers.push(
        question.kind === 'open'
          ? { questionId: question.id, choiceIds: [], text: 'The coupling failed in the ceiling void and the water was tracking toward the riser cupboard, so I treated it as electrical.', at: at++ }
          : { questionId: question.id, choiceIds: pick[question.id] ?? [question.choices![0].id], at: at++ },
      );
    }
    // What the screen does once the questions run out: a disagreement raises
    // the resolution question, and answering it is what records the exception.
    const contradiction = findContradiction(exercise, answers);
    const resolution = resolutionQuestion(exercise);
    if (contradiction && resolution) {
      answers.push({
        questionId: resolution.id,
        choiceIds: [],
        text: contradiction.distinguishingCondition ?? 'The branch sub-valve is accessible and closing it stops the flow.',
        at: at++,
      });
    }
    return answers;
  }

  it('terminates — the exercise ends because nothing is left, not because it ran out', () => {
    const answers = answerAll();
    expect(nextQuestion(exercise, answers)).toBeNull();
    expect(answers.length).toBeLessThan(20);
  });

  it('closes every part it can reach', () => {
    const { done, of } = progress(exercise, answerAll());
    expect(done).toBe(of);
  });

  it('asks the open account first and the two-metre line only after', () => {
    const answers = answerAll();
    expect(answers[0].questionId).toBe('q-account');
    const threshold = answers.findIndex((a) => a.questionId === 'q-threshold');
    const essentials = answers.findIndex((a) => a.questionId === 'q-who');
    expect(threshold).toBeGreaterThan(essentials);
  });

  it('never volunteers the question only a contradiction can raise', () => {
    const answers: Answer[] = [];
    for (let guard = 0; guard < 40; guard++) {
      const question = nextQuestion(exercise, answers);
      if (!question) break;
      expect(question.id).not.toBe('q-exception');
      answers.push({
        questionId: question.id,
        choiceIds: question.kind === 'open' ? [] : [question.choices![0].id],
        text: question.kind === 'open' ? 'x'.repeat(80) : undefined,
        at: guard + 1,
      });
    }
  });

  it('leaves the exception open when nobody contradicted themselves', () => {
    const consistent: Answer[] = [
      { questionId: 'q-account', choiceIds: [], text: 'x'.repeat(80), at: 1 },
      { questionId: 'q-isolate', choiceIds: ['sub'], at: 2 },
      { questionId: 'q-isolate-branch', choiceIds: ['sub'], at: 3 },
    ];
    const { done, of } = progress(exercise, consistent);
    expect(done).toBeLessThan(of);
  });

  it('catches the riser/sub-valve contradiction, with the condition that keeps both', () => {
    const found = findContradiction(exercise, answerAll());
    expect(found?.part).toBe('decision');
    expect(found?.earlier.claim).toBe('isolate:riser');
    expect(found?.later.claim).toBe('isolate:sub_valve');
    expect(found?.distinguishingCondition).toMatch(/sub-valve is accessible/i);
  });

  it('finds no contradiction from a consistent expert', () => {
    const consistent: Answer[] = [
      { questionId: 'q-account', choiceIds: [], text: 'x'.repeat(80), at: 1 },
      { questionId: 'q-isolate', choiceIds: ['sub'], at: 2 },
      { questionId: 'q-isolate-branch', choiceIds: ['sub'], at: 3 },
    ];
    expect(findContradiction(exercise, consistent)).toBeNull();
  });
});
