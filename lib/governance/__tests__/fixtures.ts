// Inline governance test fixtures — no file reads.

import type { Pill, Rule } from "@/lib/engine";

export function rule(id: string, overrides: Partial<Rule> = {}): Rule {
  return {
    id,
    title: `${id} title`,
    trigger: {
      incident_type: "water_ingress",
      all: [{ path: "evidence.active_water_release", op: "eq", value: true }],
      any: [],
    },
    required_evidence: ["location_confirmed"],
    decision: `${id} decision`,
    allowed_actions: ["Isolate"],
    forbidden_actions: [],
    exceptions: [],
    action_class: "recommend",
    forbidden_if_missing_evidence: false,
    escalate_to: { role: "duty_lew", fallback: "head_technical_services" },
    owner: "chief_engineer",
    deadline_minutes: 15,
    asset_overrides: {},
    asset_refs: [],
    sensitivity: "internal",
    provenance: [],
    ...overrides,
  };
}

export function pill(rules: Rule[] = [rule("TS-01"), rule("TS-02"), rule("TS-03")]): Pill {
  return {
    manifest: {
      name: "chilled-water-leak",
      description: "test",
      version: "1.2.0",
      owner: "chief_engineer",
      steward: "asset_operations_manager",
      approver: "head_technical_services",
      scope: "water_ingress",
      access: "internal",
    },
    rules,
    provenance: {},
    evals: {},
  };
}

export const PILL_ID = "technical-services-chilled-water-leak";
export const CE = { name: "Tan Wei Ming", role: "chief_engineer" };
export const AOM = { name: "Priya Nair", role: "asset_operations_manager" };
export const HTS = { name: "Goh Boon Kheng", role: "head_technical_services" };
export const TECH = { name: "Duty Technician", role: "technician" };
