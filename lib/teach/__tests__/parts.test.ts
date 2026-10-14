// The contract: coverage is over real Rule fields, and every part is spelled
// for a human. If this file fails, the coverage board is lying about something.

import { describe, expect, it } from 'vitest';
import type { Rule } from '@/lib/engine/types';
import { ESSENTIAL_PARTS, isRulePart, PART_LABELS, RULE_PARTS, type RulePart } from '../parts';

/** A value of this type can only be built if every part is a key of Rule. */
const EVERY_PART_IS_A_RULE_FIELD: Record<RulePart, keyof Rule> = {
  trigger: 'trigger',
  decision: 'decision',
  required_evidence: 'required_evidence',
  allowed_actions: 'allowed_actions',
  forbidden_actions: 'forbidden_actions',
  escalate_to: 'escalate_to',
  deadline_minutes: 'deadline_minutes',
  exceptions: 'exceptions',
};

describe('the rule-part contract', () => {
  it('names only fields a Rule actually has', () => {
    for (const part of RULE_PARTS) expect(EVERY_PART_IS_A_RULE_FIELD[part]).toBe(part);
  });

  it('covers every part the map claims, and no more', () => {
    expect(Object.keys(EVERY_PART_IS_A_RULE_FIELD).sort()).toEqual([...RULE_PARTS].sort());
  });

  it('lists each part once', () => {
    expect(new Set(RULE_PARTS).size).toBe(RULE_PARTS.length);
  });

  it('has a human label and a question for every part', () => {
    for (const part of RULE_PARTS) {
      const entry = PART_LABELS[part];
      expect(entry.label.length).toBeGreaterThan(2);
      expect(entry.asks.endsWith('?')).toBe(true);
      // The label is what a technician reads: no schema vocabulary in it.
      expect(entry.label).not.toMatch(/_/);
    }
  });

  it('treats every essential part as a real part', () => {
    for (const part of ESSENTIAL_PARTS) expect(isRulePart(part)).toBe(true);
  });

  it('cannot draft a rule without a decision, a trigger, evidence or an approver', () => {
    expect([...ESSENTIAL_PARTS].sort()).toEqual(
      ['decision', 'escalate_to', 'required_evidence', 'trigger'].sort(),
    );
  });

  it('rejects a part nobody defined', () => {
    expect(isRulePart('vibes')).toBe(false);
    expect(isRulePart('action_class')).toBe(false);
  });
});
