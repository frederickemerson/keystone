'use client';

// Portfolio pulse — the override-rate KPI. docs/SUBMISSION.md §6.3 listed this
// figure as "proposed for the pilot, not built"; lib/governance/overrides counts
// it from the append-only audit log and this renders it.
//
// It shows counts over their denominator and never a percentage the log cannot
// carry (ConfidenceMeter's "Count of confirmed sources, not a probability" is
// the same rule). Escalations and refused attempts are deliberately kept beside
// the figure rather than inside it: a gate routing to a named human, or an
// attempt governance refused, is the system working — not an override.

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, FileQuestion, RotateCcw, ScrollText, ShieldX, Stamp, ThumbsDown, Users } from 'lucide-react';
import { CHIP_BASE, EmptyState, TONE_CHIP, type Tone } from '@/components/mosaic';
import { useMounted } from '@/components/mosaic/useMounted';
import { cn } from '@/lib/ui/cn';
import { roleLabel } from '@/lib/governance/access';
import { EMPTY_AUDIT_LOG } from '@/lib/governance/audit';
import {
  formatOverrideCount,
  OVERRIDE_RATE_SUBTITLE,
  overrideRateNote,
  summariseOverrides,
  type OverrideSummary,
} from '@/lib/governance/overrides';
import { useGovernanceStore } from '@/lib/governance/store';
import { routes } from '@/lib/journey';

/** Rows shown per list before the rest are summarised in a line. */
const MAX_ROWS = 5;

function Figure({ summary }: { summary: OverrideSummary }) {
  return (
    <div>
      <p className="text-[13px] leading-snug text-ink-muted">Recommended actions refused by a named human</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-ink">
          {formatOverrideCount(summary)}
        </span>
        <span className="text-[13px] font-medium text-ink-muted">decisions</span>
      </p>
      <p className="mt-2 max-w-[46ch] text-[11px] leading-snug text-ink-muted">{overrideRateNote(summary)}</p>
    </div>
  );
}

/** The counts that sit beside the figure, each labelled for what it actually is. */
function ContextChips({ summary }: { summary: OverrideSummary }) {
  const { approvals } = summary;
  const chips: { key: string; tone: Tone; icon: React.ReactNode; text: string; title: string }[] = [
    {
      key: 'escalated',
      tone: 'escalate',
      icon: <ArrowUpRight className="size-3.5" aria-hidden="true" />,
      text: `${summary.escalations} escalated to a named human`,
      title: 'The gate routing a decision to a named human. Not an override — the gate worked.',
    },
    {
      key: 'held',
      tone: 'approval',
      icon: <FileQuestion className="size-3.5" aria-hidden="true" />,
      text: `${summary.evidenceHolds} held for evidence`,
      title: 'Decisions held open until missing evidence is confirmed.',
    },
    {
      key: 'approvals',
      tone: approvals.overEvalRegressions > 0 ? 'blocked' : 'neutral',
      icon: <Stamp className="size-3.5" aria-hidden="true" />,
      text: `${approvals.overEvalRegressions} of ${approvals.total} approvals over an eval regression`,
      title: 'Version approvals where the approver accepted an eval regression, with a reason on record.',
    },
    {
      key: 'rollbacks',
      tone: 'neutral',
      icon: <RotateCcw className="size-3.5" aria-hidden="true" />,
      text: `${summary.rollbacks} rolled back`,
      title: 'Approved versions withdrawn in this run.',
    },
    {
      key: 'refused',
      tone: 'neutral',
      icon: <ShieldX className="size-3.5" aria-hidden="true" />,
      text: `${summary.refusedAttempts} refused by governance`,
      title: 'Attempts governance refused outright. They never took effect, so they are not overrides.',
    },
  ];

  return (
    <ul className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <span className={cn(CHIP_BASE, TONE_CHIP[chip.tone], 'tabular-nums')} title={chip.title}>
            {chip.icon}
            {chip.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ListPanel({
  icon,
  title,
  description,
  rows,
  hidden,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  rows: readonly { key: string; label: React.ReactNode; count: string }[];
  /** How many rows are not shown (0 when all of them are). */
  hidden: number;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
        <span className="text-ink-muted">{icon}</span>
        {title}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{description}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-ink-muted">Nothing recorded in this run.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {rows.map((row) => (
            <li key={row.key} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-ink">{row.label}</span>
              <span className="shrink-0 tabular-nums text-ink-muted">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 ? <p className="mt-1.5 text-[11px] text-ink-muted">+{hidden} more</p> : null}
    </div>
  );
}

/**
 * The override figure for the current run. Before mount (and on the server) the
 * persisted store is not read, so the first client render matches the server's.
 */
export function OverrideRate() {
  const audit = useGovernanceStore((s) => s.audit);
  const mounted = useMounted();
  const summary = useMemo(() => summariseOverrides(mounted ? audit : EMPTY_AUDIT_LOG), [mounted, audit]);

  const nothingRecorded =
    summary.decisions === 0 &&
    summary.approvals.total === 0 &&
    summary.rollbacks === 0 &&
    summary.refusedAttempts === 0;

  const actorRows = summary.byActor.slice(0, MAX_ROWS).map((row) => ({
    key: `${row.actor}-${row.role}`,
    label: (
      <>
        {row.actor} <span className="text-ink-muted">({roleLabel(row.role)})</span>
      </>
    ),
    count: `${row.overrides} of ${row.decisions}`,
  }));

  const ruleRows = summary.byRule.slice(0, MAX_ROWS).map((row) => ({
    key: row.ruleId,
    label: row.pillId ? (
      <Link href={routes.pill(row.pillId, row.ruleId)} className="font-mono text-ink hover:underline">
        {row.ruleId}
      </Link>
    ) : (
      <span className="font-mono">{row.ruleId}</span>
    ),
    count: `${row.overrides} of ${row.decisions}`,
  }));

  return (
    <div className="card-paper px-5 py-4">
      <p className="max-w-[80ch] text-[13px] leading-snug text-ink-muted">{OVERRIDE_RATE_SUBTITLE}</p>

      {nothingRecorded ? (
        <EmptyState
          className="mt-3"
          icon={ThumbsDown}
          title="No overrides recorded yet"
          description="Nothing has been decided against a pill in this run. The figure counts decisions in the append-only audit log, so it fills as the demo runs — it is not a measured zero."
        />
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <Figure summary={summary} />
            <div className="min-w-0 flex-1">
              <ContextChips summary={summary} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ListPanel
              icon={<Users className="size-4" aria-hidden="true" />}
              title="By whom"
              description="Overrides of the decisions each person recorded."
              rows={actorRows}
              hidden={Math.max(0, summary.byActor.length - MAX_ROWS)}
            />
            <ListPanel
              icon={<ScrollText className="size-4" aria-hidden="true" />}
              title="By rule"
              description="Repeat overrides of one rule are the signal it has drifted from practice."
              rows={ruleRows}
              hidden={Math.max(0, summary.byRule.length - MAX_ROWS)}
            />
          </div>
        </>
      )}
    </div>
  );
}
