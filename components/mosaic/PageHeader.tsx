import type { ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

/**
 * The one page-header pattern for app screens: a quiet eyebrow line (ids,
 * status chips), a lowercase Fraunces title kept to one line where possible,
 * a Geist subtitle for the detail, optional meta row, and right-aligned
 * actions. Typeset only — no marginalia inside the app.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  className,
}: {
  /** Small line above the title (e.g. id · severity · status). */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** One or two lines of detail under the title. */
  subtitle?: ReactNode;
  /** Extra row under the subtitle (pills in use, clocks). */
  meta?: ReactNode;
  /** Right-aligned controls. At most one primary (filled) action per view. */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-wrap items-start gap-x-6 gap-y-4', className)}>
      <div className="min-w-0 flex-1 basis-[28rem]">
        {eyebrow ? (
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">{eyebrow}</div>
        ) : null}
        <h1 className={cn(eyebrow ? 'mt-1.5' : undefined)}>{title}</h1>
        {subtitle ? (
          <div className="mt-1.5 max-w-[75ch] text-[15px] leading-snug text-ink-muted">{subtitle}</div>
        ) : null}
        {meta ? <div className="mt-3">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
