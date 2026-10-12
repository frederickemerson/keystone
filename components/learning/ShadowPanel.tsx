'use client';

// Step 5 — Shadow mode (trial run). Entering Shadow replays the new version
// beside the approved one over every past incident (the governance store does
// it, lib/governance/trial); nothing is applied until a human approves.

import type { ReactNode } from 'react';
import { CheckCircle2, Eye, XCircle } from 'lucide-react';
import { KpiStat, SectionHeader } from '@/components/mosaic';
import { describeTrial, TRIAL_VS_SCORE } from '@/lib/governance/evalScore';
import type { ActionStatus } from '@/lib/engine/types';
import {
  shadowSummary,
  type ShadowRun,
  type ShadowSummary,
} from '@/lib/governance/approval';
import type { PillVersion } from '@/lib/governance/versions';
import { VersionChip } from './VersionChip';

function decisionsLine(decisions: Record<string, ActionStatus>): string {
  const entries = Object.entries(decisions);
  if (entries.length === 0) return 'no rule fired';
  return entries.map(([ruleId, status]) => `${ruleId} ${status}`).join(' · ');
}

export function ShadowPanel({
  version,
  approvedVersion,
  promoteBlockedReason,
  handoff,
  runs,
  totalCases,
  onPromote,
}: {
  version: PillVersion;
  approvedVersion: string | null;
  /** Why the acting role may not promote to Shadow (store policy); undefined when it may. */
  promoteBlockedReason?: string;
  /** Hand-off to someone the promotion check allows, shown with the blocked reason. */
  handoff?: ReactNode;
  runs: readonly ShadowRun[];
  totalCases: number;
  onPromote: () => void;
}) {
  const summary: ShadowSummary = shadowSummary(runs);
  const promotable = version.status === 'Draft' && !promoteBlockedReason;
  const isShadow = version.status === 'Shadow';

  return (
    <section aria-labelledby="learn-step-5-title" id="learn-step-5" tabIndex={-1} className="scroll-mt-4">
      <SectionHeader
        title="5. Trial run (Shadow)"
        description="The approved version stays live; the trial run only records what the new version would do."
        icon={<Eye className="size-4" />}
        actions={<VersionChip status={version.status} version={version.version} />}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPromote}
          disabled={!promotable}
          title={
            promotable
              ? undefined
              : version.status !== 'Draft'
                ? `v${version.version} is already ${version.status}`
                : promoteBlockedReason
          }
          className="btn-pill btn-pill-primary"
        >
          <Eye className="size-3.5" aria-hidden="true" /> Promote to Shadow
        </button>
        <span className="text-xs text-ink-muted">
          Entering Shadow replays all {totalCases} past incidents through both versions.
        </span>
      </div>

      {version.status === 'Draft' && promoteBlockedReason ? (
        <div className="mt-3 space-y-2 rounded-lg border border-dashed border-line bg-surface/50 px-3 py-2">
          <p className="text-xs text-ink-muted">{promoteBlockedReason}</p>
          {handoff}
        </div>
      ) : null}

      {runs.length === 0 ? (
        <p className="mt-3 text-xs text-ink-muted">
          {isShadow
            ? 'No trial run is on record for this version, so it cannot be approved.'
            : 'No trial run yet: it runs when the version enters Shadow.'}
        </p>
      ) : (
        <>
          <p className="mt-3 text-[13px] font-medium text-ink">{describeTrial(runs)}</p>
          <p className="mt-1 text-[12px] text-ink-muted">{TRIAL_VS_SCORE}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <KpiStat label="Shadow agreements" value={summary.label} />
            <KpiStat label="Incidents replayed" value={`${runs.length}/${totalCases}`} />
            <KpiStat label="Compared against" value={approvedVersion ? `v${approvedVersion}` : '—'} />
          </div>

          <div className="card-paper mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Shadow run results per closed incident</caption>
              <thead className="border-b border-line bg-dew-drop text-[13px] text-ink-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Closed incident
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Approved {approvedVersion ? `v${approvedVersion}` : ''}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Shadow v{version.version}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Agreement
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.incidentId} className="border-b border-line last:border-0">
                    <th scope="row" className="px-3 py-2 font-mono text-xs font-normal text-ink">
                      {run.incidentId}
                    </th>
                    <td className="px-3 py-2 font-mono text-[11px] text-ink-muted">
                      {decisionsLine(run.approvedDecision)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-ink-muted">
                      {decisionsLine(run.shadowDecision)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          run.agree
                            ? 'inline-flex items-center gap-1 text-xs font-medium text-recommend'
                            : 'inline-flex items-center gap-1 text-xs font-medium text-blocked'
                        }
                      >
                        {run.agree ? (
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        ) : (
                          <XCircle className="size-3.5" aria-hidden="true" />
                        )}
                        {run.agree ? 'Agrees' : 'Differs'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
