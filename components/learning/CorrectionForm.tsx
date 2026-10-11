'use client';

// Step 2 — Expert correction. The Chief Engineer marks a rule with what went
// wrong and edits the field itself; proposing writes a Draft version through
// the governance store (history is append-only, nothing is overwritten).

import { GitBranch, AlertTriangle } from 'lucide-react';
import { SectionHeader } from '@/components/mosaic';
import type { Rule } from '@/lib/engine/types';
import type { Actor } from '@/lib/governance/versions';
import { CORRECTION_FIELD, VERDICTS, roleDisplayName, type CorrectionDraft } from './learning-utils';

export function CorrectionForm({
  rules,
  baseVersion,
  nextVersion,
  actor,
  draft,
  before,
  disabledReason,
  onChange,
  onPropose,
}: {
  rules: readonly Rule[];
  baseVersion: string;
  /** Version the proposal will create (bumped from the pill's history). */
  nextVersion: string;
  actor: Actor;
  draft: CorrectionDraft;
  /** Current value of the corrected field on the live version. */
  before: number | null;
  disabledReason?: string;
  onChange: (draft: CorrectionDraft) => void;
  onPropose: () => void;
}) {
  const rule = rules.find((r) => r.id === draft.ruleId);
  const unchanged = draft.after !== null && draft.after === before;
  const noChangeNeeded = draft.verdict === 'correct';
  const reasonMissing = draft.reason.trim().length === 0;
  const blocked =
    Boolean(disabledReason) || noChangeNeeded || draft.after === null || unchanged || reasonMissing;

  function blockedWhy(): string {
    if (disabledReason) return disabledReason;
    if (noChangeNeeded) return 'A rule marked Correct has no change to propose.';
    if (draft.after === null) return 'Give the corrected value.';
    if (unchanged) return 'The corrected value is the same as today — nothing would change.';
    if (reasonMissing) return 'A correction needs a reason (it becomes the version record).';
    return '';
  }

  return (
    <section aria-labelledby="learn-step-2-title" id="learn-step-2" tabIndex={-1} className="scroll-mt-4">
      <SectionHeader
        title="2. Expert correction"
        description={`${actor.name} (${roleDisplayName(actor.role)}) marks the rule that got this wrong and corrects the field. Proposing creates Draft v${nextVersion} — approved v${baseVersion} stays live.`}
      />

      <form
        className="mt-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!blocked) onPropose();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="correction-rule" className="block text-xs font-medium text-ink">
              Rule
            </label>
            <select
              id="correction-rule"
              value={draft.ruleId}
              onChange={(e) => onChange({ ...draft, ruleId: e.target.value })}
              className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
            >
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — {r.title}
                </option>
              ))}
            </select>
            {rule ? (
              <p className="mt-1 text-[11px] text-ink-muted">
                Today: <span className="font-mono">{CORRECTION_FIELD}</span>{' '}
                {rule.deadline_minutes ?? 'not set'} minutes
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="correction-after" className="block text-xs font-medium text-ink">
              Corrected {CORRECTION_FIELD} (minutes)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="correction-before"
                type="text"
                readOnly
                aria-label={`Current ${CORRECTION_FIELD}`}
                value={before ?? '—'}
                className="w-20 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-sm text-ink-muted"
              />
              <span aria-hidden="true" className="text-ink-muted">
                →
              </span>
              <input
                id="correction-after"
                type="number"
                min={0}
                value={draft.after ?? ''}
                onChange={(e) =>
                  onChange({ ...draft, after: e.target.value === '' ? null : Number(e.target.value) })
                }
                className="w-24 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
              />
            </div>
          </div>
        </div>

        <fieldset className="rounded-lg border border-line bg-surface p-3">
          <legend className="px-1 text-xs font-medium text-ink">What the expert found</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {VERDICTS.map((v) => (
              <label
                key={v.value}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-line bg-surface px-2 py-1.5 text-xs hover:border-accent"
              >
                <input
                  type="radio"
                  name="correction-verdict"
                  value={v.value}
                  checked={draft.verdict === v.value}
                  onChange={() => onChange({ ...draft, verdict: v.value })}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-ink">{v.label}</span>
                  <span className="block text-[11px] text-ink-muted">{v.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="correction-reason" className="block text-xs font-medium text-ink">
            Reason <span className="text-ink-muted">(required — recorded on the version)</span>
          </label>
          <textarea
            id="correction-reason"
            rows={2}
            value={draft.reason}
            onChange={(e) => onChange({ ...draft, reason: e.target.value })}
            aria-describedby="correction-reason-hint"
            placeholder="Why this value is right for this asset…"
            className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-muted"
          />
          <p id="correction-reason-hint" className="mt-1 text-[11px] text-ink-muted">
            Becomes the permanent version record and appears in the audit log.
          </p>
        </div>

        {blocked && blockedWhy() ? (
          <p className="flex items-start gap-1.5 text-xs text-ink-muted">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {blockedWhy()}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={blocked}
          title={blocked ? blockedWhy() : `Propose v${nextVersion}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <GitBranch className="size-3.5" aria-hidden="true" /> Propose v{nextVersion}
        </button>
      </form>
    </section>
  );
}
