import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { IncidentRecord } from '@/lib/data';
import { humanizeKey } from '@/components/incident/labels';
import { ClampText } from '@/components/mosaic/Disclosure';

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
    // `relative`: containing block for the sr-only spans (see ActiveIncidentsTable).
    <div className="card-paper relative overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[13px] text-ink-muted">
            <th className="px-4 py-3 font-normal">Incident</th>
            <th className="px-4 py-3 font-normal">Asset</th>
            <th className="px-4 py-3 font-normal">Closed</th>
            <th className="px-4 py-3 font-normal">Eval</th>
            <th className="px-4 py-3 font-normal">Outcome</th>
            <th className="px-4 py-3 font-normal" aria-label="Open outcome" />
          </tr>
        </thead>
        <tbody>
          {closed.map((incident) => (
            <tr key={incident.id} className="border-b border-line/70 align-top last:border-0">
              <td className="px-4 py-3">
                <p className="whitespace-nowrap font-medium text-ink">{humanizeKey(incident.subtype)}</p>
                <p className="font-mono text-[11px] text-ink-muted">{incident.id}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink">{incident.asset_name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[13px] tabular-nums text-ink-muted">
                {formatDate(incident.closed_at ?? '')}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {typeof incident.eval_pass === 'boolean' ? (
                    incident.eval_pass ? (
                      <span
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-recommend/40 bg-recommend-tint px-2.5 py-0.5 text-[11px] font-medium text-recommend"
                        title="Eval expected matched actual"
                      >
                        <CheckCircle2 className="size-3" aria-hidden="true" /> Pass
                        <span className="sr-only"> (eval expected matched actual)</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-blocked/45 bg-blocked-tint px-2.5 py-0.5 text-[11px] font-medium text-blocked"
                        title="Eval expected did not match actual"
                      >
                        <XCircle className="size-3" aria-hidden="true" /> Flag
                        <span className="sr-only"> (eval expected did not match actual)</span>
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                  {incident.flagged_for_learning ? (
                    <span className="whitespace-nowrap rounded-full border border-approval/40 bg-approval-tint px-2.5 py-0.5 text-[11px] font-medium text-approval">
                      Learning
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="max-w-md px-4 py-3 text-[13px] text-ink-muted">
                <ClampText lines={2}>{incident.outcome}</ClampText>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/learning/${pillId}`}
                  className="whitespace-nowrap text-[13px] font-medium text-accent hover:underline"
                >
                  Outcome →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
