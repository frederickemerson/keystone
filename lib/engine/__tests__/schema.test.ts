import { describe, it, expect } from "vitest";
import { parsePill, extractFrontmatter } from "../schema.js";

// Inline SKILL.md with YAML frontmatter.
const skillMd = `---
name: technical-services
description: Technical Services pill for water ingress
version: 1.0.0
owner: chief_engineer
steward: ts_steward
approver: fm_director
scope: water_ingress
access: internal
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
  "TS-07": {
    transcript_segment: "ce-interview-2026-10-02#00:14:32",
    confirmation_status: "confirmed",
    expert_role: "Chief Engineer",
  },
});

const evalsYaml = `id: case-1
description: LEW sign-off missing
asset:
  id: asset-001
  name: Harbourfront One
  type: office
  attributes:
    floors: 30
incident:
  id: INC-001
  type: water_ingress
  floor: L23
evidence:
  water_near_electrical:
    value: true
    source: leak_detector
    at: "2026-10-11T08:00:00Z"
    confirmed: true
  lew_signoff:
    value: false
    source: cmms
    at: "2026-10-11T08:05:00Z"
    confirmed: false
expected:
  TS-07: blocked
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

    expect(pill.provenance["TS-07"].confirmation_status).toBe("confirmed");

    expect(pill.evals["case-1"].id).toBe("case-1");
    expect(pill.evals["case-1"].expected).toEqual({ "TS-07": "blocked" });
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
