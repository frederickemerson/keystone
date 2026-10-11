import { cn } from '@/lib/ui/cn';

export function ConfidenceMeter({
  required,
  confirmed,
  label = 'Evidence confidence',
  className,
}: {
  /** Total number of required evidence items. */
  required: number;
  /** Number of those items that are confirmed. */
  confirmed: number;
  label?: string;
  className?: string;
}) {
  const safeRequired = Math.max(0, required);
  const safeConfirmed = Math.min(Math.max(0, confirmed), safeRequired);
  const segments = Array.from({ length: safeRequired }, (_, i) => i < safeConfirmed);

  return (
    <div className={cn('rounded-lg border border-line bg-surface p-3', className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="font-semibold tabular-nums text-ink">
          {safeConfirmed} of {safeRequired} required evidence confirmed
        </span>
      </div>

      <div className="mt-2 flex gap-1" role="img" aria-label={`${safeConfirmed} of ${safeRequired} required evidence confirmed`}>
        {segments.length === 0 ? (
          <span className="h-2 flex-1 rounded-full bg-surface-raised" aria-hidden="true" />
        ) : (
          segments.map((filled, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn('h-2 flex-1 rounded-full', filled ? 'bg-recommend' : 'bg-surface-raised')}
            />
          ))
        )}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-ink-muted">
        Evidence coverage from confirmed sources — not a probability or confidence percentage.
      </p>
    </div>
  );
}
