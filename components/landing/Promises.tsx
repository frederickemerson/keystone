'use client';

// The hand-off from the replay to "How it works": what Keystone promises, in
// three verbs, each over the steps of the story below that keep it.

import { useRef, type MouseEvent } from 'react';
import { MotionConfig, motion, useInView } from 'motion/react';
import { Branches, Dish, Vault } from '@lucasmarkes/hairline/react';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import { NUMERALS, STEP_TITLES } from './story/HowItWorksStory';
import { usePrefersReducedMotion } from './story/useMotionPreference';
import { useMediaQuery } from './story/usePlayOnView';
import styles from './landing.module.css';

interface PromiseCopy {
  verb: string;
  /** Reads on from the verb: "Capture what only he knows…". */
  line: string;
  figure: typeof Vault;
  figureLabel: string;
  /** Indices into the How it works steps that keep this promise. */
  steps: number[];
  /** The gate's vault never opens, not even under the pointer. */
  locked?: boolean;
}

const PROMISES: PromiseCopy[] = [
  {
    verb: 'Capture',
    line: 'what only he knows, in one onboarding call.',
    figure: Dish,
    figureLabel: 'A dish on its mount, turned to listen: the expert’s judgement, heard once.',
    steps: [0, 1],
  },
  {
    verb: 'Enforce',
    line: 'at the moment of risk, with gates the AI can’t override.',
    figure: Vault,
    figureLabel: 'A vault door with its bolts shot: a gate the AI cannot open.',
    steps: [2],
    locked: true,
  },
  {
    verb: 'Improve',
    line: 'only through tested, approved versions.',
    figure: Branches,
    figureLabel: 'A branch that forks from the main line and merges back: a tested, approved version.',
    steps: [3, 4],
  },
];

const EASE = [0.2, 0, 0, 1] as const;

/** The steps of "How it works" that keep a promise, on one rail across all three. */
function StepRail({
  steps,
  last,
  shown,
  delay,
  instant,
}: {
  steps: number[];
  last: boolean;
  shown: boolean;
  delay: number;
  instant: boolean;
}) {
  return (
    <div className="relative mt-auto pt-9">
      {/* The rail runs on under the gap to the next promise, so the five steps read as one line. */}
      <motion.span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-[calc(2.25rem+17px)] h-px origin-left bg-line-strong/35',
          last ? 'right-0' : 'right-0 md:-right-10 lg:-right-14',
        )}
        initial={false}
        animate={{ scaleX: shown ? 1 : 0 }}
        transition={instant ? { duration: 0 } : { duration: 0.7, delay: delay + 0.25, ease: EASE }}
      />
      <ol className="relative flex flex-wrap items-center gap-x-4 gap-y-3">
        {steps.map((step, j) => (
          <motion.li
            key={step}
            className="flex items-center gap-2.5 bg-canvas pr-2"
            initial={false}
            animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
            transition={instant ? { duration: 0 } : { duration: 0.35, delay: delay + 0.4 + j * 0.08, ease: EASE }}
          >
            <span
              className="grid size-9 place-items-center rounded-full border-[1.5px] border-charcoal bg-surface font-mono text-[12px] font-semibold text-ink"
              aria-hidden="true"
            >
              {NUMERALS[step]}
            </span>
            <span className="text-[15px] font-medium text-ink">
              <span className="sr-only">Step {NUMERALS[step]}: </span>
              {STEP_TITLES[step]}
            </span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

function PromiseColumn({
  promise,
  index,
  wide,
  reduced,
}: {
  promise: PromiseCopy;
  index: number;
  wide: boolean;
  reduced: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const shown = reduced || inView;
  const Art = promise.figure;
  // Side by side, the three arrive in a quick cascade; stacked, each on its own.
  const delay = wide ? index * 0.12 : 0;
  return (
    <li ref={ref} className="flex min-w-0 flex-col">
      <motion.div
        className="relative aspect-[5/4] w-full max-w-[300px]"
        initial={false}
        animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
        transition={reduced ? { duration: 0 } : { duration: 0.6, delay, ease: EASE }}
      >
        <div className={styles.promiseBleed}>
          <Art
            theme="light"
            role="img"
            aria-label={promise.figureLabel}
            intensity={0.7}
            className={promise.locked ? styles.lockedFigure : undefined}
          />
        </div>
      </motion.div>
      <motion.h3
        className="mt-5"
        initial={false}
        animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        transition={reduced ? { duration: 0 } : { duration: 0.55, delay: delay + 0.08, ease: EASE }}
      >
        <span className="block text-[44px] font-semibold leading-[1] tracking-[-0.03em] text-heading lg:text-[52px]">
          {promise.verb}
        </span>
        <span className="mt-3.5 block max-w-[20rem] font-sans text-[19px] font-normal leading-[1.45] tracking-normal text-ink lg:text-[20px]">
          {promise.line}
        </span>
      </motion.h3>
      <StepRail
        steps={promise.steps}
        last={index === PROMISES.length - 1}
        shown={shown}
        delay={delay}
        instant={reduced}
      />
    </li>
  );
}

export function Promises() {
  const reduced = usePrefersReducedMotion();
  const wide = useMediaQuery('(min-width: 768px)');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const headingShown = useInView(headingRef, { once: true, amount: 0.6 }) || reduced;
  const linkShown = useInView(linkRef, { once: true, amount: 1 }) || reduced;

  const toHowItWorks = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById('how-it-works');
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="promises-title" className={cn('border-t border-line', styles.promises)}>
        <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-20 sm:px-8 lg:pb-20 lg:pt-28">
          <motion.h2
            id="promises-title"
            className="max-w-[16em] font-display text-[38px] font-semibold leading-[1.06] tracking-[-0.025em] text-heading sm:text-[52px] lg:text-[64px] lg:leading-[1.03]"
            ref={headingRef}
            initial={false}
            animate={headingShown ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
            transition={reduced ? { duration: 0 } : { duration: 0.6, ease: EASE }}
          >
            Keystone puts his judgement in every incident room.
          </motion.h2>

          <ul className="mt-14 grid gap-16 md:grid-cols-3 md:gap-10 lg:mt-20 lg:gap-14">
            {PROMISES.map((promise, i) => (
              <PromiseColumn key={promise.verb} promise={promise} index={i} wide={wide} reduced={reduced} />
            ))}
          </ul>

          <motion.a
            href="#how-it-works"
            onClick={toHowItWorks}
            className="group mt-16 inline-flex min-h-11 items-center gap-2 rounded-full text-[17px] font-medium text-ink underline-offset-4 hover:underline lg:mt-20"
            ref={linkRef}
            initial={false}
            animate={linkShown ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={reduced ? { duration: 0 } : { duration: 0.5, delay: 0.3, ease: EASE }}
          >
            Here’s how
            <ArrowDown
              className="size-[18px] transition-transform duration-200 ease-out group-hover:translate-y-0.5"
              strokeWidth={2}
              aria-hidden="true"
            />
          </motion.a>
        </div>
      </section>
    </MotionConfig>
  );
}
