'use client';

// After an approval the version leaves the queue; this says what happened and
// where to see it working, instead of the card silently vanishing. The page
// scrolls it into view and announces it (it appears above the queue).

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';
import { pillDisplayName } from '@/components/mosaic';
import { incidentsUsingPill } from '@/components/registry/hub-utils';
import type { IncidentRecord } from '@/lib/data/schemas';
import type { PillBundle } from '@/lib/pills/load';
import { actionAnchorId, routes, withAnchor } from '@/lib/journey/routes';

export function LiveNowCard({
  bundle,
  version,
  stillLive,
  incidents,
  replayEnd,
  originIncidentId,
  focusRuleId,
  onDismiss,
}: {
  bundle: PillBundle;
  version: string;
  /** False once a later approval or a rollback has replaced it. */
  stillLive: boolean;
  incidents: readonly IncidentRecord[];
  /** Incident id → number of recorded timeline events (only incidents the room can replay). */
  replayEnd: Readonly<Record<string, number>>;
  /** The incident the version's change came from (its note's task, or its correction), if known. */
  originIncidentId: string | undefined;
  /** The rule this version added or changed: "See it in …" lands on its action card. */
  focusRuleId: string | undefined;
  onDismiss: () => void;
}) {
  const name = pillDisplayName(bundle.name);
  const ref = useRef<HTMLElement>(null);
  const replayable = (id: string): boolean => Object.hasOwn(replayEnd, id);
  // Where the change came from, when the room can replay it; otherwise an open
  // incident that recorded this pill. Either way the room evaluates the new version.
  const origin = originIncidentId && replayable(originIncidentId) ? originIncidentId : undefined;
  const openId =
    origin ??
    incidentsUsingPill(bundle.id, incidents, {}).find((u) => u.incident.status !== 'closed' && replayable(u.incident.id))
      ?.incident.id;

  // The approve button sits far below this card: bring the outcome into view.
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={`${name} v${version} approved`}
      className="flex scroll-mt-24 flex-wrap items-start gap-3 rounded-xl border border-recommend/40 bg-recommend-tint p-4 outline-none"
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
          {openId ? (
            <Link
              href={
                focusRuleId
                  ? withAnchor(routes.incident(openId, replayEnd[openId]), actionAnchorId(focusRuleId))
                  : routes.incident(openId, replayEnd[openId])
              }
              className="btn-pill btn-pill-primary text-xs">
              {origin ? `See it in ${openId}, where it came from` : `See it in ${openId}`}{' '}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null}
          <Link href={routes.pill(bundle.id)} className="btn-pill text-xs">
            Open the pill
          </Link>
          <Link href={routes.learning(bundle.id, openId)} className="btn-pill text-xs">
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
