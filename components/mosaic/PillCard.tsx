import { CalendarClock, CircleDashed, Eye, BadgeCheck, Archive, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { PillCardData, PillStatus } from './types';
import { PillLabel } from './PillLabel';
import { pillDisplayName } from './pillTitle';
import { CHIP_BASE, TONE_CHIP, type Tone } from './tones';

const STATUS: Record<PillStatus, { tone: Tone; icon: LucideIcon; extra?: string }> = {
  Draft: { tone: 'neutral', icon: CircleDashed },
  Shadow: { tone: 'approval', icon: Eye },
  Approved: { tone: 'recommend', icon: BadgeCheck },
  Retired: { tone: 'neutral', icon: Archive, extra: 'line-through' },
};

/** "technical-services" → "Technical Services". */
function humanize(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Same wording as the registry detail's "Equipment classes (Brick)" row. */
export function equipmentClassesLabel(count: number): string {
  return `${count} equipment class${count === 1 ? '' : 'es'} (Brick)`;
}

export function PillCard({ data, className }: { data: PillCardData; className?: string }) {
  const evalTotal = data.evalPass.total || 0;
  const evalPct = evalTotal > 0 ? Math.round((data.evalPass.pass / evalTotal) * 100) : 0;
  const classes = data.equipmentClasses;
  const classList = classes.join(', ');
  const status = STATUS[data.status];
  const StatusIcon = status.icon;

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-line-strong bg-surface p-4 shadow-card',
        className,
      )}
      aria-label={`Pill ${data.domain}/${data.name}`}
    >
      <PillLabel
        name={pillDisplayName(data.name)}
        pillClass={humanize(data.domain)}
        version={data.version}
        owner={data.owner}
        approver={data.approver}
        nameAs="h3"
        size="sm"
      />

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span
          className={cn(CHIP_BASE, TONE_CHIP[status.tone], status.extra)}
          role="status"
          aria-label={`Status: ${data.status}`}
        >
          <StatusIcon className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
          {data.status}
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-ink-muted">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            Steward <span className="font-medium text-ink">{data.steward}</span>
          </span>
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line text-xs">
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
      </dl>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <span>
          Covers{' '}
          <span className="font-medium tabular-nums text-ink" title={classList || undefined}>
            {equipmentClassesLabel(classes.length)}
          </span>
          {classes.length ? <span className="sr-only">: {classList}</span> : null}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5" aria-hidden="true" />
          Next review <span className="font-mono tabular-nums text-ink">{data.nextReviewDate}</span>
        </span>
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
    <div className="bg-surface px-3 py-2">
      <dt className="text-[11px] text-ink-muted">{label}</dt>
      <dd className={cn('mt-0.5 flex items-baseline gap-1.5 text-sm font-semibold tabular-nums text-ink', tone)}>
        {value}
        {hint ? <span className="text-[11px] font-normal text-ink-muted">{hint}</span> : null}
      </dd>
    </div>
  );
}
