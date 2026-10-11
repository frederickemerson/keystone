import { describe, it, expect } from "vitest";
import { evaluate } from "../evaluate.js";
import {
  makePill,
  makeRule,
  officeAsset,
  dataCentreAsset,
  waterIngressIncident,
  fireIncident,
  makeEvidence,
  fullConfirmedEvidence,
} from "./fixtures.js";

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

  it("with exception applied, blocked becomes escalate (missing evidence overridden)", () => {
    const pill = makePill();
    const result = evaluate(pill, dataCentreAsset, waterIngressIncident, makeEvidence());
    // Exception overrides forbidden_if_missing_evidence → must_escalate → escalate
    expect(result.actions[0].status).toBe("escalate");
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
