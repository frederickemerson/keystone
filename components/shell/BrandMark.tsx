import { cn } from '@/lib/ui/cn';

/** Geometry shared by the mark and app/icon.svg (32-unit grid). */
const KEYSTONE = 'M13 24 L10 6 L22 6 L19 24Z';
const VOUSSOIR_LEFT = 'M11.16 25 L9.34 14 L3.6 17.2 L7.4 27.2Z';
const VOUSSOIR_RIGHT = 'M20.84 25 L22.66 14 L28.4 17.2 L24.6 27.2Z';

export type BrandTone = 'default' | 'onBrand' | 'onDark';

/**
 * Keystone mark: the crown of an arch. Two night-ink voussoirs lean in on a
 * brand-orange keystone (--brand-keystone), the wedge that locks the arch. On the orange brand
 * band the keystone turns cream so it never disappears. Decorative; pair with
 * the visible wordmark (BrandLogo) or an aria-label on the parent link.
 */
export function BrandMark({
  className,
  size = 32,
  tone = 'default',
}: {
  className?: string;
  size?: number;
  tone?: BrandTone;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      <path d={VOUSSOIR_LEFT} fill={tone === 'onDark' ? '#ffffff' : 'var(--charcoal)'} />
      <path d={VOUSSOIR_RIGHT} fill={tone === 'onDark' ? '#ffffff' : 'var(--charcoal)'} />
      <path d={KEYSTONE} fill={tone === 'onBrand' ? 'var(--cream-paper)' : 'var(--brand-keystone)'} />
    </svg>
  );
}

/** Mark + "Keystone" wordmark (Geist 600, -0.02em). Decorative text is real text. */
export function BrandLogo({
  className,
  markSize = 32,
  textClassName = 'text-[24px]',
  tone = 'default',
  subtitle,
}: {
  className?: string;
  markSize?: number;
  textClassName?: string;
  tone?: BrandTone;
  subtitle?: string;
}) {
  return (
    <span className={cn('inline-grid grid-cols-[auto_auto] items-center gap-x-2', className)}>
      <BrandMark size={markSize} tone={tone} />
      <span className={cn('font-display font-semibold leading-none tracking-[-0.02em]', tone === 'onDark' ? 'text-white' : 'text-charcoal', textClassName)}>
        Keystone
      </span>
      {subtitle ? (
        <span className={cn('col-start-2 mt-1 text-xs leading-none', tone === 'onDark' ? 'text-white/65' : 'text-ink-muted')}>{subtitle}</span>
      ) : null}
    </span>
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
