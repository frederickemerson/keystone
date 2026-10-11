'use client';

import { useId, useState } from 'react';
import { LlmBadge } from '@/components/mosaic/LlmBadge';
import type { Generation } from '@/lib/llm/providers';
import { Check, EyeOff, Mail, X } from 'lucide-react';
import { StatusBadge } from '@/components/mosaic';
import type { ActionStatus } from '@/lib/engine/types';
import { canSee, getRole, redact, roleLabel } from '@/lib/governance/access';
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
  generation,
}: {
  generation?: Generation<{ draft: Draft; snapshotAt: string }> | null;
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
    <article className="rounded-xl border border-line-strong bg-surface p-5 shadow-card" aria-labelledby={`${reasonId}-subj`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-approval/40 bg-approval-tint px-2.5 py-[3px] text-xs font-medium text-approval">
          <Mail className="size-3.5" aria-hidden="true" />
          Draft — requires {getRole(draft.approved_by_role)?.person ?? roleLabel(draft.approved_by_role)}’s approval
        </span>
        <span className="text-[11px] text-ink-muted">
          {draft.channel} · {draft.draft_id}
        </span>
        <LlmBadge result={generation} />
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
            className="btn-pill text-xs"
          >
            <Check className="size-3.5 text-recommend" aria-hidden="true" />
            Approve for sending
          </button>
          <button
            type="button"
            disabled={!permission.enabled}
            aria-describedby={permission.enabled ? undefined : reasonId}
            onClick={() => onDecide(draft, 'rejected')}
            className="btn-pill text-xs"
          >
            <X className="size-3.5 text-ink-muted" aria-hidden="true" />
            Reject draft
          </button>
        </div>
        {!permission.enabled ? (
          <p id={reasonId} className="text-[11px] text-ink-muted">
            · {permission.reason}
          </p>
        ) : null}
        <p className="text-[11px] text-ink-muted">
          Nothing is sent by Keystone — approval records a named human sign-off in the audit log.
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
  const [generation, setGeneration] = useState<Generation<{ draft: Draft; snapshotAt: string }> | null>(null);
  const [loading, setLoading] = useState(false);
  const mayDraft = Boolean(getRole(role)?.can_draft_tenant_message);
  async function draftLive() {
    if (!fixture || !mayDraft) return;
    setLoading(true);
    setGeneration(null);
    try {
      const response = await fetch('/api/llm/tenant-message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: fixture.source_incident }),
        signal: AbortSignal.timeout(35_000),
      });
      if (!response.ok) throw new Error('request-failed');
      setGeneration(await response.json());
    } catch {
      setGeneration({ data: { draft: fixture.drafts[0], snapshotAt: fixture.generated_at }, source: 'recorded', provider: 'fixtures', model: fixture.model, latencyMs: 0, reason: 'Live request unavailable; showing the recorded first notice.' });
    } finally {
      setLoading(false);
    }
  }
  if (!fixture || fixture.drafts.length === 0) {
    return <p className="rounded-lg border border-dashed border-line px-3 py-4 text-xs text-ink-muted">{noDraftReason}</p>;
  }
  return (
    <div className="space-y-3" aria-busy={loading}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-pill text-xs" disabled={loading || !mayDraft} onClick={draftLive} title={mayDraft ? 'Optional live drafting; nothing is sent.' : 'Switch to a role permitted to draft tenant messages.'}>
          {loading ? 'Drafting with Hunyuan…' : 'Draft live with Hunyuan'}
        </button>
        {generation ? <button type="button" className="btn-pill text-xs" onClick={() => setGeneration(null)}>Use recorded draft</button> : null}
      </div>
      <p className="text-[11px] text-ink-muted">First-notice snapshot at {formatClock(fixture.generated_at)}, not the current replay step. Live drafting selects and arranges reviewed factual sentences; no new cause or completion promise.</p>
      <span className="sr-only" role="status">{loading ? 'Drafting with Hunyuan…' : generation ? `${generation.source === 'live' ? 'Live' : 'Recorded'} draft ready for human review` : 'Recorded output'}</span>
      {(generation ? [generation.data.draft] : fixture.drafts).map((d) => (
        <DraftCard
          key={d.draft_id}
          draft={d}
          generation={generation}
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
