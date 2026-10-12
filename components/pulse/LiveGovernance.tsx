'use client';

// Pulse figures that depend on governance state (approve / rollback happen in
// the governance store, not in the pill files). The server renders the
// file-seeded values; after mount these read the store, which is what the
// incident room, registry and canvas already show.

import { useEffect, useMemo } from 'react';
import { KpiStat } from '@/components/mosaic';
import { useMounted } from '@/components/mosaic/useMounted';
import type { Pill } from '@/lib/engine';
import {
  addScores,
  EMPTY_SCORE,
  formatChecks,
  formatIncidents,
  pastIncidentScore,
  PAST_INCIDENTS_LABEL,
} from '@/lib/governance/evalScore';
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
 * "Pills approved" and "Past incidents passed" for the governed (live approved)
 * version of each pill: every past incident (eval case) replayed through that
 * version's rules, counted and worded by lib/governance/evalScore, the one
 * score every screen shows. Before mount (and on the server) the file pills
 * are the seed, so both renders agree.
 */
export function LiveGovernanceKpis({
  pills,
}: {
  pills: readonly PulsePill[];
  /** Ignored: the score is computed here from `pills` (kept so the Pulse page compiles unchanged). */
  initial?: unknown;
}) {
  useSeededPills(pills);
  const mounted = useMounted();
  const versions = useGovernanceStore((s) => s.versions);

  const live = useMemo(() => {
    let approved = 0;
    let score = EMPTY_SCORE;
    for (const { id, pill } of pills) {
      const history = mounted ? versions[id] : undefined;
      // Not seeded yet (server render, first effect pending): the file pill is the seed.
      const v = history ? currentApproved(history) : undefined;
      if (history ? !v : pill.manifest.status !== 'approved') continue;
      approved += 1;
      score = addScores(score, pastIncidentScore(v ? pillAtVersion(pill, v) : pill));
    }
    return { approved, score };
  }, [mounted, pills, versions]);

  return (
    <>
      <KpiStat label="Pills approved" value={live.approved} />
      <div title={formatChecks(live.score)}>
        <KpiStat label={PAST_INCIDENTS_LABEL} value={formatIncidents(live.score)} />
      </div>
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
