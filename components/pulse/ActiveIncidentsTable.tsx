import Link from 'next/link';
import { cn } from '@/lib/ui/cn';
import type { IncidentRecord } from '@/lib/data';
import { personaFor, roleLabel } from '@/lib/governance/access';
import { humanizeKey } from '@/components/incident/labels';

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

function unresolvedOwner(incident: IncidentRecord): { name: string; role: string } | null {
  const unresolved = (incident.actions ?? []).filter(
    (a) => a.status === 'blocked' || a.status === 'needs_approval',
  );
  if (unresolved.length === 0) return null;
  const top = [...unresolved].sort(
    (a, b) => (ACTION_RANK[a.action_class] ?? 9) - (ACTION_RANK[b.action_class] ?? 9),
  )[0];
  // The named human an unresolved action routes to: its escalation target's
  // persona from roles.json (one source of truth for names), shown with the
  // role label the human acts in.
  if (!top.escalate_to) return null;
  return { name: personaFor(top.escalate_to.role).name, role: roleLabel(top.escalate_to.role) };
}

// Severity is a danger axis, not an escalation: high = blocked ink (brick red),
// medium = requires-approval ochre, low = recommend green.
const SEVERITY_TONE: Record<string, string> = {
  high: 'text-blocked',
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
    <div className="card-paper overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[13px] text-ink-muted">
            <th className="px-4 py-3 font-normal">Severity</th>
            <th className="px-4 py-3 font-normal">Asset</th>
            <th className="px-4 py-3 font-normal">Title</th>
            <th className="px-4 py-3 font-normal">Detected</th>
            <th className="px-4 py-3 font-normal">Unresolved owner</th>
            <th className="px-4 py-3 font-normal">Evidence</th>
            <th className="px-4 py-3 font-normal">Pill @ version</th>
            <th className="px-4 py-3 font-normal" aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {active.map((incident) => {
            const cov = incident.evidence_coverage;
            const owner = unresolvedOwner(incident);
            return (
              <tr
                key={incident.id}
                className="border-b border-line/70 align-top last:border-0 hover:bg-surface-raised/40"
              >
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'text-[13px] font-medium',
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
                  <p className="font-medium text-ink">{humanizeKey(incident.subtype)}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
                    {incident.description}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-ink">
                  {formatDuration(minutesSince(incident.opened_at))}
                </td>
                <td className="px-4 py-3 text-xs">
                  {owner ? (
                    <span className="whitespace-nowrap">
                      <span className="font-medium text-ink">{owner.name}</span>
                      <span className="text-ink-muted"> · {owner.role}</span>
                    </span>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {cov ? (
                    <span
                      className="inline-block whitespace-nowrap rounded-full border border-line bg-dew-drop px-2.5 py-1 font-mono text-xs tabular-nums text-ink"
                      title={`${cov.confirmed} of ${cov.required} required evidence confirmed`}
                    >
                      {cov.confirmed} of {cov.required}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] tabular-nums text-ink-muted">
                  {incident.pill_applied}@{incident.pill_version}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/incident/${incident.id}`} className="btn-pill text-xs">
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
