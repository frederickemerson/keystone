import { describe, it, expect } from "vitest";
import { runEvals, compareVersions } from "../evals.js";
import type { EvalCase } from "../types.js";
import {
  makePill,
  makeRule,
  officeAsset,
  dataCentreAsset,
  waterIngressIncident,
  makeEvidence,
  fullConfirmedEvidence,
} from "./fixtures.js";

function makeEvalCase(
  id: string,
  asset: typeof officeAsset,
  evidence: ReturnType<typeof makeEvidence>,
  expected: Record<string, "allowed" | "blocked" | "needs_approval" | "escalate">,
): EvalCase {
  return {
    id,
    asset,
    incident: waterIngressIncident,
    evidence,
    expected,
  };
}

describe("runEvals — basic pass/fail", () => {
  it("passes when actual matches expected for all rules", () => {
    const pill = makePill();
    const cases = [
      makeEvalCase("case-1", officeAsset, makeEvidence(), { "TS-07": "blocked" }),
    ];
    const result = runEvals(pill, cases);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results[0].pass).toBe(true);
  });

  it("fails when actual does not match expected", () => {
    const pill = makePill();
    const cases = [
      makeEvalCase("case-1", officeAsset, fullConfirmedEvidence(), { "TS-07": "blocked" }),
    ];
    const result = runEvals(pill, cases);
    expect(result.failed).toBe(1);
    expect(result.results[0].actual).toBe("escalate");
    expect(result.results[0].expected).toBe("blocked");
  });

  it("handles multiple cases", () => {
    const pill = makePill();
    const cases = [
      makeEvalCase("case-1", officeAsset, makeEvidence(), { "TS-07": "blocked" }),
      makeEvalCase("case-2", officeAsset, fullConfirmedEvidence(), { "TS-07": "escalate" }),
    ];
    const result = runEvals(pill, cases);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
  });
});

describe("runEvals — rule not fired", () => {
  it("reports 'allowed' status for rules that did not fire", () => {
    const pill = makePill();
    // Use an incident type that doesn't match.
    const cases: EvalCase[] = [
      {
        id: "case-mismatch",
        asset: officeAsset,
        incident: { id: "INC-X", type: "fire_alarm" },
        evidence: makeEvidence(),
        expected: { "TS-07": "allowed" },
      },
    ];
    const result = runEvals(pill, cases);
    expect(result.results[0].actual).toBe("allowed");
    expect(result.passed).toBe(1);
  });
});

describe("runEvals — data_centre exception", () => {
  it("evals correctly when the data_centre exception applies", () => {
    const pill = makePill();
    const cases = [
      makeEvalCase("case-dc", dataCentreAsset, makeEvidence(), { "TS-07": "escalate" }),
    ];
    const result = runEvals(pill, cases);
    expect(result.results[0].actual).toBe("escalate");
    expect(result.passed).toBe(1);
  });
});

describe("compareVersions — regression detection", () => {
  it("detects regressions: passing in old, failing in new", () => {
    const oldRule = makeRule({ forbidden_if_missing_evidence: true });
    const oldPill = makePill([oldRule]);

    // New pill: removes forbidden_if_missing_evidence → status changes from blocked to escalate.
    const newRule = makeRule({ forbidden_if_missing_evidence: false });
    const newPill = makePill([newRule]);

    const cases = [
      makeEvalCase("case-1", officeAsset, makeEvidence(), { "TS-07": "blocked" }),
    ];

    const result = compareVersions(oldPill, newPill, cases);
    expect(result.regressions).toHaveLength(1);
    expect(result.regressions[0].caseId).toBe("case-1");
    expect(result.regressions[0].ruleId).toBe("TS-07");
    expect(result.regressions[0].oldActual).toBe("blocked");
    expect(result.regressions[0].newActual).toBe("escalate");
  });

  it("detects improvements: failing in old, passing in new", () => {
    // Old pill: rule has forbidden_if_missing_evidence=true → blocked.
    const oldRule = makeRule({ forbidden_if_missing_evidence: true });
    const oldPill = makePill([oldRule]);

    // New pill: rule requires no evidence → allowed/escalate.
    const newRule = makeRule({ required_evidence: [] });
    const newPill = makePill([newRule]);

    const cases = [
      makeEvalCase("case-1", officeAsset, makeEvidence(), { "TS-07": "escalate" }),
    ];

    const result = compareVersions(oldPill, newPill, cases);
    expect(result.improvements).toHaveLength(1);
    expect(result.regressions).toHaveLength(0);
    expect(result.improvements[0].oldActual).toBe("blocked");
    expect(result.improvements[0].newActual).toBe("escalate");
  });

  it("reports no regressions when pills are identical", () => {
    const pill = makePill();
    const cases = [
      makeEvalCase("case-1", officeAsset, makeEvidence(), { "TS-07": "blocked" }),
    ];
    const result = compareVersions(pill, pill, cases);
    expect(result.regressions).toHaveLength(0);
    expect(result.improvements).toHaveLength(0);
  });

  it("handles multiple cases with mixed results", () => {
    const oldRule = makeRule({ forbidden_if_missing_evidence: true });
    const oldPill = makePill([oldRule]);

    // New rule: tighter — requires more evidence.
    const newRule = makeRule({
      required_evidence: ["lew_signoff", "insulation_resistance_ok", "area_dry", "extra_check"],
    });
    const newPill = makePill([newRule]);

    const cases = [
      makeEvalCase("case-1", officeAsset, fullConfirmedEvidence(), { "TS-07": "escalate" }),
      makeEvalCase("case-2", officeAsset, makeEvidence(), { "TS-07": "blocked" }),
    ];

    const result = compareVersions(oldPill, newPill, cases);
    // case-1: old=escalate, new=blocked (extra_check missing) → regression.
    expect(result.regressions).toHaveLength(1);
    expect(result.regressions[0].caseId).toBe("case-1");
  });
});

describe("compareVersions — summary counts", () => {
  it("reports old and new summary counts", () => {
    const oldPill = makePill();
    const newPill = makePill([makeRule({ forbidden_if_missing_evidence: false })]);
    const cases = [
      makeEvalCase("case-1", officeAsset, makeEvidence(), { "TS-07": "blocked" }),
    ];
    const result = compareVersions(oldPill, newPill, cases);
    expect(result.oldSummary.passed).toBe(1);
    expect(result.newSummary.failed).toBe(1);
  });
});
