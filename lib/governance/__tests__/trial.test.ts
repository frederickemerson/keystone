// A version in Shadow is a version that has been trialled: entering Shadow
// replays the pill's past incidents, and approval needs at least one run.

import { describe, expect, it } from "vitest";
import { canApprove } from "../approval";
import { createGovernanceStore, GovernanceError, memoryStorage, shadowKey } from "../store";
import { replayTrial } from "../trial";
import { pillAtVersion, type PillVersion } from "../versions";
import { AOM, CE, HTS, PAST_LEAK, PILL_ID, pill, rule } from "./fixtures";

const clock = () => "2026-10-11T08:00:00.000Z";

function setup(evals = { [PAST_LEAK.id]: PAST_LEAK }) {
  const store = createGovernanceStore(memoryStorage(), clock);
  const s = () => store.getState();
  s().seedPills([{ id: PILL_ID, pill: pill(undefined, evals) }]);
  s().setRole("chief_engineer");
  s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-02", patch: { deadline_minutes: 10 } }], "correction");
  return s;
}

const shadowed: PillVersion = {
  pillId: PILL_ID,
  version: "1.3.0",
  status: "Shadow",
  rules: [rule("TS-01")],
  createdBy: CE,
  createdAt: "t",
  shadowedBy: AOM,
  shadowedAt: "t",
  reason: "r",
  parentVersion: "1.2.0",
  approverRole: "head_technical_services",
};

describe("trial run (Shadow)", () => {
  it("replayTrial decides every past incident under both versions", () => {
    const base = pill();
    const candidate = pillAtVersion(base, { ...shadowed, rules: [rule("TS-01", { action_class: "requires_approval" })] });
    const [run] = replayTrial(base, candidate, [PAST_LEAK], "t");
    expect(run).toMatchObject({ incidentId: PAST_LEAK.id, agree: false, at: "t" });
    expect(run.approvedDecision["TS-01"]).toBe("allowed");
    expect(run.shadowDecision["TS-01"]).toBe("needs_approval");
  });

  it("entering Shadow replays every past incident, in the one version_shadowed audit event", () => {
    const s = setup();
    s().setRole("asset_operations_manager");
    const before = s().audit.length;
    s().promoteToShadow(PILL_ID, "1.3.0");
    const runs = s().shadowRuns[shadowKey(PILL_ID, "1.3.0")];
    expect(runs.map((r) => r.incidentId)).toEqual([PAST_LEAK.id]);
    expect(s().audit.length).toBe(before + 1);
    expect(s().audit.at(-1)).toMatchObject({ action: "version_shadowed", pillVersion: "1.3.0" });
    expect(s().audit.at(-1)?.detail).toMatch(/1 past incident/);
  });

  it("refuses Shadow (audited) for a pill with no past incidents to trial on", () => {
    const s = setup({});
    s().setRole("asset_operations_manager");
    expect(() => s().promoteToShadow(PILL_ID, "1.3.0")).toThrow(GovernanceError);
    expect(s().versions[PILL_ID][1].status).toBe("Draft");
    expect(s().audit.at(-1)).toMatchObject({ action: "version_shadow_blocked" });
  });

  it("canApprove blocks a Shadow version with zero trial runs (fail-closed when not given)", () => {
    expect(canApprove(shadowed, { regressions: [] }, HTS, undefined, { trialRuns: 0 }).reasons.map((r) => r.code)).toEqual([
      "no_trial_runs",
    ]);
    expect(canApprove(shadowed, { regressions: [] }, HTS, undefined, { trialRuns: 0 }).reasons.map((r) => r.code)).toEqual(["no_trial_runs"]);
    expect(canApprove(shadowed, { regressions: [] }, HTS, undefined, { trialRuns: 1 }).allowed).toBe(true);
  });

  it("the store approves only with the trial runs it recorded", () => {
    const s = setup();
    s().setRole("asset_operations_manager");
    s().promoteToShadow(PILL_ID, "1.3.0");
    s().setRole("head_technical_services");
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);
  });
});
