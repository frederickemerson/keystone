import { describe, it, expect } from "vitest";
import { parsePill, extractFrontmatter } from "../schema";

// Inline SKILL.md with YAML frontmatter.
const skillMd = `---
name: technical-services
description: Technical Services pill for water ingress
version: 1.0.0
owner: chief_engineer
steward: ts_steward
approver: fm_director
status: approved
scope:
  incident_types: [water_ingress]
access:
  sensitivity_default: internal
---

# Technical Services Pill

This pill handles water ingress incidents.
`;

const rulesYaml = `- id: TS-07
  title: No re-energisation without LEW sign-off
  trigger:
    incident_type: water_ingress
    all:
      - path: evidence.water_near_electrical
        op: eq
        value: true
    any: []
  required_evidence: [lew_signoff, insulation_resistance_ok, area_dry]
  decision: Re-energise affected AHU / DB
  allowed_actions: ["Keep circuit isolated", "Request LEW inspection"]
  forbidden_actions: ["Re-energise before LEW sign-off"]
  exceptions:
    - when:
        - path: asset.type
          op: eq
          value: data_centre
      note: "Critical facilities manager co-signs"
  action_class: must_escalate
  forbidden_if_missing_evidence: true
  escalate_to:
    role: duty_lew
    fallback: head_technical_services
  owner: chief_engineer
  deadline_minutes: null
  asset_overrides:
    data_centre:
      escalate_to:
        role: dc_critical_facilities_manager
  asset_refs: ["brick:Switchgear", "brick:Electrical_Room"]
  sensitivity: internal
  provenance: ["ce-interview-2026-10-02#00:14:32"]
`;

const provenanceJson = JSON.stringify({
  pill: "technical-services",
  version: "1.0.0",
  source_interview: "ce-interview-2026-10-02",
  expert: { name: "Tan Wei Ming", role: "Chief Engineer" },
  rules: {
    "TS-07": {
      source: "ce-interview-2026-10-02",
      start: "00:14:32",
      end: "00:16:10",
      quote: "never re-energise before the LEW signs off",
      confirmation: "confirmed",
      confirmed_by: "Tan Wei Ming",
      confirmed_at: "2026-10-02T12:45:00+08:00",
    },
  },
});

const evalsYaml = `id: case-1
title: LEW sign-off missing
incident_date: "2026-01-01"
asset:
  name: Harbourfront One
  type: grade_a_office
  floors: 30
evidence:
  water_near_electrical: true
  lew_signoff:
    value: false
    confirmed: true
expected_decisions:
  TS-07:
    status: blocked
`;

describe("extractFrontmatter", () => {
  it("extracts the YAML block between --- delimiters", () => {
    const fm = extractFrontmatter(skillMd);
    expect(fm).toContain("name: technical-services");
    expect(fm).toContain("version: 1.0.0");
  });

  it("throws when no frontmatter is present", () => {
    expect(() => extractFrontmatter("just markdown, no frontmatter")).toThrow(
      "no YAML frontmatter",
    );
  });
});

describe("parsePill", () => {
  it("parses manifest, rules, provenance, and evals from source files", () => {
    const pill = parsePill({
      skillMd,
      rulesYaml,
      provenanceJson,
      evals: { "case-1": evalsYaml },
    });

    expect(pill.manifest.name).toBe("technical-services");
    expect(pill.manifest.version).toBe("1.0.0");

    expect(pill.rules).toHaveLength(1);
    expect(pill.rules[0].id).toBe("TS-07");
    expect(pill.rules[0].action_class).toBe("must_escalate");
    expect(pill.rules[0].trigger.all).toHaveLength(1);

    expect(pill.provenance["TS-07"].confirmation).toBe("confirmed");
    expect(pill.provenance["TS-07"].quote).toContain("LEW signs off");

    expect(pill.evals["case-1"].id).toBe("case-1");
    expect(pill.evals["case-1"].expected).toEqual({ "TS-07": { status: "blocked" } });
    expect(pill.evals["case-1"].asset.id).toBe("harbourfront-one");
    expect(pill.evals["case-1"].asset.type).toBe("grade_a_office");
    expect(pill.evals["case-1"].incident.type).toBe("water_ingress");
    expect(pill.evals["case-1"].evidence.water_near_electrical).toEqual({
      value: true,
      source: "eval",
      at: "2026-01-01",
      confirmed: true,
    });
    expect(pill.evals["case-1"].evidence.lew_signoff).toEqual({
      value: false,
      source: "eval",
      at: "2026-01-01",
      confirmed: true,
    });

    // No evidence.yaml supplied → empty catalog.
    expect(pill.evidenceCatalog).toEqual({});
  });

  it("parses an optional evidence.yaml catalog", () => {
    const pill = parsePill({
      skillMd,
      rulesYaml,
      provenanceJson,
      evidenceYaml: `lew_signoff:
  label: LEW sign-off
  type: boolean
  confirmable_by: [duty_lew]
  description: Signed electrical safety certificate
`,
      evals: {},
    });
    expect(pill.evidenceCatalog.lew_signoff.label).toBe("LEW sign-off");
    expect(pill.evidenceCatalog.lew_signoff.confirmable_by).toEqual(["duty_lew"]);
  });

  it("throws on invalid rules YAML", () => {
    const badYaml = `- id: TS-07
  title: Bad rule
  trigger: oops
`;
    expect(() =>
      parsePill({ skillMd, rulesYaml: badYaml, provenanceJson, evals: {} }),
    ).toThrow("validation error");
  });

  it("throws on invalid JSON for provenance", () => {
    expect(() =>
      parsePill({ skillMd, rulesYaml, provenanceJson: "{not json", evals: {} }),
    ).toThrow("JSON parse error");
  });

  it("parses an authored deadline_minutes expectation", () => {
    const yamlText = evalsYaml.replace("    status: blocked", "    status: blocked\n    deadline_minutes: 10");
    const pill = parsePill({ skillMd, rulesYaml, provenanceJson, evals: { "case-1": yamlText } });
    expect(pill.evals["case-1"].expected).toEqual({ "TS-07": { status: "blocked", deadline_minutes: 10 } });
  });

  it("rejects an unknown expected-decision field instead of silently ignoring it", () => {
    const yamlText = evalsYaml.replace("    status: blocked", "    status: blocked\n    deadline_minute: 10");
    expect(() =>
      parsePill({ skillMd, rulesYaml, provenanceJson, evals: { "case-1": yamlText } }),
    ).toThrow(/deadline_minute/);
  });

  it("handles an empty evals map", () => {
    const pill = parsePill({ skillMd, rulesYaml, provenanceJson, evals: {} });
    expect(pill.evals).toEqual({});
  });

  it("throws on invalid manifest frontmatter", () => {
    const badMd = `---
name: ""
description: missing required fields
---

Body.
`;
    expect(() =>
      parsePill({ skillMd: badMd, rulesYaml, provenanceJson, evals: {} }),
    ).toThrow();
  });
});
