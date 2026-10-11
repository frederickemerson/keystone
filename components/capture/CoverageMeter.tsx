'use client';

// Coverage meter by rule field (SPEC §4 / research_domain §1.6). Shows how the
// interviewer targets gaps instead of chit-chat: each field fills as rule tiles
// arrive, and "open gaps" list what Keystone will ask next.

import { cn } from '@/lib/ui/cn';
import type { Rule } from '@/lib/engine/types';

interface FieldDef {
  key: string;
  label: string;
  test: (r: Rule) => boolean;
}

const FIELDS: FieldDef[] = [
  { key: 'trigger', label: 'Trigger', test: (r) => !!r.trigger?.incident_type },
  { key: 'cue_evidence', label: 'Cue / evidence', test: (r) => r.required_evidence.length > 0 },
  { key: 'decision', label: 'Decision', test: (r) => !!r.decision },
  { key: 'allowed', label: 'Allowed', test: (r) => r.allowed_actions.length > 0 },
  { key: 'forbidden', label: 'Forbidden', test: (r) => r.forbidden_actions.length > 0 },
  { key: 'exception', label: 'Exception', test: (r) => r.exceptions.length > 0 },
  { key: 'escalation', label: 'Escalation', test: (r) => !!r.escalate_to?.role },
  { key: 'owner', label: 'Owner', test: (r) => !!r.owner },
  { key: 'deadline', label: 'Deadline', test: (r) => r.deadline_minutes != null },
  // Outcome is intentionally never populated by the extraction fixture — it stays
  // an open gap so the Knowledge Checker has something to ask about next.
  { key: 'outcome', label: 'Outcome', test: () => false },
];

const NEXT_QUESTIONS: Record<string, string> = {
  trigger: 'Which incident type and conditions actually trigger this rule?',
  cue_evidence: 'What readings or alarms confirm the situation is real?',
  decision: 'What decision should Keystone recommend at this point?',
  allowed: 'Which actions are explicitly permitted?',
  forbidden: 'What must never be done, even under pressure?',
  exception: 'When does this rule not apply — what is the boundary?',
  escalation: 'Who must be escalated to, and under what condition?',
  owner: 'Which role owns this decision?',
  deadline: 'Within what time window must it happen?',
  outcome: 'How will we know the action actually worked?',
};

export interface CoverageResult {
  /** Filled fields / (fields × captured candidates), as a whole percent. */
  overall: number;
  /** Candidates captured so far (the denominator of every per-field bar). */
  captured: number;
  stats: { key: string; label: string; filled: number; total: number; pct: number }[];
  /** Fields still missing on at least one captured candidate. */
  gaps: { key: string; label: string; next: string; missing: number }[];
}

/**
 * Schema coverage across the captured candidates. Per field: how many captured
 * candidates have it filled, out of the candidates captured so far. Nothing
 * captured yet → 0% with no denominators faked.
 */
export function computeCoverage(rules: readonly Rule[]): CoverageResult {
  const captured = rules.length;
  const stats = FIELDS.map((f) => {
    const filled = rules.filter(f.test).length;
    return {
      key: f.key,
      label: f.label,
      filled,
      total: captured,
      pct: captured === 0 ? 0 : Math.round((filled / captured) * 100),
    };
  });
  const filledTotal = stats.reduce((s, f) => s + f.filled, 0);
  const overall = captured === 0 ? 0 : Math.round((filledTotal / (FIELDS.length * captured)) * 100);
  const gaps = stats
    .filter((f) => f.filled < f.total)
    .map((f) => ({ key: f.key, label: f.label, next: NEXT_QUESTIONS[f.key], missing: f.total - f.filled }));
  return { overall, captured, stats, gaps };
}

export function CoverageMeter({ rules }: { rules: Rule[] }) {
  const { overall, captured, stats, gaps } = computeCoverage(rules);

  return (
    <div className="rounded-xl border border-line-strong bg-surface p-5 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="font-display-soft text-[17px] font-semibold text-heading">Schema coverage</p>
        <p className="text-[15px] font-semibold tabular-nums text-ink">{overall}%</p>
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">
        {captured === 0
          ? 'No candidates captured yet.'
          : `Fields filled across ${captured} captured candidate${captured === 1 ? '' : 's'}.`}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {stats.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="w-24 shrink-0 truncate text-xs text-ink-muted" title={s.label}>
              {s.label}
            </span>
            <span
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-dew-drop-deep"
              role="progressbar"
              aria-valuenow={s.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${s.label} coverage ${s.pct}%`}
            >
              <span
                className={cn(
                  'block h-full rounded-full transition-[width] motion-reduce:transition-none',
                  s.pct >= 100 ? 'bg-recommend' : s.pct > 0 ? 'bg-charcoal' : 'bg-ink-muted/40',
                )}
                style={{ width: `${s.pct}%` }}
              />
            </span>
            <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-ink-muted">
              {s.filled}/{s.total}
            </span>
          </div>
        ))}
      </div>

      {gaps.length > 0 ? (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-[13px] font-semibold text-ink">Open gaps — what Keystone will ask next</p>
          <ul className="mt-1.5 space-y-1">
            {gaps.map((g) => (
              <li key={g.key} className="flex gap-2 text-xs leading-snug text-ink-muted">
                <span className="shrink-0 font-medium text-ink">{g.label}</span>
                <span>
                  {g.next}{' '}
                  <span className="tabular-nums">
                    ({g.missing} of {captured} missing)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
