// The exercise engine: what gets asked next, and how a disagreement is found.
//
// The load-bearing claim of this design is that a contradiction is computable
// from structured answers rather than reported by a model. Most of these pin
// that: same field + different claims = disagreement, and nothing else is.

import { describe, expect, it } from 'vitest';
import {
  claimsFrom,
  coveredParts,
  exerciseSchema,
  findContradiction,
  MIN_OPEN_CHARS,
  nextQuestion,
  openParts,
  progress,
  questionSchema,
  type Answer,
  type Exercise,
} from '../exercise';

const OPENING = {
  id: 'open-1',
  kind: 'open' as const,
  covers: 'trigger' as const,
  prompt: 'Walk me through what you do, and why.',
};

/** The riser/sub-valve pair the recorded call needed a model to notice. */
const ISOLATE_DEFAULT = {
  id: 'q-isolate',
  kind: 'single_choice' as const,
  covers: 'decision' as const,
  prompt: 'What do you isolate?',
  choices: [
    { id: 'riser', label: 'The whole riser', claim: 'isolate:riser' },
    { id: 'floor', label: 'The floor valve', claim: 'isolate:floor' },
    { id: 'sub', label: 'The sub-valve', claim: 'isolate:sub_valve' },
  ],
};

const ISOLATE_BRANCH = {
  id: 'q-isolate-branch',
  kind: 'single_choice' as const,
  covers: 'decision' as const,
  prompt: 'And here?',
  given: 'An AHU branch leak, sub-valve accessible and reachable.',
  choices: [
    { id: 'riser', label: 'The whole riser', claim: 'isolate:riser' },
    { id: 'sub', label: 'The sub-valve', claim: 'isolate:sub_valve' },
  ],
};

const LEW = {
  id: 'q-lew',
  kind: 'true_false' as const,
  covers: 'required_evidence' as const,
  prompt: 'An LEW must test insulation resistance before re-energising.',
  choices: [
    { id: 'true', label: 'True', claim: 'ir_test:required' },
    { id: 'false', label: 'False', claim: 'ir_test:not_required' },
  ],
};

const WHO = {
  id: 'q-who',
  kind: 'single_choice' as const,
  covers: 'escalate_to' as const,
  prompt: 'Whose sign-off does re-energising need?',
  choices: [
    { id: 'lew', label: 'The duty LEW', claim: 'signoff:lew' },
    { id: 'ce', label: 'The chief engineer', claim: 'signoff:chief_engineer' },
  ],
};

const DEADLINE = {
  id: 'q-deadline',
  kind: 'single_choice' as const,
  covers: 'deadline_minutes' as const,
  prompt: 'How long before this has to be escalated?',
  choices: [
    { id: '30', label: 'Thirty minutes', claim: 'deadline:30' },
    { id: '60', label: 'An hour', claim: 'deadline:60' },
  ],
};

const EXERCISE: Exercise = {
  pillId: 'technical-services-chilled-water-leak',
  scenarioId: 'hf1-l28-coupling',
  incidentType: 'water_ingress',
  opening: OPENING,
  questions: [ISOLATE_DEFAULT, LEW, WHO, DEADLINE, ISOLATE_BRANCH],
};

function answer(questionId: string, choiceIds: string[], at: number): Answer {
  return { questionId, choiceIds, at };
}

const LONG_ENOUGH = 'x'.repeat(MIN_OPEN_CHARS);

describe('the authored shape', () => {
  it('accepts the exercise', () => {
    expect(exerciseSchema.safeParse(EXERCISE).success).toBe(true);
  });

  it('refuses a choice question with nothing to choose', () => {
    expect(questionSchema.safeParse({ ...ISOLATE_DEFAULT, choices: [ISOLATE_DEFAULT.choices[0]] }).success).toBe(false);
  });

  it('refuses choices on an open question, which would make it two things at once', () => {
    expect(questionSchema.safeParse({ ...OPENING, choices: ISOLATE_DEFAULT.choices }).success).toBe(false);
  });

  it('refuses a true/false with three answers', () => {
    expect(
      questionSchema.safeParse({ ...LEW, choices: [...LEW.choices, { id: 'x', label: 'Maybe' }] }).success,
    ).toBe(false);
  });

  it('refuses duplicate choice ids, which would make an answer ambiguous', () => {
    expect(
      questionSchema.safeParse({
        ...ISOLATE_DEFAULT,
        choices: [ISOLATE_DEFAULT.choices[0], { ...ISOLATE_DEFAULT.choices[1], id: 'riser' }],
      }).success,
    ).toBe(false);
  });

  it('refuses a part that is not a Rule field', () => {
    expect(questionSchema.safeParse({ ...ISOLATE_DEFAULT, covers: 'vibes' }).success).toBe(false);
  });
});

describe('coverage', () => {
  it('starts with everything open', () => {
    expect(coveredParts(EXERCISE, []).size).toBe(0);
    expect(openParts(EXERCISE, [])).toContain('decision');
  });

  it('does not count a blank open answer as an account of anything', () => {
    const covered = coveredParts(EXERCISE, [{ questionId: 'open-1', choiceIds: [], text: '   ', at: 1 }]);
    expect(covered.size).toBe(0);
  });

  it('does not count an open answer too short to be an account', () => {
    const short = 'x'.repeat(MIN_OPEN_CHARS - 1);
    expect(coveredParts(EXERCISE, [{ questionId: 'open-1', choiceIds: [], text: short, at: 1 }]).size).toBe(0);
  });

  it('counts a real open answer', () => {
    expect(
      coveredParts(EXERCISE, [{ questionId: 'open-1', choiceIds: [], text: LONG_ENOUGH, at: 1 }]),
    ).toEqual(new Set(['trigger']));
  });

  it('counts a tapped choice', () => {
    expect(coveredParts(EXERCISE, [answer('q-lew', ['true'], 1)])).toEqual(new Set(['required_evidence']));
  });

  it('ignores an answer to a question this exercise does not contain', () => {
    expect(coveredParts(EXERCISE, [answer('q-from-another-pill', ['x'], 1)]).size).toBe(0);
  });

  it('counts parts, not questions: two questions on one part cover it once', () => {
    const covered = coveredParts(EXERCISE, [answer('q-isolate', ['riser'], 1), answer('q-isolate-branch', ['sub'], 2)]);
    expect(covered).toEqual(new Set(['decision']));
  });

  it('reports progress out of the parts some question can actually close', () => {
    const { of } = progress(EXERCISE, []);
    // trigger, decision, required_evidence, escalate_to, deadline_minutes
    expect(of).toBe(5);
    expect(progress(EXERCISE, [answer('q-lew', ['true'], 1)]).done).toBe(1);
  });
});

describe('nextQuestion', () => {
  it('opens wide, before anything else', () => {
    expect(nextQuestion(EXERCISE, [])?.id).toBe('open-1');
  });

  it('asks an essential part before a merely useful one', () => {
    const after = [{ questionId: 'open-1', choiceIds: [], text: LONG_ENOUGH, at: 1 }];
    // deadline_minutes is not essential, so it is not what comes next.
    expect(nextQuestion(EXERCISE, after)?.covers).not.toBe('deadline_minutes');
    expect(['decision', 'required_evidence', 'escalate_to']).toContain(nextQuestion(EXERCISE, after)?.covers);
  });

  it('never asks about a part the opening answer already settled', () => {
    const answers = [
      { questionId: 'open-1', choiceIds: [], text: LONG_ENOUGH, at: 1 },
      answer('q-isolate', ['riser'], 2),
      answer('q-lew', ['true'], 3),
      answer('q-who', ['lew'], 4),
    ];
    expect(nextQuestion(EXERCISE, answers)?.covers).toBe('deadline_minutes');
  });

  it('stops when there is nothing left to learn', () => {
    const answers = [
      { questionId: 'open-1', choiceIds: [], text: LONG_ENOUGH, at: 1 },
      answer('q-isolate', ['riser'], 2),
      answer('q-lew', ['true'], 3),
      answer('q-who', ['lew'], 4),
      answer('q-deadline', ['30'], 5),
    ];
    expect(nextQuestion(EXERCISE, answers)).toBeNull();
  });
});

describe('findContradiction', () => {
  it('finds nothing when nothing has been said', () => {
    expect(findContradiction(EXERCISE, [])).toBeNull();
  });

  it('finds nothing when two answers agree', () => {
    const answers = [answer('q-isolate', ['riser'], 1), answer('q-isolate-branch', ['riser'], 2)];
    expect(findContradiction(EXERCISE, answers)).toBeNull();
  });

  it('finds the riser/sub-valve disagreement without a model', () => {
    const found = findContradiction(EXERCISE, [
      answer('q-isolate', ['riser'], 1),
      answer('q-isolate-branch', ['sub'], 2),
    ]);
    expect(found?.part).toBe('decision');
    expect(found?.earlier.claim).toBe('isolate:riser');
    expect(found?.later.claim).toBe('isolate:sub_valve');
  });

  it('takes the distinguishing condition from the later question, never inventing one', () => {
    const found = findContradiction(EXERCISE, [
      answer('q-isolate', ['riser'], 1),
      answer('q-isolate-branch', ['sub'], 2),
    ]);
    expect(found?.distinguishingCondition).toBe(ISOLATE_BRANCH.given);
  });

  it('reports null rather than a guess when the later question gave no condition', () => {
    const bare: Exercise = {
      ...EXERCISE,
      questions: [ISOLATE_DEFAULT, { ...ISOLATE_BRANCH, given: undefined }],
    };
    const found = findContradiction(bare, [answer('q-isolate', ['riser'], 1), answer('q-isolate-branch', ['sub'], 2)]);
    expect(found).not.toBeNull();
    expect(found?.distinguishingCondition).toBeNull();
  });

  it('keeps the earlier statement earlier, whatever order the answers arrive in', () => {
    const found = findContradiction(EXERCISE, [
      answer('q-isolate-branch', ['sub'], 9),
      answer('q-isolate', ['riser'], 1),
    ]);
    expect(found?.earlier.claim).toBe('isolate:riser');
  });

  it('does not call two parts of one multi-choice answer a disagreement', () => {
    const multi: Exercise = {
      ...EXERCISE,
      questions: [
        {
          id: 'q-evidence',
          kind: 'multi_choice',
          covers: 'required_evidence' as const,
          prompt: 'Which must be confirmed?',
          choices: [
            { id: 'lew', label: 'LEW sign-off', claim: 'ev:lew' },
            { id: 'dry', label: 'Area dry', claim: 'ev:dry' },
          ],
        },
      ],
    };
    expect(findContradiction(multi, [answer('q-evidence', ['lew', 'dry'], 1)])).toBeNull();
  });

  it('treats a choice that asserts nothing as no disagreement', () => {
    const depends: Exercise = {
      ...EXERCISE,
      questions: [
        ISOLATE_DEFAULT,
        {
          ...ISOLATE_BRANCH,
          choices: [{ id: 'depends', label: 'It depends' }, { id: 'sub', label: 'The sub-valve' }],
        },
      ],
    };
    expect(
      findContradiction(depends, [answer('q-isolate', ['riser'], 1), answer('q-isolate-branch', ['depends'], 2)]),
    ).toBeNull();
  });

  it('never contradicts across different fields of a rule', () => {
    const answers = [answer('q-isolate', ['riser'], 1), answer('q-who', ['ce'], 2)];
    expect(findContradiction(EXERCISE, answers)).toBeNull();
  });
});

describe('claimsFrom', () => {
  it('carries the words the person chose, so both halves can be shown', () => {
    const claims = claimsFrom(EXERCISE, [answer('q-isolate', ['riser'], 1)]);
    expect(claims).toHaveLength(1);
    expect(claims[0].label).toBe('The whole riser');
  });

  it('returns claims oldest first', () => {
    const claims = claimsFrom(EXERCISE, [answer('q-who', ['lew'], 5), answer('q-isolate', ['riser'], 1)]);
    expect(claims.map((c) => c.at)).toEqual([1, 5]);
  });
});
