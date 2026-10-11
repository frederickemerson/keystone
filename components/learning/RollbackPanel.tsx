'use client';

// Step 7 — Rollback. Big enough to reach for in an incident, safe by design:
// a reason is mandatory and history is append-only — the version being rolled
// back is marked Retired and a new Approved version restores the old rules.

import { useState } from 'react';
import { History, Undo2 } from 'lucide-react';
import { SectionHeader } from '@/components/mosaic';

export function RollbackPanel({
  baseVersion,
  approvedVersion,
  canRollback,
  disabledReason,
  rolledBackTo,
  onRollback,
}: {
  baseVersion: string;
  approvedVersion: string | null;
  canRollback: boolean;
  disabledReason?: string;
  rolledBackTo: string | null;
  onRollback: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const ready = canRollback && reason.trim().length > 0;

  return (
    <section aria-labelledby="learn-step-7-title" id="learn-step-7" tabIndex={-1} className="scroll-mt-4">
      <SectionHeader
        title="7. Roll back"
        description="One click, with a reason. Nothing is ever deleted — the rolled-back version is marked Retired and a new version carries the restored rules."
        icon={<History className="size-4" />}
      />

      <div className="mt-3 space-y-3 rounded-xl border border-line bg-surface p-3">
        {rolledBackTo ? (
          <p role="status" className="flex items-center gap-1.5 text-xs text-recommend">
            <Undo2 className="size-3.5" aria-hidden="true" />
            Rolled back — v{rolledBackTo} rules are live again as a new Approved version.
          </p>
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
                className="mt-1.5 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-muted"
              />
              <p id="rollback-reason-hint" className="mt-1 text-[11px] text-ink-muted">
                Recorded on the restored version and in the audit log.
              </p>
            </div>

            {disabledReason ? <p className="text-xs text-ink-muted">{disabledReason}</p> : null}

            <button
              type="button"
              onClick={() => onRollback(reason)}
              disabled={!ready}
              title={ready ? undefined : disabledReason ?? 'Enter a reason to roll back'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-escalate/40 bg-escalate/10 px-4 py-3 text-sm font-semibold text-escalate transition-colors hover:bg-escalate/15 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <Undo2 className="size-4" aria-hidden="true" /> Roll back to v{baseVersion}
            </button>

            <p className="text-[11px] text-ink-muted">
              {approvedVersion
                ? `v${approvedVersion} is live now. Rolling back retires it and restores v${baseVersion}'s rules as a new version.`
                : `Restores v${baseVersion}'s rules as a new version.`}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
