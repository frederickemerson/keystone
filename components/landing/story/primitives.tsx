'use client';

// Visual building blocks of the "How it works" story. Each takes a local
// progress MotionValue (0 → 1) and derives transform/opacity only, so the
// same pieces run scroll-linked (desktop), time-based on entry (mobile) or
// frozen at 1 (reduced motion).

import { type ReactNode, type RefObject } from 'react';
import { motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import styles from '../landing.module.css';

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Decelerating curve for things arriving on paper. */
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
/** Map [a, b] of a progress value to an eased 0 → 1. */
export const seg = (v: number, a: number, b: number) => easeOut(clamp01((v - a) / (b - a)));

/** Eased 0 → 1 over a sub-range of a progress MotionValue. */
export function useSeg(t: MotionValue<number>, a: number, b: number) {
  return useTransform(t, (v) => seg(v, a, b));
}

/** Fade + lift in over [a, b]. */
export function useRise(t: MotionValue<number>, a: number, b: number, distance = 12) {
  const k = useSeg(t, a, b);
  const y = useTransform(k, (v) => (1 - v) * distance);
  return { opacity: k, y };
}

// ---------------------------------------------------------------------------
// I · the handwritten quote, highlighted word by word
// ---------------------------------------------------------------------------

export interface FlyOffset {
  dx: number;
  dy: number;
}

function QuoteWord({
  word,
  index,
  count,
  hl,
  fly,
  offsets,
  wordRef,
}: {
  word: string;
  index: number;
  count: number;
  hl: MotionValue<number>;
  fly?: MotionValue<number>;
  offsets?: RefObject<FlyOffset[]>;
  wordRef?: (el: HTMLSpanElement | null) => void;
}) {
  // Each word's highlighter stroke runs across its own slice of the range.
  const start = index / count;
  const sweep = useTransform(hl, (v) => clamp01((v - start) * count));

  // Desktop only: the words lift off the page into the rule card, staggered.
  const local = (v: number) => seg(v, index * 0.045, 0.62 + index * 0.045);
  const zero = hl; // any MotionValue; the transforms below ignore it when no fly
  const src = fly ?? zero;
  const x = useTransform(src, (v) => (fly ? (offsets?.current?.[index]?.dx ?? 0) * local(v) : 0));
  const y = useTransform(src, (v) => {
    if (!fly) return 0;
    const k = local(v);
    // A small upward arc before the drop, like a word plucked off paper.
    return (offsets?.current?.[index]?.dy ?? 0) * k - Math.sin(k * Math.PI) * 28;
  });
  const scale = useTransform(src, (v) => (fly ? 1 - 0.45 * local(v) : 1));
  const opacity = useTransform(src, (v) => (fly ? 1 - clamp01((local(v) - 0.7) / 0.3) : 1));

  return (
    <motion.span
      ref={wordRef}
      className="relative inline-block whitespace-nowrap will-change-transform"
      style={{ x, y, scale, opacity }}
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-x-[-3px] bottom-[6px] top-[12px] -z-10 origin-left rounded-[3px] bg-marker/25"
        style={{ scaleX: sweep }}
      />
      {word}
    </motion.span>
  );
}

export function QuoteWords({
  text,
  hl,
  fly,
  offsets,
  wordRefs,
  className,
}: {
  text: string;
  hl: MotionValue<number>;
  fly?: MotionValue<number>;
  offsets?: RefObject<FlyOffset[]>;
  wordRefs?: RefObject<(HTMLSpanElement | null)[]>;
  className?: string;
}) {
  const words = text.split(/\s+/);
  return (
    <p
      className={cn('relative isolate font-hand font-semibold text-marker-ink', className)}
      style={{ rotate: '-1.2deg' }}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          <QuoteWord
            word={w}
            index={i}
            count={words.length}
            hl={hl}
            fly={fly}
            offsets={offsets}
            wordRef={
              wordRefs
                ? (el) => {
                    wordRefs.current[i] = el;
                  }
                : undefined
            }
          />
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </p>
  );
}

/** A page of the expert's notebook: ruled, bound, slightly tilted. */
export function NotebookPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0 translate-x-1.5 translate-y-2 rotate-[1.2deg] rounded-[14px] border-[1.5px] border-charcoal bg-dew-drop" />
      <div
        className={cn(
          'relative h-full rounded-[14px] border-[1.5px] border-charcoal bg-[#fffdf8] shadow-lift',
          styles.ruled,
        )}
      >
        <div className="absolute inset-y-0 left-0 flex w-9 flex-col justify-around border-r border-dashed border-line py-5">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className="mx-auto block size-3 rounded-full border border-[var(--shadow-mist)] bg-canvas" />
          ))}
        </div>
        <div className="relative pb-7 pl-[72px] pr-6 pt-6">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// II–V · the typeset rule card
// ---------------------------------------------------------------------------

function EvidenceChip({
  name,
  enter,
  missing,
  index,
}: {
  name: string;
  enter: MotionValue<number>;
  missing?: MotionValue<number>;
  index: number;
}) {
  const k = useTransform(enter, (v) => seg(v, 0.55 + index * 0.1, 0.8 + index * 0.1));
  const scale = useTransform(k, (v) => 0.85 + 0.15 * v);
  const ring = useTransform(missing ?? enter, (v) => (missing ? v : 0));
  return (
    <motion.span
      className="relative inline-flex rounded-full border border-line bg-surface px-2 py-[3px] font-mono text-[12px] leading-none text-ink"
      style={{ opacity: k, scale }}
    >
      {name}
      {/* "Still missing" state: a dashed brick-red ring over the chip. */}
      <motion.span
        aria-hidden="true"
        className="absolute -inset-px rounded-full border border-dashed border-blocked bg-blocked-tint/40"
        style={{ opacity: ring }}
      />
    </motion.span>
  );
}

/** The gate's stamp: a padlock whose shackle drops shut, and "Blocked". */
function BlockedStamp({ gate, fade }: { gate: MotionValue<number>; fade?: MotionValue<number> }) {
  const still = useMotionValue(1);
  const fadeBy = fade ?? still;
  const opacity = useTransform([gate, fadeBy], ([g, f]: number[]) => clamp01((g - 0.62) / 0.08) * f);
  const scale = useTransform(gate, [0.62, 0.74, 0.82], [1.35, 0.94, 1]);
  const rotate = useTransform(gate, [0.62, 0.82], [-10, 4]);
  const shackle = useTransform(gate, [0.7, 0.8], [-4, 0]);
  return (
    <motion.span
      className="absolute -right-3 -top-3.5 z-10 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-blocked bg-blocked-tint px-2.5 py-1 text-[13px] font-semibold leading-none text-blocked shadow-[0_1px_2px_rgba(180,35,24,0.25)]"
      style={{ opacity, scale, rotate }}
    >
      <svg viewBox="0 0 16 18" className="h-[15px] w-[13px]" fill="none" aria-hidden="true">
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

export interface RuleCardFacts {
  ruleId: string;
  ruleTitle: string;
  trigger: string;
  evidence: string[];
}

export function RuleCard({
  facts,
  assemble,
  gate,
  gateOpacity,
  missing = [],
  extraEvidence = [],
  extra,
  titleRef,
  className,
}: {
  facts: RuleCardFacts;
  /** 0 → 1: title, trigger and chips typeset in. */
  assemble: MotionValue<number>;
  /** 0 → 1: missing evidence marked, then the stamp snaps on. */
  gate?: MotionValue<number>;
  /** Optional 1 → 0 fade for the stamp, independent of the gate. */
  gateOpacity?: MotionValue<number>;
  missing?: string[];
  extraEvidence?: string[];
  /** 0 → 1: extra (asset-specific) evidence appears. */
  extra?: MotionValue<number>;
  titleRef?: RefObject<HTMLSpanElement | null>;
  className?: string;
}) {
  const title = useSeg(assemble, 0.5, 0.78);
  const meta = useSeg(assemble, 0.45, 0.7);
  const ring = useTransform(gate ?? assemble, (v) => (gate ? seg(v, 0.5, 0.62) : 0));
  const extraIn = useTransform(extra ?? assemble, (v) => (extra ? v : 0));
  const extraScale = useTransform(extraIn, [0, 0.7, 1], [0.6, 1.08, 1]);

  return (
    <div className={cn('card-paper relative px-5 pb-4 pt-4 shadow-lift', className)}>
      {gate ? <BlockedStamp gate={gate} fade={gateOpacity} /> : null}
      <div className={cn('flex items-start gap-2.5', gate && 'pr-12')}>
        <motion.span
          className="shrink-0 whitespace-nowrap rounded-[5px] border border-line-strong bg-dew-drop px-1.5 py-0.5 font-mono text-[12px] font-medium text-ink"
          style={{ opacity: meta }}
        >
          {facts.ruleId}
        </motion.span>
        <motion.span
          ref={titleRef}
          className="min-w-0 font-display text-[17px] font-semibold leading-tight tracking-[-0.02em] text-heading"
          style={{ opacity: title }}
        >
          {facts.ruleTitle}
        </motion.span>
      </div>
      <motion.p className="mt-2.5 text-[13px] leading-snug text-ink-muted" style={{ opacity: meta }}>
        <span className="font-medium text-ink">When</span>{' '}
        {facts.trigger.charAt(0).toLowerCase() + facts.trigger.slice(1)}
      </motion.p>
      <motion.p className="mt-3 text-[12px] font-medium text-ink-muted" style={{ opacity: meta }}>
        Required evidence
      </motion.p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {facts.evidence.map((key, i) => (
          <EvidenceChip
            key={key}
            name={key}
            index={i}
            enter={assemble}
            missing={missing.includes(key) ? ring : undefined}
          />
        ))}
        {extraEvidence.map((key) => (
          <motion.span
            key={key}
            className="inline-flex items-center gap-1 rounded-full border border-escalate-mark/60 bg-escalate-tint px-2 py-[3px] font-mono text-[12px] leading-none text-escalate"
            style={{ opacity: extraIn, scale: extraScale }}
          >
            + {key}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

/** The asset strip tucked under a rule card in step V. */
export function AssetStrip({
  asset,
  role,
  swapRole,
  swap,
}: {
  asset: string;
  role: string;
  swapRole?: string;
  swap?: MotionValue<number>;
}) {
  const still = useMotionValue(0);
  const k = swap ?? still;
  const outOpacity = useTransform(k, (v) => 1 - v);
  const outY = useTransform(k, (v) => -14 * v);
  const inOpacity = k;
  const inY = useTransform(k, (v) => 14 * (1 - v));

  return (
    <div className="mx-3 flex min-h-[38px] flex-wrap items-center gap-x-3 gap-y-1 rounded-b-[10px] border-x border-b border-charcoal/70 bg-dew-drop px-4 py-2 text-[13px]">
      <span className="font-semibold text-heading">{asset}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-ink-muted">
        Escalate to
        <span className="relative inline-grid overflow-hidden font-medium text-ink">
          <motion.span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: outOpacity, y: outY }}>
            {role}
          </motion.span>
          {swapRole ? (
            <motion.span
              className="col-start-1 row-start-1 whitespace-nowrap text-escalate"
              style={{ opacity: inOpacity, y: inY }}
            >
              {swapRole}
            </motion.span>
          ) : null}
        </span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// III · the incident evidence feed
// ---------------------------------------------------------------------------

export interface FeedLine {
  time: string;
  label: string;
  key: string;
}

function FeedRow({ line, t, index, count }: { line: FeedLine; t: MotionValue<number>; index: number; count: number }) {
  const a = 0.08 + (index / count) * 0.36;
  const { opacity, y } = useRise(t, a, a + 0.12, 10);
  return (
    <motion.li className="flex items-baseline gap-3 py-1.5" style={{ opacity, y }}>
      <span className="w-11 shrink-0 font-mono text-[12px] text-ink-muted">{line.time}</span>
      <span className="flex min-w-0 items-baseline gap-1.5 text-[13px] leading-snug text-ink">
        <Check className="size-3.5 shrink-0 translate-y-[2px] text-recommend" strokeWidth={2.5} aria-hidden="true" />
        {line.label}
      </span>
    </motion.li>
  );
}

export function EvidenceFeed({
  lines,
  title,
  t,
  className,
}: {
  lines: FeedLine[];
  title: string;
  t: MotionValue<number>;
  className?: string;
}) {
  const live = useTransform(t, (v) => (v > 0.02 && v < 0.62 ? 1 : 0.35));
  return (
    <div className={cn('rounded-xl border border-line bg-surface/90 px-4 py-3', className)}>
      <p className="flex items-center gap-2 text-[12px] font-medium text-ink-muted">
        <motion.span className="size-2 rounded-full bg-blocked" style={{ opacity: live }} />
        {title}
      </p>
      <ol className="mt-1.5 divide-y divide-line">
        {lines.map((line, i) => (
          <FeedRow key={`${line.time}-${line.key}`} line={line} t={t} index={i} count={lines.length} />
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IV · version fork, diff, evals and rollback
// ---------------------------------------------------------------------------

export interface LearnFacts {
  fromVersion: string;
  toVersion: string;
  ruleId: string;
  fromDeadline: number;
  toDeadline: number;
  evalCount: number;
  evalPassed: number;
}

const evalStart = (index: number, count: number) => 0.42 + (index / count) * 0.24;

function EvalDot({ t, index, count, pass }: { t: MotionValue<number>; index: number; count: number; pass: boolean }) {
  const a = evalStart(index, count);
  const k = useSeg(t, a, a + 0.06);
  const scale = useTransform(k, [0, 0.6, 1], [0.6, 1.15, 1]);
  const Icon = pass ? Check : X;
  return (
    <span className="relative inline-grid size-5 place-items-center">
      <span className="col-start-1 row-start-1 size-5 rounded-full border border-dashed border-[var(--shadow-mist)]" />
      <motion.span
        className={cn(
          'col-start-1 row-start-1 grid size-5 place-items-center rounded-full text-white',
          pass ? 'bg-recommend' : 'bg-blocked',
        )}
        style={{ opacity: k, scale }}
      >
        <Icon className="size-3" strokeWidth={3} aria-hidden="true" />
      </motion.span>
    </span>
  );
}

function EvalCounter({ t, count, passed }: { t: MotionValue<number>; count: number; passed: number }) {
  const n = useTransform(t, (v) => {
    let shown = 0;
    for (let i = 0; i < passed; i++) if (v >= evalStart(i, count) + 0.03) shown++;
    return `${shown}/${count} pass`;
  });
  return (
    <span className="inline-grid font-mono text-[13px] font-semibold tabular-nums text-recommend">
      <span className="invisible col-start-1 row-start-1">{`${count}/${count} pass`}</span>
      <motion.span className="col-start-1 row-start-1 text-right">{n}</motion.span>
    </span>
  );
}

export function VersionFork({
  facts,
  t,
  className,
}: {
  facts: LearnFacts;
  t: MotionValue<number>;
  className?: string;
}) {
  const trunk = useSeg(t, 0, 0.18);
  const branch = useSeg(t, 0.12, 0.34);
  const node = useSeg(t, 0.3, 0.38);
  const nodeScale = useTransform(node, [0, 0.7, 1], [0.4, 1.15, 1]);
  const diff = useRise(t, 0.34, 0.46, 8);
  const strike = useSeg(t, 0.4, 0.48);
  const evalsRow = useRise(t, 0.38, 0.46, 8);
  const back = useSeg(t, 0.7, 0.84);
  const backLabel = useSeg(t, 0.78, 0.9);

  return (
    <div className={cn('rounded-xl border border-line bg-surface/90 px-5 py-4', className)}>
      <p className="text-[12px] font-medium text-ink-muted">Pill versions</p>
      {/* One coordinate space (viewBox 440 × 100) for both the SVG strokes and
          the HTML nodes, so they stay aligned at any width. */}
      <div className="relative mt-2 aspect-[440/100] w-full">
        <svg
          viewBox="0 0 440 100"
          className="absolute inset-0 h-full w-full overflow-visible"
          fill="none"
          aria-hidden="true"
        >
          <motion.path d="M20 30 H420" stroke="var(--charcoal)" strokeWidth="1.5" style={{ pathLength: trunk }} />
          <motion.path
            d="M20 30 C 90 30, 120 78, 196 78 H232"
            stroke="var(--recommend)"
            strokeWidth="1.5"
            style={{ pathLength: branch }}
          />
          {/* Rollback: a dashed arc from the new version back to the old. */}
          <motion.path
            d="M240 68 C 236 8, 80 0, 30 22"
            stroke="var(--burnt-sienna)"
            strokeWidth="1.25"
            strokeDasharray="4 4"
            style={{ pathLength: back, opacity: back }}
          />
          <motion.path
            d="M40 13 L29 22 L42 27"
            stroke="var(--burnt-sienna)"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: backLabel }}
          />
        </svg>
        <span className="absolute left-[4.55%] top-[30%] -translate-x-1/2 -translate-y-1/2">
          <span className="block size-3 rounded-full border-[1.5px] border-charcoal bg-surface" />
        </span>
        <span className="absolute left-0 top-[46%] font-mono text-[12px] text-ink">v{facts.fromVersion}</span>
        <motion.span
          className="absolute left-[54.5%] top-[78%] -translate-x-1/2 -translate-y-1/2"
          style={{ opacity: node, scale: nodeScale }}
        >
          <span className="block size-3.5 rounded-full border-[1.5px] border-recommend bg-recommend-tint" />
        </motion.span>
        <motion.span
          className="absolute left-[58%] top-[78%] -translate-y-1/2 font-mono text-[12px] font-semibold text-recommend"
          style={{ opacity: node }}
        >
          v{facts.toVersion}
        </motion.span>
        <motion.span
          className="absolute right-0 top-[-4%] whitespace-nowrap text-[12px] font-medium text-burnt-sienna"
          style={{ opacity: backLabel }}
        >
          Rollback restores v{facts.fromVersion}
        </motion.span>
      </div>

      <motion.p
        className="mt-3 flex flex-wrap items-baseline gap-x-2 rounded-lg bg-dew-drop px-3 py-2 text-[14px] text-ink"
        style={diff}
      >
        <span className="font-mono text-[12px] font-medium">{facts.ruleId}</span>
        <span>deadline</span>
        <span className="relative font-mono text-ink-muted">
          {facts.fromDeadline}
          <motion.span
            aria-hidden="true"
            className="absolute inset-x-[-2px] top-1/2 h-[1.5px] origin-left bg-blocked"
            style={{ scaleX: strike }}
          />
        </span>
        <span aria-hidden="true">→</span>
        <span className="font-mono font-semibold text-recommend">{facts.toDeadline}</span>
        <span>min</span>
      </motion.p>

      <motion.div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2" style={evalsRow}>
        <span className="text-[13px] text-ink-muted">Replayed incidents</span>
        <span className="flex gap-1.5">
          {Array.from({ length: facts.evalCount }, (_, i) => (
            <EvalDot key={i} t={t} index={i} count={facts.evalCount} pass={i < facts.evalPassed} />
          ))}
        </span>
        <EvalCounter t={t} count={facts.evalCount} passed={facts.evalPassed} />
      </motion.div>
    </div>
  );
}
