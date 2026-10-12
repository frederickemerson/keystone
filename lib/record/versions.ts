// Which pill version applied when. A decision record must name the version
// that was live when each thing happened, never today's version. Pure.
//
// Clocks: version approvals, decisions and confirmations are stamped with the
// real (demo) clock, so comparing them is sound. The incident itself is on
// the recorded incident clock; an incident's own `pill_version` says what it
// opened under, and is preferred to any timestamp comparison.

import { compareSemver, findVersion, type PillVersion } from '@/lib/governance/versions';

function approvalTime(v: PillVersion): number {
  return v.approvedAt ? Date.parse(v.approvedAt) : Number.NaN;
}

/** Every version that was ever approved (Approved now, or Retired after being approved), oldest approval first. */
function everApproved(history: readonly PillVersion[]): PillVersion[] {
  return history
    .filter((v) => !Number.isNaN(approvalTime(v)))
    .sort((a, b) => approvalTime(a) - approvalTime(b) || compareSemver(a.version, b.version));
}

/**
 * The version live at `at`: the latest one approved at or before it (each
 * approval retires the one before). Undefined when nothing was approved yet.
 */
export function versionLiveAt(history: readonly PillVersion[], at: string): PillVersion | undefined {
  const t = Date.parse(at);
  if (Number.isNaN(t)) return undefined;
  return everApproved(history)
    .filter((v) => approvalTime(v) <= t)
    .at(-1);
}

/**
 * The version an incident opened under. The incident's recorded pill version
 * is authoritative for the pill it records; for any other pill, the version
 * live when it opened, or else the earliest approved (the seeded baseline: a
 * recorded incident predates every approval made in the app).
 */
export function openedUnderVersion(
  history: readonly PillVersion[],
  /** `pillId` is the pill the incident recorded at open (pillIdFromRef of `pill_applied`). */
  incident: { openedAt: string; pillId: string; pillVersion: string },
  pillId: string,
): PillVersion | undefined {
  if (incident.pillId === pillId) {
    const recorded = findVersion(history, incident.pillVersion);
    if (recorded) return recorded;
  }
  return versionLiveAt(history, incident.openedAt) ?? everApproved(history)[0];
}

/**
 * The version live when a person acted at `at`: the version they recorded
 * with the action, else the one live by approval times, else the version the
 * incident opened under.
 */
export function versionAtAction(
  history: readonly PillVersion[],
  recorded: string | undefined,
  at: string,
  openedUnder: string,
): string {
  return recorded ?? versionLiveAt(history, at)?.version ?? openedUnder;
}
