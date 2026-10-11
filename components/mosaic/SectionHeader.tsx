import { cn } from '@/lib/ui/cn';
import type { ReactNode } from 'react';

export function SectionHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4 border-b border-line pb-2.5', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <span className="mt-1.5 shrink-0 text-ink-muted">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="text-[21px] font-semibold leading-tight text-heading">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-[70ch] text-[13px] leading-snug text-ink-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
