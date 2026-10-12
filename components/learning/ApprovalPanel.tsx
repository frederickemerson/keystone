'use client';

// Step 6 — Approve. The gate is the governance store's canApprove(): only a
// Shadow version can be approved, and the approver is a third person — never
// its author, never the person who put it into Shadow. Regressions need the
// pill's approver to override with a reason. Blockers are stated in plain
// English. Once the version has been approved, the step shows that record
// (and, after a rollback, what is live now) instead of the gate.

import { useState, type ReactNode } from 'react';
import { Ban, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { SectionHeader } from '@/components/mosaic';
import type { ApprovalCheck } from '@/lib/governance/approval';
import type { PillVersion } from '@/lib/governance/versions';
import { explainBlocker, roleDisplayName } from './learning-utils';
import { VersionChip } from './VersionChip';

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' });
}

export interface ApprovalRecord {
  approvedBy: string;
  approvedAt: string;
  /** Version live now. */
  liveVersion: string;
  /** Set when the approved version was later rolled back: the rollback version and the version it restored. */
  rolledBackAs?: string;
  restored?: string;
}

export function ApprovalPanel({
  version,
  check,
  canOverride,
  disabledReason,
  record,
  handoff,
  onApprove,
  onOverride,
}: {
  version: PillVersion;
  /** The gate for a version in review; null once it has left review. */
  check: ApprovalCheck | null;
  canOverride: boolean;
  disabledReason?: string;
  /** The stored approval, once the version has been approved. */
  record?: ApprovalRecord;
  /** Hand-off to someone the approval check allows, offered when the acting person may not approve. */
  handoff?: ReactNode;
  onApprove: () => ApprovalCheck;
  onOverride: (reason: string) => ApprovalCheck;
}) {
  const [overrideReason, setOverrideReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const overrideReady = canOverride && overrideReason.trim().length > 0;

  return (
    <section aria-labelledby="learn-step-6-title" id="learn-step-6" tabIndex={-1} className="scroll-mt-4">
      <SectionHeader
        title="6. Approval"
        description={`Approver for this pill: ${roleDisplayName(version.approverRole)} — never the author or the Shadow promoter.`}
        icon={<ShieldCheck className="size-4" />}
        actions={<VersionChip status={version.status} version={version.version} />}
      />

      <div className="mt-3 space-y-3">
        {record ? (
          <div role="status" className="space-y-1 rounded-card border border-line bg-surface p-4 text-xs">
            <p className="flex items-center gap-1.5 font-medium text-recommend">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              v{version.version} approved by {record.approvedBy} · {when(record.approvedAt)}
            </p>
            <p className="text-ink-muted">
              Proposed by {version.createdBy.name}
              {version.shadowedBy ? `, put into Shadow by ${version.shadowedBy.name}` : ''}, approved by{' '}
              {record.approvedBy}: three different people.
            </p>
            <p className="text-ink">
              {record.rolledBackAs
                ? `Nothing to approve — v${record.liveVersion} is live (it restores v${record.restored ?? '?'} rules after the rollback in step 7).`
                : `Nothing to approve — v${record.liveVersion} is live.`}
            </p>
          </div>
        ) : disabledReason || !check ? (
          <p className="text-xs text-ink-muted">{disabledReason ?? `v${version.version} is ${version.status}; nothing to approve.`}</p>
        ) : (
          <>
            <div className="rounded-card border border-line bg-surface p-4">
              <p className="text-xs font-semibold text-ink">Approval gate</p>
              {check.allowed ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-recommend">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  Clear to approve — no regressions, and you neither wrote v{version.version} nor put it into Shadow.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {check.reasons.map((reason) => (
                    <li key={reason.code} className="flex items-start gap-1.5 text-xs text-blocked">
                      <Ban className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      <span>{explainBlocker(reason, version.approverRole)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const result = onApprove();
                  setMessage(result.allowed ? `v${version.version} approved.` : `Blocked: ${result.blockers.join('; ')}`);
                }}
                disabled={!check.allowed}
                title={check.allowed ? undefined : check.blockers.join(' | ')}
                className="btn-pill btn-pill-primary"
              >
                <ShieldCheck className="size-3.5" aria-hidden="true" /> Approve v{version.version}
              </button>
            </div>
            {handoff}

            {check.regressions > 0 ? (
              <div className="rounded-card border border-approval/30 bg-approval-tint p-4">
                <label
                  htmlFor="override-reason"
                  className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-approval"
                >
                  <ShieldAlert className="size-3.5" aria-hidden="true" />
                  {check.regressions} eval regression{check.regressions === 1 ? '' : 's'} — override with a
                  reason
                  <span className="text-ink-muted">(only {roleDisplayName(version.approverRole)})</span>
                </label>
                <textarea
                  id="override-reason"
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Why the regressions are acceptable…"
                  className="mt-1.5 w-full rounded-input border border-line bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-muted"
                />
                <button
                  type="button"
                  onClick={() => {
                    const result = onOverride(overrideReason);
                    setMessage(
                      result.allowed
                        ? `v${version.version} approved with override.`
                        : `Override blocked: ${result.blockers.join('; ')}`,
                    );
                  }}
                  disabled={!overrideReady}
                  title={overrideReady ? undefined : canOverride ? 'Enter a reason' : `Only ${roleDisplayName(version.approverRole)} may override`}
                  className="btn-pill mt-2 border-approval text-approval"
                >
                  <ShieldAlert className="size-3.5" aria-hidden="true" /> Override &amp; approve
                </button>
              </div>
            ) : null}

            {message ? (
              <p role="status" className="rounded-lg bg-dew-drop px-3 py-1.5 text-xs text-ink">
                {message}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
