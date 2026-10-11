import { cn } from '@/lib/ui/cn';

/**
 * MOSAIC mark: a loose, hand-inked ring with a marker-orange pencil tick —
 * a judgement, checked. Decorative; pair with the visible wordmark.
 */
export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      <path
        d="M21.6 4.2c-8.9-.6-16.4 5.5-17.3 14-.9 8.8 5.2 16.6 14.4 17.6 8.7.9 16.3-4.9 17.2-13.5.7-6.6-2.7-12.4-8.5-15.4"
        stroke="var(--charcoal)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M27.2 6.2c.9.5 1.8 1 2.6 1.7"
        stroke="var(--charcoal)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M12.4 20.8c1.9 1.3 3.6 3 5 5.1.3.4.9.4 1.1-.1 2.6-5.8 6.2-10.6 11.4-14.6"
        stroke="var(--marker-orange)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Wobbly marker underline used for the active nav item. Decorative. */
export function NavScribble({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 10"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none text-marker', className)}
    >
      <path
        d="M2 6.4C20 3.6 38 3.1 58 4.6c18 1.4 35 2.6 60-.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
