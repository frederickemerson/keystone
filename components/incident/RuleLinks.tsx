'use client';

// Links out of the incident room for one rule: to its anchor in the pill hub,
// to the moment the expert said it, to its canvas tile and to the learning loop.

import Link from 'next/link';
import { BookOpen, ExternalLink, LayoutGrid, Volume2 } from 'lucide-react';
import { routes } from '@/lib/journey/routes';
import { cn } from '@/lib/ui/cn';
import { expertCallHref } from './expertCall';
import type { ExpertQuote } from './provenance';

/** A rule id that opens the rule in its pill hub. */
export function RuleIdLink({ pillId, ruleId, className }: { pillId: string; ruleId: string; className?: string }) {
  return (
    <Link
      href={routes.pill(pillId, ruleId)}
      className={cn('font-mono underline decoration-1 underline-offset-2 hover:decoration-2', className)}
      aria-label={`Rule ${ruleId}: open it in its pill`}
    >
      {ruleId}
    </Link>
  );
}

/** "Chilled water leak v1.2.0 · rule TS-07" line for a card's details. */
export function RuleSourceLine({
  pillId,
  pillName,
  version,
  ruleId,
}: {
  pillId: string;
  pillName: string;
  version: string;
  ruleId: string;
}) {
  return (
    <p className="text-ink">
      <span className="font-medium">From:</span>{' '}
      <Link href={routes.pill(pillId, ruleId)} className="underline underline-offset-2 hover:text-accent">
        {pillName} v{version} · rule {ruleId}
      </Link>
    </p>
  );
}

const LINK = 'btn-pill text-xs';

/** Why drawer footer: where the rule lives, who said it, and how to correct it. */
export function WhyDrawerLinks({
  pillId,
  ruleId,
  incidentId,
  expert,
}: {
  pillId: string;
  ruleId: string;
  incidentId: string;
  expert: ExpertQuote | null;
}) {
  const hear = expertCallHref(expert?.source, expert?.start);
  return (
    <nav aria-label={`Rule ${ruleId} elsewhere`} className="flex flex-wrap gap-2">
      <Link href={routes.pill(pillId, ruleId)} className={LINK}>
        <ExternalLink className="size-3.5" aria-hidden="true" /> Open rule in pill
      </Link>
      {hear ? (
        <Link href={hear} className={LINK}>
          <Volume2 className="size-3.5" aria-hidden="true" /> Hear the expert ({expert?.start})
        </Link>
      ) : null}
      <Link href={routes.canvas(pillId, ruleId)} className={LINK}>
        <LayoutGrid className="size-3.5" aria-hidden="true" /> See it on the canvas
      </Link>
      <Link href={routes.learning(pillId, incidentId)} className={LINK}>
        <BookOpen className="size-3.5" aria-hidden="true" /> Suggest a correction
      </Link>
    </nav>
  );
}
