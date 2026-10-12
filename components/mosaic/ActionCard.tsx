'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Clock, AlertCircle, FileX, User, ArrowUpRight, Stamp, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { ActionClass, ActionDecision, ActionStatus } from '@/lib/engine/types';
import { ActionClassChip } from './ActionClassChip';
import { StatusBadge } from './StatusBadge';
import { PersonaName } from './PersonaName';
import { Disclosure, firstSentence } from './Disclosure';
import { actionAnchorId } from '@/lib/journey/routes';

/**
 * The status an action class yields on its own, when no evidence gate
 * intervenes (engine status precedence, lib/engine/evaluate computeStatus).
 * When the status equals this, the class chip only repeats it.
 */
const CLASS_UNGATED_STATUS: Record<ActionClass, ActionStatus> = {
  must_escalate: 'escalate',
  requires_approval: 'needs_approval',
  recommend: 'allowed',
};

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

/** "4:56" under an hour; "23 h 59 min" from an hour up (a 24-hour deadline is not "1439:57"). */
function formatCountdown(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) return `${Math.floor(m / 60)} h ${m % 60} min`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ActionCard({
  action,
  title,
  ownerLabel,
  escalateLabel,
  details,
  children,
  onWhy,
  className,
}: {
  action: ActionDecision;
  /** Short title (e.g. the rule title). Defaults to the decision's first sentence. */
  title?: ReactNode;
  /** Named human for the owner, when the caller resolves it per asset. Defaults to the role persona. */
  ownerLabel?: ReactNode;
  /** Named human for escalation, when the caller resolves it per asset. Defaults to the role persona. */
  escalateLabel?: ReactNode;
  /** Extra secondary content shown inside the "Details" disclosure. */
  details?: ReactNode;
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
      id={actionAnchorId(action.ruleId)}
      className={cn(
        'scroll-mt-24',
        // min-w-0: as a grid/flex item the card must shrink to its track, never
        // grow to fit a long nowrap child (that pushed actions off-screen).
        'flex min-w-0 flex-col gap-3 rounded-xl border border-line-strong bg-surface p-5 shadow-card',
        className,
      )}
      aria-labelledby={`action-${action.ruleId}-title`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={action.status} />
        {CLASS_UNGATED_STATUS[action.actionClass] !== action.status ? (
          <ActionClassChip actionClass={action.actionClass} />
        ) : null}
        <span className="ml-auto rounded-full border border-line bg-dew-drop px-2 py-0.5 font-mono text-[11px] tabular-nums text-ink-muted">
          {action.pillId}@{action.pillVersion}
        </span>
      </div>

      <h3
        id={`action-${action.ruleId}-title`}
        className="text-[15px] font-medium leading-snug text-ink"
      >
        {title ?? firstSentence(action.decision)}
      </h3>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-y border-line py-2.5 text-[13px]">
        <dt className="flex items-center gap-1.5 text-ink-muted">
          <User className="size-3.5" aria-hidden="true" /> Owner
        </dt>
        <dd className="min-w-0 text-ink">
          {ownerLabel ?? <PersonaName role={action.owner} />}
        </dd>

        {action.escalateTo || escalateLabel ? (
          <>
            <dt className="flex items-center gap-1.5 text-ink-muted">
              <ArrowUpRight className="size-3.5" aria-hidden="true" /> Escalate to
            </dt>
            <dd className="min-w-0 text-ink">
              {escalateLabel ?? (action.escalateTo ? <PersonaName role={action.escalateTo.role} /> : null)}
            </dd>
          </>
        ) : null}

        {action.deadline != null ? (
          <>
            <dt className="flex items-center gap-1.5 text-ink-muted">
              <Clock className="size-3.5" aria-hidden="true" /> Deadline
            </dt>
            <dd
              className={cn(
                'relative font-mono font-medium tabular-nums',
                urgent ? 'text-escalate' : 'text-ink',
              )}
            >
              {remainingMs == null ? `${action.deadline} min` : `${formatCountdown(remainingMs)} left`}
              <span className="sr-only"> (SLA {action.deadline} minutes)</span>
            </dd>
          </>
        ) : null}
      </dl>

      {missing.length > 0 ? (
        <div className="rounded-lg border border-blocked/35 bg-blocked-tint px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-blocked">
            <FileX className="size-3.5" aria-hidden="true" />
            Missing evidence <span className="tabular-nums">({missing.length})</span>
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Missing evidence keys">
            {missing.map((key) => (
              <li
                key={key}
                className="inline-flex items-center gap-1 rounded-full border border-blocked/30 bg-surface/60 px-2 py-0.5 font-mono text-[11px] text-blocked"
              >
                <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
                {key}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Disclosure
        label="Details"
        summary={[
          action.allowedActions?.length ? `${action.allowedActions.length} allowed` : null,
          action.forbiddenActions?.length ? `${action.forbiddenActions.length} forbidden` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      >
        <div className="space-y-2.5 rounded-lg bg-dew-drop/60 px-3 py-2.5 text-[13px] leading-relaxed">
          <p className="text-pretty text-ink">
            <span className="font-medium">Decision:</span> {action.decision}
          </p>
          {action.allowedActions?.length ? (
            <div>
              <p className="font-medium text-recommend">Allowed</p>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-ink">
                {action.allowedActions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {action.forbiddenActions?.length ? (
            <div>
              <p className="font-medium text-blocked">Forbidden</p>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-blocked">
                {action.forbiddenActions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {action.escalateTo?.fallback ? (
            <p className="text-ink">
              <span className="font-medium">Escalation fallback:</span>{' '}
              <PersonaName role={action.escalateTo.fallback} />
            </p>
          ) : null}
          {details}
        </div>
      </Disclosure>

      <div className="mt-auto flex min-w-0 flex-wrap items-center gap-2 pt-1">
        {children}
        {onWhy ? (
          <button type="button" onClick={onWhy} className="btn-pill ml-auto text-xs">
            <HelpCircle className="size-3.5" aria-hidden="true" />
            Why?
          </button>
        ) : null}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
        <Stamp className="size-3" aria-hidden="true" />
        <span>
          Rule <span className="font-mono text-ink">{action.ruleId}</span> · named human required
        </span>
      </p>
    </article>
  );
}
