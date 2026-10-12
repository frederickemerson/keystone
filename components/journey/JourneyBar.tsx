'use client';

// Capture · Compile · Apply · Learn · Reuse: the landing page's loop, carried
// into the app. The current stage comes from the route, or from the guide
// step while the guided demo is on that step's screen.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { STAGES } from '@/lib/journey';
import { currentStage, stageHref } from '@/lib/guide/stage';
import { cn } from '@/lib/ui/cn';
import { useGuide } from './GuideProvider';

const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

export function JourneyBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { state, step } = useGuide();
  const stage = currentStage(pathname, state?.open && !state.finished ? step : undefined);

  return (
    <nav aria-label="The loop" className={cn('min-w-0', className)}>
      <ol className="flex items-center gap-0.5 overflow-x-auto">
        {STAGES.map((s, i) => {
          const current = s.id === stage;
          return (
            <li key={s.id} className="flex shrink-0 items-center">
              {i > 0 ? <span aria-hidden="true" className="mx-1 h-px w-3 bg-line sm:w-5" /> : null}
              <Link
                href={stageHref(s.id)}
                aria-current={current ? 'step' : undefined}
                title={`${s.label}: open this stage of the story`}
                className={cn(
                  'inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors duration-150',
                  current
                    ? 'bg-night font-medium text-white'
                    : 'text-ink-muted hover:bg-dew-drop hover:text-ink',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('font-serif text-[13px] italic', current ? 'text-lavender-on-night' : 'text-ink-muted/80')}
                >
                  {NUMERALS[i]}
                </span>
                {s.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
