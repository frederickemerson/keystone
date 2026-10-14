// The draft, and the two ways it could lie.
//
// It could name an evidence key or a role the pill does not have, which would
// produce a rule the engine cannot evaluate. Or it could fill in a field
// nobody answered, which would put words in the expert's mouth. Both are
// checked here against the real pill.

import { describe, expect, it } from 'vitest';
import { loadPill } from '@/lib/pills/load';
import { ruleSchema } from '@/lib/engine';
import { CLAIM_MAPPING, DISTANCE_EVIDENCE_KEY, draftRuleFrom, draftProvenance } from '../draft';
import { loadExercise } from '../load';
import type { Answer } from '../exercise';

const PILL_ID = 'technical-services-chilled-water-leak';
const exercise = loadExercise(PILL_ID)!;
const pill = loadPill(PILL_ID)!;

function answer(questionId: string, choiceIds: string[], at: number): Answer {
  return { questionId, choiceIds, at };
}

/** The way the recorded expert answered. */
const FULL: Answer[] = [
  { questionId: 'q-account', choiceIds: [], text: 'x'.repeat(80), at: 1 },
  answer('q-isolate', ['riser'], 2),
  answer('q-evidence', ['lew_signoff', 'insulation_resistance_ok', 'area_dry'], 3),
  answer('q-who', ['duty_lew'], 4),
  answer('q-forbidden', ['reset_breaker', 'visual_only', 'open_cupboard'], 5),
  answer('q-deadline', ['30'], 6),
  answer('q-threshold', ['2'], 7),
  answer('q-isolate-branch', ['sub'], 8),
  { questionId: 'q-exception', choiceIds: [], text: 'The branch sub-valve is accessible and closing it stops the flow.', at: 9 },
];

describe('the claim vocabulary', () => {
  it('names only evidence keys the pill declares', () => {
    const declared = new Set(Object.keys(pill.pill.evidenceCatalog));
    const named = Object.values(CLAIM_MAPPING).flatMap((m) => (m.evidenceKey ? [m.evidenceKey] : []));
    expect(named.length).toBeGreaterThan(0);
    for (const key of named) expect(declared).toContain(key);
  });

  it('writes the distance threshold against a key the pill declares', () => {
    expect(Object.keys(pill.pill.evidenceCatalog)).toContain(DISTANCE_EVIDENCE_KEY);
  });

  it('gives every choice in the shipped exercise a declared meaning', () => {
    const claims = [exercise.opening, ...exercise.questions]
      .flatMap((q) => q.choices ?? [])
      .flatMap((c) => (c.claim ? [c.claim] : []));
    expect(claims.length).toBeGreaterThan(0);
    const undeclared = claims.filter((claim) => !CLAIM_MAPPING[claim]);
    expect(undeclared).toEqual([]);
  });
});

describe('draftRuleFrom', () => {
  it('fills nothing from nothing', () => {
    const draft = draftRuleFrom(exercise, []);
    expect(draft.patch).toEqual({});
    expect(draft.filled).toEqual([]);
  });

  it('never fills a field nobody answered', () => {
    const only = draftRuleFrom(exercise, [answer('q-who', ['duty_lew'], 1)]);
    expect(only.filled).toEqual(['escalate_to']);
    expect(only.patch.decision).toBeUndefined();
    expect(only.patch.required_evidence).toBeUndefined();
    expect(only.patch.deadline_minutes).toBeUndefined();
    expect(only.patch.trigger).toBeUndefined();
  });

  it('carries the three evidence keys the expert picked, and not the two he did not', () => {
    const draft = draftRuleFrom(exercise, FULL);
    expect(draft.patch.required_evidence).toEqual(['lew_signoff', 'insulation_resistance_ok', 'area_dry']);
  });

  it('adds no gate for a courtesy that is not evidence', () => {
    const draft = draftRuleFrom(exercise, [answer('q-evidence', ['tenant_told'], 1)]);
    // Answered, so the part counts; but it contributes no required evidence.
    expect(draft.filled).toEqual(['required_evidence']);
    expect(draft.patch.required_evidence).toBeUndefined();
  });

  it('writes the threshold as a structured condition, not a sentence', () => {
    const draft = draftRuleFrom(exercise, FULL);
    expect(draft.patch.trigger?.all).toEqual([
      { path: `evidence.${DISTANCE_EVIDENCE_KEY}`, op: 'lte', value: 2 },
    ]);
  });

  it('lets a later refinement win for a single-valued field', () => {
    const draft = draftRuleFrom(exercise, FULL);
    // q-isolate said riser at t=2; q-isolate-branch said sub-valve at t=8.
    expect(draft.patch.decision).toMatch(/sub-valve/i);
  });

  it('accumulates list fields instead of overwriting them', () => {
    const draft = draftRuleFrom(exercise, FULL);
    expect(draft.patch.forbidden_actions).toHaveLength(3);
  });

  it('records the resolved condition as the exception', () => {
    const draft = draftRuleFrom(exercise, FULL);
    expect(draft.exception).toMatch(/sub-valve is accessible/i);
    expect(draft.filled).toContain('exceptions');
  });

  it('reports a claim it has no meaning for, rather than guessing at one', () => {
    const invented = {
      ...exercise,
      questions: [
        {
          id: 'q-made-up',
          kind: 'single_choice' as const,
          covers: 'decision' as const,
          prompt: 'Something nobody declared a meaning for?',
          choices: [
            { id: 'a', label: 'A', claim: 'nobody:declared_this' },
            { id: 'b', label: 'B', claim: 'isolate:riser' },
          ],
        },
      ],
    };
    const draft = draftRuleFrom(invented, [answer('q-made-up', ['a'], 1)]);
    expect(draft.unmapped).toEqual(['nobody:declared_this']);
    expect(draft.patch.decision).toBeUndefined();
  });

  it('produces a patch the engine’s own rule schema accepts, once completed', () => {
    const draft = draftRuleFrom(exercise, FULL);
    const existing = pill.pill.rules.find((r) => r.id === 'TS-07')!;
    const completed = { ...existing, ...draft.patch };
    expect(ruleSchema.safeParse(completed).success).toBe(true);
  });
});

describe('draftProvenance', () => {
  it('keeps the words behind each field, so the draft can show its own sources', () => {
    const rows = draftProvenance(exercise, FULL);
    expect(rows.length).toBeGreaterThan(5);
    for (const row of rows) expect(row.label.length).toBeGreaterThan(0);
  });

  it('leaves out a claim with no declared meaning', () => {
    expect(draftProvenance(exercise, []).length).toBe(0);
  });
});
