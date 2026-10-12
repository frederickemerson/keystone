// The decision record's sections. Presentational: everything comes from the
// IncidentDecisionRecord, which is also the JSON download.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ActionClassChip } from '@/components/mosaic/ActionClassChip';
import { SectionHeader } from '@/components/mosaic/SectionHeader';
import { StatusBadge } from '@/components/mosaic/StatusBadge';
import { pillDisplayName } from '@/components/mosaic/pillTitle';
import { humanizeKey } from '@/components/incident/labels';
import { roleLabel } from '@/lib/governance/access';
import { routes } from '@/lib/journey/routes';
import type { EvidenceOrigin, IncidentDecisionRecord, RecordActor, RecordDecision } from '@/lib/record/types';

// Deterministic Singapore wall-clock, identical on server and client.
const SGT = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23', timeZone: 'Asia/Singapore' });

function when(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : SGT.format(d);
}

function person(a: RecordActor | undefined): string {
  return a ? `${a.name} (${roleLabel(a.role)})` : '—';
}

function valueText(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <SectionHeader title={title} description={description} />
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-muted">{children}</p>;
}

function Origin({ origin }: { origin?: EvidenceOrigin }) {
  if (!origin) return <span className="text-ink-muted">Not reported</span>;
  const source = origin.connectorId ? (
    <Link href={`${routes.connectors()}#${origin.connectorId}`} className="underline-offset-2 hover:underline">
      {origin.source}
    </Link>
  ) : (
    origin.source
  );
  return (
    <span>
      {source}
      {origin.confirmedBy ? ` · ${person(origin.confirmedBy)}` : ''} · <span className="font-mono text-[12px]">{origin.eventId}</span> ·{' '}
      {when(origin.at)}
    </span>
  );
}

function Decision({ decision }: { decision?: RecordDecision }) {
  if (!decision) return <span className="text-ink-muted">No decision recorded</span>;
  return (
    <span>
      {humanizeKey(decision.outcome)} by {person(decision.actor)} · {when(decision.at)}
      {decision.note ? <span className="block text-ink-muted">“{decision.note}”</span> : null}
    </span>
  );
}

const TH = 'py-2 pr-3 text-left text-[12px] font-medium text-ink-muted';
const TD = 'py-2 pr-3 align-top text-[13px] text-ink';

export function RecordSections({ record }: { record: IncidentDecisionRecord }) {
  const { incident } = record;
  return (
    <>
      <Section title="Incident">
        <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-ink-muted">Incident</dt>
          <dd>
            <span className="font-mono">{incident.id}</span> · {humanizeKey(incident.type)} ({humanizeKey(incident.subtype)})
          </dd>
          <dt className="text-ink-muted">Asset</dt>
          <dd>
            {incident.assetName} · {incident.location}
          </dd>
          <dt className="text-ink-muted">Status</dt>
          <dd>
            {humanizeKey(incident.status)} · severity {incident.severity}
          </dd>
          <dt className="text-ink-muted">Opened</dt>
          <dd>{when(incident.openedAt)}</dd>
          {incident.closedAt ? (
            <>
              <dt className="text-ink-muted">Closed</dt>
              <dd>{when(incident.closedAt)}</dd>
            </>
          ) : null}
          {incident.affectedParty ? (
            <>
              <dt className="text-ink-muted">Affected</dt>
              <dd>
                {incident.affectedParty.name} · {incident.affectedParty.where}
              </dd>
            </>
          ) : null}
          <dt className="text-ink-muted">Summary</dt>
          <dd className="max-w-[70ch]">{incident.description}</dd>
        </dl>
      </Section>

      <Section title="Pills applied" description="Every approved pill runs on the incident; each decides only its own rules.">
        <ul className="space-y-1.5 text-sm">
          {record.pills.map((p) => (
            <li key={p.pillId}>
              <Link href={routes.pill(p.pillId)} className="font-medium underline-offset-2 hover:underline">
                {pillDisplayName(p.name)} v{p.version}
              </Link>{' '}
              · {p.rulesTriggered} of {p.rulesTotal} rules fired · approved by {person(p.approvedBy)}
              {p.approvedAt ? `, ${when(p.approvedAt)}` : ''}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Gates and actions" description="One row per rule that fired, decided by the deterministic engine on the full timeline.">
        {record.gates.length === 0 ? (
          <Empty>No rule fired on this incident.</Empty>
        ) : (
          <ol className="space-y-3">
            {record.gates.map((g) => (
              <li key={`${g.pillId}-${g.ruleId}`} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={routes.pill(g.pillId, g.ruleId)} className="font-mono text-sm font-semibold underline-offset-2 hover:underline">
                    {g.ruleId} v{g.pillVersion}
                  </Link>
                  <span className="text-sm font-medium">{g.title}</span>
                  <StatusBadge status={g.status} />
                  <ActionClassChip actionClass={g.actionClass} />
                </div>
                {g.requiredEvidence.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-[13px]">
                    {g.requiredEvidence.map((r) => (
                      <li key={r.key}>
                        <span className={r.state === 'confirmed' ? 'text-recommend' : 'font-semibold text-blocked'}>
                          {r.state === 'confirmed' ? 'Confirmed' : 'Missing'}
                        </span>{' '}
                        {r.label} — {r.state === 'confirmed' ? <Origin origin={r.origin} /> : 'not confirmed'}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 text-[13px]">
                  {g.escalateTo ? <>Escalate to {roleLabel(g.escalateTo.role)}. </> : null}
                  {g.deadlineMinutes !== null ? <>Deadline {g.deadlineMinutes} min. </> : null}
                  <Decision decision={g.decision} />
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="AI proposals" description="Recorded model output replayed with the timeline. A proposal is a draft; only the gate and a named person decide.">
        {record.aiProposals.length === 0 ? (
          <Empty>No AI proposals were recorded for this incident.</Empty>
        ) : (
          <ul className="space-y-3">
            {record.aiProposals.map((p) => (
              <li key={p.proposalId} className="rounded-xl border border-line bg-surface p-4 text-[13px]">
                <p className="text-[12px] text-ink-muted">
                  {p.proposalId} · {p.model} · recorded ({p.fixtureId}) · after {p.afterEventId}
                </p>
                <p className="mt-1 text-sm font-medium">“{p.text}”</p>
                <p className="mt-1">{p.fate}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Evidence" description="Each item's current value, where it came from, and when.">
        {record.evidence.length === 0 ? (
          <Empty>No evidence recorded.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th className={TH}>Item</th>
                  <th className={TH}>Value</th>
                  <th className={TH}>Source</th>
                </tr>
              </thead>
              <tbody>
                {record.evidence.map((e) => (
                  <tr key={e.key} className="border-b border-line/60">
                    <td className={TD}>{e.label}</td>
                    <td className={TD}>
                      {valueText(e.value)}
                      {e.confirmed ? '' : ' (unconfirmed)'}
                    </td>
                    <td className={TD}>
                      <Origin origin={e} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Tenant communication" description="Keystone drafts and records approval. It never sends.">
        {record.tenantMessages.length === 0 ? (
          <Empty>No tenant message was drafted for this incident.</Empty>
        ) : (
          <ul className="space-y-1.5 text-[13px]">
            {record.tenantMessages.map((m) => (
              <li key={m.draftId}>
                <span className="font-mono">{m.draftId}</span> · {m.subject} · {humanizeKey(m.channel)} · approver {roleLabel(m.approverRole)} ·{' '}
                <Decision decision={m.decision} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Audit trail" description="Audit events about this incident from the append-only log, oldest first.">
        {record.audit.length === 0 ? (
          <Empty>No audit events for this incident in this browser yet.</Empty>
        ) : (
          <ol className="space-y-1 text-[13px]">
            {record.audit.map((e) => (
              <li key={e.id}>
                <span className="font-mono text-ink-muted">{e.id}</span> · {when(e.at)} · {e.actor} ({roleLabel(e.role)}) ·{' '}
                {humanizeKey(e.action)}
                {e.ruleId ? ` · ${e.ruleId}` : ''} — {e.detail}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}
