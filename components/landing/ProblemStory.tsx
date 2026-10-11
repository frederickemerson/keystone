'use client';

// "The problem" as a short story told in four beats, each one a large Hairline
// figure and a line of narration. The facts are the real ones: the expert, his
// years, and INC-2026-1011's timestamps, replayed as if he had already left.
//
// Desktop: the narration scrolls past a sticky stage; the beat that has
// reached the middle of the screen picks the figure. Mobile: each beat carries its own
// figure. Figures only play while they are on screen, never under reduced motion.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MotionConfig, motion, useInView } from 'motion/react';
import { Cabinet, Drawer, Plug, Query } from '@lucasmarkes/hairline/react';
import { Ban } from 'lucide-react';
import { MarkerHighlight } from '@/components/mosaic';
import { cn } from '@/lib/ui/cn';
import type { ProblemFacts } from './data';
import { usePrefersReducedMotion } from './story/useMotionPreference';
import styles from './landing.module.css';

type Figure = typeof Drawer;

interface Beat {
  key: string;
  figure: Figure;
  figureLabel: string;
  narration: ReactNode;
  detail: ReactNode;
  /** The unsafe outcome: the figure and its consequence are drawn in brick red. */
  outcome?: string;
}

const EASE = [0.2, 0, 0, 1] as const;
const EXIT_EASE = [0.3, 0, 1, 1] as const;

function Clock({ children }: { children: string }) {
  return <time className="tabular-nums">{children}</time>;
}

function beatsFor(facts: ProblemFacts): Beat[] {
  return [
    {
      key: 'expert',
      figure: Cabinet,
      figureLabel: 'A full rack of blades: years of judgement held in one place.',
      narration: <>{facts.experienceYears} years of judgement, all in one head.</>,
      detail: (
        <>
          {facts.expert}, {facts.expertRole}. When water meets power, he makes the call.
        </>
      ),
    },
    {
      key: 'retires',
      figure: Drawer,
      figureLabel: 'A cabinet of empty drawers: none of his calls were written down.',
      narration: <>He retires. The drawer is empty.</>,
      detail: <>None of his calls were ever written down.</>,
    },
    {
      key: 'guess',
      figure: Query,
      figureLabel: 'A question mark: the duty team has no rule to follow.',
      narration: (
        <>
          <Clock>{facts.electricsWetAt}</Clock> at {facts.incidentAsset}: water reaches the electrics. The duty team
          guesses.
        </>
      ),
      detail: <>Isolate the branch or the riser? Power back on, or wait? His answers left with him.</>,
    },
    {
      key: 'power',
      figure: Plug,
      figureLabel: 'A plug and a wall socket: power restored before the electrician signs off.',
      narration: <>Someone restores power before the electrician signs off.</>,
      detail: (
        <>
          The insulation test passed at <Clock>{facts.insulationPassedAt}</Clock>. The area was not dry until{' '}
          <Clock>{facts.areaDryAt}</Clock>.
        </>
      ),
      outcome: 'Unsafe re-energisation. A tenant’s trading floor at risk.',
    },
  ];
}

function FigureArt({ beat, play }: { beat: Beat; play: boolean }) {
  const Art = beat.figure;
  return (
    <Art
      theme="light"
      role="img"
      aria-label={beat.figureLabel}
      intensity={0.8}
      play={play}
      className={beat.outcome ? styles.problemAlarm : undefined}
    />
  );
}

/** Mobile: the beat's own figure, playing while at least half of it is on screen. */
function InlineFigure({ beat, motionOK }: { beat: Beat; motionOK: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  return (
    <div ref={ref} className="relative mb-6 aspect-[5/4] lg:hidden">
      <div className={styles.problemBleed}>
        <FigureArt beat={beat} play={motionOK && inView} />
      </div>
    </div>
  );
}

/** Desktop: one stage, four figures stacked; only the active one shows and plays. */
function Stage({ beats, active, motionOK }: { beats: Beat[]; active: number; motionOK: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  return (
    <div ref={ref} className={styles.problemStage}>
      <div className="relative aspect-[5/4] w-full">
        {beats.map((beat, i) => {
          const on = i === active;
          return (
            <motion.div
              key={beat.key}
              className="absolute inset-0"
              initial={false}
              animate={on ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: i < active ? -16 : 16, scale: 0.97 }}
              transition={on ? { duration: 0.6, delay: 0.1, ease: EASE } : { duration: 0.26, ease: EXIT_EASE }}
              style={{ pointerEvents: on ? 'auto' : 'none' }}
              aria-hidden={on ? undefined : true}
            >
              <div className={styles.problemBleed}>
                <FigureArt beat={beat} play={motionOK && inView && on} />
              </div>
            </motion.div>
          );
        })}
      </div>
      <ol className="mt-3 flex justify-center gap-2" aria-hidden="true">
        {beats.map((beat, i) => (
          <li
            key={beat.key}
            className={cn(
              'h-[3px] w-8 rounded-full transition-colors duration-300',
              i === active ? (beat.outcome ? 'bg-blocked' : 'bg-charcoal') : 'bg-line',
            )}
          />
        ))}
      </ol>
    </div>
  );
}

/**
 * Index of the last beat whose top has passed the middle of the viewport.
 * Read from layout on each scroll frame, so a jump (End key, an anchor link)
 * lands on the right beat instead of skipping one.
 */
function useActiveBeat(count: number) {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      let next = 0;
      refs.current.slice(0, count).forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= middle) next = i;
      });
      setActive(next);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [count]);
  return { refs, active };
}

export function ProblemStory({ facts }: { facts: ProblemFacts }) {
  const beats = beatsFor(facts);
  const motionOK = !usePrefersReducedMotion();
  const { refs, active } = useActiveBeat(beats.length);

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="problem-title" className={cn('border-t border-line', styles.problem)}>
        <div className="mx-auto w-full max-w-[1240px] px-4 pt-16 sm:px-8 lg:pt-24">
          <h2
            id="problem-title"
            className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[52px]"
          >
            The problem
          </h2>
          <p className="mt-4 text-[19px] text-ink-muted">When the expert leaves, what stays?</p>
        </div>

        <div className="mx-auto grid w-full max-w-[1240px] px-4 sm:px-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-x-16">
          <ol className="min-w-0">
            {beats.map((beat, i) => (
              <li
                key={beat.key}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-active={i === active ? '' : undefined}
                className={styles.problemBeat}
              >
                <InlineFigure beat={beat} motionOK={motionOK} />
                <div className={styles.problemCopy}>
                  <p className="font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] text-heading sm:text-[38px] lg:text-[42px] lg:leading-[1.1]">
                    {beat.narration}
                  </p>
                  <p className="mt-5 max-w-[28rem] text-[17px] leading-[1.55] text-ink-muted sm:text-[18px]">
                    {beat.detail}
                  </p>
                  {beat.outcome ? (
                    <p className="mt-6 inline-flex items-start gap-2 rounded-[20px] border border-blocked/25 bg-blocked-tint px-4 py-2 text-[15px] font-medium leading-[1.45] text-blocked">
                      <Ban className="mt-[3px] size-4 shrink-0" aria-hidden="true" />
                      {beat.outcome}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          <div className={cn('hidden lg:block', styles.problemStageColumn)}>
            <Stage beats={beats} active={active} motionOK={motionOK} />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-6 sm:px-8 lg:pb-28 lg:pt-10">
          <p className="max-w-[17em] font-display text-[36px] font-semibold leading-[1.08] tracking-[-0.02em] text-heading sm:text-[48px] lg:text-[60px] lg:leading-[1.05]">
            Keystone keeps his judgement, and makes it <MarkerHighlight>enforceable</MarkerHighlight>.
          </p>
        </div>
      </section>
    </MotionConfig>
  );
}
