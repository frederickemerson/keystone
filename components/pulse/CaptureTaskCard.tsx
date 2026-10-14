'use client';

// One capture task: the question, who it is for, and Answer (voice capture
// with the task bound) or Dismiss (with a reason). Used inline on the incident
// room's action card and in the pulse "Open capture tasks" list.

import { useId, useState } from 'react';
import Link from 'next/link';
import { routes } from '@/lib/journey';
import { Check, Mic, MicOff, X } from 'lucide-react';
import { VoiceCapture } from '@/components/capture/VoiceCapture';
import type { ProposablePill } from '@/components/capture/DraftFromNoteTile';
import { CHIP_BASE, TONE_CHIP, type Tone } from '@/components/mosaic';
import { formatSgtClock } from '@/components/incident/labels';
import { taskHeadline } from '@/components/incident/captureTasks';
import type { CaptureTask, CaptureTaskKind, DraftFromNote, VoiceNote } from '@/lib/capture';
import { roleLabel } from '@/lib/governance/access';
import { cn } from '@/lib/ui/cn';

const KIND: Record<CaptureTaskKind, { label: string; tone: Tone }> = {
  gate_blocked: { label: 'Gate blocked', tone: 'blocked' },
  gate_override: { label: 'Gate overridden', tone: 'escalate' },
  job_closeout: { label: 'Job close-out', tone: 'neutral' },
  asset_qr: { label: 'QR scan', tone: 'neutral' },
  agent_answer_disputed: { label: 'Agent answer disputed', tone: 'escalate' },
};

export interface CaptureTaskCardProps {
  task: CaptureTask;
  /** The signed-in role; only task.createdFor may answer or dismiss. */
  role: string;
  /** Show the incident link (pulse list); the incident room already is the incident. */
  showIncident?: boolean;
  /** Called with the recorded note once VoiceCapture finishes; the caller answers the task. */
  onAnswer: (task: CaptureTask, note: VoiceNote, drafts: DraftFromNote[]) => void;
  onDismiss: (task: CaptureTask, reason: string) => void;
  /** Pills a draft from the answer may be proposed into (seeded in the store by the page). */
  pills?: readonly ProposablePill[];
  /**
   * Answer somewhere roomier than this card (the incident room's capture
   * panel). When given, Answer calls it instead of opening capture inline.
   */
  onAnswerElsewhere?: (task: CaptureTask) => void;
  /** Open voice capture straight away (the close-out entry point). */
  startAnswering?: boolean;
  className?: string;
}

export function CaptureTaskCard({
  task,
  role,
  showIncident = false,
  onAnswer,
  onDismiss,
  startAnswering = false,
  pills = [],
  onAnswerElsewhere,
  className,
}: CaptureTaskCardProps) {
  // A gate task names its pill; other tasks may go to any pill offered.
  const taskPills = task.pillId ? pills.filter((p) => p.id === task.pillId) : pills;
  const [mode, setMode] = useState<'idle' | 'answering' | 'dismissing'>(
    startAnswering && role === task.createdFor ? 'answering' : 'idle',
  );
  const [reason, setReason] = useState('');
  const headingId = useId();
  const reasonId = useId();
  const notYoursId = useId();
  const kind = KIND[task.kind];
  const mine = role === task.createdFor;
  const notYours = mine ? undefined : `Addressed to ${roleLabel(task.createdFor)}. Sign in as that role to answer it.`;

  return (
    <article
      aria-labelledby={headingId}
      className={cn('rounded-xl border border-line-strong/60 bg-surface p-4 shadow-card', className)}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className={cn(CHIP_BASE, TONE_CHIP[kind.tone])}>{kind.label}</span>
        {task.ruleId ? <span className="font-mono text-[12px] text-ink">{task.ruleId}</span> : null}
        {showIncident && task.incidentId ? (
          <Link
            href={routes.incident(task.incidentId)}
            className="font-mono text-[12px] text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
          >
            {task.incidentId}
          </Link>
        ) : null}
        <span className="ml-auto text-[11px] tabular-nums text-ink-muted">
          For {roleLabel(task.createdFor)} ·{' '}
          <time dateTime={task.createdAt} className="font-mono">
            {formatSgtClock(task.createdAt)}
          </time>
        </span>
      </div>

      <h3 id={headingId} className="mt-2.5 flex items-center gap-2 text-[16px] font-semibold leading-snug text-heading">
        <Mic className="size-4 shrink-0 text-ink" aria-hidden="true" />
        {taskHeadline(task.kind)}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-ink">{task.prompt}</p>

      {task.status === 'answered' ? (
        <p className={cn('mt-3 rounded-lg border px-3 py-2 text-[12px]', TONE_CHIP.recommend)}>
          <Check className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
          Answered by {task.answeredBy?.name} · note <span className="font-mono">{task.noteId}</span>. The draft waits on
          the pill&apos;s canvas.
        </p>
      ) : task.status === 'dismissed' ? (
        <p className="mt-3 rounded-lg border border-line bg-na-tint px-3 py-2 text-[12px] text-ink">
          <MicOff className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
          Dismissed by {task.answeredBy?.name}. The reason is in the audit log.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onAnswerElsewhere ? onAnswerElsewhere(task) : setMode(mode === 'answering' ? 'idle' : 'answering')
              }
              aria-expanded={onAnswerElsewhere ? undefined : mode === 'answering'}
              disabled={!mine}
              aria-describedby={mine ? undefined : notYoursId}
              className="btn-pill btn-pill-primary text-xs"
            >
              <Mic className="size-3.5" aria-hidden="true" />
              {mode === 'answering' ? 'Close capture' : 'Answer'}
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === 'dismissing' ? 'idle' : 'dismissing')}
              aria-expanded={mode === 'dismissing'}
              disabled={!mine}
              aria-describedby={mine ? undefined : notYoursId}
              className="btn-pill text-xs"
            >
              <X className="size-3.5" aria-hidden="true" />
              Dismiss
            </button>
          </div>
          {notYours ? (
            <p id={notYoursId} className="mt-2 text-[12px] text-ink-muted">
              {notYours}
            </p>
          ) : null}

          {mine && mode === 'dismissing' ? (
            <form
              className="mt-3 rounded-lg border border-line bg-dew-drop p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!reason.trim()) return;
                onDismiss(task, reason.trim());
                setReason('');
                setMode('idle');
              }}
            >
              <label htmlFor={reasonId} className="block text-[12px] font-medium text-ink">
                Why dismiss it? This is recorded in the audit log.
              </label>
              <textarea
                id={reasonId}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={280}
                required
                placeholder="For example: not applicable, the gate was right"
                className="mt-1.5 w-full rounded-input border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink"
              />
              <div className="mt-2 flex gap-2">
                <button type="submit" disabled={!reason.trim()} className="btn-pill text-xs">
                  Dismiss task
                </button>
                <button type="button" onClick={() => setMode('idle')} className="btn-pill text-xs shadow-none">
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </>
      )}

      {/* Stays mounted after the note is saved: the speaker reads back the
          numbers in the draft right here, while the task shows as answered. */}
      {mine && mode === 'answering' ? (
        <div className="mt-3">
          <VoiceCapture
            taskId={task.id}
            assetId={task.assetId}
            pills={taskPills}
            onNote={(note: VoiceNote, drafts: DraftFromNote[]) => {
              onAnswer(task, note, drafts);
            }}
          />
        </div>
      ) : null}
    </article>
  );
}
