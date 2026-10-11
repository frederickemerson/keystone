'use client';

import { useId } from 'react';
import { Check, EyeOff, Mail, X } from 'lucide-react';
import { StatusBadge } from '@/components/mosaic';
import type { ActionStatus } from '@/lib/engine/types';
import { canSee, redact, roleLabel } from '@/lib/governance/access';
import type { ActionDecisionRecord, ActionOutcome } from '@/lib/governance/store';
import type { TenantMessageFixture } from '@/lib/data/schemas';
import { cn } from '@/lib/ui/cn';
import { DecisionStamp } from './DecisionButtons';
import { tenantMessagePermission } from './permissions';
import { formatClock } from './labels';

type Draft = TenantMessageFixture['drafts'][number];

function minutesBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000);
}

function DraftCard({
  draft,
  role,
  replayAt,
  gate,
  record,
  onDecide,
}: {
  draft: Draft;
  role: string;
  replayAt: string | null;
  gate: { ruleId: string; status: ActionStatus; missing: string[] } | null;
  record: ActionDecisionRecord | undefined;
  onDecide: (draft: Draft, outcome: ActionOutcome) => void;
}) {
  const reasonId = useId();
  const visible = redact(draft, role);
  const masked = !canSee(role, draft.sensitivity);
  const permission = tenantMessagePermission(role, draft.approved_by_role);
  const left = replayAt ? minutesBetween(replayAt, draft.sla_first_notice_deadline) : null;

  return (
    <article className="rounded-xl border border-approval/40 bg-surface p-4" aria-labelledby={`${reasonId}-subj`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-approval/40 bg-approval/10 px-2.5 py-0.5 text-xs font-semibold text-approval">
          <Mail className="size-3.5" aria-hidden="true" />
          Draft — requires {roleLabel(draft.approved_by_role)} approval
        </span>
        <span className="text-[11px] text-ink-muted">
          {draft.channel} · recorded LLM draft {draft.draft_id}
        </span>
        {masked ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted">
            <EyeOff className="size-3.5" aria-hidden="true" /> {draft.sensitivity} masked for {roleLabel(role)}
          </span>
        ) : null}
      </div>

      {gate ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
          Gate {gate.ruleId}: <StatusBadge status={gate.status} />
          {gate.missing.length > 0 ? <span>missing {gate.missing.join(', ')}</span> : null}
        </p>
      ) : null}

      <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-ink-muted">To</dt>
        <dd className="text-ink">{visible.recipients.join('; ')}</dd>
        <dt className="text-ink-muted">Subject</dt>
        <dd id={`${reasonId}-subj`} className="font-medium text-ink">
          {visible.subject}
        </dd>
        <dt className="text-ink-muted">First notice SLA</dt>
        <dd className={cn('tabular-nums', left !== null && left <= 10 ? 'font-semibold text-escalate' : 'text-ink')}>
          due {formatClock(draft.sla_first_notice_deadline)} ({draft.sla_first_notice_deadline_min} min from{' '}
          {formatClock(draft.sla_first_notice_clock_start)})
          {left !== null ? ` · ${left >= 0 ? `${left} min left` : `${-left} min overdue`} on replay clock` : ''}
        </dd>
      </dl>

      <pre
        className={cn(
          'mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-canvas p-3 font-sans text-xs leading-relaxed',
          masked ? 'italic text-ink-muted' : 'text-ink',
        )}
      >
        {visible.body}
      </pre>

      <div className="mt-3 flex flex-col gap-2">
        {record ? <DecisionStamp record={record} /> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!permission.enabled}
            aria-describedby={permission.enabled ? undefined : reasonId}
            onClick={() => onDecide(draft, 'approved')}
            className="inline-flex items-center gap-1.5 rounded-md border border-recommend/40 bg-recommend/10 px-2.5 py-1.5 text-xs font-medium text-recommend hover:bg-recommend/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Check className="size-3.5" aria-hidden="true" />
            Approve for sending
          </button>
          <button
            type="button"
            disabled={!permission.enabled}
            aria-describedby={permission.enabled ? undefined : reasonId}
            onClick={() => onDecide(draft, 'rejected')}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-ink disabled:cursor-not-allowed disabled:opacity-45"
          >
            <X className="size-3.5" aria-hidden="true" />
            Reject draft
          </button>
        </div>
        {!permission.enabled ? (
          <p id={reasonId} className="text-[11px] text-ink-muted">
            · {permission.reason}
          </p>
        ) : null}
        <p className="text-[11px] text-ink-muted">
          Nothing is sent by MOSAIC — approval records a named human sign-off in the audit log.
        </p>
      </div>
    </article>
  );
}

export function TenantMessagePanel({
  fixture,
  role,
  replayAt,
  gate,
  records,
  onDecide,
  noDraftReason,
}: {
  fixture: TenantMessageFixture | null;
  role: string;
  replayAt: string | null;
  gate: { ruleId: string; status: ActionStatus; missing: string[] } | null;
  records: Record<string, ActionDecisionRecord>;
  onDecide: (draft: Draft, outcome: ActionOutcome) => void;
  noDraftReason: string;
}) {
  if (!fixture || fixture.drafts.length === 0) {
    return <p className="rounded-lg border border-dashed border-line px-3 py-4 text-xs text-ink-muted">{noDraftReason}</p>;
  }
  return (
    <div className="space-y-3">
      {fixture.drafts.map((d) => (
        <DraftCard
          key={d.draft_id}
          draft={d}
          role={role}
          replayAt={replayAt}
          gate={gate}
          record={records[d.draft_id]}
          onDecide={onDecide}
        />
      ))}
    </div>
  );
}
