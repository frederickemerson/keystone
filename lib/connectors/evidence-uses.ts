// Which rules read an evidence key, and whether the key can gate them. Pure;
// the connectors screen uses it to link each key a connector reports to the
// rules it feeds.

import type { Pill, Rule } from '@/lib/engine';

export interface EvidenceUse {
  pillId: string;
  ruleId: string;
  /** True when the key is required evidence (base or exception-added): it can hold the rule's gate. */
  gating: boolean;
}

function conditionKeys(rule: Rule): string[] {
  return [...rule.trigger.all, ...rule.trigger.any, ...rule.exceptions.flatMap((ex) => ex.when)]
    .filter((c) => c.path.startsWith('evidence.'))
    .map((c) => c.path.split('.')[1]);
}

function gatingKeys(rule: Rule): string[] {
  return [...rule.required_evidence, ...rule.exceptions.flatMap((ex) => ex.add_required_evidence ?? [])];
}

/** Evidence key → the rules that read it, in pill and rule order. */
export function evidenceUses(pills: readonly { id: string; pill: Pill }[]): Record<string, EvidenceUse[]> {
  const out: Record<string, EvidenceUse[]> = {};
  for (const { id, pill } of pills) {
    for (const rule of pill.rules) {
      const gating = new Set(gatingKeys(rule));
      for (const key of new Set([...conditionKeys(rule), ...gating])) {
        (out[key] ??= []).push({ pillId: id, ruleId: rule.id, gating: gating.has(key) });
      }
    }
  }
  return out;
}
