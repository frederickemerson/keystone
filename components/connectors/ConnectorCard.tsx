// One connector on the connectors screen: status (computed, never claimed),
// what it feeds, whether it may confirm gate evidence, and a sample event.

import Link from 'next/link';
import type { Connector } from '@/lib/connectors/contract';
import type { ResolvedStatus } from '@/lib/connectors/ai-status';
import type { EvidenceUse } from '@/lib/connectors/evidence-uses';
import type { TimelineEvent } from '@/lib/data/schemas';
import { routes } from '@/lib/journey/routes';
import { EvidenceTimeline } from '@/components/mosaic/EvidenceTimeline';
import { AdpAgentProbe } from './AdpAgentProbe';
import { BrowserSpeechStatus } from './BrowserSpeechStatus';
import { StatusChip } from './StatusChip';

export interface ConnectorKeyView {
  key: string;
  label: string;
  uses: EvidenceUse[];
}

type Props = {
  connector: Connector;
  status: ResolvedStatus;
  keys: ConnectorKeyView[];
  /** The sample event, already scoped to the viewer's role on the server. */
  sample?: TimelineEvent;
  /**
   * Offer the live "ask the agent" control. Only true for the ADP row, and
   * only when an AppKey is actually set — with none there is nothing to ask,
   * and a button that always fails is worse than no button.
   */
  canAsk?: boolean;
};

function gateLine(c: Connector): string | null {
  if (c.kind !== 'evidence_source') return null;
  if (c.status === 'planned') return null;
  return c.canConfirmGateEvidence
    ? 'Can confirm gate evidence: yes, entered by a named person in a role the pill allows.'
    : 'Can confirm gate evidence: no. It can raise an incident; a named person opens a gate.';
}

function KeyList({ keys }: { keys: ConnectorKeyView[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {keys.map((k) => {
        const first = k.uses[0];
        const title = k.uses.length
          ? `Read by ${k.uses.map((u) => `${u.ruleId}${u.gating ? ' (gate)' : ''}`).join(', ')}`
          : 'No rule reads this item yet';
        const chip = 'inline-flex items-center rounded-full border border-line bg-dew-drop px-2 py-0.5 text-[12px] text-ink';
        return (
          <li key={k.key}>
            {first ? (
              <Link href={routes.pill(first.pillId, first.ruleId)} title={title} className={`${chip} underline-offset-2 hover:underline`}>
                {k.label}
              </Link>
            ) : (
              <span title={title} className={chip}>
                {k.label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ConnectorCard({ connector: c, status, keys, sample, canAsk = false }: Props) {
  const gate = gateLine(c);
  return (
    <li id={c.id} className="card-paper scroll-mt-24 space-y-3 p-5 target:ring-2 target:ring-accent">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold text-heading">{c.name}</h3>
          <p className="text-[13px] text-ink-muted">{c.system}</p>
        </div>
        {status.checkedIn === 'browser' ? <BrowserSpeechStatus /> : <StatusChip status={status.status} />}
      </div>
      <p className="max-w-[75ch] text-sm text-ink">{c.description}</p>
      {status.detail && status.checkedIn === 'server' ? (
        <p className="text-[13px] text-ink-muted">Checked on this request: {status.detail}</p>
      ) : null}
      {keys.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-ink">Evidence it can report</p>
          <KeyList keys={keys} />
        </div>
      ) : null}
      {gate ? <p className="text-[13px] text-ink">{gate}</p> : null}
      {canAsk ? <AdpAgentProbe /> : null}
      {sample ? (
        <details className="rounded-lg border border-line bg-surface p-3">
          <summary className="cursor-pointer text-[13px] font-medium text-ink">Sample event ({sample.id}, recorded)</summary>
          <EvidenceTimeline events={[sample]} className="mt-3" />
        </details>
      ) : null}
    </li>
  );
}
