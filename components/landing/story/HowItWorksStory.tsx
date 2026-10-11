'use client';

// "How it works" as one object that changes in your hands: the expert's
// notebook line becomes a typeset rule, the rule blocks an unsafe action,
// a correction ships as a tested version, and the pill moves to a new asset.
//
// Desktop: a pinned stage scrubbed by scroll (useScroll → useTransform).
// Mobile and reduced motion: five stacked states. Mobile states play once
// when they enter the viewport; reduced motion shows each final state.

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { cn } from '@/lib/ui/cn';
import type { HeroFacts, StoryFacts } from '../data';
import {
  AssetStrip,
  EvidenceFeed,
  NotebookPage,
  QuoteWords,
  RuleCard,
  VersionFork,
  clamp01,
  seg,
  type FlyOffset,
} from './primitives';
import { usePrefersReducedMotion } from './useMotionPreference';

const NUMERALS = ['I', 'II', 'III', 'IV', 'V'] as const;
const PHASES = NUMERALS.length;

interface StepCopy {
  title: string;
  body: ReactNode;
  href: string;
  cta: string;
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** "All three required checks are" / "Two of four required checks are". */
function countPhrase(missing: number, total: number): string {
  const word = (n: number) => WORDS[n] ?? String(n);
  const noun = total === 1 ? 'required check is' : 'required checks are';
  if (missing === total) return total === 1 ? `The ${noun}` : `All ${word(total).toLowerCase()} ${noun}`;
  return `${word(missing)} of ${word(total).toLowerCase()} ${noun}`;
}

function stepCopy(hero: HeroFacts, story: StoryFacts): StepCopy[] {
  const learn = story.learn;
  return [
    {
      title: 'Capture',
      body: (
        <>
          An AI interview surfaces the cues, exceptions and contradictions behind a call. {hero.expert} says it once, in
          his own words, at <span className="font-mono text-[0.9em]">{hero.timestamp}</span> of the onboarding
          interview.
        </>
      ),
      href: '/capture',
      cta: 'Hear the onboarding call',
    },
    {
      title: 'Compile',
      body: (
        <>
          Each candidate rule goes back to the expert to confirm or edit. One sentence becomes{' '}
          <span className="font-mono text-[0.9em]">{hero.ruleId}</span>, with the evidence it needs before anyone acts.
        </>
      ),
      href: `/canvas/${hero.pillId}`,
      cta: 'Open the rule canvas',
    },
    {
      title: 'Apply',
      body: (
        <>
          During <span className="font-mono text-[0.9em]">{story.incidentId}</span> at {story.incidentAsset}, approved
          rules check evidence as it arrives. {countPhrase(story.missing.length, hero.gateEvidence.length)} still
          unconfirmed, so re-energising stays blocked. The AI cannot override the gate.
        </>
      ),
      href: `/incident/${story.incidentId}`,
      cta: 'Open the incident room',
    },
    {
      title: 'Learn',
      body: learn ? (
        <>
          A correction from the field becomes <span className="font-mono text-[0.9em]">v{learn.toVersion}</span>:{' '}
          <span className="font-mono text-[0.9em]">{learn.ruleId}</span>’s deadline moves from {learn.fromDeadline} to{' '}
          {learn.toDeadline} minutes. {learn.evalPassed} of {learn.evalCount} past incidents pass on replay before
          review, and <span className="font-mono text-[0.9em]">v{learn.fromVersion}</span> stays one rollback away.
        </>
      ) : (
        <>Corrections are versioned, replay-tested against past incidents and reviewed before promotion.</>
      ),
      href: `/learning/${hero.pillId}`,
      cta: 'Open the learning loop',
    },
    {
      title: 'Reuse',
      body: (
        <>
          The approved pill carries the same rule to {story.reuse.toAsset}. Its data-centre override sends escalation to
          the {story.reuse.toRole}
          {story.reuse.addedEvidenceLabels.length > 0 ? (
            <> and requires a {listJoin(story.reuse.addedEvidenceLabels)}</>
          ) : null}
          .
        </>
      ),
      href: '/registry',
      cta: 'Browse the registry',
    },
  ];
}

function cardFacts(hero: HeroFacts, story: StoryFacts) {
  return {
    ruleId: hero.ruleId,
    ruleTitle: hero.ruleTitle,
    trigger: story.ruleTrigger,
    evidence: hero.gateEvidence,
  };
}

// ---------------------------------------------------------------------------
// Desktop: the pinned stage
// ---------------------------------------------------------------------------

/** Local 0 → 1 progress of phase `i`, over [start, end] of that phase. */
function usePhase(p: MotionValue<number>, i: number, start = 0, end = 1) {
  return useTransform(p, (v) => clamp01((v * PHASES - i - start) / (end - start)));
}

/** offsetLeft/Top summed up to `root`: layout position, ignoring transforms. */
function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

const CARD_TOP = 252; // where the rule card sits under the notebook (px)
const PANEL_TOP = 168; // where feed / version panels sit once the card has risen
const COPY_GAP = 226; // vertical offset of the reused copy in step V

function Recorder({ t }: { t: MotionValue<number> }) {
  // A small call meter that only moves while you scroll through step I.
  const bars = [0, 1, 2, 3, 4];
  return (
    <span className="inline-flex h-4 items-center gap-[3px]" aria-hidden="true">
      {bars.map((i) => (
        <RecorderBar key={i} t={t} i={i} />
      ))}
    </span>
  );
}

function RecorderBar({ t, i }: { t: MotionValue<number>; i: number }) {
  const scaleY = useTransform(t, (v) => (v <= 0 || v >= 1 ? 0.35 : 0.35 + 0.65 * Math.abs(Math.sin(v * 38 + i * 1.7))));
  return <motion.span className="block h-4 w-[3px] origin-center rounded-full bg-marker-ink" style={{ scaleY }} />;
}

function PinnedStage({ hero, story, p }: { hero: HeroFacts; story: StoryFacts; p: MotionValue<number> }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const offsets = useRef<FlyOffset[]>([]);

  // Measure where each handwritten word has to travel to land in the title.
  const measure = useCallback(() => {
    const stage = stageRef.current;
    const title = titleRef.current;
    if (!stage || !title) return;
    const target = offsetWithin(title, stage);
    const words = wordRefs.current.filter(Boolean) as HTMLSpanElement[];
    const n = Math.max(1, words.length - 1);
    offsets.current = words.map((w, i) => {
      const from = offsetWithin(w, stage);
      const tx = target.x + (i / n) * Math.max(0, title.offsetWidth - w.offsetWidth * 0.55);
      return { dx: tx - from.x, dy: target.y - from.y - 4 };
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  const capture = usePhase(p, 0);
  const compile = usePhase(p, 1);
  const apply = usePhase(p, 2);
  const learnT = usePhase(p, 3, 0.04, 0.96);
  const reuse = usePhase(p, 4);

  // I: highlighter runs word by word.
  const hl = useTransform(capture, (v) => clamp01((v - 0.08) / 0.7));
  // II: words fly; the card typesets around them.
  const fly = useTransform(compile, (v) => clamp01(v / 0.85));
  const assemble = useTransform(compile, (v) => clamp01((v - 0.05) / 0.85));
  const recorderOpacity = useTransform(p, [0.17, 0.22], [1, 0]);

  // The notebook steps back once its words have left, then clears the stage.
  const notebookOpacity = useTransform(p, (v) => {
    const dim = 1 - 0.35 * seg(v, 0.31, 0.39);
    return dim * (1 - seg(v, 0.4, 0.46));
  });
  // Centred on its own in step I, it makes room for the card in step II.
  const notebookY = useTransform(p, (v) => 120 * (1 - seg(v, 0.17, 0.235)) - 36 * seg(v, 0.4, 0.47));
  const notebookScale = useTransform(p, (v) => 1 - 0.04 * seg(v, 0.31, 0.47));
  const notebookRotate = useTransform(p, (v) => -1.5 - 2 * seg(v, 0.4, 0.47));

  // III: the card rises to the top of the stage; evidence arrives under it.
  const cardY = useTransform(p, (v) => -CARD_TOP * seg(v, 0.41, 0.48));
  const cardIn = useTransform(compile, (v) => seg(v, 0.02, 0.3));
  const cardScale = useTransform(cardIn, (v) => 0.97 + 0.03 * v);
  const gate = useTransform(apply, (v) => clamp01((v - 0.16) / 0.74));
  const feedIn = useTransform(p, (v) => seg(v, 0.44, 0.5) * (1 - seg(v, 0.6, 0.63)));
  const feedY = useTransform(feedIn, (v) => (1 - v) * 14);

  // IV: version history replaces the feed.
  const forkIn = useTransform(p, (v) => seg(v, 0.61, 0.65) * (1 - seg(v, 0.8, 0.83)));
  const forkY = useTransform(forkIn, (v) => (1 - v) * 14);

  // V: the card's asset strip slides out, then a copy lands on the next asset.
  const strip = useTransform(reuse, (v) => seg(v, 0.04, 0.2));
  const stripY = useTransform(strip, (v) => (v - 1) * 30);
  const copyIn = useTransform(reuse, (v) => seg(v, 0.14, 0.46));
  const copyOpacity = useTransform(reuse, (v) => (v > 0.12 ? 1 : 0));
  const copyY = useTransform(copyIn, (v) => v * COPY_GAP);
  const copyX = useTransform(copyIn, (v) => Math.sin(v * Math.PI) * 28);
  const copyRotate = useTransform(copyIn, (v) => Math.sin(v * Math.PI) * 2.2);
  const swap = useTransform(reuse, (v) => seg(v, 0.52, 0.66));
  const extra = useTransform(reuse, (v) => seg(v, 0.62, 0.78));
  const stampOut = useTransform(reuse, (v) => 1 - seg(v, 0.0, 0.1));

  const one = useMotionValue(1);
  const facts = cardFacts(hero, story);

  return (
    <div ref={stageRef} className="relative h-[560px] w-full max-w-[580px]" aria-hidden="true">
      {/* I · the expert's notebook */}
      <motion.div
        className="absolute inset-x-0 top-0 z-20 origin-top-left pr-8"
        style={{
          opacity: notebookOpacity,
          y: notebookY,
          scale: notebookScale,
          rotate: notebookRotate,
        }}
      >
        <NotebookPage>
          <p className="flex items-center gap-2 text-[13px] font-medium text-ink-muted">
            <motion.span style={{ opacity: recorderOpacity }} className="inline-flex">
              <Recorder t={capture} />
            </motion.span>
            Onboarding interview, <span className="font-mono text-[12px]">{hero.timestamp}</span>
          </p>
          <QuoteWords
            text={hero.quoteFragment}
            hl={hl}
            fly={fly}
            offsets={offsets}
            wordRefs={wordRefs}
            className="mt-3 text-[36px] leading-[40px]"
          />
          <p className="mt-3 text-[13px] font-medium text-ink-muted">
            {hero.expert}, {story.expertRole.toLowerCase()}
          </p>
        </NotebookPage>
      </motion.div>

      {/* III · incident evidence */}
      <motion.div className="absolute inset-x-0 pl-10" style={{ top: PANEL_TOP, opacity: feedIn, y: feedY }}>
        <EvidenceFeed lines={story.feed} title={`${story.incidentId}, ${story.incidentAsset}`} t={apply} />
      </motion.div>

      {/* IV · versions */}
      {story.learn ? (
        <motion.div className="absolute inset-x-0 pl-10" style={{ top: PANEL_TOP, opacity: forkIn, y: forkY }}>
          <VersionFork facts={story.learn} t={learnT} />
        </motion.div>
      ) : null}

      {/* V · the copy that lands on the next asset (under the original) */}
      <motion.div
        className="absolute inset-x-0 pl-10"
        style={{
          top: 0,
          opacity: copyOpacity,
          x: copyX,
          y: copyY,
          rotate: copyRotate,
        }}
      >
        <div>
          <RuleCard
            facts={facts}
            assemble={one}
            extraEvidence={story.reuse.addedEvidence}
            extra={extra}
            className="relative z-10"
          />
          <AssetStrip
            asset={story.reuse.toAsset}
            role={story.reuse.fromRole}
            swapRole={story.reuse.toRole}
            swap={swap}
          />
        </div>
      </motion.div>

      {/* II–V · the rule card */}
      <motion.div
        className="absolute inset-x-0 z-10 pl-10"
        style={{ top: CARD_TOP, y: cardY, opacity: cardIn, scale: cardScale }}
      >
        <motion.div style={{ y: stripY, opacity: strip }} className="absolute inset-x-0 top-full pl-10">
          <AssetStrip asset={story.reuse.fromAsset} role={story.reuse.fromRole} />
        </motion.div>
        <RuleCard
          facts={facts}
          assemble={assemble}
          gate={gate}
          gateOpacity={stampOut}
          missing={story.missing}
          titleRef={titleRef}
          className="relative z-10"
        />
      </motion.div>
    </div>
  );
}

function StepText({
  copy,
  index,
  p,
  active,
}: {
  copy: StepCopy;
  index: number;
  p: MotionValue<number>;
  active: boolean;
}) {
  const a = index / PHASES;
  const b = (index + 1) / PHASES;
  const first = index === 0;
  const last = index === PHASES - 1;
  const opacity = useTransform(p, (v) => {
    const fadeIn = first ? 1 : seg(v, a - 0.01, a + 0.025);
    const fadeOut = last ? 1 : 1 - seg(v, b - 0.018, b + 0.008);
    return fadeIn * fadeOut;
  });
  const y = useTransform(p, (v) => {
    if (!first && v < a + 0.025) return (1 - seg(v, a - 0.01, a + 0.025)) * 18;
    if (!last && v > b - 0.018) return -seg(v, b - 0.018, b + 0.008) * 18;
    return 0;
  });
  return (
    <motion.div
      className="col-start-1 row-start-1"
      style={{ opacity, y, pointerEvents: active ? 'auto' : 'none' }}
      aria-current={active ? 'step' : undefined}
    >
      <h3 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-heading">
        <span className="sr-only">Step {NUMERALS[index]}: </span>
        {copy.title}
      </h3>
      <p className="mt-4 max-w-[30rem] text-[19px] leading-[1.55] text-ink">{copy.body}</p>
      <Link
        href={copy.href}
        tabIndex={active ? 0 : -1}
        className="mt-6 inline-flex min-h-10 items-center rounded-full border border-charcoal/45 px-4 text-[15px] font-medium text-ink transition-colors hover:bg-surface"
      >
        {copy.cta}
      </Link>
    </motion.div>
  );
}

function Progress({
  p,
  active,
  onJump,
  steps,
}: {
  p: MotionValue<number>;
  active: number;
  onJump: (i: number) => void;
  steps: StepCopy[];
}) {
  const fill = useTransform(p, (v) => clamp01(v * (PHASES / (PHASES - 1)) - 0.1));
  return (
    <nav aria-label="How it works steps" className="relative">
      <div className="absolute inset-x-[18px] top-1/2 h-px -translate-y-1/2 bg-line" aria-hidden="true" />
      <motion.div
        className="absolute left-[18px] right-[18px] top-1/2 h-[1.5px] -translate-y-1/2 origin-left bg-charcoal"
        style={{ scaleX: fill }}
        aria-hidden="true"
      />
      <ol className="relative flex justify-between">
        {NUMERALS.map((n, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-label={`Step ${n}: ${steps[i].title}`}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'grid size-9 place-items-center rounded-full border-[1.5px] font-mono text-[12px] font-semibold transition-[background-color,color,border-color,transform] duration-200 ease-out',
                  current && 'scale-110 border-charcoal bg-charcoal text-cream-paper',
                  done && 'border-charcoal bg-surface text-ink',
                  !current && !done && 'border-line bg-dew-drop text-ink-muted hover:border-charcoal/60',
                )}
              >
                {n}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function PinnedStory({ hero, story, steps }: { hero: HeroFacts; story: StoryFacts; steps: StepCopy[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next = Math.min(PHASES - 1, Math.max(0, Math.floor(v * PHASES)));
    setActive((cur) => (cur === next ? cur : next));
  });

  const onJump = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const travel = track.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: top + travel * ((i + 0.55) / PHASES),
      behavior: 'smooth',
    });
  }, []);

  return (
    <div ref={trackRef} className="relative" style={{ height: `${PHASES * 100}vh` }}>
      <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1240px] grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-center gap-x-20 px-8">
          <PinnedStage hero={hero} story={story} p={scrollYProgress} />
          <div className="min-w-0">
            <Progress p={scrollYProgress} active={active} onJump={onJump} steps={steps} />
            <div className="mt-12 grid">
              {steps.map((copy, i) => (
                <StepText key={copy.title} copy={copy} index={i} p={scrollYProgress} active={i === active} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile and reduced motion: five states in sequence
// ---------------------------------------------------------------------------

/** 0 → 1 once the element is in view (or 1 at once when motion is reduced). */
function usePlayOnView(ref: React.RefObject<HTMLElement | null>, reduced: boolean, duration = 1.8) {
  const t = useMotionValue(reduced ? 1 : 0);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  useEffect(() => {
    if (reduced) {
      t.set(1);
      return;
    }
    if (!inView) return;
    const controls = animate(t, 1, { duration, ease: 'linear' });
    return () => controls.stop();
  }, [inView, reduced, t, duration]);
  return t;
}

function SequenceStep({
  index,
  copy,
  reduced,
  children,
}: {
  index: number;
  copy: StepCopy;
  reduced: boolean;
  children: (t: MotionValue<number>) => ReactNode;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const t = usePlayOnView(ref, reduced, index === 3 ? 2.4 : 1.8);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const shown = reduced || inView;
  return (
    <li
      ref={ref}
      className="grid gap-6 border-t border-line pt-8 pb-12 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-10"
    >
      <motion.div
        initial={false}
        animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: reduced ? 0.3 : 0.45, ease: [0.2, 0, 0, 1] }}
      >
        <h3 className="flex items-center gap-3 font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-heading">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full border-[1.5px] border-charcoal bg-surface font-mono text-[12px] font-semibold tracking-normal text-ink"
            aria-hidden="true"
          >
            {NUMERALS[index]}
          </span>
          <span className="sr-only">Step {NUMERALS[index]}: </span>
          {copy.title}
        </h3>
        <p className="mt-3 text-[17px] leading-[1.55] text-ink">{copy.body}</p>
        <Link
          href={copy.href}
          className="mt-4 inline-flex min-h-10 items-center rounded-full border border-charcoal/45 px-4 text-[15px] font-medium text-ink hover:bg-surface"
        >
          {copy.cta}
        </Link>
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="min-w-0 pr-3 pt-1"
        initial={false}
        animate={shown ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {children(t)}
      </motion.div>
    </li>
  );
}

function SequenceStory({
  hero,
  story,
  steps,
  reduced,
}: {
  hero: HeroFacts;
  story: StoryFacts;
  steps: StepCopy[];
  reduced: boolean;
}) {
  const one = useMotionValue(1);
  const facts = cardFacts(hero, story);
  return (
    <ol className="mx-auto w-full max-w-[1000px] px-4 pb-16 sm:px-8">
      <SequenceStep index={0} copy={steps[0]} reduced={reduced}>
        {(t) => (
          <NotebookPage>
            <p className="text-[13px] font-medium text-ink-muted">
              Onboarding interview, <span className="font-mono text-[12px]">{hero.timestamp}</span>
            </p>
            <QuoteWords text={hero.quoteFragment} hl={t} className="mt-2 text-[28px] leading-[40px]" />
            <p className="mt-2 text-[13px] font-medium text-ink-muted">
              {hero.expert}, {story.expertRole.toLowerCase()}
            </p>
          </NotebookPage>
        )}
      </SequenceStep>
      <SequenceStep index={1} copy={steps[1]} reduced={reduced}>
        {(t) => <RuleCard facts={facts} assemble={t} />}
      </SequenceStep>
      <SequenceStep index={2} copy={steps[2]} reduced={reduced}>
        {(t) => (
          <div className="grid gap-4">
            <RuleCard facts={facts} assemble={one} gate={t} missing={story.missing} />
            <EvidenceFeed lines={story.feed} title={`${story.incidentId}, ${story.incidentAsset}`} t={t} />
          </div>
        )}
      </SequenceStep>
      <SequenceStep index={3} copy={steps[3]} reduced={reduced}>
        {(t) => (story.learn ? <VersionFork facts={story.learn} t={t} /> : null)}
      </SequenceStep>
      <SequenceStep index={4} copy={steps[4]} reduced={reduced}>
        {(t) => <ReuseState facts={facts} story={story} t={t} />}
      </SequenceStep>
    </ol>
  );
}

function ReuseState({
  facts,
  story,
  t,
}: {
  facts: ReturnType<typeof cardFacts>;
  story: StoryFacts;
  t: MotionValue<number>;
}) {
  const one = useMotionValue(1);
  const swap = useTransform(t, (v) => seg(v, 0.25, 0.6));
  const extra = useTransform(t, (v) => seg(v, 0.5, 0.85));
  return (
    <div>
      <RuleCard
        facts={facts}
        assemble={one}
        extraEvidence={story.reuse.addedEvidence}
        extra={extra}
        className="relative z-10"
      />
      <AssetStrip asset={story.reuse.toAsset} role={story.reuse.fromRole} swapRole={story.reuse.toRole} swap={swap} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function HowItWorksStory({ hero, story }: { hero: HeroFacts; story: StoryFacts }) {
  const reduced = usePrefersReducedMotion();
  const steps = stepCopy(hero, story);
  return (
    <>
      <div className={reduced ? 'block' : 'lg:hidden'}>
        <SequenceStory hero={hero} story={story} steps={steps} reduced={reduced} />
      </div>
      {reduced ? null : (
        <div className="hidden lg:block">
          <PinnedStory hero={hero} story={story} steps={steps} />
        </div>
      )}
    </>
  );
}
