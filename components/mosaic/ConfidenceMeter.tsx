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
    <div className={cn('rounded-xl border border-line-strong bg-surface p-4 shadow-card', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px]">
        <span className="font-medium text-ink">{label}</span>
        <span className="font-medium tabular-nums text-ink">
          {safeConfirmed} of {safeRequired} required evidence confirmed
        </span>
      </div>

      <div className="mt-2.5 flex gap-1.5" role="img" aria-label={`${safeConfirmed} of ${safeRequired} required evidence confirmed`}>
        {segments.length === 0 ? (
          <span className="h-2.5 flex-1 rounded-full border border-line bg-dew-drop" aria-hidden="true" />
        ) : (
          segments.map((filled, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn(
                'h-2.5 flex-1 rounded-full border',
                filled ? 'border-recommend bg-recommend' : 'border-line bg-dew-drop',
              )}
            />
          ))
        )}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-ink-muted">Count of confirmed sources, not a probability.</p>
    </div>
  );
}
