'use client';

// The incident room, pulse, canvas and approvals read capture state and call
// capture actions through these two hooks only, so the surfaces share one
// view of the governance store's capture slice. Persisted state is read only
// after mount (server HTML and the first client render match).

import { useMemo } from 'react';
import { useMounted } from '@/components/mosaic/useMounted';
import type { CaptureStoreActions, CaptureTask, DraftFromNote, PeerConfirmation, VoiceNote } from '@/lib/capture';
import { getGovernanceStore, useGovernanceStore } from '@/lib/governance/store';

export interface CaptureView {
  tasks: readonly CaptureTask[];
  notes: readonly VoiceNote[];
  drafts: readonly DraftFromNote[];
  peerConfirmations: readonly PeerConfirmation[];
}

const EMPTY: CaptureView = Object.freeze({ tasks: [], notes: [], drafts: [], peerConfirmations: [] });

export function useCaptureView(): CaptureView {
  const mounted = useMounted();
  const tasks = useGovernanceStore((s) => s.captureTasks);
  const notes = useGovernanceStore((s) => s.voiceNotes);
  const drafts = useGovernanceStore((s) => s.draftsFromNotes);
  const peerConfirmations = useGovernanceStore((s) => s.peerConfirmations);
  return useMemo(
    () =>
      mounted
        ? {
            tasks: Object.values(tasks),
            notes: Object.values(notes),
            drafts: Object.values(drafts).flat(),
            peerConfirmations,
          }
        : EMPTY,
    [mounted, tasks, notes, drafts, peerConfirmations],
  );
}

export function useCaptureActions(): CaptureStoreActions {
  const createCaptureTask = useGovernanceStore((s) => s.createCaptureTask);
  const answerCaptureTask = useGovernanceStore((s) => s.answerCaptureTask);
  const dismissCaptureTask = useGovernanceStore((s) => s.dismissCaptureTask);
  const recordVoiceNote = useGovernanceStore((s) => s.recordVoiceNote);
  const recordDraftsFromNote = useGovernanceStore((s) => s.recordDraftsFromNote);
  const amendNoteFromReadBack = useGovernanceStore((s) => s.amendNoteFromReadBack);
  const confirmReadBack = useGovernanceStore((s) => s.confirmReadBack);
  const proposeFromNote = useGovernanceStore((s) => s.proposeFromNote);
  const peerConfirm = useGovernanceStore((s) => s.peerConfirm);
  return useMemo(
    () => ({
      createCaptureTask,
      answerCaptureTask,
      dismissCaptureTask,
      recordVoiceNote,
      recordDraftsFromNote,
      amendNoteFromReadBack,
      confirmReadBack,
      proposeFromNote,
      peerConfirm,
    }),
    [
      createCaptureTask,
      answerCaptureTask,
      dismissCaptureTask,
      recordVoiceNote,
      recordDraftsFromNote,
      amendNoteFromReadBack,
      confirmReadBack,
      proposeFromNote,
      peerConfirm,
    ],
  );
}

/**
 * Link a recorded note to its task. VoiceCapture records the note with the
 * task bound and answers it itself; this only answers a task that is still
 * open afterwards (read from the live store, not a render-time snapshot), so
 * the task is answered exactly once either way.
 */
export function ensureTaskAnswered(actions: Pick<CaptureStoreActions, 'answerCaptureTask'>, taskId: string, noteId: string): void {
  const live = getGovernanceStore().getState().captureTasks[taskId];
  if (live?.status === 'open') actions.answerCaptureTask(taskId, noteId);
}

/** The note a task or draft points at. */
export function noteById(view: CaptureView, noteId: string | undefined): VoiceNote | undefined {
  return noteId ? view.notes.find((n) => n.id === noteId) : undefined;
}

/** The task a note answered (its taskId). */
export function taskForNote(view: CaptureView, note: VoiceNote | undefined): CaptureTask | undefined {
  return note?.taskId ? view.tasks.find((t) => t.id === note.taskId) : undefined;
}
