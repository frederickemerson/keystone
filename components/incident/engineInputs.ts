// Adapters from data/ records to engine inputs, plus replay-step evidence
// accumulation (evidence state = all evidence_updates up to the current step).

import type { ConditionContext } from '@/lib/engine/conditions';
import { evaluateRule } from '@/lib/engine/evaluate';
import type { Asset, Evidence, EvidenceItem, Incident, Pill, Rule } from '@/lib/engine/types';
import type { AssetRecord, IncidentRecord, SensitivityLevel, TimelineEvent } from '@/lib/data/schemas';
import type { EvidenceConfirmationRecord } from '@/lib/governance/store';

export interface EvidenceEntry extends EvidenceItem {
  /** Sensitivity of the timeline event that last set this key. */
  sensitivity: SensitivityLevel;
  eventId: string;
}

export type EvidenceState = Record<string, EvidenceEntry>;

/**
 * Fold evidence_updates of events[0..step) — later events overwrite earlier
 * ones. A human evidence confirmation (governance store) is folded in right
 * after the event it is anchored to, so it applies from that point of the
 * replay on. Jev suggestions never appear here: only confirmations do.
 */
export function accumulateEvidence(
  events: readonly TimelineEvent[],
  step: number,
  confirmations: Readonly<Record<string, EvidenceConfirmationRecord>> = {},
): EvidenceState {
  const state: EvidenceState = {};
  const byEvent = new Map<string, EvidenceConfirmationRecord[]>();
  for (const c of Object.values(confirmations)) byEvent.set(c.eventId, [...(byEvent.get(c.eventId) ?? []), c]);
  for (const event of events.slice(0, step)) {
    for (const [key, upd] of Object.entries(event.evidence_updates)) {
      state[key] = {
        value: upd.value,
        confirmed: upd.confirmed,
        source: event.source,
        at: event.at,
        sensitivity: event.sensitivity,
        eventId: event.id,
      };
    }
    for (const c of byEvent.get(event.id) ?? []) {
      state[c.key] = {
        value: c.value,
        confirmed: true,
        source: `confirmed by ${c.actor.name}`,
        at: event.at,
        sensitivity: event.sensitivity,
        eventId: event.id,
      };
    }
  }
  return state;
}

export function toEngineEvidence(state: EvidenceState): Evidence {
  const out: Evidence = {};
  for (const [key, e] of Object.entries(state)) {
    out[key] = { value: e.value, source: e.source, at: e.at, confirmed: e.confirmed };
  }
  return out;
}

export function toEngineAsset(asset: AssetRecord): Asset {
  const { id, name, type, ...attributes } = asset;
  return { id, name, type, attributes };
}

export function toEngineIncident(incident: IncidentRecord): Incident {
  return { ...incident };
}

/**
 * Evidence keys a rule reads in this situation: its trigger's `evidence.*`
 * conditions plus the gating keys the ENGINE derives for it (base
 * required_evidence ∪ add_required_evidence of every matching exception, e.g.
 * cfm_cosign for TS-07 at a data centre). The gating set comes from
 * evaluateRule, never re-derived here, so the drawer lists exactly what the
 * engine checks.
 */
export function evidenceKeysForRule(rule: Rule, ctx: ConditionContext): string[] {
  const fromTrigger = [...rule.trigger.all, ...rule.trigger.any]
    .filter((c) => c.path.startsWith('evidence.'))
    .map((c) => c.path.split('.')[1] ?? '')
    .filter(Boolean);
  return [...new Set([...fromTrigger, ...evaluateRule(rule, ctx).requiredEvidence])];
}

export function findRule(pill: Pill, ruleId: string): Rule | undefined {
  return pill.rules.find((r) => r.id === ruleId);
}
