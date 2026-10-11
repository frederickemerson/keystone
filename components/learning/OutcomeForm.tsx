'use client';

// Step 1 — Outcome capture. Prefilled from INC-2026-1011, every field editable:
// the human confirms what actually happened before any rule is touched.

import { ClipboardCheck, Pencil } from 'lucide-react';
import { SectionHeader } from '@/components/mosaic';
import type { IncidentRecord } from '@/lib/data/schemas';
import { CAUSE_OPTIONS, defaultOutcome, type OutcomeDraft } from './learning-utils';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-muted';

export function OutcomeForm({
  incident,
  draft,
  saved,
  onChange,
  onSave,
  onEdit,
}: {
  incident: IncidentRecord | null;
  draft: OutcomeDraft;
  saved: boolean;
  onChange: (draft: OutcomeDraft) => void;
  onSave: () => void;
  onEdit: () => void;
}) {
  const invalid = draft.timeToIsolateMinutes < 0 || draft.costSgd < 0;

  function set<K extends keyof OutcomeDraft>(key: K, value: OutcomeDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <section aria-labelledby="learn-step-1-title" id="learn-step-1" tabIndex={-1} className="scroll-mt-4">
      <SectionHeader
        title="1. Capture the outcome"
        description="INC-2026-1011 has closed. Record what actually happened — this is the evidence any rule change must answer to."
      />

      {saved ? (
        <div className="mt-3 space-y-3">
          <dl className="grid gap-2 rounded-card border border-recommend/40 bg-recommend-tint p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-muted">Actual time-to-isolate</dt>
              <dd className="font-medium tabular-nums text-ink">{draft.timeToIsolateMinutes} minutes</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Tenant impact</dt>
              <dd className="font-medium text-ink">{draft.tenantImpact}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Cost of the incident</dt>
              <dd className="font-medium tabular-nums text-ink">SGD {draft.costSgd.toLocaleString('en-SG')}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Cause confirmed</dt>
              <dd className="font-medium text-ink">{draft.causeConfirmed}</dd>
            </div>
            {draft.notes.trim() ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-ink-muted">Notes</dt>
                <dd className="text-ink">{draft.notes}</dd>
              </div>
            ) : null}
          </dl>
          <button
            type="button"
            onClick={onEdit}
            className="btn-pill"
          >
            <Pencil className="size-3.5" aria-hidden="true" /> Edit outcome
          </button>
        </div>
      ) : (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!invalid) onSave();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="outcome-tti" className="block text-xs font-medium text-ink">
                Actual time-to-isolate (minutes)
              </label>
              <input
                id="outcome-tti"
                type="number"
                min={0}
                value={draft.timeToIsolateMinutes}
                onChange={(e) => set('timeToIsolateMinutes', Number(e.target.value))}
                aria-describedby="outcome-tti-hint"
                aria-invalid={draft.timeToIsolateMinutes < 0 || undefined}
                className={fieldClass}
              />
              <p id="outcome-tti-hint" className="mt-1 text-[11px] text-ink-muted">
                Alarm to isolation sub-valve closed
                {incident ? ` — opened ${incident.opened_at.slice(11, 16)}` : ''}.
              </p>
            </div>

            <div>
              <label htmlFor="outcome-cause" className="block text-xs font-medium text-ink">
                Cause confirmed
              </label>
              <select
                id="outcome-cause"
                value={draft.causeConfirmed}
                onChange={(e) => set('causeConfirmed', e.target.value)}
                className={fieldClass}
              >
                {CAUSE_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="outcome-tenant" className="block text-xs font-medium text-ink">
                Tenant impact
              </label>
              <input
                id="outcome-tenant"
                type="text"
                value={draft.tenantImpact}
                onChange={(e) => set('tenantImpact', e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="outcome-cost" className="block text-xs font-medium text-ink">
                Cost (SGD)
              </label>
              <input
                id="outcome-cost"
                type="number"
                min={0}
                value={draft.costSgd}
                onChange={(e) => set('costSgd', Number(e.target.value))}
                aria-invalid={draft.costSgd < 0 || undefined}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="outcome-notes" className="block text-xs font-medium text-ink">
              What the responding team observed
            </label>
            <textarea
              id="outcome-notes"
              rows={3}
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
              className={fieldClass}
            />
          </div>

          {invalid ? (
            <p role="alert" className="text-xs text-blocked">
              Time and cost cannot be negative.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={invalid}
            className="btn-pill btn-pill-primary"
          >
            <ClipboardCheck className="size-3.5" aria-hidden="true" /> Confirm outcome
          </button>
        </form>
      )}
    </section>
  );
}
