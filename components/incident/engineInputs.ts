// Adapters from data/ records to engine inputs, plus replay-step evidence
// accumulation (evidence state = all evidence_updates up to the current step).

import type { Asset, Evidence, EvidenceItem, Incident, Pill, Rule } from '@/lib/engine/types';
import type { AssetRecord, IncidentRecord, SensitivityLevel, TimelineEvent } from '@/lib/data/schemas';

export interface EvidenceEntry extends EvidenceItem {
  /** Sensitivity of the timeline event that last set this key. */
  sensitivity: SensitivityLevel;
  eventId: string;
}

export type EvidenceState = Record<string, EvidenceEntry>;

/** Fold evidence_updates of events[0..step) — later events overwrite earlier ones. */
export function accumulateEvidence(events: readonly TimelineEvent[], step: number): EvidenceState {
  const state: EvidenceState = {};
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

/** Evidence keys a rule reads: trigger conditions on `evidence.*` + required evidence. */
export function evidenceKeysForRule(rule: Rule): string[] {
  const fromTrigger = [...rule.trigger.all, ...rule.trigger.any]
    .filter((c) => c.path.startsWith('evidence.'))
    .map((c) => c.path.split('.')[1] ?? '')
    .filter(Boolean);
  return [...new Set([...fromTrigger, ...rule.required_evidence])];
}

export function findRule(pill: Pill, ruleId: string): Rule | undefined {
  return pill.rules.find((r) => r.id === ruleId);
}
