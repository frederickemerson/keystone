// Why a rule is not applicable, in plain words, for the incident room's
// "Show N not applicable" list. Built from the engine's structured trace (which
// conditions failed) and the pill's evidence labels — never by re-parsing the
// engine's debug string (trace.triggerReason).

import type { Condition, ConditionTrace, EvidenceCatalog, Rule, TraceStep } from '@/lib/engine/types';
import { humanizeKey } from './labels';

function conditionLabel(path: string, catalog: EvidenceCatalog): string {
  const [root, key = path] = path.split('.');
  if (root === 'evidence' && Object.hasOwn(catalog, key)) return catalog[key].label;
  return humanizeKey(key);
}

function valueText(v: unknown): string {
  if (Array.isArray(v)) return v.map(valueText).join(', ');
  if (typeof v === 'string') return humanizeKey(v).toLowerCase();
  return String(v);
}

/** One condition as a requirement: "Life-safety hazard confirmed", "Moisture reading (%) above 15". */
function requirement(c: Pick<Condition, 'path' | 'op' | 'value'>, catalog: EvidenceCatalog): string {
  const label = conditionLabel(c.path, catalog);
  switch (c.op) {
    case 'eq':
      if (c.value === true) return label;
      if (c.value === false) return `${label}: no`;
      return `${label}: ${valueText(c.value)}`;
    case 'neq':
      return `${label} not ${valueText(c.value)}`;
    case 'gt':
      return `${label} above ${valueText(c.value)}`;
    case 'gte':
      return `${label} at least ${valueText(c.value)}`;
    case 'lt':
      return `${label} below ${valueText(c.value)}`;
    case 'lte':
      return `${label} at most ${valueText(c.value)}`;
    case 'in':
      return `${label}: one of ${valueText(c.value)}`;
    case 'exists':
      return `${label} recorded`;
  }
}

const failed = (conds: readonly ConditionTrace[]): ConditionTrace[] => conds.filter((c) => !c.matched);

/** In the engine's order: incident type, then the all-conditions, then the any-conditions. */
export function notApplicableReason(rule: Rule, trace: TraceStep, catalog: EvidenceCatalog, incidentType: string): string {
  if (rule.trigger.incident_type !== incidentType) {
    const type = humanizeKey(rule.trigger.incident_type);
    return `Only for ${type.charAt(0).toLowerCase()}${type.slice(1)} incidents`;
  }
  const unmetAll = failed(trace.allConditions);
  if (unmetAll.length > 0) return `Needs: ${unmetAll.map((c) => requirement(c, catalog)).join(' · ')}`;
  return `Needs one of: ${trace.anyConditions.map((c) => requirement(c, catalog)).join(' · ')}`;
}
