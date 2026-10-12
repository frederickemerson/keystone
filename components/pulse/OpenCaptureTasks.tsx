'use client';

// Pulse: the capture tasks addressed to the signed-in role. Answer opens voice
// capture with the task bound; Dismiss asks for a reason. Every step goes
// through the governance store, which audits it (and refuses + audits any
// role other than the task's createdFor).

import { useEffect, useMemo, useState } from 'react';
import { Mic } from 'lucide-react';
import { EmptyState } from '@/components/mosaic';
import { useMounted } from '@/components/mosaic/useMounted';
import { openTasksFor } from '@/components/incident/captureTasks';
import { ensureTaskAnswered, useCaptureActions, useCaptureView } from '@/components/incident/useCapture';
import { useGovernanceStore } from '@/lib/governance/store';
import type { CaptureTask, VoiceNote } from '@/lib/capture';
import { CaptureTaskCard } from './CaptureTaskCard';
import { proposablePill } from '@/components/canvas/noteDraftUtils';
import type { Pill } from '@/lib/engine';

export interface PulseCapturePill {
  id: string;
  name: string;
  pill: Pill;
}

export function OpenCaptureTasks({ sessionRole, pills }: { sessionRole: string; pills: readonly PulseCapturePill[] }) {
  const mounted = useMounted();
  const storeRole = useGovernanceStore((s) => s.currentActor.role);
  const role = mounted ? storeRole : sessionRole;
  const view = useCaptureView();
  const actions = useCaptureActions();
  const [message, setMessage] = useState<string | null>(null);
  const seedPills = useGovernanceStore((s) => s.seedPills);
  const versions = useGovernanceStore((s) => s.versions);
  // Proposing a draft from an answer needs the pills in the store (no-op once seeded).
  useEffect(() => {
    seedPills(pills.map((p) => ({ id: p.id, pill: p.pill })));
  }, [pills, seedPills]);
  const proposable = useMemo(
    () => pills.map((p) => proposablePill(p, mounted ? versions[p.id] : undefined)),
    [pills, mounted, versions],
  );

  // Tasks answered in this visit stay listed, so the speaker can finish the
  // read-back in the capture panel that is still open on the card.
  const [answeredHere, setAnsweredHere] = useState<readonly string[]>([]);
  const open = [
    ...view.tasks.filter((t) => t.status !== 'open' && answeredHere.includes(t.id)),
    ...openTasksFor(view.tasks, role),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const run = (fn: () => string) => {
    try {
      setMessage(fn());
    } catch (err) {
      setMessage(`Not recorded: ${(err as Error).message}`);
    }
  };
  const answer = (task: CaptureTask, note: VoiceNote) =>
    run(() => {
      setAnsweredHere((ids) => (ids.includes(task.id) ? ids : [...ids, task.id]));
      ensureTaskAnswered(actions, task.id, note.id);
      return `Answered with note ${note.id}. The draft is on the pill's canvas for review.`;
    });
  const dismiss = (task: CaptureTask, reason: string) =>
    run(() => {
      actions.dismissCaptureTask(task.id, reason);
      return `Task dismissed. Reason recorded.`;
    });

  return (
    <div className="space-y-3">
      <p role="status" aria-live="polite" className={message ? 'rounded-lg bg-dew-drop px-3 py-1.5 text-xs text-ink' : 'sr-only'}>
        {message ?? ''}
      </p>
      {!mounted ? (
        <p className="min-h-[148px] rounded-xl border-[1.5px] border-dashed border-line bg-surface/60 px-6 py-10 text-center text-[13px] text-ink-muted" aria-busy="true">
          Loading your capture tasks…
        </p>
      ) : open.length === 0 ? (
        <EmptyState
          icon={Mic}
          title="No open capture tasks for you"
          description="When a gate blocks you, or you close out a job, Keystone asks one short question here."
          className="min-h-[148px] py-6"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {open.map((t) => (
            <CaptureTaskCard
              key={t.id}
              task={t}
              role={role}
              showIncident
              onAnswer={(task, note) => answer(task, note)}
              onDismiss={dismiss}
              pills={proposable}
            />
          ))}
        </div>
      )}
    </div>
  );
}
