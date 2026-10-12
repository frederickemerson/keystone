// Server component: closed incidents and their outcome against the pill that
// covers them. An incident's eval verdict is shown only when a pill's scope
// covers its asset type (lib/governance/coverage, the same test as the coverage
// table); otherwise the row says no pill covers it, never "Pass".

import Link from 'next/link';
import { CheckCircle2, Minus, XCircle } from 'lucide-react';
import { loadAssets, type IncidentRecord } from '@/lib/data';
import { loadAllPills } from '@/lib/pills/load';
import { outcomePill } from '@/lib/governance/coverage';
import { routes } from '@/lib/journey';
import { humanizeKey } from '@/components/incident/labels';
import { ClampText } from '@/components/mosaic/Disclosure';
import { assetTypeMeta } from './assetMeta';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const CHIP = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium';

function EvalChip({ pass }: { pass: boolean | undefined }) {
  if (typeof pass !== 'boolean') return <span className="text-xs text-ink-muted">—</span>;
  return pass ? (
    <span className={`${CHIP} border-recommend/40 bg-recommend-tint text-recommend`} title="Eval expected matched actual">
      <CheckCircle2 className="size-3" aria-hidden="true" /> Pass
      <span className="sr-only"> (eval expected matched actual)</span>
    </span>
  ) : (
    <span className={`${CHIP} border-blocked/45 bg-blocked-tint text-blocked`} title="Eval expected did not match actual">
      <XCircle className="size-3" aria-hidden="true" /> Flag
      <span className="sr-only"> (eval expected did not match actual)</span>
    </span>
  );
}

export function ClosedIncidentsList({
  incidents,
}: {
  incidents: IncidentRecord[];
  /** Ignored: each row links to the pill that covers it (kept so the Pulse page compiles unchanged). */
  pillId?: string;
}) {
  const closed = incidents.filter((i) => i.status === 'closed');

  if (closed.length === 0) {
    return <p className="text-sm text-ink-muted">No recently closed incidents.</p>;
  }

  // Only the asset type is read here (never shown), so the unscoped asset list is fine.
  const assetType = new Map(loadAssets().map((a) => [a.id, a.type]));
  const pills = loadAllPills();

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
          {closed.map((incident) => {
            const type = assetType.get(incident.asset_id);
            const pill = outcomePill(pills, incident.pill_applied, type);
            return (
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
                    {pill ? (
                      <EvalChip pass={incident.eval_pass} />
                    ) : (
                      <span
                        className={`${CHIP} border-na/35 bg-na-tint font-normal text-na`}
                        title="No pill's scope covers this asset type, so no pill decision is scored here."
                      >
                        <Minus className="size-3" aria-hidden="true" /> No pill for {assetTypeMeta(type ?? '').label.toLowerCase()}
                      </span>
                    )}
                    {pill && incident.flagged_for_learning ? (
                      <span className={`${CHIP} border-approval/40 bg-approval-tint text-approval`}>Learning</span>
                    ) : null}
                  </div>
                </td>
                <td className="max-w-md px-4 py-3 text-[13px] text-ink-muted">
                  <ClampText lines={2}>{incident.outcome}</ClampText>
                </td>
                <td className="px-4 py-3 text-right">
                  {pill ? (
                    <Link
                      href={routes.learning(pill.id, incident.id)}
                      className="whitespace-nowrap text-[13px] font-medium text-accent hover:underline"
                    >
                      Outcome →
                    </Link>
                  ) : (
                    <Link
                      href={routes.capture()}
                      className="whitespace-nowrap text-[13px] font-medium text-accent hover:underline"
                    >
                      Capture an expert →
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
