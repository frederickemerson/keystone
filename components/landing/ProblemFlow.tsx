'use client';

import { useEffect, useRef, useState } from 'react';
import { MotionConfig, motion, useInView, type Variants } from 'motion/react';
import { Branches, Drawer, Hub, Padlock, Phone, Query, Relay, Settle } from '@lucasmarkes/hairline/react';
import { Ban, CheckCircle2, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import styles from './landing.module.css';

type FlowStep = {
  title: string;
  detail: string;
  figure: typeof Drawer;
  label: string;
  locked?: boolean;
};

const TODAY: FlowStep[] = [
  {
    title: '20 years, one person',
    detail: 'The judgement lives in his head.',
    figure: Hub,
    label: 'One central expert holds the links to years of operational judgement.',
  },
  {
    title: 'He retires',
    detail: 'The drawer is empty.',
    figure: Drawer,
    label: 'Empty drawers: the expert leaves without a reusable rulebook.',
  },
  {
    title: 'The team guesses',
    detail: 'Next leak at 3am: no shared rule.',
    figure: Query,
    label: 'A question mark: the next shift faces a leak without the expert’s judgement.',
  },
];

const WITH_KEYSTONE: FlowStep[] = [
  {
    title: 'One onboarding call',
    detail: 'Capture the expert’s cues.',
    figure: Phone,
    label: 'A phone: one onboarding conversation captures the expert’s judgement.',
  },
  {
    title: 'Judgement compiles into rules',
    detail: 'The expert confirms each rule.',
    figure: Settle,
    label: 'Crooked tiles settle into a connected tree of structured rules.',
  },
  {
    title: 'Gates AI cannot override',
    detail: 'Missing required evidence blocks action.',
    figure: Padlock,
    label: 'A closed padlock: the AI cannot bypass required evidence gates.',
    locked: true,
  },
  {
    title: 'Every correction is versioned',
    detail: 'Test, approve, or roll back.',
    figure: Branches,
    label: 'A branching version history preserves corrections and earlier rules.',
  },
  {
    title: 'Reused on every asset',
    detail: 'Same rules, asset-specific roles.',
    figure: Relay,
    label: 'A relay connects one rulebook to multiple assets and their local roles.',
  },
];

const EASE = [0.2, 0, 0, 1] as const;

const listVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } },
};

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/** The connecting arrow draws itself once the step before it has landed. */
const arrowVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  shown: {
    pathLength: 1,
    opacity: 1,
    transition: { delay: 0.3, duration: 0.4, ease: EASE },
  },
};

const outcomeVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

function FlowSteps({ steps, play }: { steps: FlowStep[]; play: boolean }) {
  return (
    <motion.ol
      className={cn(styles.flowSteps, steps.length === 3 ? styles.threeSteps : styles.fiveSteps)}
      variants={listVariants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.35 }}
    >
      {steps.map(({ title, detail, figure: Figure, label, locked }, index) => (
        <motion.li key={title} className={styles.flowStep} variants={stepVariants}>
          <div className={cn('card-paper', styles.flowTile)}>
            <Figure
              theme="light"
              role="img"
              aria-label={label}
              className={cn(styles.flowFigure, locked && styles.lockedFigure)}
              // Keep the safety gate visibly closed, even while other figures play.
              {...(play && !locked ? { play: true } : {})}
            />
          </div>
          <div className={styles.flowCopy}>
            <h4 className="text-[18px] font-semibold leading-tight text-heading">
              <span
                className="mr-2 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-current font-mono text-[11px] align-[2px]"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              {title}
            </h4>
            <p className="mt-2 text-[15px] leading-snug text-ink-muted">{detail}</p>
          </div>
          {index < steps.length - 1 ? (
            <svg className={styles.flowArrow} viewBox="0 0 32 16" fill="none" aria-hidden="true">
              <motion.path
                d="M1 8h29m-6-6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                variants={arrowVariants}
              />
            </svg>
          ) : null}
        </motion.li>
      ))}
    </motion.ol>
  );
}

function Outcome({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <motion.p
      className={cn(styles.flowOutcome, className)}
      variants={outcomeVariants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.8 }}
    >
      {children}
    </motion.p>
  );
}

export function ProblemFlow() {
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: no-preference)');
    const syncMotion = () => setMotionAllowed(preference.matches);
    syncMotion();
    preference.addEventListener('change', syncMotion);
    return () => preference.removeEventListener('change', syncMotion);
  }, []);

  // Figures only play while the section is on screen.
  const sectionRef = useRef<HTMLElement>(null);
  const onScreen = useInView(sectionRef, { amount: 0.15 });
  const play = motionAllowed && !paused && onScreen;

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={sectionRef}
        aria-labelledby="problem-title"
        className={cn('border-t border-line', styles.problemFlow)}
      >
        <div className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-8 lg:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="problem-title"
                className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[52px]"
              >
                The problem
              </h2>
              <p className="mt-4 text-[19px] text-ink-muted">When the expert leaves, what stays?</p>
            </div>
            <div className="min-h-9">
              {motionAllowed ? (
                <button type="button" className="btn-pill gap-2 shadow-none" onClick={() => setPaused(!paused)}>
                  {paused ? (
                    <Play className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Pause className="size-3.5" aria-hidden="true" />
                  )}
                  {paused ? 'Play figures' : 'Pause figures'}
                </button>
              ) : null}
            </div>
          </div>

          <div className={cn(styles.flowRow, styles.today)}>
            <h3 className="mb-6 text-[20px] font-semibold text-ink-muted">Today</h3>
            <FlowSteps steps={TODAY} play={play} />
            <Outcome className="border-blocked/20 bg-blocked-tint text-blocked">
              <Ban className="size-4 shrink-0" aria-hidden="true" />
              Unsafe re-energisation, inconsistent calls, lost tenant trust
            </Outcome>
          </div>

          <div className={cn(styles.flowRow, styles.withKeystone)}>
            <h3 className="mb-6 text-[20px] font-semibold text-heading">With Keystone</h3>
            <FlowSteps steps={WITH_KEYSTONE} play={play} />
            <Outcome className="border-recommend/20 bg-recommend-tint text-recommend">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              Same safe call, every site, every shift
            </Outcome>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
