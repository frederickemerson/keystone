import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import type { ContradictionFixture } from '@/lib/data';
import { describeCondition } from './conditionProse';
import { Disclosure } from '@/components/mosaic/Disclosure';

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
      className="rounded-xl border border-approval/35 bg-approval-tint p-5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-approval/40 bg-surface text-approval">
          <AlertTriangle className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-[19px] font-semibold leading-tight">
              Contradiction resolved <span className="font-sans text-[13px] font-medium text-approval">· rule <span className="font-mono">{rule_id}</span></span>
            </h2>
          </div>

          <div className="rounded-lg border border-line-strong bg-surface p-3.5">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
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
              <summary className="cursor-pointer select-none text-xs text-ink-muted">
                Rule condition (code form)
              </summary>
              <p className="mt-1 font-mono text-xs leading-relaxed text-ink">
                {resolution.distinguishing_condition}
              </p>
            </details>
            <p className="mt-1.5 text-xs text-ink-muted">
              Resolved at <span className="font-mono tabular-nums">{resolution.resolved_at}</span> · confirmation:{' '}
              {resolution.confirmation_status}
            </p>
          </div>

          <Disclosure label="Both expert statements" openLabel="Hide statements">
            <div className="grid gap-2 md:grid-cols-2">
              <Statement label="Statement A" t={statement_a.t} text={statement_a.text_fragment} tone="border-line" />
              <Statement label="Statement B" t={statement_b.t} text={statement_b.text_fragment} tone="border-line" />
            </div>
          </Disclosure>
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
    <div className={`rounded-lg border ${tone} bg-surface p-3`}>
      <p className="text-xs font-medium text-ink-muted">
        {label} · <span className="font-mono tabular-nums">{t}</span>
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink">“{text}”</p>
    </div>
  );
}
