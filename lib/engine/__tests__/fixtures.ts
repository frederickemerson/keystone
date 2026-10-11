// Shared inline test fixtures for the MOSAIC engine tests.
// These are self-contained — no file reads from pills/.

import type { Asset, Evidence, Incident, Pill, Rule } from "../index.js";

// ---------------------------------------------------------------------------
// Rule builders
// ---------------------------------------------------------------------------

export function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: "TS-07",
    title: "No re-energisation without LEW sign-off",
    trigger: {
      incident_type: "water_ingress",
      all: [{ path: "evidence.water_near_electrical", op: "eq", value: true }],
      any: [],
    },
    required_evidence: ["lew_signoff", "insulation_resistance_ok", "area_dry"],
    decision: "Re-energise affected AHU / DB",
    allowed_actions: ["Keep circuit isolated", "Request LEW inspection"],
    forbidden_actions: ["Re-energise before LEW sign-off"],
    exceptions: [
      {
        when: [{ path: "asset.type", op: "eq", value: "data_centre" }],
        note: "Critical facilities manager co-signs",
      },
    ],
    action_class: "must_escalate",
    forbidden_if_missing_evidence: true,
    escalate_to: { role: "duty_lew", fallback: "head_technical_services" },
    owner: "chief_engineer",
    deadline_minutes: null,
    asset_overrides: {
      data_centre: {
        escalate_to: { role: "dc_critical_facilities_manager" },
      },
    },
    asset_refs: ["brick:Switchgear", "brick:Electrical_Room"],
    sensitivity: "internal",
    provenance: ["ce-interview-2026-10-02#00:14:32"],
    ...overrides,
  };
}

export function makePill(rules?: Rule[]): Pill {
  return {
    manifest: {
      name: "technical-services",
      description: "Technical Services pill for water ingress",
      version: "1.0.0",
      owner: "chief_engineer",
      steward: "ts_steward",
      approver: "fm_director",
      scope: "water_ingress",
      access: "internal",
    },
    rules: rules ?? [makeRule()],
    provenance: {
      "TS-07": {
        transcript_segment: "ce-interview-2026-10-02#00:14:32",
        confirmation_status: "confirmed",
        expert_role: "Chief Engineer",
      },
    },
    evals: {},
  };
}

// ---------------------------------------------------------------------------
// Asset fixtures
// ---------------------------------------------------------------------------

export const officeAsset: Asset = {
  id: "asset-001",
  name: "Harbourfront One",
  type: "office",
  attributes: { floors: 30, grade: "A" },
};

export const dataCentreAsset: Asset = {
  id: "asset-002",
  name: "Harbourfront DC1",
  type: "data_centre",
  attributes: { pue: 1.32 },
};

// ---------------------------------------------------------------------------
// Incident fixtures
// ---------------------------------------------------------------------------

export const waterIngressIncident: Incident = {
  id: "INC-001",
  type: "water_ingress",
  floor: "L23",
};

export const fireIncident: Incident = {
  id: "INC-002",
  type: "fire_alarm",
};

// ---------------------------------------------------------------------------
// Evidence fixtures
// ---------------------------------------------------------------------------

export function makeEvidence(
  overrides: Partial<Record<string, { value: unknown; source: string; at: string; confirmed: boolean }>> = {},
): Evidence {
  const base: Evidence = {
    water_near_electrical: {
      value: true,
      source: "leak_detector_L23",
      at: "2026-10-11T08:00:00Z",
      confirmed: true,
    },
    lew_signoff: {
      value: false,
      source: "cmms",
      at: "2026-10-11T08:05:00Z",
      confirmed: false,
    },
    insulation_resistance_ok: {
      value: false,
      source: "meter",
      at: "2026-10-11T08:10:00Z",
      confirmed: false,
    },
    area_dry: {
      value: false,
      source: "visual",
      at: "2026-10-11T08:15:00Z",
      confirmed: false,
    },
  };
  return { ...base, ...overrides };
}

/** Evidence where all required evidence is confirmed true. */
export function fullConfirmedEvidence(): Evidence {
  return makeEvidence({
    lew_signoff: { value: true, source: "lew_signoff_form", at: "2026-10-11T09:00:00Z", confirmed: true },
    insulation_resistance_ok: { value: true, source: "meter", at: "2026-10-11T09:05:00Z", confirmed: true },
    area_dry: { value: true, source: "visual", at: "2026-10-11T09:10:00Z", confirmed: true },
  });
}
