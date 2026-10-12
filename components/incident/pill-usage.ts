// Which pills (and which versions) the room is running, and what each is doing
// at the current replay step. Pure: derived from the approved versions the
// room evaluates and the engine's board items, never from labels.

import { pillDisplayName } from '@/components/mosaic/pillTitle';
import type { IncidentRecord } from '@/lib/data/schemas';
import { pillIdFromRef } from '@/components/registry/hub-utils';
import type { ApprovedPill, BoardItem } from './types';

export interface PillInUse {
  pillId: string;
  name: string;
  domain: string;
  /** Approved version the room evaluates (governance store). */
  version: string;
  ruleCount: number;
  /** Rules triggered at the current step. */
  triggered: number;
  /** Of those, how many the gate holds. */
  blocked: number;
  /** Version the incident recorded at open, when it differs from the one evaluated now. */
  openedUnder?: string;
}

export function pillsInUse(
  approved: readonly ApprovedPill[],
  items: readonly BoardItem[],
  incident: Pick<IncidentRecord, 'pill_applied' | 'pill_version'>,
): PillInUse[] {
  const recorded = pillIdFromRef(incident.pill_applied);
  return approved.map((entry) => {
    const mine = items.filter((i) => i.entry.bundle.id === entry.bundle.id);
    const drifted = entry.bundle.id === recorded && incident.pill_version !== entry.version;
    return {
      pillId: entry.bundle.id,
      name: pillDisplayName(entry.bundle.name),
      domain: entry.bundle.domain,
      version: entry.version,
      ruleCount: entry.pill.rules.length,
      triggered: mine.length,
      blocked: mine.filter((i) => i.action.status === 'blocked').length,
      ...(drifted ? { openedUnder: incident.pill_version } : {}),
    };
  });
}

/** "Chilled water leak v1.2.0 · 13 rules". */
export function loadedPillLabel(p: Pick<PillInUse, 'name' | 'version' | 'ruleCount'>): string {
  return `${p.name} v${p.version} · ${p.ruleCount} rule${p.ruleCount === 1 ? '' : 's'}`;
}

/** "2 triggered · 1 blocked" at this step, or "None triggered yet". */
export function activityLabel(p: Pick<PillInUse, 'triggered' | 'blocked'>): string {
  if (p.triggered === 0) return 'None triggered yet';
  return `${p.triggered} triggered${p.blocked > 0 ? ` · ${p.blocked} blocked` : ''}`;
}

/** Visible proof that learning changes operations: the incident opened under one version, runs another. */
export function driftLabel(p: Pick<PillInUse, 'version' | 'openedUnder'>): string | null {
  return p.openedUnder ? `Opened under v${p.openedUnder}; now evaluated with v${p.version}` : null;
}
