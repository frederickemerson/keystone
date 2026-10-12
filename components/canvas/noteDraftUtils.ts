// Pure helpers for drafts from frontline notes on the Decision Canvas / Approvals.

import type { DraftFromNote } from '@/lib/capture';
import type { PillEditPolicy } from '@/lib/governance/access';
import type { PillVersion } from '@/lib/governance/versions';
import type { PillBundle } from '@/lib/pills/load';
import type { ProposablePill } from '@/components/capture/DraftFromNoteTile';
import { pillDisplayName } from '@/components/mosaic/pillTitle';

export function policyOf(bundle: Pick<PillBundle, 'pill'>): PillEditPolicy {
  const m = bundle.pill.manifest;
  return { owner: m.owner, steward: m.steward, approver: m.approver, access: m.access };
}

/** The version a draft became, if it was proposed. */
export function versionForDraft(
  history: readonly PillVersion[] | undefined,
  draft: Pick<DraftFromNote, 'noteId' | 'rule'>,
): PillVersion | undefined {
  // Latest first: a draft re-proposed after a retired version shows its current version.
  return [...(history ?? [])].reverse().find((v) => v.capture?.noteId === draft.noteId && v.capture.draftRuleId === draft.rule.id);
}


/**
 * A pill a draft may be proposed into. `ruleIds` covers every id the pill has
 * used in any stored version, so the proposed rule never reuses one.
 */
export function proposablePill(
  bundle: Pick<PillBundle, 'id' | 'name' | 'pill'>,
  history: readonly PillVersion[] | undefined,
): ProposablePill {
  const ids = new Set(bundle.pill.rules.map((r) => r.id));
  for (const v of history ?? []) for (const r of v.rules) ids.add(r.id);
  return { id: bundle.id, name: pillDisplayName(bundle.name), ruleIds: [...ids], policy: policyOf(bundle) };
}
