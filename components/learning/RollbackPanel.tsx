'use client';

// Step 7 — Rollback. Big enough to reach for in an incident, safe by design:
// a reason is mandatory and history is append-only — the version being rolled
// back is marked Retired and a new Approved version restores the old rules.

import { useState, type ReactNode } from 'react';
import { History, Undo2 } from 'lucide-react';
import { SectionHeader } from '@/components/mosaic';

export function RollbackPanel({
  restoreVersion,
  approvedVersion,
  canRollback,
  disabledReason,
  rolledBack,
  handoff,
  onRollback,
}: {
  /** The previously approved version a rollback restores; null when there is none. */
  restoreVersion: string | null;
  approvedVersion: string | null;
  canRollback: boolean;
  disabledReason?: string;
  /** Hand-off to someone the rollback check allows. */
  handoff?: ReactNode;
  /** The stored rollback of this change, if it happened. */
  rolledBack: { restored: string; as: string; by: string; reason: string } | null;
  onRollback: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const ready = canRollback && restoreVersion !== null && reason.trim().length > 0;

  return (
    <section aria-labelledby="learn-step-7-title" id="learn-step-7" tabIndex={-1} className="scroll-mt-4">
      <SectionHeader
        title="7. Roll back"
        description="Nothing is deleted — rollback adds a new version."
        icon={<History className="size-4" />}
      />

      <div className="card-paper mt-3 space-y-3 p-6">
        {rolledBack ? (
          <div role="status" className="space-y-1 text-xs">
            <p className="flex items-center gap-1.5 font-medium text-recommend">
              <Undo2 className="size-3.5" aria-hidden="true" />
              Rolled back by {rolledBack.by} — v{rolledBack.restored} rules are live again as v{rolledBack.as}.
            </p>
            <p className="text-ink-muted">Reason: {rolledBack.reason}</p>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="rollback-reason" className="block text-xs font-medium text-ink">
                Reason for rollback <span className="text-ink-muted">(required)</span>
              </label>
              <textarea
                id="rollback-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-describedby="rollback-reason-hint"
                placeholder="What the new version got wrong in production…"
                className="mt-1.5 w-full rounded-input border border-line bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-muted"
              />
              <p id="rollback-reason-hint" className="mt-1 text-[11px] text-ink-muted">
                Recorded on the restored version and in the audit log.
              </p>
            </div>

            {disabledReason ? <p className="text-xs text-ink-muted">{disabledReason}</p> : null}
            {handoff}

            {restoreVersion === null ? null : (
            <button
              type="button"
              onClick={() => onRollback(reason)}
              disabled={!ready}
              title={ready ? undefined : disabledReason ?? 'Enter a reason to roll back'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-pill border-[1.5px] border-blocked/50 bg-blocked-tint px-4 py-3 text-sm font-semibold text-blocked transition-colors hover:bg-blocked-tint/70 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <Undo2 className="size-4" aria-hidden="true" /> Roll back to v{restoreVersion}
            </button>
            )}

            {disabledReason || restoreVersion === null ? null : (
            <p className="text-[11px] text-ink-muted">
              {approvedVersion
                ? `v${approvedVersion} is live now. Rolling back retires it and restores v${restoreVersion}'s rules as a new version.`
                : `Restores v${restoreVersion}'s rules as a new version.`}
            </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
