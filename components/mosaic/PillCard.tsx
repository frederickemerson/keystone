import { User, ShieldCheck, BadgeCheck, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { PillCardData, PillStatus } from './types';

const STATUS_TONE: Record<PillStatus, string> = {
  Draft: 'border-line bg-surface-raised text-ink-muted',
  Shadow: 'border-approval/30 bg-approval/10 text-approval',
  Approved: 'border-recommend/30 bg-recommend/10 text-recommend',
  Retired: 'border-line bg-surface-raised text-ink-muted line-through',
};

export function PillCard({ data, className }: { data: PillCardData; className?: string }) {
  const evalTotal = data.evalPass.total || 0;
  const evalPct = evalTotal > 0 ? Math.round((data.evalPass.pass / evalTotal) * 100) : 0;
  const assets =
    typeof data.assetsCovered === 'number'
      ? `${data.assetsCovered} asset${data.assetsCovered === 1 ? '' : 's'}`
      : data.assetsCovered.join(', ');

  return (
    <article
      className={cn('flex flex-col gap-3 rounded-xl border border-line bg-surface p-4', className)}
      aria-label={`Pill ${data.domain}/${data.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-ink-muted">{data.domain}</p>
          <h3 className="truncate text-sm font-semibold text-ink">{data.name}</h3>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium',
            STATUS_TONE[data.status],
          )}
          role="status"
          aria-label={`Status: ${data.status}`}
        >
          {data.status}
        </span>
      </div>

      <p className="font-mono text-[11px] text-ink-muted">v{data.version}</p>

      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="flex items-center gap-1 text-ink-muted">
          <User className="size-3.5" aria-hidden="true" /> Owner
        </dt>
        <dd className="truncate text-ink">{data.owner}</dd>

        <dt className="flex items-center gap-1 text-ink-muted">
          <ShieldCheck className="size-3.5" aria-hidden="true" /> Steward
        </dt>
        <dd className="truncate text-ink">{data.steward}</dd>

        <dt className="flex items-center gap-1 text-ink-muted">
          <BadgeCheck className="size-3.5" aria-hidden="true" /> Approver
        </dt>
        <dd className="truncate text-ink">{data.approver}</dd>
      </dl>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric label="Assets covered" value={assets} />
        <Metric
          label="Eval pass"
          value={`${data.evalPass.pass}/${data.evalPass.total}`}
          hint={`${evalPct}%`}
        />
        <Metric label="Shadow agreements" value={String(data.shadowAgreements)} />
        <Metric
          label="Pending corrections"
          value={String(data.pendingCorrections)}
          tone={data.pendingCorrections > 0 ? 'text-approval' : undefined}
        />
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
        <CalendarClock className="size-3.5" aria-hidden="true" />
        Next review: {data.nextReviewDate}
      </p>
    </article>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-raised/50 p-2">
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={cn('mt-0.5 flex items-baseline gap-1 text-sm font-semibold tabular-nums text-ink', tone)}>
        {value}
        {hint ? <span className="text-[11px] font-normal text-ink-muted">{hint}</span> : null}
      </p>
    </div>
  );
}
