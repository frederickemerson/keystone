import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

const NUMERALS: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/** 1 → "I", 7 → "VII". Non-positive input returns "". */
export function toRoman(n: number): string {
  let rest = Math.floor(n);
  let out = '';
  for (const [value, numeral] of NUMERALS) {
    while (rest >= value) {
      out += numeral;
      rest -= value;
    }
  }
  return out;
}

export interface RomanListItem {
  /** Stable key; defaults to the index. */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Makes the row a link. */
  href?: string;
  /** Marks the current step (aria-current="step"). */
  current?: boolean;
  /** Completed step: title is shown in recommend green with a sr-only "done". */
  done?: boolean;
}

/**
 * A bordered notebook index with roman numerals on the right (I–VII), used
 * for the Learning flow and interview phases. It is a real ordered list, so
 * assistive tech announces position; the numerals themselves are decorative.
 */
export function RomanList({
  items,
  start = 1,
  className,
  layout = 'column',
  'aria-label': ariaLabel,
}: {
  items: RomanListItem[];
  start?: number;
  className?: string;
  /** `row`: one compact strip (numeral above title); descriptions are kept for assistive tech only. */
  layout?: 'column' | 'row';
  'aria-label'?: string;
}) {
  if (layout === 'row') {
    return (
      <ol
        aria-label={ariaLabel}
        className={cn(
          'grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line-strong bg-line shadow-card sm:grid-cols-4 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none',
          className,
        )}
      >
        {items.map((item, i) => {
          const body = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'block font-display-soft text-[13px] font-semibold tabular-nums',
                  item.done ? 'text-recommend' : item.current ? 'text-marker-ink' : 'text-ink-muted',
                )}
              >
                {toRoman(start + i)}
              </span>
              <span
                className={cn(
                  'mt-0.5 block text-[13px] font-medium leading-snug',
                  item.done ? 'text-recommend' : item.current ? 'text-ink' : 'text-ink-muted',
                )}
              >
                {item.title}
                {item.done ? <span className="sr-only"> (done)</span> : null}
              </span>
              {item.description ? <span className="sr-only">: {item.description}</span> : null}
            </>
          );
          const cellClass = cn(
            'relative block h-full px-3.5 py-2.5',
            item.current ? 'bg-dew-drop' : 'bg-surface',
          );
          return (
            <li
              key={item.id ?? i}
              className="relative"
              aria-current={item.current ? 'step' : undefined}
              title={typeof item.description === 'string' ? item.description : undefined}
            >
              {item.current ? (
                <span aria-hidden="true" className="absolute inset-x-2 bottom-0 z-[1] h-[3px] rounded-t-full bg-marker" />
              ) : null}
              {item.href ? (
                <Link
                  href={item.href}
                  className={cn(cellClass, 'transition-colors duration-150 hover:bg-dew-drop focus-visible:-outline-offset-2')}
                >
                  {body}
                </Link>
              ) : (
                <div className={cellClass}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol
      aria-label={ariaLabel}
      className={cn(
        'divide-y divide-line overflow-hidden rounded-xl border border-line-strong bg-surface shadow-card',
        className,
      )}
    >
      {items.map((item, i) => {
        const numeral = toRoman(start + i);
        const body = (
          <>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block text-[15px] font-medium leading-snug',
                  item.done ? 'text-recommend' : 'text-ink',
                )}
              >
                {item.title}
                {item.done ? <span className="sr-only"> (done)</span> : null}
              </span>
              {item.description ? (
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">
                  {item.description}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden="true"
              className="w-10 shrink-0 text-right font-display-soft text-[17px] font-semibold tabular-nums text-ink-muted"
            >
              {numeral}
            </span>
          </>
        );
        const rowClass = cn(
          'relative flex items-center gap-4 px-5 py-3.5',
          item.current && 'bg-dew-drop',
        );
        return (
          <li key={item.id ?? i} className="relative" aria-current={item.current ? 'step' : undefined}>
            {item.current ? (
              <span aria-hidden="true" className="absolute inset-y-2 left-0 z-[1] w-[3px] rounded-r-full bg-marker" />
            ) : null}
            {item.href ? (
              <Link
                href={item.href}
                className={cn(rowClass, 'transition-colors duration-150 hover:bg-dew-drop focus-visible:-outline-offset-2')}
              >
                {body}
              </Link>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
