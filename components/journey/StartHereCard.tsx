'use client';

// Pulse's "Start here": the guided demo, and the signed-in person's own part
// in the story (derived from DEMO_PATH), so nobody lands on a dashboard with
// nothing to do.

import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';
import { DEMO_FINISH, DEMO_PATH, routes } from '@/lib/journey';
import { stepsFor, storyLine } from '@/lib/guide/cast';
import { stageLabel } from '@/lib/guide/stage';
import { personaFor, roleLabel } from '@/lib/governance/access';
import { useGuide } from './GuideProvider';

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function StartHereCard({ role }: { role: string | null }) {
  const { state, step, start, resume, goTo, busy } = useGuide();
  const mine = role ? stepsFor(role) : [];
  const first = mine[0];
  const part =
    role && first
      ? ` Your part as ${roleLabel(role)}: ${lowerFirst(storyLine(role))}.`
      : ' Your role is not in the demo story; you can still follow it, or open the incidents you can see.';

  return (
    <section
      aria-labelledby="start-here-title"
      className="glass-night relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#2a2342_0%,#15121f_65%)] p-5 sm:p-6"
    >
      <p className="flex items-center gap-2 text-[12px] font-medium text-lavender-on-night">
        <Compass className="size-3.5" aria-hidden="true" /> Start here
      </p>

      {state?.finished ? (
        <>
          <h2 id="start-here-title" className="mt-1.5 font-serif text-[28px] font-normal leading-[1.08] text-white">
            {DEMO_FINISH.title}
          </h2>
          <p className="mt-2 max-w-[42rem] text-[14px] leading-snug text-white/85">
            You followed one rule from an expert&apos;s words to a governed new version. Replay it, or look at what it left
            behind.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <PrimaryButton onClick={() => void start()} disabled={busy}>
              Replay the guided demo
            </PrimaryButton>
            {DEMO_FINISH.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-5 text-[14px] font-medium text-white hover:bg-white/20"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </>
      ) : state && step ? (
        <>
          <h2 id="start-here-title" className="mt-1.5 font-serif text-[28px] font-normal leading-[1.08] text-white">
            You are on step {state.step + 1} of {DEMO_PATH.length}: {lowerFirst(step.title)}
          </h2>
          <p className="mt-2 max-w-[42rem] text-[14px] leading-snug text-white/85">
            {stageLabel(step.stage)} · as {personaFor(step.role).name}, {roleLabel(step.role)}. {step.doThis}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PrimaryButton onClick={() => (state.open ? void goTo(state.step) : resume())} disabled={busy}>
              {state.open ? 'Open this step' : 'Resume the guided demo'}
            </PrimaryButton>
          </div>
        </>
      ) : (
        <>
          <h2 id="start-here-title" className="mt-1.5 font-serif text-[28px] font-normal leading-[1.08] text-white">
            Follow one rule from an expert&apos;s words to a blocked unsafe action
          </h2>
          <p className="mt-2 max-w-[42rem] text-[14px] leading-snug text-white/85">
            The guided demo walks the whole loop in {DEMO_PATH.length} steps and switches people for you.
            {part}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <PrimaryButton onClick={() => void start()} disabled={busy}>
              Start the guided demo
            </PrimaryButton>
            {first ? (
              <button
                type="button"
                onClick={() => void goTo(first.index)}
                disabled={busy}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-5 text-[14px] font-medium text-white hover:bg-white/20 disabled:opacity-60"
              >
                Go to your step: {lowerFirst(first.step.title)}
              </button>
            ) : (
              <Link
                href={routes.incidents()}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-5 text-[14px] font-medium text-white hover:bg-white/20"
              >
                Open incidents
              </Link>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-white py-1 pl-5 pr-1 text-[14px] font-medium text-night hover:bg-white/90 focus-visible:outline-white disabled:opacity-60"
    >
      {children}
      <span className="grid size-9 place-items-center rounded-full bg-lavender text-white transition-transform group-hover:translate-x-0.5">
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </button>
  );
}
