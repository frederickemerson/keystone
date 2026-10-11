import Link from 'next/link';
import { cn } from '@/lib/ui/cn';
import type { IncidentRecord } from '@/lib/data';

// Stable demo clock so "time since detection" is deterministic across renders.
const DEMO_NOW = new Date('2026-10-11T11:30:00+08:00');

function minutesSince(iso: string): number {
  const diff = DEMO_NOW.getTime() - new Date(iso).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const ACTION_RANK: Record<string, number> = {
  must_escalate: 0,
  requires_approval: 1,
  recommend: 2,
};

function unresolvedOwner(incident: IncidentRecord): string | null {
  const unresolved = (incident.actions ?? []).filter(
    (a) => a.status === 'blocked' || a.status === 'needs_approval',
  );
  if (unresolved.length === 0) return null;
  const top = [...unresolved].sort(
    (a, b) => (ACTION_RANK[a.action_class] ?? 9) - (ACTION_RANK[b.action_class] ?? 9),
  )[0];
  return top.escalate_to?.name ?? top.escalate_to?.role ?? top.owner ?? null;
}

const SEVERITY_TONE: Record<string, string> = {
  high: 'text-escalate',
  medium: 'text-approval',
  low: 'text-recommend',
};

export function ActiveIncidentsTable({ incidents }: { incidents: IncidentRecord[] }) {
  const active = incidents.filter((i) => i.status !== 'closed');

  if (active.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-surface/50 px-4 py-8 text-center text-sm text-ink-muted">
        No active incidents.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
            <th className="px-4 py-2.5 font-medium">Severity</th>
            <th className="px-4 py-2.5 font-medium">Asset</th>
            <th className="px-4 py-2.5 font-medium">Title</th>
            <th className="px-4 py-2.5 font-medium">Detected</th>
            <th className="px-4 py-2.5 font-medium">Unresolved owner</th>
            <th className="px-4 py-2.5 font-medium">Evidence</th>
            <th className="px-4 py-2.5 font-medium">Pill @ version</th>
            <th className="px-4 py-2.5 font-medium" aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {active.map((incident) => {
            const cov = incident.evidence_coverage;
            return (
              <tr
                key={incident.id}
                className="border-b border-line/70 align-top last:border-0 hover:bg-surface-raised/40"
              >
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wide',
                      SEVERITY_TONE[incident.severity] ?? 'text-ink-muted',
                    )}
                  >
                    {incident.severity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-ink">{incident.asset_name}</span>
                </td>
                <td className="max-w-xs px-4 py-3">
                  <p className="font-medium text-ink">{incident.subtype.replace(/_/g, ' ')}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
                    {incident.description}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-ink">
                  {formatDuration(minutesSince(incident.opened_at))}
                </td>
                <td className="px-4 py-3 text-xs text-ink">
                  {unresolvedOwner(incident) ?? '—'}
                </td>
                <td className="px-4 py-3">
                  {cov ? (
                    <span
                      className="rounded border border-line bg-surface-raised px-2 py-1 font-mono text-xs tabular-nums text-ink"
                      title={`${cov.confirmed} of ${cov.required} required evidence confirmed`}
                    >
                      {cov.confirmed} of {cov.required}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-ink-muted">
                  {incident.pill_applied}@{incident.pill_version}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/incident/${incident.id}`}
                    className="rounded-md border border-line bg-surface-raised px-2.5 py-1 text-xs font-medium text-ink hover:border-accent"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
