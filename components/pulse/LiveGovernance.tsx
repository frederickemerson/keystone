'use client';

// Pulse figures that depend on governance state (approve / rollback happen in
// the governance store, not in the pill files). The server renders the
// file-seeded values; after mount these read the store, which is what the
// incident room, registry and canvas already show.

import { useEffect, useMemo } from 'react';
import { KpiStat } from '@/components/mosaic';
import { useMounted } from '@/components/mosaic/useMounted';
import { runEvals, type Pill } from '@/lib/engine';
import { useGovernanceStore } from '@/lib/governance/store';
import { currentApproved, pillAtVersion } from '@/lib/governance/versions';

export interface PulsePill {
  id: string;
  pill: Pill;
}

/** Seed the store from the pill files (no-op for pills already seeded). */
function useSeededPills(pills: readonly PulsePill[]): void {
  const seedPills = useGovernanceStore((s) => s.seedPills);
  useEffect(() => {
    seedPills(pills.map((p) => ({ id: p.id, pill: p.pill })));
  }, [pills, seedPills]);
}

/**
 * "Pills approved" and "Replay agreement" for the governed (live approved)
 * version of each pill: every eval case of the pill replayed through that
 * version's rules, counted in asserted fields ("x of y").
 */
export function LiveGovernanceKpis({
  pills,
  initial,
}: {
  pills: readonly PulsePill[];
  /** Server values from the pill files (identical to the seeded store). */
  initial: { approved: number; agreement: { passed: number; total: number } };
}) {
  useSeededPills(pills);
  const mounted = useMounted();
  const versions = useGovernanceStore((s) => s.versions);

  const live = useMemo(() => {
    if (!mounted) return initial;
    let approved = 0;
    let passed = 0;
    let total = 0;
    for (const { id, pill } of pills) {
      const history = versions[id];
      // Not seeded yet (first effect pending): the file pill is the seed.
      const v = history ? currentApproved(history) : undefined;
      if (history && !v) continue;
      approved += 1;
      const summary = runEvals(v ? pillAtVersion(pill, v) : pill, Object.values(pill.evals));
      passed += summary.passed;
      total += summary.passed + summary.failed;
    }
    return { approved, agreement: { passed, total } };
  }, [mounted, initial, pills, versions]);

  return (
    <>
      <KpiStat label="Pills approved" value={live.approved} />
      <KpiStat label="Replay agreement" value={`${live.agreement.passed} of ${live.agreement.total}`} />
    </>
  );
}

/**
 * The version an active incident is evaluated with now: the pill's live
 * approved version from the store (as in the incident room). The version
 * recorded when the incident opened stays available on hover.
 */
export function LivePillVersion({
  pillId,
  appliedAtOpen,
}: {
  pillId: string | undefined;
  appliedAtOpen: string;
}) {
  const mounted = useMounted();
  const history = useGovernanceStore((s) => (pillId ? s.versions[pillId] : undefined));
  const live = mounted && history ? currentApproved(history)?.version : undefined;
  const version = live ?? appliedAtOpen;
  const title =
    live && live !== appliedAtOpen
      ? `Governed version now v${live} (applied at open: v${appliedAtOpen})`
      : `Governed version v${version}`;
  return (
    <span className="font-mono tabular-nums text-ink-muted" title={title}>
      {' '}
      v{version}
    </span>
  );
}
