'use client';

// "The problem" as a short story told in four beats, each one a large Hairline
// figure and a line of narration. The facts are the real ones: the expert, his
// years, and INC-2026-1011's timestamps, replayed as if he had already left.
//
// Then the turn: the clock runs back through the incident to the moment the
// water reached the electrics, and beat IV's figure rewinds from red to ink,
// its plug back on the floor. The replay below starts from there.
//
// Desktop: the narration scrolls past a sticky stage; the beat that has
// reached the middle of the screen picks the figure. Mobile: each beat carries its own
// figure. Figures only play while they are on screen, never under reduced motion.

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  MotionConfig,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { Cabinet, Drawer, Plug, Query } from '@lucasmarkes/hairline/react';
import { Ban } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { ProblemFacts } from './data';
import { clamp01, seg } from './story/primitives';
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
  /** The turn rewinds this beat's figure, so it also carries an at-rest label. */
  rewoundLabel?: string;
}

/** Beat IV's consequence. The replay flips this same card to its opposite. */
export const UNSAFE_OUTCOME = 'Unsafe re-energisation. A tenant’s trading floor at risk.';

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
      rewoundLabel: 'The plug lies on the floor, unplugged: the power is still off.',
      narration: <>Someone restores power before the electrician signs off.</>,
      detail: (
        <>
          The insulation test passed at <Clock>{facts.insulationPassedAt}</Clock>. The area was not dry until{' '}
          <Clock>{facts.areaDryAt}</Clock>.
        </>
      ),
      outcome: UNSAFE_OUTCOME,
    },
  ];
}

// ---------------------------------------------------------------------------
// The turn's choreography, all read off one scroll progress `r`: 0 as the
// headline's top comes up over the bottom edge, 1 once it sits mid-screen.
// ---------------------------------------------------------------------------

/** Red → ink crossfade of the rewinding figure. */
const inkOf = (r: number) => seg(r, 0.02, 0.55);
/** The stage figure steps back to the right, making room for the headline. */
const stepBackOf = (r: number) => seg(r, 0, 0.45);
/** Headline lines rise in one after another. */
const lineOf = (r: number, i: number) => seg(r, 0.06 + i * 0.08, 0.4 + i * 0.08);
/** The clock runs back through the incident's events. */
const clockOf = (r: number) => clamp01((r - 0.3) / 0.6);

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

/**
 * Beat IV's figure, rewinding: the red, playing drawing fades out over the
 * same figure in ink, at rest, its plug back on the floor. Opacity only.
 */
function RewindArt({ beat, play, rewind }: { beat: Beat; play: boolean; rewind: MotionValue<number> }) {
  const Art = beat.figure;
  const ink = useTransform(rewind, inkOf);
  const red = useTransform(ink, (v) => 1 - v);
  const [rewound, setRewound] = useState(false);
  useEffect(() => {
    const sync = () => {
      const next = ink.get() > 0.98;
      setRewound((cur) => (cur === next ? cur : next));
    };
    sync();
    return ink.on('change', sync);
  }, [ink]);
  return (
    <div className="grid">
      <motion.div className="col-start-1 row-start-1" style={{ opacity: red }}>
        <Art
          theme="light"
          role="img"
          aria-label={beat.figureLabel}
          aria-hidden={rewound || undefined}
          intensity={0.8}
          play={play && !rewound}
          className={styles.problemAlarm}
        />
      </motion.div>
      <motion.div className="col-start-1 row-start-1" style={{ opacity: ink }}>
        <Art
          theme="light"
          role="img"
          aria-label={beat.rewoundLabel}
          aria-hidden={!rewound || undefined}
          intensity={0.8}
        />
      </motion.div>
    </div>
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
function Stage({
  beats,
  active,
  motionOK,
  rewind,
}: {
  beats: Beat[];
  active: number;
  motionOK: boolean;
  rewind: MotionValue<number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  // During the turn the stage keeps beat IV's figure and steps it back.
  const shown = Math.min(active, beats.length - 1);
  const stepBack = useTransform(rewind, stepBackOf);
  const x = useTransform(stepBack, (v) => `${v * 6}%`);
  const scale = useTransform(stepBack, (v) => 1 - 0.16 * v);
  const ticks = useTransform(rewind, (v) => 1 - inkOf(v));
  return (
    <div ref={ref} className={styles.problemStage}>
      <div className="relative aspect-[5/4] w-full">
        {beats.map((beat, i) => {
          const on = i === shown;
          const play = motionOK && inView && on;
          return (
            <motion.div
              key={beat.key}
              className="absolute inset-0"
              initial={false}
              animate={on ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: i < shown ? -16 : 16, scale: 0.97 }}
              transition={on ? { duration: 0.6, delay: 0.1, ease: EASE } : { duration: 0.26, ease: EXIT_EASE }}
              style={{ pointerEvents: on ? 'auto' : 'none' }}
              aria-hidden={on ? undefined : true}
            >
              {beat.rewoundLabel ? (
                <motion.div className={cn(styles.problemBleed, 'origin-right')} style={{ x, scale }}>
                  <RewindArt beat={beat} play={play} rewind={rewind} />
                </motion.div>
              ) : (
                <div className={styles.problemBleed}>
                  <FigureArt beat={beat} play={play} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <motion.ol className="mt-3 flex justify-center gap-2" aria-hidden="true" style={{ opacity: ticks }}>
        {beats.map((beat, i) => (
          <li
            key={beat.key}
            className={cn(
              'h-[3px] w-8 rounded-full transition-colors duration-300',
              i === shown ? (beat.outcome ? 'bg-blocked' : 'bg-charcoal') : 'bg-line',
            )}
          />
        ))}
      </motion.ol>
    </div>
  );
}

/**
 * Index of the last beat whose top has passed the middle of the viewport
 * (the turn counts as one more). Read from layout on each scroll frame, so a
 * jump (End key, an anchor link) lands on the right beat instead of skipping one.
 */
function useActiveBeat(count: number) {
  const refs = useRef<(HTMLElement | null)[]>([]);
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

// ---------------------------------------------------------------------------
// The turn
// ---------------------------------------------------------------------------

function TurnLine({ r, index, children }: { r: MotionValue<number>; index: number; children: ReactNode }) {
  const k = useTransform(r, (v) => lineOf(v, index));
  const y = useTransform(k, (v) => (1 - v) * 28);
  return (
    <motion.span className="block" style={{ opacity: k, y }}>
      {children}
    </motion.span>
  );
}

/**
 * "Now replay 08:11": on the way in, the clock runs back through the
 * incident's own events, from its last entry to the moment the water reached
 * the electrics. Tabular figures, so the line never changes width.
 */
function Turn({
  facts,
  beat,
  rewind,
  motionOK,
  turnRef,
  headlineRef,
}: {
  facts: ProblemFacts;
  beat: Beat;
  rewind: MotionValue<number>;
  motionOK: boolean;
  turnRef: (el: HTMLElement | null) => void;
  headlineRef: RefObject<HTMLParagraphElement | null>;
}) {
  const times = facts.rewind;
  const clock = useTransform(rewind, (v) => times[Math.round(clockOf(v) * (times.length - 1))] ?? facts.electricsWetAt);
  const figureRef = useRef<HTMLDivElement>(null);
  const inView = useInView(figureRef, { amount: 0.5 });

  return (
    <div ref={turnRef} className={styles.turn}>
      {/* Mobile: the figure rewinds in place, above the headline. */}
      <div ref={figureRef} className="relative mb-8 aspect-[5/4] lg:hidden">
        <div className={styles.problemBleed}>
          <RewindArt beat={beat} play={motionOK && inView} rewind={rewind} />
        </div>
      </div>
      <p ref={headlineRef} className={styles.turnHeadline}>
        <span className="sr-only">
          Now replay {facts.electricsWetAt}, with his judgement in the room.
        </span>
        <span aria-hidden="true">
          <TurnLine r={rewind} index={0}>
            Now replay{' '}
            <motion.time className="tabular-nums" dateTime={facts.electricsWetAt}>
              {clock}
            </motion.time>{' '}
            —
          </TurnLine>
          <TurnLine r={rewind} index={1}>
            with his judgement
          </TurnLine>
          <TurnLine r={rewind} index={2}>
            in the room.
          </TurnLine>
        </span>
      </p>
    </div>
  );
}

export function ProblemStory({ facts }: { facts: ProblemFacts }) {
  const beats = beatsFor(facts);
  const reduced = usePrefersReducedMotion();
  const motionOK = !reduced;
  // Beats I–IV, then the turn.
  const { refs, active } = useActiveBeat(beats.length + 1);
  const turnIndex = beats.length;

  const headline = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: headline, offset: ['start end', 'center center'] });
  // Reduced motion: no scrubbing. The turn shows its final state, and the
  // stage simply switches beat IV's figure to ink once the turn is current.
  const settled = useMotionValue(1);
  const switched = useMotionValue(0);
  useEffect(() => switched.set(active >= turnIndex ? 1 : 0), [active, turnIndex, switched]);
  const rewind = reduced ? settled : scrollYProgress;
  const stageRewind = reduced ? switched : scrollYProgress;

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="problem-title" className={styles.problem}>
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
          <div className="min-w-0">
            <ol>
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
            <Turn
              facts={facts}
              beat={beats[beats.length - 1]}
              rewind={rewind}
              motionOK={motionOK}
              turnRef={(el) => {
                refs.current[turnIndex] = el;
              }}
              headlineRef={headline}
            />
          </div>
          <div className={cn('hidden lg:block', styles.problemStageColumn)}>
            <Stage beats={beats} active={active} motionOK={motionOK} rewind={stageRewind} />
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
