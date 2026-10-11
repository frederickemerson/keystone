import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { IncidentRecord } from '@/lib/data';

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
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface p-3"
        >
          <span className="font-mono text-[11px] text-ink-muted">{incident.id}</span>
          <span className="text-sm font-medium text-ink">
            {incident.subtype.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-ink-muted">· {incident.asset_name}</span>
          <span className="text-xs text-ink-muted">· {formatDate(incident.closed_at ?? '')}</span>

          {typeof incident.eval_pass === 'boolean' ? (
            incident.eval_pass ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-recommend/30 bg-recommend/10 px-2 py-0.5 text-[11px] font-medium text-recommend"
                title="Eval expected matched actual"
              >
                <CheckCircle2 className="size-3" aria-hidden="true" /> Eval pass
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-escalate/40 bg-escalate/15 px-2 py-0.5 text-[11px] font-medium text-escalate"
                title="Eval expected did not match actual"
              >
                <XCircle className="size-3" aria-hidden="true" /> Eval flag
              </span>
            )
          ) : null}

          {incident.flagged_for_learning ? (
            <span className="rounded-full border border-approval/30 bg-approval/10 px-2 py-0.5 text-[11px] font-medium text-approval">
              Learning
            </span>
          ) : null}

          <p className="w-full text-xs text-ink-muted">{incident.outcome}</p>

          <Link
            href={`/learning/${pillId}`}
            className="ml-auto text-xs font-medium text-accent hover:underline"
          >
            Outcome →
          </Link>
        </li>
      ))}
    </ul>
  );
}
