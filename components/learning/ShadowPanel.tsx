'use client';

// Step 5 — Shadow mode. The new version runs silently alongside the approved
// one over the closed incidents; nothing is applied until a human approves.

import { CheckCircle2, Eye, Play, UserCheck, XCircle } from 'lucide-react';
import { KpiStat, SectionHeader } from '@/components/mosaic';
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
  canRun,
  blockedReason,
  promoteBlockedReason,
  switchRole,
  runs,
  totalCases,
  onPromote,
  onRun,
}: {
  version: PillVersion;
  approvedVersion: string | null;
  canRun: boolean;
  blockedReason?: string;
  /** Why the acting role may not promote to Shadow (store policy); undefined when it may. */
  promoteBlockedReason?: string;
  /** Hand-off to a role that holds the pill-promotion grant, offered when the acting role lacks it. */
  switchRole?: { label: string; onSwitch: () => void };
  runs: readonly ShadowRun[];
  totalCases: number;
  onPromote: () => void;
  onRun: () => void;
}) {
  const summary: ShadowSummary = shadowSummary(runs);
  const promotable = version.status === 'Draft' && !promoteBlockedReason;
  const isShadow = version.status === 'Shadow';

  return (
    <section aria-labelledby="learn-step-5-title" id="learn-step-5" tabIndex={-1} className="scroll-mt-4">
      <SectionHeader
        title="5. Run it in shadow"
        description="Shadow replays the closed incidents through both versions. The approved version stays live — the shadow only records what it would have decided."
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
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          title={canRun ? undefined : blockedReason}
          className="btn-pill"
        >
          <Play className="size-3.5" aria-hidden="true" /> Replay {totalCases} closed incidents
        </button>
        {!canRun && blockedReason && !(version.status === 'Draft' && promoteBlockedReason) ? (
          <span className="text-xs text-ink-muted">{blockedReason}</span>
        ) : null}
      </div>

      {version.status === 'Draft' && promoteBlockedReason ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line bg-surface/50 px-3 py-2">
          <p className="text-xs text-ink-muted">{promoteBlockedReason}</p>
          {switchRole ? (
            <button type="button" onClick={switchRole.onSwitch} className="btn-pill">
              <UserCheck className="size-3.5" aria-hidden="true" /> Switch user to {switchRole.label}
            </button>
          ) : null}
        </div>
      ) : null}

      {runs.length === 0 ? (
        <p className="mt-3 text-xs text-ink-muted">
          No shadow runs recorded yet
          {isShadow ? ' — press “Replay closed incidents”.' : ' — promote to Shadow first.'}
        </p>
      ) : (
        <>
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
