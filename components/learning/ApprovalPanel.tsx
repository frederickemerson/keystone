'use client';

// Step 6 — Approve. The gate is the governance store's canApprove(): the author
// can never approve their own version, and regressions need the pill's approver
// to override with a reason. Blockers are stated in plain English.

import { useState } from 'react';
import { Ban, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { SectionHeader } from '@/components/mosaic';
import type { ApprovalCheck } from '@/lib/governance/approval';
import type { Actor, PillVersion } from '@/lib/governance/versions';
import { explainBlocker, roleDisplayName } from './learning-utils';
import { VersionChip } from './VersionChip';

export function ApprovalPanel({
  version,
  actor,
  check,
  canOverride,
  disabledReason,
  onApprove,
  onOverride,
}: {
  version: PillVersion;
  actor: Actor;
  check: ApprovalCheck;
  canOverride: boolean;
  disabledReason?: string;
  onApprove: () => ApprovalCheck;
  onOverride: (reason: string) => ApprovalCheck;
}) {
  const [overrideReason, setOverrideReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const overrideReady = canOverride && overrideReason.trim().length > 0;

  return (
    <section aria-labelledby="learn-step-6-title" id="learn-step-6" tabIndex={-1} className="scroll-mt-4">
      <SectionHeader
        title="6. Steward approval"
        description={`Approver for this pill: ${roleDisplayName(version.approverRole)}. Acting as ${actor.name} (${roleDisplayName(actor.role)}).`}
        icon={<ShieldCheck className="size-4" />}
        actions={<VersionChip status={version.status} version={version.version} />}
      />

      <div className="mt-3 space-y-3">
        {disabledReason ? (
          <p className="text-xs text-ink-muted">{disabledReason}</p>
        ) : (
          <>
            <div className="rounded-card border border-line bg-surface p-4">
              <p className="text-xs font-semibold text-ink">Approval gate</p>
              {check.allowed ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-recommend">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  Clear to approve — no regressions, and the approver is not the author.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {check.blockers.map((blocker, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-blocked">
                      <Ban className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      <span>{explainBlocker(blocker, version.approverRole)}</span>
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
