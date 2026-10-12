// A decision records the pill version LIVE when the person decides — not the
// version the incident opened under — so the decision record never restamps
// (or under-stamps) a past decision.

import { describe, expect, it } from "vitest";
import { createGovernanceStore, memoryStorage } from "../store";
import { liveVersionOf } from "../versions";
import { PILL_ID, pill } from "./fixtures";

const clock = () => "2026-10-12T01:00:00.000Z";

describe("liveVersionOf", () => {
  it("is the current approved version from the governance store", () => {
    const store = createGovernanceStore(memoryStorage(), clock);
    const s = () => store.getState();
    s().seedPills([{ id: PILL_ID, pill: pill() }]);
    expect(liveVersionOf(s().versions, PILL_ID)).toBe("1.2.0");

    s().setRole("chief_engineer");
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-02", patch: { deadline_minutes: 10 } }], "correction");
    s().setRole("asset_operations_manager");
    s().promoteToShadow(PILL_ID, "1.3.0");
    s().setRole("head_technical_services");
    s().approveVersion(PILL_ID, "1.3.0", { regressions: [] });
    expect(liveVersionOf(s().versions, PILL_ID)).toBe("1.3.0");

    // What the approvals card records for a decision taken now.
    const rec = s().decideAction({
      incidentId: "INC-2026-1011",
      ruleId: "TS-07",
      outcome: "escalated",
      pillId: PILL_ID,
      pillVersion: liveVersionOf(s().versions, PILL_ID),
    });
    expect(rec.pillVersion).toBe("1.3.0");
  });

  it("is undefined for a pill the store has not seeded", () => {
    expect(liveVersionOf({}, "nope")).toBeUndefined();
  });
});
