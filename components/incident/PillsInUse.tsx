'use client';

// "Pills applied to this incident": every approved pill the room evaluates,
// with the version loaded, what it is doing at this step, and a link to its hub.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CHIP_BASE, TONE_CHIP, pillDisplayName } from '@/components/mosaic';
import { Term } from '@/components/journey/Term';
import { routes } from '@/lib/journey/routes';
import { cn } from '@/lib/ui/cn';
import { activityLabel, driftLabel, loadedPillLabel, type PillInUse } from './pill-usage';
import type { RoomPill } from './types';

export function PillsInUse({ pills, unapproved }: { pills: readonly PillInUse[]; unapproved: readonly RoomPill[] }) {
  return (
    <section aria-labelledby="pills-in-use-heading" className="space-y-2">
      <h2 id="pills-in-use-heading" className="text-[13px] font-medium text-ink-muted">
        <Term k="pill">Pills</Term> applied to this incident
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),19.5rem))] gap-2.5">
        {pills.map((p) => {
          const drift = driftLabel(p);
          return (
            <li key={p.pillId}>
              <Link
                href={routes.pill(p.pillId)}
                className="group flex h-full flex-col gap-0.5 rounded-xl border border-line-strong/70 bg-surface px-3.5 py-2.5 text-[13px] transition-colors hover:border-ink/40"
              >
                <span className="flex items-center justify-between gap-2 font-medium text-ink">
                  {loadedPillLabel(p)}
                  <ArrowRight className="size-3.5 shrink-0 text-ink-muted group-hover:text-ink" aria-hidden="true" />
                </span>
                <span className={cn('text-[12px]', p.blocked > 0 ? 'text-blocked' : 'text-ink-muted')}>
                  {activityLabel(p)}
                </span>
                {drift ? <span className="text-[12px] text-approval">{drift}</span> : null}
              </Link>
            </li>
          );
        })}
        {unapproved.map((p) => (
          <li key={p.id}>
            <Link href={routes.pill(p.id)} className={cn(CHIP_BASE, TONE_CHIP.approval, 'hover:underline')}>
              {pillDisplayName(p.name)}: no approved version
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
