'use client';

// Two things you said, neither of them wrong.
//
// The difference from components/capture/ContradictionCard is where the
// contradiction came from. That one renders a recorded fixture that a model
// reported and a guard checked for invented quotes. This one renders what
// lib/teach/exercise computed by comparing two claims: same field of the rule,
// different answers. There is nothing to verify, because nothing was
// generated — these are the two options the person tapped, in their own
// authored wording.
//
// The resolution shape is the one the whole project insists on: keep both
// statements, name the condition that separates them. There is deliberately no
// control here that discards one of them.

import { AlertTriangle } from 'lucide-react';
import { PART_LABELS } from '@/lib/teach/parts';
import type { Contradiction } from '@/lib/teach/exercise';

export interface ContradictionPanelProps {
  contradiction: Contradiction;
  /** The condition the expert confirmed, once they have. */
  resolution: string | null;
  children?: React.ReactNode;
}

export function ContradictionPanel({ contradiction, resolution, children }: ContradictionPanelProps) {
  const { earlier, later, part } = contradiction;
  return (
    <section
      className="rounded-xl border border-approval/40 bg-approval-tint p-5"
      role="alert"
      aria-label="Two answers disagree"
    >
      <header className="flex items-center gap-2 text-approval">
        <AlertTriangle className="size-4" aria-hidden="true" />
        <h2 className="text-[15px] font-semibold">Two answers disagree</h2>
      </header>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
        Both are about <span className="font-medium">{PART_LABELS[part].label.toLowerCase()}</span>, and you are
        not wrong twice. There is a condition here you have not said out loud.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {[
          { label: 'Earlier you chose', claim: earlier },
          { label: 'Just now you chose', claim: later },
        ].map(({ label, claim }) => (
          <div key={label} className="rounded-lg border border-line bg-surface p-3">
            <p className="text-xs font-medium text-ink-muted">{label}</p>
            <blockquote className="mt-1.5 border-l-2 border-approval/50 pl-2.5 text-[14px] leading-relaxed text-ink">
              {claim.label}
            </blockquote>
            {claim.given ? (
              <p className="mt-2 text-[12px] leading-snug text-ink-muted">Given: {claim.given}</p>
            ) : null}
          </div>
        ))}
      </div>

      {resolution ? (
        <div className="mt-3 rounded-lg border border-approval/40 bg-surface p-3">
          <p className="text-xs font-medium text-ink-muted">The condition that keeps both</p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink">{resolution}</p>
          <p className="mt-2 text-[12px] leading-snug text-ink-muted">
            So the first answer is the general case and the second is the special one. Nothing you said has been
            thrown away.
          </p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
