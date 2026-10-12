import { notFound } from 'next/navigation';
import { IncidentRoom } from '@/components/incident/IncidentRoom';
import type { AiProposal, IncidentScenario, RoomPill } from '@/components/incident/types';
import {
  loadAiProposalFixture,
  loadAssets,
  loadIncidents,
  loadTenantMessageFixture,
  loadTimeline,
  listTimelineIds,
  type AssetRecord,
  type IncidentRecord,
  type Timeline,
} from '@/lib/data';
import { loadAllPills } from '@/lib/pills/load';
import { getSession } from '@/lib/auth/session';
import { UNRESOLVED_ROLE } from '@/lib/governance/access';
import { scopeAsset, scopeIncident, scopeTenantMessageFixture, scopeTimeline } from '@/lib/governance/scope';

export const dynamic = 'force-dynamic';

/**
 * Recorded LLM proposals for an incident, each resolved to the replay step of
 * its `proposed_after_event`. A proposal naming an event that is not on the
 * incident's timeline is a data error and fails loudly.
 */
function proposalsFor(incidentId: string, timeline: Timeline): AiProposal[] {
  const fixture = loadAiProposalFixture(incidentId);
  if (!fixture) return [];
  return fixture.proposals.map((p) => {
    const index = timeline.events.findIndex((e) => e.id === p.proposed_after_event);
    if (index === -1) {
      throw new Error(
        `${fixture.fixture_id}: ${p.proposal_id} proposed_after_event ${p.proposed_after_event} is not on the ${incidentId} timeline`,
      );
    }
    return {
      proposalId: p.proposal_id,
      ruleId: p.rule_id,
      text: p.text,
      model: fixture.model,
      afterStep: index + 1,
      // The schema admits only recorded fixtures (fixture_type "llm_fallback").
      source: { kind: 'recorded' as const, fixtureId: fixture.fixture_id, generatedAt: fixture.generated_at },
    };
  });
}

/**
 * One incident's room data, scoped to the signed-in role on the server: records
 * above the role's clearance are masked before they reach the client.
 */
function scenarioFor(incident: IncidentRecord, assets: AssetRecord[], role: string): IncidentScenario | null {
  const asset = assets.find((a) => a.id === incident.asset_id);
  const timeline = loadTimeline(incident.id);
  if (!asset || !timeline) return null;
  const tenantMessage = loadTenantMessageFixture(incident.id);
  return {
    incident: scopeIncident(incident, role),
    asset: scopeAsset(asset, role),
    timeline: scopeTimeline(timeline, role),
    tenantMessage: tenantMessage ? scopeTenantMessageFixture(tenantMessage, role) : null,
    aiProposals: proposalsFor(incident.id, timeline),
  };
}

/**
 * The same pills on a different asset profile (Wow 3): another open incident
 * of the same type, with a timeline, on an asset of a different type —
 * preferring one recorded with an `asset_overlay`.
 */
function overlayFor(primary: IncidentScenario, incidents: IncidentRecord[], assets: AssetRecord[], role: string) {
  const withTimeline = new Set(listTimelineIds());
  const candidates = incidents.filter((i) => {
    if (i.id === primary.incident.id || i.status === 'closed' || !withTimeline.has(i.id)) return false;
    if (i.type !== primary.incident.type) return false;
    const asset = assets.find((a) => a.id === i.asset_id);
    return asset !== undefined && asset.type !== primary.asset.type;
  });
  const pick = candidates.find((i) => i.asset_overlay) ?? candidates[0];
  return pick ? scenarioFor(pick, assets, role) : null;
}

function parseStep(raw: string | string[] | undefined): number | 'end' {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'end') return 'end';
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export default async function IncidentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { step } = await searchParams;
  const session = await getSession();
  const role = session?.role ?? UNRESOLVED_ROLE;

  const incidents = loadIncidents();
  const assets = loadAssets();
  const incident = incidents.find((i) => i.id === id);
  if (!incident) notFound();
  const primary = scenarioFor(incident, assets, role);
  if (!primary) notFound();

  // Approved-version selection happens client-side against the governance
  // store; the server ships every file pill as the seed baseline.
  const pills: RoomPill[] = loadAllPills().map(({ id: pillId, domain, name, pill }) => ({
    id: pillId,
    domain,
    name,
    pill,
  }));

  return (
    <IncidentRoom
      primary={primary}
      overlay={overlayFor(primary, incidents, assets, role)}
      pills={pills}
      initialStep={parseStep(step)}
      sessionActor={session ? { role: session.role, name: session.name } : null}
    />
  );
}
