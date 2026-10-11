'use client';

// Prominent amber "Contradiction detected" card. Quotes both spans side by side
// (from contradiction.json) and reveals the resolved distinguishing condition once
// the expert has answered.

import { AlertTriangle } from 'lucide-react';

type Contradiction = import('@/lib/data').ContradictionFixture['contradiction'];

function Span({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-2.5">
      <p className="font-mono text-[10px] text-ink-muted">{label}</p>
      <blockquote className="mt-1 border-l-2 border-amber-500/50 pl-2 text-xs italic text-ink">
        “{text}”
      </blockquote>
    </div>
  );
}

export function ContradictionCard({
  data,
  resolved,
}: {
  data: Contradiction;
  resolved: boolean;
}) {
  const { statement_a, statement_b, resolution } = data;
  return (
    <div
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
      role="alert"
      aria-label="Contradiction detected"
    >
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <AlertTriangle className="size-4" aria-hidden="true" />
        <span className="text-sm font-semibold">Contradiction detected</span>
        <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
          {resolved ? 'resolved' : 'unresolved'}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Span label={`Statement A · ${statement_a.t}`} text={statement_a.text_fragment} />
        <Span label={`Statement B · ${statement_b.t}`} text={statement_b.text_fragment} />
      </div>

      {resolved ? (
        <div className="mt-3 rounded-lg border border-recommend/30 bg-recommend/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-recommend">
            Resolved — distinguishing condition
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{resolution.distinguishing_condition}</p>
          {resolution.statement_a_generalised ? (
            <p className="mt-2 text-[11px] text-ink-muted">{resolution.statement_a_generalised}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-300/90">
          MOSAIC is resolving this with the expert via a distinguishing-condition probe…
        </p>
      )}
    </div>
  );
}
