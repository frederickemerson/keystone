'use client';

import { ChevronsRight, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

export const SPEEDS = [1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

const BTN =
  'inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-45';

export function ReplayControls({
  step,
  total,
  playing,
  speed,
  onNext,
  onTogglePlay,
  onEnd,
  onRestart,
  onSpeed,
}: {
  step: number;
  total: number;
  playing: boolean;
  speed: Speed;
  onNext: () => void;
  onTogglePlay: () => void;
  onEnd: () => void;
  onRestart: () => void;
  onSpeed: (s: Speed) => void;
}) {
  const atEnd = step >= total;
  return (
    <div className="rounded-lg border border-line bg-surface p-3" role="group" aria-label="Timeline replay">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold uppercase tracking-widest text-ink-muted">Replay</span>
        <span className="tabular-nums text-ink">
          Event {step} / {total}
        </span>
      </div>
      <div
        className="mt-2 flex h-1.5 gap-0.5"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-label="Replay progress"
      >
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn('flex-1 rounded-full', i < step ? 'bg-accent' : 'bg-surface-raised')} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button type="button" className={cn(BTN, 'border-accent bg-accent text-accent-ink hover:opacity-90')} onClick={onNext} disabled={atEnd}>
          <StepForward className="size-3.5" aria-hidden="true" />
          Next event
        </button>
        <button type="button" className={BTN} onClick={onTogglePlay} disabled={atEnd && !playing} aria-pressed={playing}>
          {playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className={BTN} onClick={onEnd} disabled={atEnd}>
          <ChevronsRight className="size-3.5" aria-hidden="true" />
          Jump to end
        </button>
        <button type="button" className={BTN} onClick={onRestart} disabled={step === 0} aria-label="Restart replay">
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </button>
        <label className="ml-auto flex items-center gap-1 text-[11px] text-ink-muted">
          Speed
          <select
            value={speed}
            onChange={(e) => onSpeed(Number(e.target.value) as Speed)}
            className="rounded border border-line bg-surface px-1 py-0.5 text-[11px] text-ink"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
