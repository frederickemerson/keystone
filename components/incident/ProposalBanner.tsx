'use client';

// Wow 1: the AI proposal and the deterministic gate that stops it.

import { ArrowUpRight, Ban, Bot, Check, HelpCircle, Mic, Volume2 } from 'lucide-react';
import type { ActionDecisionRecord } from '@/lib/governance/store';
import type { CaptureTask } from '@/lib/capture';
import { cn } from '@/lib/ui/cn';
import { WRAPPING_PILL } from './DecisionButtons';
import { formatClock, formatSgtClock, missingSummary, personLabel } from './labels';
import { actionPermissions, withRecordedDecision } from './permissions';
import { RuleIdLink } from './RuleLinks';
import type { AiProposal, BoardItem } from './types';

export function ProposalBanner({
  proposal,
  item,
  naReason,
  people,
  role,
  record,
  captureTask,
  activeTaskId,
  onAnswerTask,
  onWhy,
  onEscalate,
}: {
  proposal: AiProposal;
  item: BoardItem | undefined;
  naReason: string | undefined;
  people: readonly { name: string; role: string }[];
  role: string;
  /** Latest recorded human decision on the proposal's gating rule. */
  record: ActionDecisionRecord | undefined;
  /** The signed-in role's capture task about this gate, if any. */
  captureTask: CaptureTask | undefined;
  activeTaskId: string | null;
  onAnswerTask: (taskId: string) => void;
  onWhy: (item: BoardItem) => void;
  onEscalate: (item: BoardItem) => void;
}) {
  // Proposals are recorded fixtures replayed with the timeline, not live
  // model calls: say so, and keep the provenance one hover/focus away.
  const provenance = `Recorded proposal from fixture ${proposal.source.fixtureId} (labelled ${proposal.model}, recorded ${formatClock(proposal.source.generatedAt)} SGT). Replayed with the timeline; no model is called.`;
  const head = (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
      <Bot className="size-4" aria-hidden="true" />
      <span title={provenance}>
        AI proposal <span aria-hidden="true">·</span> recorded
        <span className="sr-only">. {provenance}</span>
      </span>
      <span className="font-medium text-ink">“{proposal.text}”</span>
    </p>
  );

  if (!item) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-3">
        {head}
        <p className="mt-1 text-xs text-ink-muted">
          Held for a named human — gate {proposal.ruleId} not triggered at this step
          {naReason ? ` (${naReason})` : ''}.
        </p>
      </div>
    );
  }

  const target = item.trace.escalateTo;
  if (item.action.status !== 'blocked') {
    return (
      <div className="rounded-xl border border-line bg-surface p-3">
        {head}
        <p className="mt-1 text-xs text-ink">
          Gate <RuleIdLink pillId={item.entry.bundle.id} ruleId={proposal.ruleId} /> v{item.entry.version}: <span className="font-semibold">{item.action.status}</span> —
          required evidence confirmed; still executed only by {personLabel(target.role, people)}.
        </p>
      </div>
    );
  }

  const escalated = record?.outcome === 'escalated' ? record : undefined;
  const perms = withRecordedDecision(actionPermissions(item.action, role, target.role), record, formatSgtClock);
  return (
    <div
      className="overflow-hidden rounded-xl border-[1.5px] border-blocked/70 bg-blocked-tint shadow-card"
      role="alert"
    >
      <div className="p-5">
        {head}
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-blocked px-3.5 py-1.5 text-[15px] font-semibold text-white">
            <Ban className="size-4" aria-hidden="true" />
            Blocked
          </span>
          <span className="font-display-soft text-[19px] font-semibold leading-snug text-blocked">
            Rule <RuleIdLink pillId={item.entry.bundle.id} ruleId={item.rule.id} className="text-[16px]" /> v{item.entry.version} —{' '}
            {missingSummary(item.action.missingEvidence)}
          </span>
        </p>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink">
          {item.rule.title}. Deterministic gate — the model cannot override it. Missing:{' '}
          <span className="font-mono text-[12px]">{item.action.missingEvidence.join(', ')}</span>
        </p>
        {escalated ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-escalate-mark/40 bg-surface px-3 py-2 text-[13px] leading-snug text-ink">
            <Check className="mt-0.5 size-4 shrink-0 text-recommend" aria-hidden="true" />
            <span>
              <span className="font-semibold">Escalated to {personLabel(target.role, people)}</span> at{' '}
              <time dateTime={escalated.at} className="font-mono tabular-nums">
                {formatSgtClock(escalated.at)}
              </time>{' '}
              by {escalated.actor.name}. The gate stays blocked until the missing evidence is confirmed.
            </span>
          </p>
        ) : null}
        {captureTask?.status === 'open' && captureTask.id !== activeTaskId ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface px-3 py-2">
            <p className="flex min-w-0 flex-1 basis-60 items-start gap-2 text-[13px] leading-snug text-ink">
              <Mic className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-semibold">Tell us why — 20 seconds.</span> What did you know that{' '}
                <span className="font-mono">{item.rule.id}</span> didn&apos;t? It can wait: the question stays on Pulse.
              </span>
            </p>
            <button type="button" onClick={() => onAnswerTask(captureTask.id)} className="btn-pill text-xs">
              <Mic className="size-3.5" aria-hidden="true" />
              Answer now
            </button>
          </div>
        ) : null}
        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
          {escalated ? null : (
            <button
              type="button"
              onClick={() => onEscalate(item)}
              disabled={!perms.escalate.enabled}
              title={perms.escalate.reason}
              className={cn('btn-pill btn-pill-primary text-xs', WRAPPING_PILL)}
            >
              <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
              Escalate to {personLabel(target.role, people)}
            </button>
          )}
          <button type="button" onClick={() => onWhy(item)} className="btn-pill text-xs">
            <HelpCircle className="size-3.5" aria-hidden="true" />
            Why?
            <span aria-hidden="true" className="text-ink-muted">
              ·
            </span>
            <Volume2 className="size-3.5" aria-hidden="true" />
            Hear the expert
          </button>
        </div>
        {!perms.escalate.enabled && !escalated ? (
          <p className="mt-2 text-[12px] text-ink-muted">{perms.escalate.reason}</p>
        ) : null}
      </div>
    </div>
  );
}
