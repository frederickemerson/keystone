'use client';

// Right rail — the pill's version history (append-only, nothing is ever
// removed) and the audit events recorded for this pill.

import { ScrollText } from 'lucide-react';
import type { AuditEvent, AuditLog } from '@/lib/governance/audit';
import { currentApproved, type PillVersion } from '@/lib/governance/versions';
import { roleDisplayName } from './learning-utils';
import { VersionChip } from './VersionChip';

const AUDIT_LIMIT = 14;

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' });
}

function VersionEntry({ version, isLive }: { version: PillVersion; isLive: boolean }) {
  return (
    <li className="rounded-lg border border-line bg-surface p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <VersionChip status={version.status} version={version.version} />
        {isLive ? (
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-ink">
            Live
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-[11px] text-ink">{version.reason}</p>
      <p className="mt-1 text-[11px] text-ink-muted">
        {version.createdBy.name} · {roleDisplayName(version.createdBy.role)} · {when(version.createdAt)}
      </p>
      {version.approvedBy ? (
        <p className="text-[11px] text-ink-muted">
          Approved by {version.approvedBy.name} · {when(version.approvedAt ?? version.createdAt)}
        </p>
      ) : null}
      {version.rollbackOf ? (
        <p className="text-[11px] text-ink-muted">
          Rollback of v{version.parentVersion ?? version.rollbackOf} · restores v{version.rollbackOf}{' '}
          rules
        </p>
      ) : version.parentVersion ? (
        <p className="text-[11px] text-ink-muted">from v{version.parentVersion}</p>
      ) : (
        <p className="text-[11px] text-ink-muted">Seeded from pill files</p>
      )}
    </li>
  );
}

export function HistoryRail({
  history,
  audit,
  pillId,
}: {
  history: readonly PillVersion[];
  audit: AuditLog;
  pillId: string;
}) {
  const live = currentApproved(history);
  const ordered = [...history].reverse();
  const events: AuditEvent[] = audit.filter((e) => e.pillId === pillId).slice().reverse();

  return (
    <div className="space-y-4">
      <section aria-labelledby="learn-history-title">
        <h2 id="learn-history-title" className="text-sm font-semibold text-ink">
          Version history
        </h2>
        <p className="mt-0.5 text-[11px] text-ink-muted">
          Append-only — rollback adds a version, it never deletes one.
        </p>
        <ol className="mt-2 space-y-2">
          {ordered.map((v) => (
            <VersionEntry key={v.version} version={v} isLive={live?.version === v.version} />
          ))}
        </ol>
      </section>

      <section aria-labelledby="learn-audit-title">
        <h2
          id="learn-audit-title"
          className="flex items-center gap-1.5 text-sm font-semibold text-ink"
        >
          <ScrollText className="size-4" aria-hidden="true" /> Audit events
        </h2>
        <p className="mt-0.5 text-[11px] text-ink-muted">
          Who, when, which version — every action on this pill.
        </p>
        {events.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-line bg-surface/50 px-3 py-4 text-center text-[11px] text-ink-muted">
            Nothing recorded yet for this pill.
          </p>
        ) : (
          <ol className="mt-2 space-y-1.5">
            {events.slice(0, AUDIT_LIMIT).map((e) => (
              <li key={e.id} className="rounded-lg border border-line bg-surface p-2.5">
                <p className="text-[11px] font-medium text-ink">
                  {e.action.replace(/_/g, ' ')}
                  {e.pillVersion ? <span className="font-mono"> · v{e.pillVersion}</span> : null}
                </p>
                <p className="text-[11px] text-ink-muted">{e.detail}</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {e.actor} · {roleDisplayName(e.role)} · {when(e.at)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
