'use client';

// Floating guide: step n of N, the stage, who you are, "Do this", "Notice",
// Back / Next. Closing keeps the step; the header's chip resumes it.

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Compass, X } from 'lucide-react';
import { DEMO_PATH } from '@/lib/journey';
import { isOnStep, stageLabel } from '@/lib/guide/stage';
import { personaFor, roleLabel } from '@/lib/governance/access';
import { cn } from '@/lib/ui/cn';
import { useGuide } from './GuideProvider';

export function GuidePanel({ currentRole }: { currentRole: string | null }) {
  const { state, step, busy, goTo, close, end } = useGuide();
  const pathname = usePathname();
  // Minimised: title and Back / Next only, so a phone keeps most of the screen.
  const [minimised, setMinimised] = useState(false);
  if (!state?.open || !step) return null;

  const index = state.step;
  const last = index === DEMO_PATH.length - 1;
  const persona = personaFor(step.role);
  const onScreen = isOnStep(step, pathname);
  const asRightPerson = currentRole === step.role;

  return (
    <aside
      aria-label="Guided demo"
      className={cn(
        'glass-night fixed inset-x-3 bottom-3 z-40 flex max-h-[min(30rem,52dvh)] flex-col rounded-2xl text-[14px]',
        'sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[23rem]',
      )}
    >
      <header className="flex items-start gap-3 border-b border-white/10 px-4 pb-3 pt-3.5">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-lavender/25 text-lavender-on-night">
          <Compass className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-white/70">
            Guided demo · step {index + 1} of {DEMO_PATH.length} · {stageLabel(step.stage)}
          </p>
          <h2 className="mt-0.5 font-serif text-[22px] font-normal leading-tight tracking-[-0.01em] text-white">
            {step.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setMinimised((m) => !m)}
          aria-expanded={!minimised}
          aria-controls="guide-body"
          aria-label={minimised ? 'Show the step details' : 'Hide the step details'}
          className="grid size-9 shrink-0 place-items-center rounded-full text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-white"
        >
          <ChevronDown className={cn('size-4 transition-transform', minimised && 'rotate-180')} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Close the guide (resume it from the header)"
          className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-white"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div id="guide-body" hidden={minimised} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <ol aria-label="Progress" className="flex gap-1">
          {DEMO_PATH.map((s, i) => (
            <li key={s.id} className="flex-1">
              <span
                aria-hidden="true"
                className={cn('block h-1 rounded-full', i < index ? 'bg-lavender' : i === index ? 'bg-white' : 'bg-white/20')}
              />
              <span className="sr-only">
                {s.title}
                {i < index ? ' (done)' : i === index ? ' (current)' : ''}
              </span>
            </li>
          ))}
        </ol>

        <p className="text-[13px] text-white/80">
          You are <span className="font-medium text-white">{persona.name}</span> · {roleLabel(step.role)}
        </p>

        {!asRightPerson || !onScreen ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void goTo(index)}
            className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 text-[13px] font-medium text-white ring-1 ring-white/25 hover:bg-white/15 disabled:opacity-60"
          >
            {asRightPerson ? 'Open this step’s screen' : `Switch to ${persona.name} and open the screen`}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}

        <section>
          <h3 className="text-[12px] font-semibold text-lavender-on-night">Do this</h3>
          <p className="mt-0.5 leading-snug text-white">{step.doThis}</p>
        </section>
        <section>
          <h3 className="text-[12px] font-semibold text-lavender-on-night">Notice</h3>
          <p className="mt-0.5 leading-snug text-white/85">{step.notice}</p>
        </section>
      </div>

      <footer className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
        <button
          type="button"
          disabled={index === 0 || busy}
          onClick={() => void goTo(index - 1)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] text-white/85 hover:bg-white/10 disabled:opacity-40"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back
        </button>
        {last ? (
          <button
            type="button"
            onClick={end}
            className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-medium text-night hover:bg-white/90"
          >
            <Check className="size-3.5" aria-hidden="true" />
            Finish the demo
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void goTo(index + 1)}
            aria-label={`Next step: ${DEMO_PATH[index + 1].title}`}
            className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white py-1 pl-4 pr-1 text-[13px] font-medium text-night hover:bg-white/90 disabled:opacity-60"
          >
            <span className="flex flex-col items-start leading-tight">
              <span>{busy ? 'Switching…' : 'Next'}</span>
              <span className="max-w-[11rem] truncate text-[11.5px] font-normal text-night/70">{DEMO_PATH[index + 1].title}</span>
            </span>
            <span className="grid size-8 place-items-center rounded-full bg-lavender text-white">
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
          </button>
        )}
      </footer>
    </aside>
  );
}
