'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { LlmBadge } from '@/components/mosaic/LlmBadge';
import { LLM_CLIENT_WAIT_MS, type Generation } from '@/lib/llm/attribution';
import { requestLive } from '@/lib/llm/live-request';
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

const WAIT_S = LLM_CLIENT_WAIT_MS / 1000;

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

      {/* A scrollable region must be reachable by keyboard (WCAG 2.1.1). */}
      <pre
        tabIndex={0}
        role="region"
        aria-label={`Tenant message body${masked ? ' (masked for your role)' : ''}`}
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
          Nothing is sent by Keystone; approval is logged.
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
  liveProviderName = 'the live model',
}: {
  fixture: TenantMessageFixture | null;
  role: string;
  replayAt: string | null;
  gate: { ruleId: string; status: ActionStatus; missing: string[] } | null;
  records: Record<string, ActionDecisionRecord>;
  onDecide: (draft: Draft, outcome: ActionOutcome) => void;
  noDraftReason: string;
  /** Display name of the configured live provider, if the page knows it (e.g. "OpenAI"). */
  liveProviderName?: string;
}) {
  const [generation, setGeneration] = useState<Generation<{ draft: Draft; snapshotAt: string }> | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const inFlight = useRef<AbortController | null>(null);
  const loading = startedAt !== null;
  const mayDraft = Boolean(getRole(role)?.can_draft_tenant_message);

  useEffect(() => {
    if (startedAt === null) return;
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(tick);
  }, [startedAt]);
  useEffect(() => () => inFlight.current?.abort(), []);

  async function draftLive() {
    if (!fixture || !mayDraft) return;
    const controller = new AbortController();
    inFlight.current = controller;
    setGeneration(null);
    setElapsed(0);
    setStartedAt(Date.now());
    try {
      // Shared client: 25 s wait, HTTP / timeout failures mapped to the
      // recorded first notice with a reason, the server Generation passed
      // through so the badge names the provider that actually answered.
      const result = await requestLive<{ draft: Draft; snapshotAt: string }>(
        '/api/llm/tenant-message',
        { incidentId: fixture.source_incident },
        {
          signal: controller.signal,
          fallback: (reason) => ({
            data: { draft: fixture.drafts[0], snapshotAt: fixture.generated_at },
            source: 'recorded',
            provider: 'fixtures',
            model: fixture.model,
            latencyMs: 0,
            attempts: [],
            reason,
          }),
        },
      );
      setGeneration(result);
    } catch {
      // Aborted by unmount; nothing to show.
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setStartedAt(null);
      }
    }
  }
  if (!fixture || fixture.drafts.length === 0) {
    return <p className="rounded-lg border border-dashed border-line px-3 py-4 text-xs text-ink-muted">{noDraftReason}</p>;
  }
  return (
    <div className="space-y-3" aria-busy={loading}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-pill text-xs" disabled={loading || !mayDraft} onClick={draftLive} title={mayDraft ? 'Optional live drafting; nothing is sent.' : 'Switch to a role permitted to draft tenant messages.'}>
          {loading ? `Drafting with ${liveProviderName}…` : 'Draft live'}
        </button>
        {loading ? (
          <span className="text-xs tabular-nums text-ink-muted">
            {elapsed} s of {WAIT_S} s, then the recorded output
          </span>
        ) : null}
        {generation ? <button type="button" className="btn-pill text-xs" onClick={() => setGeneration(null)}>Use recorded draft</button> : null}
      </div>
      {generation?.reason ? <p className="text-[11px] text-ink-muted">{generation.reason}</p> : null}
      <p className="text-[11px] text-ink-muted" title="Live drafting selects and arranges reviewed factual sentences; no new cause or completion promise.">
        Snapshot at <span className="font-mono tabular-nums">{formatClock(fixture.generated_at)}</span> · reviewed sentences only
        <span className="sr-only">. Live drafting selects and arranges reviewed factual sentences; no new cause or completion promise.</span>
      </p>
      <span className="sr-only" role="status">{loading ? `Drafting with ${liveProviderName}…` : generation ? `${generation.source === 'live' ? 'Live' : 'Recorded'} draft ready for human review` : 'Recorded output'}</span>
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
