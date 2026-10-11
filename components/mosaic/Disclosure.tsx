'use client';

// Progressive disclosure primitives: show a one-line summary, keep the full
// text one keyboard-accessible click away. Nothing is removed from the DOM
// tree's reach — only collapsed.

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

/**
 * First sentence of a block of prose — the short title shown on a card.
 * Splits on a sentence terminator followed by whitespace and a capital/quote,
 * so "e.g. a valve" and "v1.2.0" never cut the sentence.
 */
export function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^(.+?[.!?])\s+(?=[A-Z"'“(])/);
  return match ? match[1] : trimmed;
}

/** True when `firstSentence` dropped something worth showing. */
export function hasMoreThanFirstSentence(text: string): boolean {
  return firstSentence(text).length < text.trim().length;
}

/**
 * A "Details" toggle with a collapsible region. The trigger is a real button
 * with aria-expanded / aria-controls; the region is unmounted while closed.
 */
export function Disclosure({
  label = 'Details',
  openLabel,
  summary,
  children,
  defaultOpen = false,
  className,
  buttonClassName,
}: {
  label?: ReactNode;
  /** Label while open; defaults to `label`. */
  openLabel?: ReactNode;
  /** Optional muted hint shown next to the trigger while closed (e.g. "4 allowed · 3 forbidden"). */
  summary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'group -mx-1 inline-flex min-h-8 items-center gap-1.5 rounded-md px-1 text-[13px] font-medium text-ink transition-colors duration-150 hover:bg-dew-drop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
          buttonClassName,
        )}
      >
        <ChevronDown
          className={cn('size-3.5 text-ink-muted transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
        {open ? (openLabel ?? label) : label}
        {!open && summary ? <span className="font-normal text-ink-muted">· {summary}</span> : null}
      </button>
      {open ? (
        <div id={id} className="mt-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Paragraph clamped to `lines` lines with a "More" / "Less" toggle that only
 * appears when the text actually overflows.
 */
export function ClampText({
  children,
  lines = 2,
  className,
}: {
  children: ReactNode;
  lines?: 2 | 3;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setOverflows(el.scrollHeight - el.clientHeight > 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, children]);

  return (
    <div className={className}>
      <p
        ref={ref}
        id={id}
        className={cn(
          'text-pretty',
          !open && (lines === 2 ? 'line-clamp-2' : 'line-clamp-3'),
        )}
      >
        {children}
      </p>
      {overflows || open ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="-mx-1 mt-0.5 rounded px-1 text-xs font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {open ? 'Less' : 'More'}
        </button>
      ) : null}
    </div>
  );
}
