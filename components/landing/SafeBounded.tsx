'use client';

import { CheckCircle2, Clock, Siren, type LucideIcon } from 'lucide-react';
import { MotionConfig, motion, type Variants } from 'motion/react';
import { TONE_PANEL, type Tone } from '@/components/mosaic';
import type { ActionClass } from '@/lib/engine/types';
import { cn } from '@/lib/ui/cn';
import type { ClassExample } from './data';
import { CountUp } from './story/CountUp';

/** Each tier is dealt off a small stack: lifted, tilted, then laid flat. */
const DEAL_TILT = [-7, -2, 4];

const deckVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.14 } },
};

const cardVariants: Variants = {
  hidden: (i: number) => ({
    opacity: 0,
    x: -48 - i * 24,
    y: 72,
    rotate: DEAL_TILT[i] ?? 0,
    scale: 0.96,
  }),
  shown: {
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 210, damping: 22, mass: 0.9 },
  },
};

const CLASS_COPY: Record<ActionClass, { label: string; tone: Tone; ink: string; icon: LucideIcon; meaning: string }> = {
  recommend: {
    label: 'Recommend',
    tone: 'recommend',
    ink: 'text-recommend',
    icon: CheckCircle2,
    meaning: 'Your team carries out the suggested step.',
  },
  requires_approval: {
    label: 'Requires approval',
    tone: 'approval',
    ink: 'text-approval',
    icon: Clock,
    meaning: 'A named, authorised person must approve.',
  },
  must_escalate: {
    label: 'Must escalate',
    tone: 'escalate',
    ink: 'text-escalate',
    icon: Siren,
    meaning: 'Route to the named role, or its fallback.',
  },
};

export function SafeBounded({ classes }: { classes: ClassExample[] }) {
  return (
    <section aria-labelledby="safe-title" className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-8 lg:py-28">
      <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end">
        <h2
          id="safe-title"
          className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[52px]"
        >
          Safe and bounded
        </h2>
        <p className="max-w-[36rem] text-[19px] leading-[1.55] text-ink">
          Three action classes, with deterministic evidence gates the AI cannot override.
        </p>
      </div>

      <MotionConfig reducedMotion="user">
        <motion.ul
          className="mt-12 grid gap-4 md:grid-cols-3"
          variants={deckVariants}
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, amount: 0.3 }}
        >
          {classes.map((c, i) => {
            const copy = CLASS_COPY[c.actionClass];
            const Icon = copy.icon;
            return (
              <motion.li
                key={c.actionClass}
                custom={i}
                variants={cardVariants}
                className={cn(
                  'flex flex-col rounded-xl border p-6 shadow-[0_2px_20px_rgb(0_0_0/0.06)] sm:p-7',
                  TONE_PANEL[copy.tone],
                )}
              >
                <h3 className={cn('flex items-center gap-2 text-[19px] font-semibold', copy.ink)}>
                  <Icon className="size-5" strokeWidth={2.25} aria-hidden="true" />
                  {copy.label}
                </h3>
                <p className="mt-3 text-[17px] leading-[1.5] text-ink">{copy.meaning}</p>
                <div className="mt-auto pt-6">
                  <p className="border-t border-current/15 pt-4 text-[15px] leading-snug text-ink-muted">
                    <span className="font-mono text-[13px] font-medium text-ink">{c.example.id}</span> {c.example.title}
                  </p>
                  <p className="mt-1.5 text-[13px] text-ink-muted">
                    <CountUp value={c.count} delay={0.35 + i * 0.14} className="font-semibold text-ink" />{' '}
                    {c.count === 1 ? 'rule' : 'rules'} in approved pills
                  </p>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      </MotionConfig>
    </section>
  );
}
