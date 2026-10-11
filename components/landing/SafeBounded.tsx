import { CheckCircle2, Clock, Siren, type LucideIcon } from 'lucide-react';
import { TONE_PANEL, type Tone } from '@/components/mosaic';
import type { ActionClass } from '@/lib/engine/types';
import { cn } from '@/lib/ui/cn';
import type { ClassExample } from './data';

const CLASS_COPY: Record<
  ActionClass,
  { label: string; tone: Tone; ink: string; icon: LucideIcon; meaning: string }
> = {
  recommend: {
    label: 'Recommend',
    tone: 'recommend',
    ink: 'text-recommend',
    icon: CheckCircle2,
    meaning: 'MOSAIC suggests the step. Your team carries it out.',
  },
  requires_approval: {
    label: 'Requires approval',
    tone: 'approval',
    ink: 'text-approval',
    icon: Clock,
    meaning: 'Held until a named person with the authority approves it.',
  },
  must_escalate: {
    label: 'Must escalate',
    tone: 'escalate',
    ink: 'text-escalate',
    icon: Siren,
    meaning: 'Handed to the role the pill names, with a fallback if they are unreachable.',
  },
};

export function SafeBounded({ classes }: { classes: ClassExample[] }) {
  return (
    <section aria-labelledby="safe-title" className="mx-auto w-full max-w-[1240px] px-4 py-20 sm:px-8 lg:py-28">
      <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end">
        <h2
          id="safe-title"
          className="font-display-soft text-[44px] font-extrabold leading-[1] tracking-[-0.02em] sm:text-[56px]"
        >
          safe and bounded
        </h2>
        <p className="max-w-[36rem] text-[19px] leading-[1.55] text-ink">
          Every rule carries one of three action classes, and a rule missing its required evidence
          is blocked outright. These are deterministic gates — the model cannot override them.
        </p>
      </div>

      <ul className="mt-12 grid gap-4 md:grid-cols-3">
        {classes.map((c) => {
          const copy = CLASS_COPY[c.actionClass];
          const Icon = copy.icon;
          return (
            <li key={c.actionClass} className={cn('flex flex-col rounded-xl border p-6 sm:p-7', TONE_PANEL[copy.tone])}>
              <h3 className={cn('flex items-center gap-2 text-[19px] font-semibold', copy.ink)}>
                <Icon className="size-5" strokeWidth={2.25} aria-hidden="true" />
                {copy.label}
              </h3>
              <p className="mt-3 text-[17px] leading-[1.5] text-ink">{copy.meaning}</p>
              <div className="mt-auto pt-6">
                <p className="border-t border-current/15 pt-4 text-[15px] leading-snug text-ink-muted">
                  <span className="font-mono text-[13px] font-medium text-ink">{c.example.id}</span>{' '}
                  {c.example.title}
                </p>
                <p className="mt-1.5 text-[13px] text-ink-muted">
                  {c.count} {c.count === 1 ? 'rule' : 'rules'} in approved pills
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
