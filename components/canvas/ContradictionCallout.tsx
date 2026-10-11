import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import type { ContradictionFixture } from '@/lib/data';
import { describeCondition } from './conditionProse';

// Static callout for the contradiction the extractor surfaced and resolved.
// Rendered server-side; the distinguishing condition is the key teaching point.
export function ContradictionCallout({
  contradiction,
  plainCondition,
}: {
  contradiction: ContradictionFixture['contradiction'];
  /** The distinguishing condition as recorded in plain language, if any. */
  plainCondition?: string;
}) {
  const { rule_id, statement_a, statement_b, resolution } = contradiction;
  const clauses = plainCondition ? [] : describeCondition(resolution.distinguishing_condition);

  return (
    <section
      aria-label={`Contradiction resolved for rule ${rule_id}`}
      className="rounded-xl border border-approval/30 bg-approval/10 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-approval/15 text-approval">
          <AlertTriangle className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-approval">
              Contradiction resolved · Rule {rule_id}
            </p>
            <p className="mt-0.5 text-sm text-ink">
              The extractor flagged two conflicting statements from the expert interview and
              resolved them with a <strong>distinguishing condition</strong> rather than dropping
              either.
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <Statement
              label="Statement A"
              t={statement_a.t}
              text={statement_a.text_fragment}
              tone="border-line"
            />
            <Statement
              label="Statement B"
              t={statement_b.t}
              text={statement_b.text_fragment}
              tone="border-line"
            />
          </div>

          <div className="rounded-lg border border-accent/30 bg-surface p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
              <ArrowLeftRight className="size-3.5" aria-hidden="true" />
              Distinguishing condition
            </p>
            {plainCondition ? (
              <p className="mt-1 text-sm leading-relaxed text-ink">{plainCondition}</p>
            ) : clauses.length > 0 ? (
              <ul className="mt-1 space-y-1 text-sm leading-relaxed text-ink">
                {clauses.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium">{c.action}</span>
                    <span className="text-ink-muted"> — when {c.when}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <details className="mt-2">
              <summary className="cursor-pointer select-none text-[11px] text-ink-muted">
                Rule condition (code form)
              </summary>
              <p className="mt-1 font-mono text-xs leading-relaxed text-ink">
                {resolution.distinguishing_condition}
              </p>
            </details>
            <p className="mt-1.5 text-[11px] text-ink-muted">
              Resolved at {resolution.resolved_at} · confirmation: {resolution.confirmation_status}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Statement({
  label,
  t,
  text,
  tone,
}: {
  label: string;
  t: string;
  text: string;
  tone: string;
}) {
  return (
    <div className={`rounded-lg border ${tone} bg-surface p-2.5`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
        {label} · {t}
      </p>
      <p className="mt-1 text-xs italic text-ink">“{text}”</p>
    </div>
  );
}
