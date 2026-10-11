import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { IncidentRecord } from '@/lib/data';
import { humanizeKey } from '@/components/incident/labels';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function ClosedIncidentsList({
  incidents,
  pillId,
}: {
  incidents: IncidentRecord[];
  pillId: string;
}) {
  const closed = incidents.filter((i) => i.status === 'closed');

  if (closed.length === 0) {
    return (
      <p className="text-sm text-ink-muted">No recently closed incidents.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {closed.map((incident) => (
        <li
          key={incident.id}
          className="card-paper flex flex-wrap items-center gap-x-3 gap-y-1 p-4"
        >
          <span className="font-mono text-[11px] text-ink-muted">{incident.id}</span>
          <span className="text-sm font-medium text-ink">
            {humanizeKey(incident.subtype)}
          </span>
          <span className="text-[13px] text-ink-muted">· {incident.asset_name}</span>
          <span className="text-[13px] text-ink-muted">· {formatDate(incident.closed_at ?? '')}</span>

          {typeof incident.eval_pass === 'boolean' ? (
            incident.eval_pass ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-recommend/40 bg-recommend-tint px-2.5 py-0.5 text-[11px] font-medium text-recommend"
                title="Eval expected matched actual"
              >
                <CheckCircle2 className="size-3" aria-hidden="true" /> Eval pass
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-blocked/45 bg-blocked-tint px-2.5 py-0.5 text-[11px] font-medium text-blocked"
                title="Eval expected did not match actual"
              >
                <XCircle className="size-3" aria-hidden="true" /> Eval flag
              </span>
            )
          ) : null}

          {incident.flagged_for_learning ? (
            <span className="rounded-full border border-approval/40 bg-approval-tint px-2.5 py-0.5 text-[11px] font-medium text-approval">
              Learning
            </span>
          ) : null}

          <p className="w-full text-[13px] text-ink-muted">{incident.outcome}</p>

          <Link
            href={`/learning/${pillId}`}
            className="ml-auto text-[13px] font-medium text-accent hover:underline"
          >
            Outcome →
          </Link>
        </li>
      ))}
    </ul>
  );
}
