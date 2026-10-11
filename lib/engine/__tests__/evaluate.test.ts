import { describe, it, expect } from "vitest";
import { evaluate } from "../evaluate";
import type { EvidenceItem, Rule } from "../index";
import {
  makePill,
  makeRule,
  officeAsset,
  dataCentreAsset,
  waterIngressIncident,
  fireIncident,
  makeEvidence,
  fullConfirmedEvidence,
} from "./fixtures";

describe("evaluate — trigger matching", () => {
  it("fires the rule when incident type matches and all conditions are met", () => {
    const pill = makePill();
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].ruleId).toBe("TS-07");
  });

  it("does not fire when incident type does not match", () => {
    const pill = makePill();
    const result = evaluate(pill, officeAsset, fireIncident, makeEvidence());
    expect(result.actions).toHaveLength(0);
    const trace = result.trace.find((t) => t.ruleId === "TS-07");
    expect(trace?.triggered).toBe(false);
    expect(trace?.triggerReason).toContain("does not match");
  });

  it("does not fire when an all-condition fails", () => {
    const pill = makePill();
    const ev = makeEvidence({
      water_near_electrical: { value: false, source: "s", at: "t", confirmed: true },
    });
    const result = evaluate(pill, officeAsset, waterIngressIncident, ev);
    expect(result.actions).toHaveLength(0);
    const trace = result.trace.find((t) => t.ruleId === "TS-07");
    expect(trace?.triggered).toBe(false);
  });

  it("fires when any-conditions are non-empty and at least one matches", () => {
    const rule = makeRule({
      trigger: {
        incident_type: "water_ingress",
        all: [{ path: "evidence.water_near_electrical", op: "eq", value: true }],
        any: [
          { path: "asset.type", op: "eq", value: "data_centre" },
          { path: "asset.type", op: "eq", value: "office" },
        ],
      },
    });
    const pill = makePill([rule]);
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    expect(result.actions).toHaveLength(1);
  });

  it("does not fire when any-conditions are non-empty and none match", () => {
    const rule = makeRule({
      trigger: {
        incident_type: "water_ingress",
        all: [{ path: "evidence.water_near_electrical", op: "eq", value: true }],
        any: [{ path: "asset.type", op: "eq", value: "data_centre" }],
      },
    });
    const pill = makePill([rule]);
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    expect(result.actions).toHaveLength(0);
    const trace = result.trace.find((t) => t.ruleId === "TS-07");
    expect(trace?.triggerReason).toContain("Any-conditions failed");
  });
});

describe("evaluate — blocked when evidence missing", () => {
  it("returns 'blocked' status when required evidence is missing and forbidden_if_missing_evidence is true", () => {
    const pill = makePill();
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    expect(result.actions[0].status).toBe("blocked");
    expect(result.actions[0].missingEvidence).toContain("lew_signoff");
    expect(result.actions[0].missingEvidence).toContain("insulation_resistance_ok");
    expect(result.actions[0].missingEvidence).toContain("area_dry");
  });

  it("returns 'escalate' status when all required evidence is confirmed (must_escalate rule)", () => {
    const pill = makePill();
    const result = evaluate(pill, officeAsset, waterIngressIncident, fullConfirmedEvidence());
    expect(result.actions[0].status).toBe("escalate");
    expect(result.actions[0].missingEvidence).toEqual([]);
  });

  it("treats unconfirmed evidence as missing", () => {
    const ev = makeEvidence({
      lew_signoff: { value: true, source: "s", at: "t", confirmed: false },
    });
    const pill = makePill();
    const result = evaluate(pill, officeAsset, waterIngressIncident, ev);
    expect(result.actions[0].status).toBe("blocked");
    expect(result.actions[0].missingEvidence).toContain("lew_signoff");
  });
});

describe("evaluate — escalate action class", () => {
  it("carries escalateTo when status is escalate", () => {
    const pill = makePill();
    const result = evaluate(pill, officeAsset, waterIngressIncident, fullConfirmedEvidence());
    expect(result.actions[0].escalateTo).toEqual({
      role: "duty_lew",
      fallback: "head_technical_services",
    });
  });

  it("carries escalateTo when status is blocked (must escalate but blocked)", () => {
    const pill = makePill();
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    expect(result.actions[0].status).toBe("blocked");
    expect(result.actions[0].escalateTo).not.toBeNull();
  });

  it("does not carry escalateTo when status is allowed (recommend rule)", () => {
    const rule = makeRule({
      id: "TS-LOC-01",
      action_class: "recommend",
      forbidden_if_missing_evidence: false,
      required_evidence: [],
    });
    const pill = makePill([rule]);
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    expect(result.actions[0].status).toBe("allowed");
    expect(result.actions[0].escalateTo).toBeNull();
  });
});

describe("evaluate — data_centre asset override", () => {
  it("applies data_centre escalate_to override", () => {
    const pill = makePill();
    const result = evaluate(pill, dataCentreAsset, waterIngressIncident, fullConfirmedEvidence());
    expect(result.actions[0].status).toBe("escalate");
    expect(result.actions[0].escalateTo).toEqual({
      role: "dc_critical_facilities_manager",
    });
  });

  it("applies the exception note for data_centre assets", () => {
    const pill = makePill();
    const result = evaluate(pill, dataCentreAsset, waterIngressIncident, makeEvidence());
    const trace = result.trace.find((t) => t.ruleId === "TS-07");
    expect(trace?.exceptionApplied).toBe(true);
    expect(trace?.exceptionNote).toBe("Critical facilities manager co-signs");
  });

  it("with exception applied, blocked stays blocked — exception cannot relax the gate", () => {
    const pill = makePill();
    const result = evaluate(pill, dataCentreAsset, waterIngressIncident, makeEvidence());
    // Exception annotates (note) but does NOT unblock the gate.
    const trace = result.trace.find((t) => t.ruleId === "TS-07");
    expect(trace?.exceptionApplied).toBe(true);
    expect(trace?.exceptionNote).toBe("Critical facilities manager co-signs");
    expect(result.actions[0].status).toBe("blocked");
    expect(result.actions[0].escalateTo).toEqual({
      role: "dc_critical_facilities_manager",
    });
  });
});

describe("evaluate — confidence", () => {
  it("reports total required and confirmed counts", () => {
    const pill = makePill();
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    expect(result.confidence.requiredEvidence).toBe(3);
    expect(result.confidence.confirmed).toBe(0);
  });

  it("counts confirmed evidence correctly", () => {
    const pill = makePill();
    const ev = makeEvidence({
      lew_signoff: { value: true, source: "s", at: "t", confirmed: true },
    });
    const result = evaluate(pill, officeAsset, waterIngressIncident, ev);
    expect(result.confidence.confirmed).toBe(1);
  });
});

describe("evaluate — trace", () => {
  it("trace includes per-condition details", () => {
    const pill = makePill();
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    const trace = result.trace[0];
    expect(trace.allConditions).toHaveLength(1);
    expect(trace.allConditions[0].path).toBe("evidence.water_near_electrical");
    expect(trace.allConditions[0].matched).toBe(true);
  });

  it("trace records missing evidence", () => {
    const pill = makePill();
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    const trace = result.trace[0];
    expect(trace.missingEvidence).toHaveLength(3);
  });

  it("trace records the status", () => {
    const pill = makePill();
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    const trace = result.trace[0];
    expect(trace.status).toBe("blocked");
  });
});

describe("evaluate — action provenance", () => {
  it("action carries pillId and pillVersion", () => {
    const pill = makePill();
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    expect(result.actions[0].pillId).toBe("technical-services");
    expect(result.actions[0].pillVersion).toBe("1.0.0");
  });

  it("action carries provenance array", () => {
    const pill = makePill();
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    expect(result.actions[0].provenance).toContain("ce-interview-2026-10-02#00:14:32");
  });
});

describe("evaluate — requires_approval", () => {
  it("returns needs_approval status when action_class is requires_approval", () => {
    const rule = makeRule({
      id: "TS-LIFT-01",
      action_class: "requires_approval",
      forbidden_if_missing_evidence: false,
      required_evidence: [],
    });
    const pill = makePill([rule]);
    const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    expect(result.actions[0].status).toBe("needs_approval");
  });
});

describe("evaluate — no exception can unblock a gate (property)", () => {
  // For every rule in a fixture pill that has forbidden_if_missing_evidence
  // and is triggered with missing evidence, no exception configuration should
  // ever produce a non-blocked status. Exceptions may only annotate and add
  // requirements — never relax a gate.
  it("every triggered forbidden rule stays blocked regardless of exceptions", () => {
    // Build a pill with several rules, each with different exceptions.
    const rules: Rule[] = [
      // Rule with a data_centre exception that annotates only.
      makeRule({ id: "R1" }),
      // Rule with an exception that adds evidence (tightens, not relaxes).
      makeRule({
        id: "R2",
        exceptions: [
          {
            when: [{ path: "asset.type", op: "eq", value: "data_centre" }],
            note: "CFM co-signs",
            add_required_evidence: ["cfm_cosign"],
          },
        ],
      }),
      // Rule with no exceptions.
      makeRule({ id: "R3", exceptions: [] }),
      // Rule with an exception matching office.
      makeRule({
        id: "R4",
        exceptions: [
          {
            when: [{ path: "asset.type", op: "eq", value: "office" }],
            note: "Office-specific note",
          },
        ],
      }),
    ];
    const pill = makePill(rules);
    const ev = makeEvidence(); // all required evidence missing/unconfirmed

    for (const asset of [officeAsset, dataCentreAsset]) {
      const result = evaluate(pill, asset, waterIngressIncident, ev);
      for (const action of result.actions) {
        expect(action.status).toBe("blocked");
        expect(action.missingEvidence.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("evaluate — data_centre override changes status (not just displayed class)", () => {
  it("asset override on action_class changes the effective status", () => {
    // Rule is must_escalate with forbidden_if_missing_evidence=false and all
    // evidence confirmed → status escalate. With a data_centre override to
    // requires_approval, the status must change to needs_approval.
    const rule = makeRule({
      id: "TS-OVERRIDE-01",
      action_class: "must_escalate",
      forbidden_if_missing_evidence: false,
      required_evidence: [],
      asset_overrides: {
        data_centre: {
          action_class: "requires_approval",
        },
      },
    });
    const pill = makePill([rule]);

    // Office: must_escalate, no missing evidence → escalate
    const officeResult = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    expect(officeResult.actions[0].status).toBe("escalate");
    expect(officeResult.actions[0].actionClass).toBe("must_escalate");

    // Data centre: overridden to requires_approval → needs_approval
    const dcResult = evaluate(pill, dataCentreAsset, waterIngressIncident, makeEvidence());
    expect(dcResult.actions[0].status).toBe("needs_approval");
    expect(dcResult.actions[0].actionClass).toBe("requires_approval");
  });

  it("asset override on forbidden_if_missing_evidence changes block behaviour", () => {
    // Rule has forbidden_if_missing_evidence=true at base. Office with missing
    // evidence → blocked. Data centre override sets forbidden=false → the rule
    // no longer blocks on missing evidence (must_escalate → escalate).
    const rule = makeRule({
      id: "TS-FORBIDDEN-OVERRIDE",
      action_class: "must_escalate",
      forbidden_if_missing_evidence: true,
      asset_overrides: {
        data_centre: {
          forbidden_if_missing_evidence: false,
        },
      },
    });
    const pill = makePill([rule]);

    // Office: forbidden=true, missing evidence → blocked
    const officeResult = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence());
    expect(officeResult.actions[0].status).toBe("blocked");

    // Data centre: forbidden overridden to false → escalate (not blocked)
    const dcResult = evaluate(pill, dataCentreAsset, waterIngressIncident, makeEvidence());
    expect(dcResult.actions[0].status).toBe("escalate");
  });
});

describe("evaluate — required evidence invariant (safety)", () => {
  // A required key is satisfied iff item exists && confirmed === true && value === true.
  // A confirmed "did NOT sign off" (value false) must never unblock a gate.

  it("confirmed-false never satisfies required evidence", () => {
    const pill = makePill();
    const ev = makeEvidence({
      lew_signoff: { value: false, source: "s", at: "t", confirmed: true },
      insulation_resistance_ok: { value: true, source: "s", at: "t", confirmed: true },
      area_dry: { value: true, source: "s", at: "t", confirmed: true },
    });
    const result = evaluate(pill, officeAsset, waterIngressIncident, ev);
    expect(result.actions[0].status).toBe("blocked");
    expect(result.actions[0].missingEvidence).toEqual(["lew_signoff"]);
    expect(result.confidence.confirmed).toBe(2);
  });

  it("unconfirmed-true never satisfies required evidence", () => {
    const pill = makePill();
    const ev = makeEvidence({
      lew_signoff: { value: true, source: "s", at: "t", confirmed: false },
      insulation_resistance_ok: { value: true, source: "s", at: "t", confirmed: true },
      area_dry: { value: true, source: "s", at: "t", confirmed: true },
    });
    const result = evaluate(pill, officeAsset, waterIngressIncident, ev);
    expect(result.actions[0].status).toBe("blocked");
    expect(result.actions[0].missingEvidence).toEqual(["lew_signoff"]);
  });

  it("property: a required key is satisfied iff value === true && confirmed === true", () => {
    const pill = makePill();
    const rule = pill.rules[0];

    for (const value of [true, false] as const) {
      for (const confirmed of [true, false] as const) {
        for (const key of rule.required_evidence) {
          // Satisfy every required key, then vary exactly this one.
          const overrides: Record<string, EvidenceItem> = {};
          for (const k of rule.required_evidence) {
            overrides[k] = { value: true, source: "s", at: "t", confirmed: true };
          }
          overrides[key] = { value, source: "s", at: "t", confirmed };

          const result = evaluate(pill, officeAsset, waterIngressIncident, makeEvidence(overrides));
          const action = result.actions[0];

          if (value === true && confirmed === true) {
            expect(action.missingEvidence).not.toContain(key);
          } else {
            expect(action.missingEvidence).toContain(key);
            expect(action.status).toBe("blocked");
          }
        }
      }
    }
  });
});
