'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Clock, AlertCircle, FileX, User, ArrowUpRight, Stamp, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { ActionDecision } from '@/lib/engine/types';
import { ActionClassChip } from './ActionClassChip';
import { StatusBadge } from './StatusBadge';

/** Live countdown of remaining minutes; returns remaining ms as a float. */
function useCountdown(deadlineMinutes: number | null): number | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(() =>
    deadlineMinutes == null ? null : deadlineMinutes * 60_000,
  );

  useEffect(() => {
    if (deadlineMinutes == null) {
      setRemainingMs(null);
      return;
    }
    const total = deadlineMinutes * 60_000;
    const start = Date.now();
    const tick = () => setRemainingMs(Math.max(0, total - (Date.now() - start)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineMinutes]);

  return remainingMs;
}

function formatCountdown(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ActionCard({
  action,
  children,
  onWhy,
  className,
}: {
  action: ActionDecision;
  /** Buttons slot (e.g. Approve / Escalate). */
  children?: ReactNode;
  /** Called when the "Why?" button is pressed. */
  onWhy?: () => void;
  className?: string;
}) {
  const remainingMs = useCountdown(action.deadline);
  const missing = action.missingEvidence ?? [];
  const urgent = action.deadline != null && (remainingMs ?? 0) <= 15 * 60_000;

  return (
    <article
      className={cn('flex flex-col gap-3 rounded-xl border border-line bg-surface p-4', className)}
      aria-labelledby={`action-${action.ruleId}-title`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={action.status} />
        <ActionClassChip actionClass={action.actionClass} />
        <span className="ml-auto rounded border border-line bg-surface-raised px-2 py-0.5 font-mono text-[11px] text-ink-muted">
          {action.pillId}@{action.pillVersion}
        </span>
      </div>

      <h3 id={`action-${action.ruleId}-title`} className="text-sm font-semibold leading-snug text-ink">
        {action.decision}
      </h3>

      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="flex items-center gap-1 text-ink-muted">
          <User className="size-3.5" aria-hidden="true" /> Owner
        </dt>
        <dd className="text-ink">{action.owner}</dd>

        {action.escalateTo ? (
          <>
            <dt className="flex items-center gap-1 text-ink-muted">
              <ArrowUpRight className="size-3.5" aria-hidden="true" /> Escalate to
            </dt>
            <dd className="text-ink">
              {action.escalateTo.role}
              {action.escalateTo.fallback ? (
                <span className="text-ink-muted"> (fallback: {action.escalateTo.fallback})</span>
              ) : null}
            </dd>
          </>
        ) : null}

        {action.deadline != null ? (
          <>
            <dt className="flex items-center gap-1 text-ink-muted">
              <Clock className="size-3.5" aria-hidden="true" /> Deadline
            </dt>
            <dd className={cn('font-medium tabular-nums', urgent ? 'text-escalate' : 'text-ink')}>
              {remainingMs == null ? `${action.deadline} min` : `${formatCountdown(remainingMs)} left`}
              <span className="sr-only"> (SLA {action.deadline} minutes)</span>
            </dd>
          </>
        ) : null}
      </dl>

      {missing.length > 0 ? (
        <div className="rounded-lg border border-escalate/30 bg-escalate/5 p-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-escalate">
            <FileX className="size-3.5" aria-hidden="true" /> Missing evidence
          </p>
          <ul className="mt-1 space-y-0.5">
            {missing.map((key) => (
              <li key={key} className="flex items-center gap-1.5 text-xs text-escalate/90">
                <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
                <span className="font-mono">{key}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {action.allowedActions?.length ? (
        <p className="text-xs text-ink-muted">
          <span className="font-medium text-ink">Allowed:</span>{' '}
          {action.allowedActions.join('; ')}
        </p>
      ) : null}
      {action.forbiddenActions?.length ? (
        <p className="text-xs text-ink-muted">
          <span className="font-medium text-escalate">Forbidden:</span>{' '}
          {action.forbiddenActions.join('; ')}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {children}
        {onWhy ? (
          <button
            type="button"
            onClick={onWhy}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-ink hover:border-accent"
          >
            <HelpCircle className="size-3.5" aria-hidden="true" />
            Why?
          </button>
        ) : null}
      </div>

      <p className="flex items-center gap-1 text-[11px] text-ink-muted">
        <Stamp className="size-3" aria-hidden="true" />
        Rule {action.ruleId} · nothing executes without a named human.
      </p>
    </article>
  );
}
