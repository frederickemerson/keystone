'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X, Play, Quote, CheckCircle2, AlertCircle, ShieldAlert, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type {
  WhyDrawerEvidence,
  WhyDrawerRule,
  WhyDrawerExpertSource,
} from './types';

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function WhyDrawer({
  open,
  onClose,
  title = 'Why this decision',
  evidenceUsed,
  rule,
  expertSource,
  onPlay,
  missingEvidence,
  counterfactuals,
  riskIfIgnored,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  evidenceUsed: WhyDrawerEvidence[];
  rule: WhyDrawerRule;
  expertSource: WhyDrawerExpertSource;
  onPlay?: (source: string, start?: string, end?: string) => void;
  missingEvidence: string[];
  /** Plain-English "what would change the decision" sentences. */
  counterfactuals: string[];
  riskIfIgnored: string;
  className?: string;
  /** Screen-specific content rendered after the standard sections. */
  children?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (focusables?.[0] ?? panel)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab' && panel) {
        const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (items.length === 0) {
          event.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={cn('fixed inset-0 z-50 flex justify-end', className)} role="presentation">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-surface p-5 shadow-xl outline-none"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close why drawer"
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-raised hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {/* Evidence used */}
          <Section
            icon={<CheckCircle2 className="size-4 text-recommend" aria-hidden="true" />}
            heading="Evidence used"
          >
            {evidenceUsed.length === 0 ? (
              <p className="text-xs text-ink-muted">No evidence recorded.</p>
            ) : (
              <ul className="space-y-1">
                {evidenceUsed.map((e) => (
                  <li key={e.key} className="flex items-center gap-2 text-xs">
                    {e.confirmed ? (
                      <CheckCircle2 className="size-3.5 text-recommend" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="size-3.5 text-approval" aria-hidden="true" />
                    )}
                    <span className="font-mono text-ink">{e.key}</span>
                    <span className="text-ink-muted">{e.confirmed ? 'confirmed' : 'unconfirmed'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Rule */}
          <Section
            icon={<ShieldAlert className="size-4 text-accent" aria-hidden="true" />}
            heading="Rule"
          >
            <p className="text-sm font-medium text-ink">
              {rule.id}@{rule.version}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">{rule.title}</p>
          </Section>

          {/* Expert source */}
          <Section
            icon={<Quote className="size-4 text-accent" aria-hidden="true" />}
            heading="Expert source"
          >
            <blockquote className="border-l-2 border-accent/40 pl-3 text-xs italic leading-relaxed text-ink">
              “{expertSource.quote}”
            </blockquote>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-ink-muted">
                {expertSource.source ?? 'expert'} · {expertSource.timestamp}
              </span>
              {onPlay ? (
                <button
                  type="button"
                  onClick={() => onPlay(expertSource.source ?? '', expertSource.timestamp, undefined)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2.5 py-1 text-xs font-medium text-ink hover:border-accent"
                >
                  <Play className="size-3.5" aria-hidden="true" />
                  Hear the expert
                </button>
              ) : null}
            </div>
          </Section>

          {/* Missing evidence */}
          <Section
            icon={<AlertCircle className="size-4 text-escalate" aria-hidden="true" />}
            heading="Missing evidence"
          >
            {missingEvidence.length === 0 ? (
              <p className="text-xs text-recommend">None — all required evidence present.</p>
            ) : (
              <ul className="space-y-1">
                {missingEvidence.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-xs text-escalate">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    <span className="font-mono">{key}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Counterfactuals */}
          <Section
            icon={<AlertTriangle className="size-4 text-approval" aria-hidden="true" />}
            heading="What would change the decision"
          >
            {counterfactuals.length === 0 ? (
              <p className="text-xs text-ink-muted">No counterfactuals available.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-4 text-xs text-ink">
                {counterfactuals.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </Section>

          {/* Risk if ignored */}
          <Section
            icon={<AlertTriangle className="size-4 text-escalate" aria-hidden="true" />}
            heading="Risk if ignored"
          >
            <p className="text-xs leading-relaxed text-ink">{riskIfIgnored}</p>
          </Section>

          {/* Screen-specific content */}
          {children}
        </div>
      </aside>
    </div>
  );
}

function Section({
  icon,
  heading,
  children,
}: {
  icon: ReactNode;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {icon}
        {heading}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}
