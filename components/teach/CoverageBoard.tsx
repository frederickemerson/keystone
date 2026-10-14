'use client';

// What is still unknown about the rule being written.
//
// This is the piece the old interview had no way to show. A 31-probe script
// can show you how far through the script you are; it cannot show you what is
// missing, because "missing" needs something to be missing from. Here the
// board is the fields of an engine Rule (lib/teach/parts), so a grey square is
// a real gap in a real artefact and not a progress bar.
//
// It is deliberately readable as a glance AND as a list: the squares carry the
// mood, the labels carry the meaning, and the whole thing is a <ul> so a
// screen reader gets the same information in the same order.

import { Check } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import { ESSENTIAL_PARTS, PART_LABELS, RULE_PARTS, type RulePart } from '@/lib/teach/parts';

export interface CoverageBoardProps {
  covered: ReadonlySet<RulePart>;
  /** Parts no question in this exercise can close, shown as unreachable rather than merely empty. */
  reachable: ReadonlySet<RulePart>;
  /** The part the current question is about, so the eye knows where to look. */
  active?: RulePart;
  className?: string;
}

export function CoverageBoard({ covered, reachable, active, className }: CoverageBoardProps) {
  const done = RULE_PARTS.filter((p) => reachable.has(p) && covered.has(p)).length;
  const total = RULE_PARTS.filter((p) => reachable.has(p)).length;

  return (
    <section className={cn('rounded-xl border border-line bg-surface p-4', className)}>
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-medium text-ink">What the rule still needs</h2>
        <span className="font-mono text-[12px] tabular-nums text-ink-muted">
          {done} of {total}
        </span>
      </header>

      <ul className="space-y-1.5">
        {RULE_PARTS.map((part) => {
          const isCovered = covered.has(part);
          const isReachable = reachable.has(part);
          const isActive = active === part;
          const essential = ESSENTIAL_PARTS.includes(part);
          return (
            <li
              key={part}
              className={cn(
                'flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-300',
                isActive && 'bg-dew-drop',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors duration-300',
                  isCovered
                    ? 'border-charcoal bg-charcoal text-cream-paper'
                    : isReachable
                      ? 'border-line-strong bg-transparent'
                      : 'border-dashed border-line bg-transparent',
                )}
                aria-hidden="true"
              >
                {isCovered ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0">
                <span className={cn('text-[13px]', isCovered ? 'text-ink' : 'text-ink-muted')}>
                  {PART_LABELS[part].label}
                </span>
                {essential && !isCovered ? (
                  <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wide text-marker">needed</span>
                ) : null}
                {!isReachable ? (
                  <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
                    not asked here
                  </span>
                ) : null}
                {isActive ? (
                  <span className="block text-[12px] leading-snug text-ink-muted">{PART_LABELS[part].asks}</span>
                ) : null}
                <span className="sr-only">
                  {isCovered ? ' — answered' : isReachable ? ' — still open' : ' — no question in this exercise covers it'}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
