'use client';

// Progress rail for the Outcome & Learning flow: seven numbered steps,
// keyboard operable, each one a button that moves focus to its section.

import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

export type StepStatus = 'done' | 'active' | 'todo';

export interface StepState {
  id: string;
  n: number;
  title: string;
  status: StepStatus;
  /** Why the step is not reachable yet (shown as the button's title + text). */
  blockedReason?: string;
}

export function StepRail({ steps, onGo }: { steps: StepState[]; onGo: (id: string) => void }) {
  const done = steps.filter((s) => s.status === 'done').length;

  return (
    <nav aria-label="Learning flow progress" className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          <span className="font-medium text-ink">
            Step {done + 1 > steps.length ? steps.length : done + 1} of {steps.length}
          </span>{' '}
          · {done} complete
        </p>
        <div
          className="h-1.5 w-40 overflow-hidden rounded-full bg-surface-raised"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={done}
          aria-label="Steps complete"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${(done / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="mt-3 flex flex-wrap gap-1.5">
        {steps.map((step) => {
          const isActive = step.status === 'active';
          const isDone = step.status === 'done';
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onGo(step.id)}
                aria-current={isActive ? 'step' : undefined}
                title={step.blockedReason ?? step.title}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                  isActive && 'border-accent bg-accent/10 font-medium text-ink',
                  isDone && 'border-recommend/30 bg-recommend/10 text-ink',
                  step.status === 'todo' && 'border-line bg-surface-raised text-ink-muted',
                )}
              >
                <span
                  className={cn(
                    'grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-semibold',
                    isDone ? 'bg-recommend text-canvas' : isActive ? 'bg-accent text-accent-ink' : 'bg-line text-ink-muted',
                  )}
                  aria-hidden="true"
                >
                  {isDone ? <Check className="size-3" /> : step.n}
                </span>
                <span>{step.title}</span>
                {step.status === 'todo' && step.blockedReason ? (
                  <Lock className="size-3 shrink-0" aria-hidden="true" />
                ) : null}
                {isDone ? <span className="sr-only">complete</span> : null}
                {step.status === 'todo' && step.blockedReason ? (
                  <span className="sr-only">not available yet: {step.blockedReason}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Move focus (and the viewport) to a step section — used by the rail. */
export function goToStep(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
}
