import { cn } from '@/lib/ui/cn';

export type StickerKind = 'bolt' | 'droplet' | 'shield' | 'star';

// Flat shapes on a 48×48 grid. Each is drawn twice: a fat paper-white stroke
// (the die-cut sticker edge) and then the coloured fill with a 2px ink outline.
const SHAPES: Record<StickerKind, { d: string; fill: string; detail?: string }> = {
  bolt: {
    d: 'M27.5 4.5 10.8 26.4c-.7.9 0 2.1 1.1 2.1h9.6l-3.4 14.2c-.3 1.3 1.4 2.1 2.2 1l17-22.6c.7-.9 0-2.1-1.1-2.1h-9.4l3.1-12.8c.3-1.3-1.5-2-2.4-.7z',
    fill: 'var(--marker-orange)',
  },
  droplet: {
    d: 'M24 4.8c-1 0-1.6.7-2.2 1.6C17 13.4 10.5 21.6 10.5 29.2 10.5 37 16.4 43 24 43s13.5-6 13.5-13.8C37.5 21.6 31 13.4 26.2 6.4c-.6-.9-1.2-1.6-2.2-1.6z',
    fill: 'var(--sticker-blue)',
    detail: 'M18.2 29.6c.2 3.4 2.4 6 5.4 6.8',
  },
  shield: {
    d: 'M24 4.6 9.6 10.2c-.7.3-1.1.9-1.1 1.6v9.7c0 10.2 6.4 17.8 14.8 21.4.5.2 1 .2 1.4 0 8.4-3.6 14.8-11.2 14.8-21.4v-9.7c0-.7-.4-1.3-1.1-1.6z',
    fill: 'var(--sticker-green)',
    detail: 'm17.6 24.2 4.6 4.5 8.6-9.4',
  },
  star: {
    d: 'M24 5.2c.6 0 1.1.3 1.4.9l4.7 9.6 10.6 1.5c1.3.2 1.8 1.8.9 2.7l-7.7 7.5 1.8 10.5c.2 1.3-1.1 2.3-2.3 1.7L24 34.6l-9.4 5c-1.2.6-2.5-.4-2.3-1.7l1.8-10.5-7.7-7.5c-.9-.9-.4-2.5.9-2.7l10.6-1.5 4.7-9.6c.3-.6.8-.9 1.4-.9z',
    fill: 'var(--sticker-pink)',
  },
};

/**
 * Small flat SVG sticker (bolt = incident, droplet = water, shield = gate,
 * star = approved). Decorative only: aria-hidden, never inside data areas —
 * landing page and empty states.
 */
export function Sticker({
  kind,
  size = 40,
  rotate = 0,
  className,
}: {
  kind: StickerKind;
  /** Rendered width/height in px. */
  size?: number;
  /** Degrees. */
  rotate?: number;
  className?: string;
}) {
  const shape = SHAPES[kind];
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn('inline-block shrink-0 drop-shadow-[0_2px_3px_rgb(43_26_7/0.14)]', className)}
      style={rotate ? { rotate: `${rotate}deg` } : undefined}
    >
      <path d={shape.d} fill="#fffefc" stroke="#fffefc" strokeWidth="7" strokeLinejoin="round" />
      <path d={shape.d} fill={shape.fill} stroke="var(--charcoal)" strokeWidth="2" strokeLinejoin="round" />
      {shape.detail ? (
        <path
          d={shape.detail}
          fill="none"
          stroke={kind === 'droplet' ? '#fffefc' : 'var(--charcoal)'}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}
