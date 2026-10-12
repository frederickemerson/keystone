'use client';

// After an approval the version leaves the queue; this says what happened and
// where to see it working, instead of the card silently vanishing.

import Link from 'next/link';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';
import { pillDisplayName } from '@/components/mosaic';
import { incidentsUsingPill } from '@/components/registry/hub-utils';
import type { IncidentRecord } from '@/lib/data/schemas';
import type { PillBundle } from '@/lib/pills/load';
import { routes } from '@/lib/journey/routes';

export function LiveNowCard({
  bundle,
  version,
  stillLive,
  incidents,
  replayable,
  onDismiss,
}: {
  bundle: PillBundle;
  version: string;
  /** False once a later approval or a rollback has replaced it. */
  stillLive: boolean;
  incidents: readonly IncidentRecord[];
  replayable: readonly string[];
  onDismiss: () => void;
}) {
  const name = pillDisplayName(bundle.name);
  // An open incident that recorded this pill and can be replayed: the room evaluates the new version there.
  const open = incidentsUsingPill(bundle.id, incidents, {}).find(
    (u) => u.incident.status !== 'closed' && replayable.includes(u.incident.id),
  )?.incident;

  return (
    <section
      aria-label={`${name} v${version} approved`}
      className="flex flex-wrap items-start gap-3 rounded-xl border border-recommend/40 bg-recommend-tint p-4"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-recommend" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[15px] font-semibold text-ink">
          {stillLive
            ? `${name} v${version} is live. Every incident now evaluates it.`
            : `${name} v${version} was approved and has since been replaced.`}
        </p>
        <div className="flex flex-wrap gap-2">
          {open ? (
            <Link href={routes.incident(open.id)} className="btn-pill btn-pill-primary text-xs">
              See it in {open.id} <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null}
          <Link href={routes.pill(bundle.id)} className="btn-pill text-xs">
            Open the pill
          </Link>
          <Link href={routes.learning(bundle.id, open?.id)} className="btn-pill text-xs">
            Learning and rollback
          </Link>
        </div>
      </div>
      <button type="button" onClick={onDismiss} className="btn-pill text-xs" aria-label="Dismiss">
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </section>
  );
}
