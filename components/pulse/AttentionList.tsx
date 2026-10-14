// The attention list: what to look at first, worst first, with the reason.
//
// Server-rendered from already role-scoped incidents. The order and the reason
// sentences are computed in lib/learning/attention.ts — this only lays them
// out, so what a reader sees and what a test asserts are the same thing.

import Link from 'next/link';
import { AlertOctagon, ArrowUpRight, Clock, ShieldQuestion, UserCheck } from 'lucide-react';
import { ATTENTION_LABEL, type AttentionItem, type AttentionKind, type AttentionReport } from '@/lib/learning/attention';
import { routes } from '@/lib/journey/routes';

const ICON: Record<AttentionKind, typeof AlertOctagon> = {
  gate_blocked: AlertOctagon,
  awaiting_decision: UserCheck,
  escalated: ShieldQuestion,
};

/** Blocked work reads as blocked; the rest are open, not alarming. */
const TONE: Record<AttentionKind, string> = {
  gate_blocked: 'text-blocked',
  awaiting_decision: 'text-ink',
  escalated: 'text-ink-muted',
};

function Row({ item, assetName }: { item: AttentionItem; assetName: string }) {
  const Icon = ICON[item.kind];
  return (
    <li className="flex items-start gap-2.5 border-t border-line py-2.5 first:border-t-0 first:pt-0">
      <Icon className={`mt-0.5 size-4 shrink-0 ${TONE[item.kind]}`} aria-hidden="true" />
      <div className="min-w-0 space-y-0.5">
        <p className="text-[14px] font-medium text-heading">{item.decision}</p>
        <p className="max-w-[80ch] text-[13px] leading-snug text-ink">{item.why}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-muted">
          <span className={TONE[item.kind]}>{ATTENTION_LABEL[item.kind]}</span>
          <span aria-hidden="true">·</span>
          <span>{assetName}</span>
          <span aria-hidden="true">·</span>
          <Link href={routes.incident(item.incidentId)} className="inline-flex items-center gap-0.5 underline-offset-2 hover:text-ink hover:underline">
            {item.incidentId}
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </Link>
          {item.who ? (
            <>
              <span aria-hidden="true">·</span>
              <span>waiting on {item.who}</span>
            </>
          ) : null}
          {item.deadlineMinutes !== null ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden="true" />
                {item.deadlineMinutes} min allowed
              </span>
            </>
          ) : null}
        </p>
      </div>
    </li>
  );
}

export function AttentionList({
  report,
  assetNames,
}: {
  report: AttentionReport;
  /** asset id → name, so a row can say where without another lookup. */
  assetNames: Readonly<Record<string, string>>;
}) {
  if (report.items.length === 0) {
    return (
      <p className="card-paper p-5 text-sm text-ink-muted">
        Nothing is blocked, awaiting a decision, or escalated in the records you can see.
      </p>
    );
  }
  return (
    <div className="card-paper space-y-2 p-5">
      <p className="max-w-[80ch] text-[13px] leading-snug text-ink-muted">
        Ordered by what the record says is in the way — a gate blocking work, then a decision a named person owes,
        then an escalation still open — and inside each, whichever has been waiting longest. No score, nothing
        weighted: the same record always produces the same order, and every line says why it is there.
      </p>
      <ol className="pt-1">
        {report.items.map((item) => (
          <Row key={`${item.incidentId}-${item.ruleId}`} item={item} assetName={assetNames[item.assetId] ?? item.assetId} />
        ))}
      </ol>
      {report.hidden > 0 ? (
        <p className="border-t border-line pt-2.5 text-[12px] text-ink-muted">
          {report.hidden} more {report.hidden === 1 ? 'item' : 'items'} qualified and {report.hidden === 1 ? 'is' : 'are'}{' '}
          not shown here. The sections below carry the full record.
        </p>
      ) : null}
    </div>
  );
}
