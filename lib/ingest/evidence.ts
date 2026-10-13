// The two facts about the pills that evidence ingestion needs: which keys can
// gate a decision, and what each key is called and who may confirm it.
//
// Both are derived from the pills on disk, through the same helper the
// connectors screen uses (lib/connectors/evidence-uses), so nothing here can
// drift from what the engine actually reads.

import { evidenceUses } from '@/lib/connectors/evidence-uses';
import type { EvidenceCatalogEntry, Pill } from '@/lib/engine';

export interface PillRef {
  id: string;
  pill: Pill;
}

/**
 * Every key that can hold a gate open: some rule's required_evidence, or a key
 * an exception adds to it.
 */
export function gatingKeysOf(pills: readonly PillRef[]): Set<string> {
  const uses = evidenceUses(pills);
  return new Set(Object.entries(uses).filter(([, u]) => u.some((use) => use.gating)).map(([key]) => key));
}

/** Union of the pills' evidence catalogues; the first declaration of a key wins. */
export function catalogOf(pills: readonly PillRef[]): Record<string, EvidenceCatalogEntry> {
  const catalog: Record<string, EvidenceCatalogEntry> = {};
  for (const { pill } of pills) {
    for (const [key, entry] of Object.entries(pill.evidenceCatalog)) catalog[key] ??= entry;
  }
  return catalog;
}
