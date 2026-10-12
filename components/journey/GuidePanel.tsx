'use client';

// The guided demo, docked in the layout so it never covers what it points at:
// - wide screens (xl): a right rail beside the page, sticky below the header;
// - narrower screens: a compact bar at the bottom of the page column (one
//   line; the step's details expand above it). The bar sits in the flow and
//   publishes its height for scroll-padding, so anchors and focus clear it.
// The shell renders one of each placement; only the one matching the screen
// width shows. Closing keeps the step; the header's chip resumes it.

import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Compass, RotateCcw, X } from 'lucide-react';
import { DEMO_FINISH, DEMO_PATH } from '@/lib/journey';
import { isOnStep, stageLabel } from '@/lib/guide/stage';
import { personaFor, roleLabel } from '@/lib/governance/access';
import { cn } from '@/lib/ui/cn';
import { useGuide } from './GuideProvider';

/** Tailwind's `xl` breakpoint: from here the guide is a rail beside the page. */
const RAIL_QUERY = '(min-width: 80rem)';
const BAR_HEIGHT_VAR = '--guide-bar-h';

export type GuidePlacement = 'rail' | 'bar';

function subscribeRail(onChange: () => void): () => void {
  const mq = window.matchMedia(RAIL_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/** null on the server (nothing renders until the client knows its width). */
function useWideScreen(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    subscribeRail,
    () => window.matchMedia(RAIL_QUERY).matches,
    () => null,
  );
}

export function GuidePanel({ currentRole, placement }: { currentRole: string | null; placement: GuidePlacement }) {
  const { state } = useGuide();
  const wide = useWideScreen();
  if (!state?.open || wide === null) return null;
  if ((placement === 'rail') !== wide) return null;
  return placement === 'rail' ? (
    <aside
      aria-label="Guided demo"
      className="sticky top-(--shell-header-h) hidden h-[calc(100dvh-var(--shell-header-h))] w-[20rem] shrink-0 self-start py-6 pr-5 xl:block"
    >
      <div className="glass-night flex max-h-full flex-col rounded-2xl text-[14px]">
        <GuideContent currentRole={currentRole} compact={false} />
      </div>
    </aside>
  ) : (
    <GuideBar currentRole={currentRole} />
  );
}

function GuideBar({ currentRole }: { currentRole: string | null }) {
  const ref = useRef<HTMLElement>(null);
  // Publish the bar's height so scroll-padding keeps anchors and focus above it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty(BAR_HEIGHT_VAR, `${Math.ceil(el.getBoundingClientRect().height)}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty(BAR_HEIGHT_VAR);
    };
  }, []);
  return (
    <aside ref={ref} aria-label="Guided demo" className="sticky bottom-0 z-[45] xl:hidden">
      <div className="glass-night flex max-h-[42dvh] flex-col rounded-t-2xl border-b-0 text-[14px]">
        <GuideContent currentRole={currentRole} compact />
      </div>
    </aside>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-10 shrink-0 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-white"
    >
      {children}
    </button>
  );
}

function GuideContent({ currentRole, compact }: { currentRole: string | null; compact: boolean }) {
  const { state, step, busy, goTo, close, toggleDetails, finish, start } = useGuide();
  const pathname = usePathname();
  const bodyId = useId();
  if (!state || !step) return null;

  if (state.finished) return <FinishCard compact={compact} onReplay={() => void start()} onClose={close} busy={busy} />;

  const index = state.step;
  const last = index === DEMO_PATH.length - 1;
  const persona = personaFor(step.role);
  const onScreen = isOnStep(step, pathname);
  const asRightPerson = currentRole === step.role;
  const expanded = !state.collapsed;

  const next = last ? (
    <button
      type="button"
      onClick={finish}
      className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-medium text-night hover:bg-white/90"
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
      className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-white py-1 pl-4 pr-1 text-[13px] font-medium text-night hover:bg-white/90 disabled:opacity-60"
    >
      <span className="flex flex-col items-start leading-tight">
        <span>{busy ? 'Switching…' : 'Next'}</span>
        {compact ? null : (
          <span className="max-w-[9rem] truncate text-[11.5px] font-normal text-night/70">{DEMO_PATH[index + 1].title}</span>
        )}
      </span>
      <span className="grid size-8 place-items-center rounded-full bg-lavender text-white">
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </span>
    </button>
  );

  return (
    <>
      <header className={cn('flex items-center gap-2 px-3', compact ? 'py-2' : 'items-start border-b border-white/10 px-4 pb-3 pt-3.5')}>
        <span
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-full bg-lavender/25 text-lavender-on-night',
            compact ? 'max-[22rem]:hidden' : 'mt-0.5',
          )}
        >
          <Compass className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-white/70">
            {compact ? (
              <>
                Step {index + 1} of {DEMO_PATH.length}
              </>
            ) : (
              <>
                Guided demo · step {index + 1} of {DEMO_PATH.length} · {stageLabel(step.stage)}
              </>
            )}
          </p>
          <h2
            className={cn(
              'font-serif font-normal leading-tight tracking-[-0.01em] text-white',
              compact ? 'truncate text-[18px]' : 'mt-0.5 text-[22px]',
            )}
          >
            {step.title}
          </h2>
        </div>
        {compact && !expanded ? next : null}
        <IconButton label={expanded ? 'Hide the step details' : 'Show the step details'} onClick={toggleDetails}>
          <ChevronDown className={cn('size-4 transition-transform', compact ? !expanded && 'rotate-180' : !expanded && '-rotate-90')} aria-hidden="true" />
        </IconButton>
        <IconButton label="Close the guide (resume it from the header)" onClick={close}>
          <X className="size-4" aria-hidden="true" />
        </IconButton>
      </header>
      <span className="sr-only" aria-live="polite">
        {`Step ${index + 1}: ${step.title}`}
      </span>

      {expanded ? (
        <div id={bodyId} className={cn('min-h-0 flex-1 space-y-3 overflow-y-auto px-4', compact ? 'pb-3' : 'py-3')}>
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
      ) : null}

      {expanded || !compact ? (
        <footer className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5">
          <button
            type="button"
            disabled={index === 0 || busy}
            onClick={() => void goTo(index - 1)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] text-white/85 hover:bg-white/10 disabled:opacity-40"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back
          </button>
          {next}
        </footer>
      ) : null}
    </>
  );
}

function FinishCard({
  compact,
  onReplay,
  onClose,
  busy,
}: {
  compact: boolean;
  onReplay: () => void;
  onClose: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-lavender/25 text-lavender-on-night">
          <Check className="size-4" aria-hidden="true" />
        </span>
        <h2 className={cn('min-w-0 flex-1 font-serif font-normal leading-tight text-white', compact ? 'text-[18px]' : 'text-[22px]')}>
          {DEMO_FINISH.title}
        </h2>
        <IconButton label="Close the end card" onClick={onClose}>
          <X className="size-4" aria-hidden="true" />
        </IconButton>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <h3 className="text-[12px] font-semibold text-lavender-on-night">What you saw</h3>
        <ul className="space-y-1.5 text-[13px] leading-snug text-white/90">
          {DEMO_FINISH.saw.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden="true" className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-lavender" />
              {line}
            </li>
          ))}
        </ul>
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3">
        <button
          type="button"
          disabled={busy}
          onClick={onReplay}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-medium text-night hover:bg-white/90 disabled:opacity-60"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Replay the demo
        </button>
        {DEMO_FINISH.links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="inline-flex min-h-10 items-center rounded-full px-3 text-[13px] text-white underline-offset-4 ring-1 ring-white/25 hover:bg-white/10"
          >
            {l.label}
          </Link>
        ))}
      </footer>
    </div>
  );
}
