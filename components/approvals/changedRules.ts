// The rules a version changes against its parent, by rule id and content (not
// by parsing the human-readable diff lines), so each can link to its pill hub.

import type { Rule } from '@/lib/engine/types';

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
