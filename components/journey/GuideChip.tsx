'use client';

// Header chip: resume a closed guided demo, start one when none is running,
// or replay it once it is finished.

import { Compass } from 'lucide-react';
import { DEMO_PATH } from '@/lib/journey';
import { useGuide } from './GuideProvider';

export function GuideChip() {
  const { state, ready, resume, start, busy } = useGuide();
  if (!ready || state?.open) return null;

  const resumable = state !== null && !state.finished;
  const label = resumable
    ? `Resume demo · ${state.step + 1}/${DEMO_PATH.length}`
    : state?.finished
      ? 'Replay demo'
      : 'Guided demo';
  const name = resumable
    ? `Resume the guided demo at step ${state.step + 1} of ${DEMO_PATH.length}`
    : state?.finished
      ? 'Replay the guided demo from the start'
      : 'Start the guided demo';

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => (resumable ? resume() : void start())}
      aria-label={name}
      className="btn-pill max-sm:size-10 max-sm:px-0"
    >
      <Compass className="size-3.5 text-lavender-ink" aria-hidden="true" />
      <span className="max-sm:hidden">{label}</span>
    </button>
  );
}
