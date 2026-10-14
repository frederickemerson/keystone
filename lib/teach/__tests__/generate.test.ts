// The generated exercise, held to the pill it came from.
//
// The claim this file defends is "point it at any pill and it works". So these
// run against the REAL pills in the repository rather than a fixture: a rule
// whose shape the generator cannot handle is a failing test here, not a blank
// screen later.
//
// The thing most worth pinning is where the wrong answers come from. A
// distractor that was invented is a distractor that can be subtly true, and
// then the exercise teaches the wrong thing. Every one of them is lifted from
// the pill's own content, and that is checked below.

import { describe, expect, it } from 'vitest';
import { listPillRefs, loadPill } from '@/lib/pills/load';
import { exerciseSchema, findContradiction, nextQuestion, type Answer } from '../exercise';
import { exerciseFromPill } from '../generate';
import { loadExercise } from '../load';

const TENANT = 'tenant-experience-incident-comms';

function generateFor(pillId: string) {
  const bundle = loadPill(pillId)!;
  const rules = bundle.pill.rules;
  const rule = rules.find((r) => r.exceptions.some((e) => e.note?.trim())) ?? rules[0];
  return {
    rule,
    exercise: exerciseFromPill({
      pillId,
      rule,
      siblings: rules.filter((r) => r.id !== rule.id),
      evidence: bundle.pill.evidenceCatalog,
      scenarioId: 'pill-rule',
    }),
  };
}

describe('every pill in the repository', () => {
  const ids = listPillRefs().map((ref) => ref.id);

  it('has more than one, or this proves nothing', () => {
    expect(ids.length).toBeGreaterThan(1);
  });

  for (const pillId of ids) {
    it(`produces a valid exercise for ${pillId}`, () => {
      const loaded = loadExercise(pillId);
      expect(loaded).not.toBeNull();
      expect(exerciseSchema.safeParse(loaded!.exercise).success).toBe(true);
    });

    it(`asks ${pillId} about the parts without which no rule can be drafted`, () => {
      const { exercise } = loadExercise(pillId)!;
      const covered = new Set([exercise.opening, ...exercise.questions].map((q) => q.covers));
      expect(covered).toContain('decision');
      expect(covered).toContain('escalate_to');
    });

    it(`terminates for ${pillId} — it ends because nothing is left`, () => {
      const { exercise } = loadExercise(pillId)!;
      const answers: Answer[] = [];
      for (let guard = 0; guard < 40; guard++) {
        const question = nextQuestion(exercise, answers);
        if (!question) break;
        answers.push({
          questionId: question.id,
          choiceIds: question.kind === 'open' ? [] : [question.choices![0].id],
          text: question.kind === 'open' ? 'x'.repeat(80) : undefined,
          at: guard + 1,
        });
      }
      expect(nextQuestion(exercise, answers)).toBeNull();
      expect(answers.length).toBeLessThan(20);
    });
  }
});

describe('where the wrong answers come from', () => {
  const { rule, exercise } = generateFor(TENANT);
  const bundle = loadPill(TENANT)!;

  it('generates at all for a pill nobody authored questions for', () => {
    expect(exercise).not.toBeNull();
  });

  it('offers this rule’s required evidence as the right answers', () => {
    const question = exercise!.questions.find((q) => q.id === 'g-evidence')!;
    const withKeys = question.choices!.filter((c) => c.means?.evidenceKey).map((c) => c.means!.evidenceKey);
    expect([...withKeys].sort()).toEqual([...rule.required_evidence].sort());
  });

  it('takes every evidence distractor from the pill, never from thin air', () => {
    const question = exercise!.questions.find((q) => q.id === 'g-evidence')!;
    const declared = new Set(Object.keys(bundle.pill.evidenceCatalog));
    for (const choice of question.choices!) {
      expect(declared).toContain(choice.id);
    }
  });

  it('gives a wrong evidence option no key, so picking it adds no gate', () => {
    const question = exercise!.questions.find((q) => q.id === 'g-evidence')!;
    const wrong = question.choices!.filter((c) => !rule.required_evidence.includes(c.id));
    expect(wrong.length).toBeGreaterThan(0);
    for (const choice of wrong) expect(choice.means?.evidenceKey).toBeUndefined();
  });

  it('uses the rule’s own allowed_actions as the wrong answers for "must not do"', () => {
    const question = exercise!.questions.find((q) => q.id === 'g-forbidden');
    if (!question) return;
    const labels = question.choices!.map((c) => c.label);
    for (const allowed of rule.allowed_actions.slice(0, 2)) {
      if (labels.includes(allowed)) {
        const choice = question.choices!.find((c) => c.label === allowed)!;
        // The pill says this one is allowed, so it must contribute nothing.
        expect(choice.means?.text).toBeUndefined();
      }
    }
    for (const forbidden of rule.forbidden_actions.slice(0, 3)) {
      const choice = question.choices!.find((c) => c.label === forbidden);
      expect(choice?.means?.text).toBe(forbidden);
    }
  });

  it('offers the rule’s escalation role, among roles the pill actually uses', () => {
    const question = exercise!.questions.find((q) => q.id === 'g-escalate')!;
    const roles = question.choices!.map((c) => c.means?.role);
    expect(roles).toContain(rule.escalate_to.role);
    const used = new Set([
      ...bundle.pill.rules.map((r) => r.escalate_to.role),
      ...bundle.pill.rules.flatMap((r) => (r.escalate_to.fallback ? [r.escalate_to.fallback] : [])),
    ]);
    for (const role of roles) expect(used).toContain(role!);
  });

  it('writes the trigger for this rule’s own incident type', () => {
    expect(exercise!.incidentType).toBe(rule.trigger.incident_type);
  });

  it('is the same exercise every run — a demo that changes its questions is a bug', () => {
    const again = generateFor(TENANT).exercise;
    expect(JSON.stringify(again)).toBe(JSON.stringify(exercise));
  });
});

describe('the contradiction beat, where the pill can support one', () => {
  it('derives the pair from a rule’s own exception, and the condition from its note', () => {
    const { rule, exercise } = generateFor('technical-services-chilled-water-leak');
    const refinement = exercise!.questions.find((q) => q.id === 'g-exception-case');
    expect(refinement).toBeDefined();
    expect(refinement!.given).toBe(rule.exceptions.find((e) => e.note?.trim())!.note);

    const answers: Answer[] = [
      { questionId: 'g-decision', choiceIds: [rule.id], at: 1 },
      { questionId: 'g-exception-case', choiceIds: ['different'], at: 2 },
    ];
    const found = findContradiction(exercise!, answers);
    expect(found?.part).toBe('decision');
    expect(found?.distinguishingCondition).toBe(refinement!.given);
  });

  it('finds nothing when the same call is confirmed for both cases', () => {
    const { rule, exercise } = generateFor('technical-services-chilled-water-leak');
    const answers: Answer[] = [
      { questionId: 'g-decision', choiceIds: [rule.id], at: 1 },
      { questionId: 'g-exception-case', choiceIds: ['same'], at: 2 },
    ];
    expect(findContradiction(exercise!, answers)).toBeNull();
  });

  it('offers no contradiction beat at all for a pill whose rules have no exceptions', () => {
    const bundle = loadPill(TENANT)!;
    const bare = bundle.pill.rules.find((r) => r.exceptions.length === 0)!;
    const exercise = exerciseFromPill({
      pillId: TENANT,
      rule: bare,
      siblings: bundle.pill.rules.filter((r) => r.id !== bare.id),
      evidence: bundle.pill.evidenceCatalog,
      scenarioId: 'pill-rule',
    });
    expect(exercise!.questions.some((q) => q.id === 'g-exception-case')).toBe(false);
  });
});
