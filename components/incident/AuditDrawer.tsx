'use client';

import type { AuditEvent } from '@/lib/governance/audit';
import { roleLabel } from '@/lib/governance/access';
import { Drawer } from './Drawer';
import { formatClock, humanizeKey } from './labels';

export function AuditDrawer({
  open,
  onClose,
  incidentId,
  events,
}: {
  open: boolean;
  onClose: () => void;
  incidentId: string;
  events: readonly AuditEvent[];
}) {
  const newestFirst = [...events].reverse();
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Audit log · ${incidentId}`}
      subtitle="Append-only. Who / when / pill version / action / outcome."
    >
      {newestFirst.length === 0 ? (
        <p className="text-sm text-ink-muted">No human decisions recorded for this incident yet.</p>
      ) : (
        <ol className="space-y-2">
          {newestFirst.map((e) => (
            <li key={e.id} className="rounded-lg border border-line bg-surface-raised/40 p-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-ink-muted">{e.id}</span>
                <time dateTime={e.at} className="tabular-nums text-ink">
                  {formatClock(e.at)}
                </time>
                <span className="rounded bg-surface px-1.5 py-0.5 font-medium text-ink">{humanizeKey(e.action)}</span>
                {e.ruleId ? <span className="font-mono text-ink">{e.ruleId}</span> : null}
                {e.pillId ? (
                  <span className="font-mono text-ink-muted">
                    {e.pillId}
                    {e.pillVersion ? `@${e.pillVersion}` : ''}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-ink">
                {e.actor} <span className="text-ink-muted">({roleLabel(e.role)})</span>
              </p>
              <p className="mt-0.5 text-ink-muted">{e.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
}
