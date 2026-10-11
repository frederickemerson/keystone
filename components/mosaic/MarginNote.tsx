import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

export type MarginArrowDirection = 'left' | 'right' | 'up' | 'down' | 'down-left' | 'down-right';

/**
 * A single hand-drawn curved arrow, authored pointing right. Other directions
 * are rotations/flips of the same stroke so every arrow shares one hand.
 */
export function HandArrow({
  direction = 'right',
  className,
}: {
  direction?: MarginArrowDirection;
  className?: string;
}) {
  const transform: Record<MarginArrowDirection, string> = {
    right: 'none',
    left: 'scaleX(-1)',
    down: 'rotate(90deg)',
    up: 'rotate(-90deg) scaleY(-1)',
    'down-right': 'rotate(38deg)',
    'down-left': 'scaleX(-1) rotate(38deg)',
  };
  return (
    <svg
      viewBox="0 0 64 32"
      width="56"
      height="28"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0 overflow-visible text-marker', className)}
      style={{ transform: transform[direction] }}
    >
      <path
        d="M3 22.5c6.5-7.8 15.2-12.4 25.6-12.9 9.1-.4 17.4 2.3 27.1 8.1"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M46.6 10.9c3.4 1.9 6.6 4.2 9.6 7-3.9.6-7.5 1.7-11 3.4"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Handwritten marginalia — the expert's voice. Caveat, marker ink, ≥18px,
 * one or two lines at most. It is real text (readable by screen readers and
 * 4.8:1 on cream); the arrow is decorative. Never use it for anything a user
 * must act on, or for numbers, statuses, ids or deadlines.
 */
export function MarginNote({
  children,
  arrow,
  rotate = -2,
  size = 'md',
  as: Tag = 'p',
  srLabel,
  className,
  style,
}: {
  children: ReactNode;
  /** Draw a hand-drawn arrow pointing this way (left/right sit inline; up/down stack). */
  arrow?: MarginArrowDirection;
  /** Degrees, −2…2 reads as handwriting. */
  rotate?: number;
  size?: 'sm' | 'md' | 'lg';
  as?: 'p' | 'span' | 'div';
  /** Optional typeset equivalent announced instead of the handwritten text. */
  srLabel?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const sizeClass = { sm: 'text-[18px]', md: 'text-[22px]', lg: 'text-[28px]' }[size];
  const stacked = arrow === 'up' || arrow === 'down' || arrow === 'down-left' || arrow === 'down-right';
  const arrowFirst = arrow === 'left' || arrow === 'up';

  const text = srLabel ? (
    <>
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{srLabel}</span>
    </>
  ) : (
    children
  );

  const arrowEl = arrow ? (
    <HandArrow
      direction={arrow}
      className={cn(
        (arrow === 'up' || arrow === 'down') && 'mx-1 my-3.5',
        (arrow === 'down-left' || arrow === 'down-right') && 'my-1.5',
        arrow === 'down-left' && 'self-start', arrow === 'down-right' && 'self-end')}
    />
  ) : null;

  return (
    <Tag
      className={cn(
        'inline-flex max-w-full font-hand font-semibold leading-[1.1] text-marker-ink',
        stacked ? 'flex-col items-start' : 'items-center gap-1.5',
        sizeClass,
        className,
      )}
      style={{ rotate: rotate ? `${rotate}deg` : undefined, ...style }}
    >
      {arrowFirst ? arrowEl : null}
      <span className="min-w-0">{text}</span>
      {!arrowFirst ? arrowEl : null}
    </Tag>
  );
}
