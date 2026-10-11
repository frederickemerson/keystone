'use client';

// The replay: beat IV's moment again, with the expert's rule in the room.
// The AI's recorded proposal arrives, TS-07 blocks it on the evidence that
// is still missing, his words show why, the duty LEW is called, and the
// outcome card from beat IV flips to its opposite. Every fact is the engine's
// own verdict on INC-2026-1011 at that minute (see data.ts).
//
// Desktop: a pinned scene scrubbed by scroll (useScroll → useTransform).
// Mobile: the same parts stacked, each playing once as it scrolls into view.
// Reduced motion: every part in its final state, nothing pinned.

import { useRef, type RefObject } from 'react';
import { MotionConfig, motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { Ban, CheckCircle2, Siren, X } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { MissingCheck, ReplayFacts } from './data';
import { UNSAFE_OUTCOME } from './ProblemStory';
import { clamp01, seg } from './story/primitives';
import { usePrefersReducedMotion } from './story/useMotionPreference';
import { useMediaQuery, usePlayOnView } from './story/usePlayOnView';
import styles from './landing.module.css';

type Span = readonly [number, number];

/** Where each part plays within the pinned track's progress (desktop). */
const WINDOWS = {
  request: [0.02, 0.4],
  gate: [0.18, 0.56],
  quote: [0.54, 0.66],
  escalate: [0.66, 0.76],
  outcome: [0.78, 0.9],
} satisfies Record<string, Span>;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * A part's local 0 → 1 progress: a slice of the pinned track's scroll on
 * desktop, or a one-off play when the part scrolls into view on mobile.
 */
function usePart(
  p: MotionValue<number>,
  scrubbed: boolean,
  [a, b]: Span,
  ref: RefObject<HTMLElement | null>,
  reduced: boolean,
  duration: number,
) {
  const fromScroll = useTransform(p, (v) => clamp01((v - a) / (b - a)));
  const fromView = usePlayOnView(ref, reduced, duration, 0.5);
  return scrubbed ? fromScroll : fromView;
}

// ---------------------------------------------------------------------------
// The request
// ---------------------------------------------------------------------------

function RequestCard({
  facts,
  t,
  held,
  cardRef,
}: {
  facts: ReplayFacts;
  t: MotionValue<number>;
  held: MotionValue<number>;
  cardRef: RefObject<HTMLDivElement | null>;
}) {
  const k = useTransform(t, (v) => seg(v, 0, 0.3));
  const y = useTransform(k, (v) => (1 - v) * 18);
  const link = useTransform(t, (v) => seg(v, 0.32, 0.55));
  const waiting = useTransform(held, (v) => 1 - v);
  const heldY = useTransform(held, (v) => (1 - v) * 8);
  const dim = useTransform(held, (v) => 1 - 0.28 * v);
  const arrowhead = useTransform(link, (v) => (v > 0.9 ? 1 : 0));

  return (
    <div ref={cardRef}>
      <motion.div className="card-paper px-5 py-4 shadow-lift" style={{ opacity: k, y }}>
        <motion.div style={{ opacity: dim }}>
          <div className="flex items-center justify-between gap-3 text-[13px] text-ink-muted">
            <span className="flex items-center gap-2">
              <time className="font-mono text-[12px] text-ink">{facts.at}</time>
              <span className="font-medium">AI proposal</span>
            </span>
            {/* Its state, swapped in place: waiting for the gate, then held by it. */}
            <span className="relative inline-grid justify-items-end text-[12px] font-medium">
              <motion.span
                aria-hidden="true"
                className="col-start-1 row-start-1 whitespace-nowrap"
                style={{ opacity: waiting }}
              >
                Checking rules
              </motion.span>
              <motion.span
                className="col-start-1 row-start-1 whitespace-nowrap text-blocked"
                style={{ opacity: held, y: heldY }}
              >
                Held by {facts.gate.ruleId}
              </motion.span>
            </span>
          </div>
          <p className="mt-1.5 font-display text-[20px] font-semibold leading-snug tracking-[-0.02em] text-heading">
            {facts.proposal}
          </p>
        </motion.div>
      </motion.div>
      {/* The request goes to the gate. */}
      <svg viewBox="0 0 24 36" className="mx-auto block h-9 w-6 overflow-visible" fill="none" aria-hidden="true">
        <motion.path d="M12 2 V31" stroke="var(--charcoal)" strokeWidth="1.25" style={{ pathLength: link }} />
        <motion.path
          d="M7.5 27 L12 32 L16.5 27"
          stroke="var(--charcoal)"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: arrowhead }}
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The gate's verdict
// ---------------------------------------------------------------------------

/** "Blocked", pressed onto the card: lands large and tilted, then settles; the shackle drops shut. */
function GateStamp({ s }: { s: MotionValue<number> }) {
  const opacity = useTransform(s, (v) => clamp01(v / 0.25));
  const scale = useTransform(s, [0, 0.45, 0.7, 1], [1.45, 0.94, 1.02, 1]);
  const rotate = useTransform(s, [0, 0.7, 1], [-12, 5, 4]);
  const shackle = useTransform(s, [0.55, 0.85], [-4, 0]);
  return (
    <motion.span
      className="absolute -right-3 -top-4 z-10 inline-flex items-center gap-2 rounded-full border-[1.5px] border-blocked bg-blocked-tint px-3.5 py-1.5 text-[15px] font-semibold leading-none text-blocked shadow-[0_1px_2px_rgba(180,35,24,0.25)]"
      style={{ opacity, scale, rotate }}
    >
      <svg viewBox="0 0 16 18" className="h-[17px] w-[15px]" fill="none" aria-hidden="true">
        <motion.path
          d="M4.5 8V5.5a3.5 3.5 0 0 1 7 0V8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{ y: shackle }}
        />
        <rect x="2" y="8" width="12" height="9" rx="2" fill="currentColor" />
      </svg>
      Blocked
    </motion.span>
  );
}

function MissingRow({ check, t, index }: { check: MissingCheck; t: MotionValue<number>; index: number }) {
  // Each required check is looked up in turn and found unconfirmed.
  const a = 0.46 + index * 0.15;
  const k = useTransform(t, (v) => seg(v, a, a + 0.12));
  const markScale = useTransform(k, [0, 0.6, 1], [0.4, 1.15, 1]);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
      <span className="relative inline-grid size-5 shrink-0 place-items-center">
        <span className="col-start-1 row-start-1 size-5 rounded-full border border-dashed border-[var(--shadow-mist)]" />
        <motion.span
          className="col-start-1 row-start-1 grid size-5 place-items-center rounded-full bg-blocked text-white"
          style={{ opacity: k, scale: markScale }}
        >
          <X className="size-3" strokeWidth={3} aria-hidden="true" />
        </motion.span>
      </span>
      <span className="min-w-0 text-[15px] leading-snug text-ink">{check.label}</span>
      <span className="relative ml-auto inline-flex rounded-full border border-line bg-surface px-2 py-[3px] font-mono text-[12px] leading-none text-ink max-sm:ml-8">
        {check.key}
        {/* Still missing: a dashed brick-red ring over the key. */}
        <motion.span
          aria-hidden="true"
          className="absolute -inset-px rounded-full border border-dashed border-blocked bg-blocked-tint/50"
          style={{ opacity: k }}
        />
      </span>
    </li>
  );
}

function GateCard({
  facts,
  t,
  cardRef,
}: {
  facts: ReplayFacts;
  t: MotionValue<number>;
  cardRef: RefObject<HTMLDivElement | null>;
}) {
  const k = useTransform(t, (v) => seg(v, 0, 0.22));
  const y = useTransform(k, (v) => (1 - v) * 18);
  const stamp = useTransform(t, (v) => clamp01((v - 0.24) / 0.18));
  const { gate } = facts;
  return (
    <motion.div ref={cardRef} className="card-paper relative px-5 pb-5 pt-5 shadow-lift sm:px-6 sm:pb-3" style={{ opacity: k, y }}>
      <GateStamp s={stamp} />
      <p className="flex items-center gap-2 pr-24 text-[13px] text-ink-muted">
        <span className="rounded-[5px] border border-line-strong bg-dew-drop px-1.5 py-0.5 font-mono text-[12px] font-medium text-ink">
          {gate.ruleId}
        </span>
        <span className="font-mono text-[12px]">v{gate.version}</span>
      </p>
      <h3 className="mt-2.5 font-display text-[21px] font-semibold leading-tight tracking-[-0.02em] text-heading sm:text-[22px]">
        {gate.ruleTitle}
      </h3>
      <p className="mt-4 text-[12px] font-medium text-ink-muted">Missing evidence</p>
      <ul className="mt-0.5 divide-y divide-line">
        {gate.missing.map((check, i) => (
          <MissingRow key={check.key} check={check} t={t} index={i} />
        ))}
      </ul>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// His words, and who is called
// ---------------------------------------------------------------------------

function QuoteNote({
  facts,
  t,
  noteRef,
}: {
  facts: ReplayFacts;
  t: MotionValue<number>;
  noteRef: RefObject<HTMLElement | null>;
}) {
  const k = useTransform(t, (v) => seg(v, 0, 0.85));
  const y = useTransform(k, (v) => (1 - v) * 26);
  const rotate = useTransform(k, (v) => -5 + 3.5 * v);
  const { quote } = facts;
  return (
    <motion.figure
      ref={noteRef}
      className="relative z-10 -mt-3 ml-auto mr-1 w-[min(100%,24.5rem)] sm:-mt-4 sm:mr-3"
      style={{ opacity: k, y, rotate }}
    >
      <div
        className={cn(
          'rounded-[12px] border-[1.5px] border-charcoal bg-[#fffdf8] px-5 pb-3.5 pt-3 shadow-lift',
          styles.noteRuled,
        )}
      >
        <blockquote className="font-hand text-[29px] font-semibold leading-[34px] text-marker-ink sm:text-[31px]">
          {quote.text}
        </blockquote>
        <figcaption className="mt-1.5 text-[13px] font-medium text-ink-muted">
          {quote.expert}, {quote.role} · <span className="font-mono text-[12px]">{quote.timestamp}</span>
        </figcaption>
      </div>
    </motion.figure>
  );
}

function EscalationLine({
  facts,
  t,
  lineRef,
}: {
  facts: ReplayFacts;
  t: MotionValue<number>;
  lineRef: RefObject<HTMLParagraphElement | null>;
}) {
  const k = useTransform(t, (v) => seg(v, 0, 0.8));
  const x = useTransform(k, (v) => (1 - v) * -14);
  return (
    <motion.p
      ref={lineRef}
      className="mt-5 inline-flex items-start gap-2 rounded-[20px] border border-escalate-mark/45 bg-escalate-tint px-3.5 py-2 text-[14px] leading-snug text-escalate"
      style={{ opacity: k, x }}
    >
      <Siren className="mt-px size-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      <span>
        Escalated to <span className="font-semibold">{facts.escalateTo.person}</span>, {facts.escalateTo.role}
      </span>
    </motion.p>
  );
}

// ---------------------------------------------------------------------------
// The outcome: beat IV's card, flipped
// ---------------------------------------------------------------------------

function OutcomeFlip({
  facts,
  t,
  flipRef,
}: {
  facts: ReplayFacts;
  t: MotionValue<number>;
  flipRef: RefObject<HTMLDivElement | null>;
}) {
  const k = useTransform(t, easeInOut);
  const front = useTransform(k, (v) => v * -180);
  const back = useTransform(k, (v) => 180 - v * 180);
  // Lifts a little mid-flip; exactly 1 at rest so the settled text stays crisp.
  const lift = useTransform(k, (v) => (v <= 0 || v >= 1 ? 1 : 1 + 0.04 * Math.sin(v * Math.PI)));
  return (
    <motion.div ref={flipRef} className="grid [perspective:1100px]" style={{ scale: lift }}>
      {/* Front: beat IV's card, exactly as it was. */}
      <motion.p
        aria-hidden="true"
        className="col-start-1 row-start-1 inline-flex items-start gap-2 self-start justify-self-start rounded-[20px] border border-blocked/25 bg-blocked-tint px-4 py-2 text-[15px] font-medium leading-[1.45] text-blocked [backface-visibility:hidden]"
        style={{ rotateX: front }}
      >
        <Ban className="mt-[3px] size-4 shrink-0" aria-hidden="true" />
        {UNSAFE_OUTCOME}
      </motion.p>
      {/* Back: the same moment with his rule in the room. */}
      <motion.p
        className="col-start-1 row-start-1 inline-flex items-start gap-2.5 self-start justify-self-start rounded-[18px] border border-recommend/30 bg-recommend-tint py-3.5 pl-4 pr-5 text-[16px] sm:pr-6 sm:text-[17px] font-medium leading-[1.5] text-recommend [backface-visibility:hidden]"
        style={{ rotateX: back }}
      >
        <CheckCircle2 className="mt-[5px] size-[18px] shrink-0" aria-hidden="true" />
        <span>
          <span className="sm:block">Power stays off until the LEW signs off.</span>{' '}
          <span className="sm:block">The tenant is told within {facts.tenantNoticeMinutes} minutes.</span>{' '}
          <span className="sm:block">Nobody guessed.</span>
        </span>
      </motion.p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

export function Replay({ facts }: { facts: ReplayFacts }) {
  const reduced = usePrefersReducedMotion();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const pinned = !reduced; // the pin itself is CSS, desktop only
  const scrubbed = pinned && desktop;

  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: trackRef, offset: ['start 0.3', 'end end'] });

  const requestRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLElement>(null);
  const escalateRef = useRef<HTMLParagraphElement>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);

  const request = usePart(p, scrubbed, WINDOWS.request, requestRef, reduced, 1.3);
  const gate = usePart(p, scrubbed, WINDOWS.gate, gateRef, reduced, 2.2);
  const quote = usePart(p, scrubbed, WINDOWS.quote, quoteRef, reduced, 0.7);
  const escalate = usePart(p, scrubbed, WINDOWS.escalate, escalateRef, reduced, 0.6);
  const outcome = usePart(p, scrubbed, WINDOWS.outcome, outcomeRef, reduced, 0.9);
  // The request is held the moment the stamp lands.
  const held = useTransform(gate, (v) => seg(v, 0.3, 0.42));

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="replay-title" className="relative">
        <div ref={trackRef} className={cn(pinned && 'lg:h-[250vh]')}>
          <div className={cn(pinned && 'lg:sticky lg:top-0 lg:flex lg:h-dvh lg:items-center lg:overflow-hidden')}>
            <div
              className={cn(
                'mx-auto grid w-full max-w-[1240px] px-4 pb-24 pt-8 sm:px-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-x-16',
                pinned ? 'lg:py-0' : 'lg:pb-28 lg:pt-16',
              )}
            >
              <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
                <h2
                  id="replay-title"
                  className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-heading sm:text-[38px] lg:text-[42px]"
                >
                  Same moment, opposite outcome.
                </h2>
                <p className="mt-5 max-w-[28rem] text-[17px] leading-[1.55] text-ink-muted sm:text-[18px]">
                  At <time className="tabular-nums">{facts.at}</time> the AI proposes putting the power back on.
                  Keystone checks the proposal against his rule before anyone acts.
                </p>
              </div>

              <div className="mt-10 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center">
                <div className="mx-auto w-full max-w-[560px]">
                  <RequestCard facts={facts} t={request} held={held} cardRef={requestRef} />
                  <GateCard facts={facts} t={gate} cardRef={gateRef} />
                  <QuoteNote facts={facts} t={quote} noteRef={quoteRef} />
                  <EscalationLine facts={facts} t={escalate} lineRef={escalateRef} />
                </div>
              </div>

              <div className="mt-10 lg:col-start-1 lg:row-start-2 lg:mt-8 lg:self-start">
                <OutcomeFlip facts={facts} t={outcome} flipRef={outcomeRef} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
