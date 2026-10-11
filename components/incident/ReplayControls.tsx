'use client';

import { ChevronsRight, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

export const SPEEDS = [1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

const BTN = 'btn-pill text-xs';

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
    <div className="rounded-xl border border-line-strong bg-surface p-4 shadow-card" role="group" aria-label="Timeline replay">
      <div className="flex items-baseline justify-between">
        <span className="font-display-soft text-[17px] font-semibold text-heading">Replay</span>
        <span className="text-[13px] tabular-nums text-ink-muted">
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
          <span key={i} className={cn('flex-1 rounded-full', i < step ? 'bg-charcoal' : 'bg-dew-drop-deep')} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button type="button" className={BTN} onClick={onNext} disabled={atEnd}>
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
        <button type="button" className={cn(BTN, 'px-0 size-9')} onClick={onRestart} disabled={step === 0} aria-label="Restart replay">
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-ink-muted">
          Speed
          <select
            value={speed}
            onChange={(e) => onSpeed(Number(e.target.value) as Speed)}
            className="min-h-8 rounded-full border border-line-strong/70 bg-surface px-2 text-xs text-ink"
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
