'use client';

// The pill hub's rules: one card per rule of the governed version, anchored at
// #rule-<id> (routes.pill(pillId, ruleId)), with the words it rests on and
// every incident whose replay triggered it.

import Link from 'next/link';
import { AudioLines, Ban, Clock, ExternalLink, Quote, Repeat, Siren } from 'lucide-react';
import { ActionClassChip, CHIP_BASE, TONE_CHIP } from '@/components/mosaic';
import { Term } from '@/components/journey/Term';
import { roleLabel } from '@/lib/governance/access';
import { routes } from '@/lib/journey/routes';
import { cn } from '@/lib/ui/cn';
import { expertCallHref } from '@/components/incident/expertCall';
import {
  RECURRENCE_LABEL,
  recurrenceSentence,
  type RecurrenceClass,
  type RecurrenceReport,
} from '@/lib/learning/recurrence';
import type { RuleApplication, RuleRow } from './hub-utils';

/**
 * Whether the record shows this rule's situation recurring.
 *
 * A rule in a pill is a standing claim that its situation happens again. This
 * says what the replayed incidents actually support — including when they
 * support nothing, which is not the same as the situation never occurring.
 */
const RECURRENCE_TONE: Record<RecurrenceClass, string> = {
  systemic: 'border-line-strong bg-dew-drop text-ink',
  single: 'border-line bg-surface text-ink-muted',
  unseen: 'border-line bg-surface text-ink-muted',
};

function RecurrenceLine({ ruleId, report }: { ruleId: string; report: RecurrenceReport }) {
  const entry = report.rules.find((r) => r.ruleId === ruleId);
  if (!entry) return null;
  return (
    <p className="flex items-start gap-1.5 text-[12px] leading-snug text-ink-muted">
      <Repeat className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className={cn(CHIP_BASE, 'mr-1.5 align-baseline', RECURRENCE_TONE[entry.classification])}>
          {RECURRENCE_LABEL[entry.classification]}
        </span>
        {recurrenceSentence(entry, report)}
      </span>
    </p>
  );
}

function SourceLine({ row }: { row: RuleRow }) {
  const src = row.source;
  if (!src) return <p className="text-[12px] text-ink-muted">No recorded quote for this rule.</p>;
  const hear = src.kind === 'expert' ? expertCallHref(src.source, src.timestamp) : null;
  return (
    <figure className="border-l-2 border-line-strong pl-3">
      <blockquote className="text-[14px] leading-relaxed text-ink">“{src.quote}”</blockquote>
      <figcaption className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-muted">
        {src.kind === 'frontline' ? (
          <span className="inline-flex items-center gap-1">
            <AudioLines className="size-3.5" aria-hidden="true" /> From a frontline note
          </span>
        ) : (
          <span>From the expert call{src.timestamp ? ` at ${src.timestamp}` : ''}</span>
        )}
        {src.confirmedBy ? <span>· confirmed by {src.confirmedBy}</span> : null}
        {hear ? (
          <Link href={hear} className="font-medium text-ink underline underline-offset-2 hover:text-accent">
            Hear it in the call
          </Link>
        ) : null}
      </figcaption>
    </figure>
  );
}

function AppliedIn({ apps }: { apps: readonly RuleApplication[] }) {
  if (apps.length === 0) {
    return <p className="text-[12px] text-ink-muted">Not triggered in any recorded incident yet.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {apps.map((a) => (
        <li key={a.incidentId}>
          <Link
            href={routes.incident(a.incidentId, a.firstStep)}
            className={cn(CHIP_BASE, a.blocked ? TONE_CHIP.blocked : TONE_CHIP.neutral, 'hover:underline')}
            title={`First triggered at event ${a.firstStep}${a.blocked ? '; the gate held' : ''}`}
          >
            {a.blocked ? <Ban className="size-3" aria-hidden="true" /> : null}
            <span className="font-mono">{a.incidentId}</span>
            <span className="font-normal">· event {a.firstStep}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function HubRuleList({
  pillId,
  rows,
  applications,
  recurrence,
}: {
  pillId: string;
  rows: readonly RuleRow[];
  applications: Readonly<Record<string, readonly RuleApplication[]>>;
  recurrence: RecurrenceReport;
}) {
  return (
    <ol className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.id}
          id={row.anchorId}
          className="card-paper scroll-mt-24 space-y-3 p-5 target:ring-2 target:ring-marker-ink"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] font-semibold text-ink">{row.id}</span>
            <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-heading">{row.title}</h3>
            <ActionClassChip actionClass={row.actionClass} />
          </div>
          <p className="text-[13px] leading-relaxed text-ink">{row.decision}</p>
          <RecurrenceLine ruleId={row.id} report={recurrence} />

          <dl className="grid gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-[9rem_1fr]">
            <dt className="text-ink-muted">
              Required <Term k="evidence">evidence</Term>
            </dt>
            <dd className="text-ink">
              {row.requiredEvidence.length === 0 ? 'None' : row.requiredEvidence.map((e) => e.label).join(' · ')}
            </dd>
            <dt className="text-ink-muted">Escalate to</dt>
            <dd className="inline-flex items-center gap-1.5 text-ink">
              <Siren className="size-3.5 text-ink-muted" aria-hidden="true" />
              {roleLabel(row.escalateRole)}
              {row.escalateFallback ? <span className="text-ink-muted">· fallback {roleLabel(row.escalateFallback)}</span> : null}
            </dd>
            {row.deadlineMinutes !== null ? (
              <>
                <dt className="text-ink-muted">Deadline</dt>
                <dd className="inline-flex items-center gap-1.5 text-ink">
                  <Clock className="size-3.5 text-ink-muted" aria-hidden="true" />
                  {row.deadlineMinutes} min
                </dd>
              </>
            ) : null}
          </dl>

          <div className="flex items-start gap-2">
            <Quote className="mt-1 size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <SourceLine row={row} />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Applied in</p>
            <AppliedIn apps={applications[row.id] ?? []} />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            <Link href={routes.canvas(pillId, row.id)} className="btn-pill text-xs">
              <ExternalLink className="size-3.5" aria-hidden="true" /> Open in canvas
            </Link>
            <Link href={routes.learning(pillId)} className="btn-pill text-xs">
              Suggest a correction
            </Link>
          </div>
        </li>
      ))}
    </ol>
  );
}
