import type { ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

/**
 * One key word per screen, underlined with a wobbly marker-orange stroke
 * ("blocked", "learns", "governed"). The word itself stays in ink so contrast
 * is unchanged; the stroke is decorative.
 */
export function MarkerHighlight({
  children,
  variant = 'underline',
  className,
}: {
  children: ReactNode;
  /** `underline` = wobbly stroke beneath; `swash` = thicker, translucent highlighter sweep behind. */
  variant?: 'underline' | 'swash';
  className?: string;
}) {
  return (
    <span className={cn('relative inline-block whitespace-nowrap', className)}>
      <span className="relative z-[1]">{children}</span>
      {variant === 'underline' ? (
        <svg
          viewBox="0 0 200 14"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
          className="pointer-events-none absolute -bottom-[0.28em] left-[-2%] h-[0.42em] w-[104%] text-marker"
        >
          <path
            d="M2 9.2C24 5.6 44 4.3 70 6.1c22 1.5 37 4.4 62 3.1 23-1.2 41-4.9 66-5.7"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M14 11.6c30-2.9 66-2.4 98-1.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.7"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 200 40"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
          className="pointer-events-none absolute inset-x-[-3%] bottom-[0.05em] h-[0.62em] w-[106%] text-marker opacity-30"
        >
          <path
            d="M3 22c40-6 92-9 194-7l-2 18C120 30 62 31 6 35z"
            fill="currentColor"
          />
        </svg>
      )}
    </span>
  );
}
