'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X, Quote, CheckCircle2, AlertCircle, ShieldAlert, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type {
  WhyDrawerEvidence,
  WhyDrawerRule,
  WhyDrawerExpertSource,
} from './types';
import { ExpertQuote } from './ExpertQuote';

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
        className="absolute inset-0 bg-cocoa-ink/30"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line-strong bg-canvas px-6 py-5 shadow-lift outline-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
          <h2 className="text-[22px] font-semibold leading-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close why drawer"
            className="grid size-9 shrink-0 place-items-center rounded-full border-[1.5px] border-ink text-ink transition-[background-color,scale] duration-150 hover:bg-dew-drop active:scale-[0.96]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Evidence used */}
          <Section
            icon={<CheckCircle2 className="size-4 text-recommend" aria-hidden="true" />}
            heading="Evidence used"
          >
            {evidenceUsed.length === 0 ? (
              <p className="text-[13px] text-ink-muted">No evidence recorded.</p>
            ) : (
              <ul className="space-y-1">
                {evidenceUsed.map((e) => (
                  <li key={e.key} className="flex items-center gap-2 text-[13px]">
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
            icon={<ShieldAlert className="size-4 text-ink" aria-hidden="true" />}
            heading="Rule"
          >
            <div className="rounded-xl border border-line-strong bg-surface px-4 py-3 shadow-card">
              <p className="font-mono text-[13px] font-medium text-ink">
                {rule.id}@{rule.version}
              </p>
              <p className="mt-0.5 text-[14px] leading-snug text-ink">{rule.title}</p>
            </div>
          </Section>

          {/* Expert source */}
          <Section
            icon={<Quote className="size-4 text-ink" aria-hidden="true" />}
            heading="Expert source"
          >
            <div className="pt-3">
              <ExpertQuote
                quote={expertSource.quote}
                expert={expertSource.expert ?? 'the expert'}
                role={expertSource.role}
                source={expertSource.source}
                timestamp={expertSource.timestamp}
                onPlay={
                  onPlay
                    ? () => onPlay(expertSource.source ?? '', expertSource.timestamp, undefined)
                    : undefined
                }
              />
            </div>
          </Section>

          {/* Missing evidence */}
          <Section
            icon={<AlertCircle className="size-4 text-blocked" aria-hidden="true" />}
            heading="Missing evidence"
          >
            {missingEvidence.length === 0 ? (
              <p className="flex items-center gap-1.5 text-[13px] text-recommend">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                None — all required evidence present.
              </p>
            ) : (
              <ul className="space-y-1">
                {missingEvidence.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-[13px] text-blocked">
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
              <p className="text-[13px] text-ink-muted">No counterfactuals available.</p>
            ) : (
              <ul className="list-disc space-y-1.5 pl-4 text-[14px] leading-relaxed text-ink marker:text-ink-muted">
                {counterfactuals.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </Section>

          {/* Risk if ignored */}
          <Section
            icon={<AlertTriangle className="size-4 text-blocked" aria-hidden="true" />}
            heading="Risk if ignored"
          >
            <p className="rounded-lg border border-blocked/30 bg-blocked-tint px-3 py-2.5 text-[14px] leading-relaxed text-ink">
              {riskIfIgnored}
            </p>
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
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        {icon}
        {heading}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}
