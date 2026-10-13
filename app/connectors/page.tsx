// Connectors: where incident evidence comes from, which AI services Keystone
// calls, and what leaves it. AI statuses are read from configuration on every
// request; sample events are scoped to the viewer's role before rendering.

import { PageHeader } from '@/components/mosaic/PageHeader';
import { SectionHeader } from '@/components/mosaic/SectionHeader';
import { ConnectorCard, type ConnectorKeyView } from '@/components/connectors/ConnectorCard';
import { StatusChip } from '@/components/connectors/StatusChip';
import { getSession } from '@/lib/auth/session';
import { CONNECTOR_STATUSES, type Connector } from '@/lib/connectors/contract';
import { resolveStatuses } from '@/lib/connectors/ai-status';
import { readAiConfig } from '@/lib/connectors/ai-status.server';
import { evidenceUses, type EvidenceUse } from '@/lib/connectors/evidence-uses';
import { CONNECTORS, STATUS_LEGEND, groupConnectors } from '@/lib/connectors/registry';
import { loadTimeline, type TimelineEvent } from '@/lib/data';
import { UNRESOLVED_ROLE } from '@/lib/governance/access';
import { scopeTimelineEvent } from '@/lib/governance/scope';
import { loadAllPills } from '@/lib/pills/load';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Connectors · Keystone' };

/** "data/timelines/INC-….json#EV-…" → that event, scoped to `role`. */
function sampleEvent(c: Connector, role: string): TimelineEvent | undefined {
  const m = /^data\/timelines\/([A-Za-z0-9-]+)\.json#([A-Za-z0-9-]+)$/.exec(c.samplePayload ?? '');
  if (!m) return undefined;
  const event = loadTimeline(m[1])?.events.find((e) => e.id === m[2]);
  return event ? scopeTimelineEvent(event, role) : undefined;
}

function keyViews(c: Connector, labels: Record<string, string>, uses: Record<string, EvidenceUse[]>): ConnectorKeyView[] {
  return c.evidenceKeys.map((key) => ({ key, label: labels[key] ?? key, uses: uses[key] ?? [] }));
}

export default async function ConnectorsPage() {
  const role = (await getSession())?.role ?? UNRESOLVED_ROLE;
  const aiConfig = readAiConfig();
  const statuses = resolveStatuses(CONNECTORS, aiConfig);
  // The ADP row gets a live "ask the agent" control, but only where there is an
  // agent to ask. Asking is also what proves the connection: the status is
  // "live" on evidence of a real answer, never on a key being present.
  const adpAskable = aiConfig.adp?.state !== undefined && aiConfig.adp.state !== 'not_configured';
  const pills = loadAllPills();
  const uses = evidenceUses(pills);
  const labels: Record<string, string> = {};
  for (const { pill } of pills) for (const [key, entry] of Object.entries(pill.evidenceCatalog)) labels[key] ??= entry.label;

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-16">
      <PageHeader
        title="Connectors"
        subtitle="Where incident evidence comes from, which AI services Keystone calls, and what you can take away. Nothing here writes to a building system."
      />

      <section aria-label="The rule" className="card-paper space-y-2 p-5">
        <p className="text-[17px] font-semibold text-heading">A feed can raise an incident. Only a named person opens a gate.</p>
        <p className="max-w-[75ch] text-sm text-ink">
          Telemetry (iBMS alarms, leak detectors) never confirms an item a gate needs, such as the LEW sign-off before
          re-energising. Those come from people: technicians on site, the Technical Services Lead, the duty LEW, or someone
          confirming an item in the incident room, which only roles listed for that item can do. The one record that counts is a
          document on file: the work order that links the shut-off valve map. A test checks this over every connector and every
          recorded event.
        </p>
      </section>

      <section aria-label="Status legend" className="space-y-2">
        <h2 className="text-[17px] font-semibold text-heading">What the statuses mean</h2>
        <dl className="grid gap-2 sm:grid-cols-2">
          {CONNECTOR_STATUSES.map((s) => (
            <div key={s} className="flex items-start gap-2 text-[13px]">
              <dt className="shrink-0">
                <StatusChip status={s} />
              </dt>
              <dd className="text-ink-muted">{STATUS_LEGEND[s].meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      {groupConnectors().map((group) => (
        <section key={group.id} aria-label={group.title} className="space-y-4">
          <SectionHeader title={group.title} />
          <ul className="grid gap-4">
            {group.connectors.map((c) => (
              <ConnectorCard
                key={c.id}
                connector={c}
                status={statuses[c.id]}
                keys={keyViews(c, labels, uses)}
                sample={sampleEvent(c, role)}
                canAsk={c.id === 'adp_chat' && adpAskable}
              />
            ))}
          </ul>
        </section>
      ))}

      <footer className="border-t border-line pt-4 text-[13px] text-ink-muted">
        Pilot path: bind iBMS points by Brick class (Brick 1.5.0), so the same pill runs at any site whose points are
        tagged, and match work orders to assets by CMMS asset code. No building system is connected in this demo.
      </footer>
    </div>
  );
}
