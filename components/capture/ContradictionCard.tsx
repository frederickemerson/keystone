'use client';

// Prominent "Contradiction detected" card (approval ochre tint; green once resolved). Quotes both spans side by side
// (from contradiction.json) and reveals the resolved distinguishing condition once
// the expert has answered.

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CHIP_BASE, TONE_CHIP } from '@/components/mosaic';
import { cn } from '@/lib/ui/cn';

type Contradiction = import('@/lib/data').ContradictionFixture['contradiction'];

function Span({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <blockquote className="mt-1.5 border-l-2 border-approval/50 pl-2.5 text-[13px] leading-relaxed text-ink">
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
      className="rounded-xl border border-approval/40 bg-approval-tint p-5"
      role="alert"
      aria-label="Contradiction detected"
    >
      <div className="flex items-center gap-2 text-approval">
        <AlertTriangle className="size-4" aria-hidden="true" />
        <span className="text-[15px] font-semibold">Contradiction detected</span>
        <span className={cn(CHIP_BASE, 'ml-auto', resolved ? TONE_CHIP.recommend : TONE_CHIP.approval, 'bg-surface')}>
          {resolved ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : null}
          {resolved ? 'Resolved' : 'Unresolved'}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Span label={`Statement A · ${statement_a.t}`} text={statement_a.text_fragment} />
        <Span label={`Statement B · ${statement_b.t}`} text={statement_b.text_fragment} />
      </div>

      {resolved ? (
        <div className="mt-3 rounded-lg border border-recommend/35 bg-recommend-tint p-3.5">
          <p className="text-[13px] font-semibold text-recommend">Resolved — distinguishing condition</p>
          <p className="mt-1 font-mono text-[13px] leading-relaxed text-ink">{resolution.distinguishing_condition}</p>
          {resolution.statement_a_generalised ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">{resolution.statement_a_generalised}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-approval">
          Keystone is resolving this with the expert via a distinguishing-condition probe…
        </p>
      )}
    </div>
  );
}
