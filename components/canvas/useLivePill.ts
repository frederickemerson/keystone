'use client';

// Live version of a pill from the governance store (seeded from the pill files).
// Before mount it returns the file manifest values — the same thing the store
// seeds — so server HTML and the first client render match.

import { useEffect } from 'react';
import type { PillStatus } from '@/lib/engine';
import type { PillBundle } from '@/lib/pills/load';
import { useGovernanceStore } from '@/lib/governance/store';
import {
  bumpMinor,
  compareSemver,
  liveVersion,
  nextMinorVersion,
  type PillVersion,
  type VersionStatus,
} from '@/lib/governance/versions';
import { useMounted } from '@/components/mosaic/useMounted';

const STATUS: Record<VersionStatus, PillStatus> = {
  Draft: 'draft',
  Shadow: 'shadow',
  Approved: 'approved',
  Retired: 'retired',
};

export interface LivePill {
  version: string;
  status: PillStatus;
  /** Versions newer than the live one that are still in review (Draft / Shadow). */
  pending: { version: string; status: PillStatus }[];
  /** Version a new proposal would receive. */
  nextVersion: string;
}

export function useLivePill(bundle: PillBundle): LivePill {
  const mounted = useMounted();
  const seedPills = useGovernanceStore((s) => s.seedPills);
  const stored = useGovernanceStore((s) => s.versions[bundle.id]);

  useEffect(() => {
    seedPills([{ id: bundle.id, pill: bundle.pill }]);
  }, [bundle, seedPills]);

  const m = bundle.pill.manifest;
  const history: readonly PillVersion[] | undefined = mounted ? stored : undefined;
  const live = history ? liveVersion(history) : undefined;
  if (!history || !live) {
    return { version: m.version, status: m.status, pending: [], nextVersion: bumpMinor(m.version) };
  }
  return {
    version: live.version,
    status: STATUS[live.status],
    pending: history
      .filter((v) => (v.status === 'Draft' || v.status === 'Shadow') && compareSemver(v.version, live.version) > 0)
      .map((v) => ({ version: v.version, status: STATUS[v.status] })),
    nextVersion: nextMinorVersion(history),
  };
}
