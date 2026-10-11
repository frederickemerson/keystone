'use client';

// Version lifecycle chip (Draft → Shadow → Approved → Retired).

import { cn } from '@/lib/ui/cn';
import type { VersionStatus } from '@/lib/governance/versions';

const TONE: Record<VersionStatus, string> = {
  Draft: 'border-line bg-surface-raised text-ink-muted',
  Shadow: 'border-approval/40 bg-approval/10 text-approval',
  Approved: 'border-recommend/30 bg-recommend/10 text-recommend',
  Retired: 'border-line bg-surface text-ink-muted',
};

export function VersionChip({
  status,
  version,
  className,
}: {
  status: VersionStatus;
  version?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONE[status],
        className,
      )}
    >
      {version ? <span className="font-mono">v{version}</span> : null}
      {status}
    </span>
  );
}
