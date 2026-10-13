// Inline operational-history fixtures for the lib/evals tests.
//
// Self-contained: no reads from data/ or pills/, so a test can describe the
// exact record shape it is about. The pill fixtures come from the engine's own
// builders (lib/engine/__tests__/fixtures) — the rule under test is TS-07,
// which blocks re-energisation while any of its three sign-offs is missing.

import type {
  AssetRecord,
  IncidentActionRecord,
  IncidentRecord,
  Timeline,
  TimelineEvent,
} from "@/lib/data/schemas";
import type { IncidentHistory } from "../derive";

export function makeAssetRecord(overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    id: "asset-hf1",
    name: "Harbourfront One",
    type: "grade_a_office",
    address: "1 Harbourfront Avenue",
    location: "Singapore",
    floors: 30,
    year_built: 2014,
    green_certification: { scheme: "BCA Green Mark", rating: "Platinum", certificate_id: "GM-2014-0001" },
    systems: { chilled_water: { loops: 2 } },
    equipment: [],
    people: [],
    facility_manager: "Muhammad Hafiz",
    ppm_compliance_pct: 98,
    ontology_refs: { brick_version: "1.3", haystack_phIoT_version: "3.9.13", cobie_facility_id: "COBIE-HF1" },
    ...overrides,
  };
}

export function makeAction(overrides: Partial<IncidentActionRecord> = {}): IncidentActionRecord {
  return {
    rule_id: "TS-07",
    decision: "Re-energise AHU-23-01 / DB-23A",
    action_class: "must_escalate",
    status: "blocked",
    provenance: "ce-interview-2026-10-02#00:14:32",
    ...overrides,
  };
}

/** A closed incident with recorded per-rule decisions — the derivable shape. */
export function makeIncident(overrides: Partial<IncidentRecord> = {}): IncidentRecord {
  return {
    id: "INC-2026-0855",
    asset_id: "asset-hf1",
    asset_name: "Harbourfront One",
    type: "water_ingress",
    subtype: "chilled_water_leak",
    status: "closed",
    severity: "high",
    opened_at: "2026-08-12T06:45:00+08:00",
    closed_at: "2026-08-12T11:20:00+08:00",
    location: "B1 mechanical riser",
    description: "CHW supply pipe joint failure in the B1 riser.",
    pill_applied: "technical-services/chilled-water-leak",
    pill_version: "1.0.0",
    actions: [makeAction()],
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: "EV-0855-01",
    at: "2026-08-12T06:50:00+08:00",
    source: "technician",
    type: "observation",
    text: "Water tracking toward the switchgear room perimeter.",
    evidence_updates: { water_near_electrical: { value: true, confirmed: true } },
    sensitivity: "internal",
    ...overrides,
  };
}

export function makeTimeline(overrides: Partial<Timeline> = {}): Timeline {
  return {
    incident_id: "INC-2026-0855",
    asset_id: "asset-hf1",
    asset_name: "Harbourfront One",
    timeline_version: "1.0",
    events: [makeEvent()],
    ...overrides,
  };
}

/** A history holding exactly one incident, its timeline and its asset. */
export function makeHistory(
  incident: IncidentRecord = makeIncident(),
  timeline: Timeline | undefined = makeTimeline(),
  asset: AssetRecord | undefined = makeAssetRecord(),
): IncidentHistory {
  return {
    incidents: [incident],
    timelines: timeline === undefined ? [] : [timeline],
    assets: asset === undefined ? [] : [asset],
  };
}
