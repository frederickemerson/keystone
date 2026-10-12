// The rules a version changes against its parent, by rule id and content (not
// by parsing the human-readable diff lines), so each can link to its pill hub.

import type { Rule } from '@/lib/engine/types';
import { diffRules } from '@/lib/governance/versions';

export type RuleChangeKind = 'added' | 'changed' | 'removed';

export interface ChangedRule {
  id: string;
  kind: RuleChangeKind;
  title: string;
  /** The rule's decision text in the new version (the old one for a removed rule). */
  decision: string;
}

export function changedRules(parentRules: readonly Rule[], rules: readonly Rule[]): ChangedRule[] {
  const before = new Map(parentRules.map((r) => [r.id, r]));
  const after = new Map(rules.map((r) => [r.id, r]));
  const out: ChangedRule[] = [];
  for (const rule of rules) {
    const prev = before.get(rule.id);
    if (!prev) out.push({ id: rule.id, kind: 'added', title: rule.title, decision: rule.decision });
    else if (JSON.stringify(prev) !== JSON.stringify(rule)) {
      out.push({ id: rule.id, kind: 'changed', title: rule.title, decision: rule.decision });
    }
  }
  for (const rule of parentRules) {
    if (!after.has(rule.id)) out.push({ id: rule.id, kind: 'removed', title: rule.title, decision: rule.decision });
  }
  return out;
}

/**
 * Field-by-field edits ("TS-02 deadline_minutes 15 → 10") of the rules present
 * in both versions. Added and removed rules are shown whole by changedRules.
 */
export function fieldChanges(parentRules: readonly Rule[], rules: readonly Rule[]): string[] {
  const shared = new Set(rules.map((r) => r.id).filter((id) => parentRules.some((p) => p.id === id)));
  return diffRules(
    parentRules.filter((r) => shared.has(r.id)),
    rules.filter((r) => shared.has(r.id)),
  ).changes;
}
