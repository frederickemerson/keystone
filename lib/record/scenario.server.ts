// Server side of the decision record: load one incident's data and scope it
// to the signed-in role BEFORE it reaches the browser, the same way the
// incident room page does (lib/governance/scope). Server only.

import 'server-only';
import {
  loadAiProposalFixture,
  loadAssets,
  loadIncident,
  loadTenantMessageFixture,
  loadTimeline,
  type AssetRecord,
  type IncidentRecord,
  type TenantMessageFixture,
  type Timeline,
} from '@/lib/data';
import { scopeAsset, scopeIncident, scopeTenantMessageFixture, scopeTimeline } from '@/lib/governance/scope';
import type { RecordProposalInput } from './build';

export interface RecordScenario {
  incident: IncidentRecord;
  asset: AssetRecord;
  timeline: Timeline;
  tenantMessage: TenantMessageFixture | null;
  proposals: RecordProposalInput[];
}

/** Recorded LLM proposals; one naming an event that is not on the timeline is a data error. */
function proposalsFor(incidentId: string, timeline: Timeline): RecordProposalInput[] {
  const fixture = loadAiProposalFixture(incidentId);
  if (!fixture) return [];
  return fixture.proposals.map((p) => {
    if (!timeline.events.some((e) => e.id === p.proposed_after_event)) {
      throw new Error(`${fixture.fixture_id}: ${p.proposal_id} proposed_after_event ${p.proposed_after_event} is not on the ${incidentId} timeline`);
    }
    return {
      proposalId: p.proposal_id,
      ruleId: p.rule_id,
      text: p.text,
      model: fixture.model,
      fixtureId: fixture.fixture_id,
      afterEventId: p.proposed_after_event,
    };
  });
}

/** One incident scoped to `role`, or null when the incident, its asset or its timeline does not exist. */
export function loadRecordScenario(incidentId: string, role: string): RecordScenario | null {
  const incident = loadIncident(incidentId);
  if (!incident) return null;
  const asset = loadAssets().find((a) => a.id === incident.asset_id);
  const timeline = loadTimeline(incident.id);
  if (!asset || !timeline) return null;
  const tenantMessage = loadTenantMessageFixture(incident.id);
  return {
    incident: scopeIncident(incident, role),
    asset: scopeAsset(asset, role),
    timeline: scopeTimeline(timeline, role),
    tenantMessage: tenantMessage ? scopeTenantMessageFixture(tenantMessage, role) : null,
    proposals: proposalsFor(incident.id, timeline),
  };
}
