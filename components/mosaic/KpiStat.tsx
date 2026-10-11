import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

export function KpiStat({
  label,
  value,
  delta,
  unit,
  className,
}: {
  label: string;
  value: string | number;
  /** Signed change vs. previous period. Positive = up, negative = down. */
  delta?: number;
  unit?: string;
  className?: string;
}) {
  const dir: 'up' | 'down' | 'none' =
    delta == null ? 'none' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'none';
  const DeltaIcon: LucideIcon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;
  const deltaTone =
    dir === 'up' ? 'text-recommend' : dir === 'down' ? 'text-blocked' : 'text-ink-muted';

  return (
    <div className={cn('rounded-xl border border-line-strong bg-surface px-4 py-3.5 shadow-card', className)}>
      <p className="text-[13px] leading-snug text-ink-muted">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-ink">{value}</span>
        {unit ? <span className="text-[13px] font-medium text-ink-muted">{unit}</span> : null}
      </p>
      {delta != null ? (
        <p className={cn('mt-1.5 flex items-center gap-1 text-xs font-medium tabular-nums', deltaTone)}>
          <DeltaIcon className="size-3.5" aria-hidden="true" />
          <span>
            {delta > 0 ? '+' : ''}
            {delta}
            {unit ? ` ${unit}` : ''}
          </span>
          <span className="sr-only">{dir === 'up' ? 'increase' : dir === 'down' ? 'decrease' : 'no change'}</span>
        </p>
      ) : null}
    </div>
  );
}
