// "Show N not applicable" explains each rule in plain words built from the
// engine's structured trace and the pill's evidence labels — never the raw
// "All-conditions failed: evidence.x (undefined) eq true — not matched".

import { describe, expect, it } from "vitest";
import { notApplicableReason } from "@/components/incident/naReason";
import { evaluate, type EvidenceCatalog } from "@/lib/engine";
import { pill, rule } from "./fixtures";

const CATALOG: EvidenceCatalog = {
  immediate_life_safety_hazard: { label: "Life-safety hazard confirmed", type: "boolean", confirmable_by: [] },
  moisture_reading_pct: { label: "Moisture reading (%)", type: "number", confirmable_by: [] },
};
const ASSET = { id: "a", name: "A", type: "grade_a_office", attributes: {} };

function traceFor(r: ReturnType<typeof rule>, incidentType = "water_ingress", evidence = {}) {
  const t = evaluate(pill([r]), ASSET, { id: "INC-1", type: incidentType }, evidence).trace[0];
  expect(t.triggered).toBe(false);
  return t;
}

describe("notApplicableReason", () => {
  it("names the evidence a boolean condition needs, by its label", () => {
    const r = rule("TS-09", { trigger: { incident_type: "water_ingress", all: [{ path: "evidence.immediate_life_safety_hazard", op: "eq", value: true }], any: [] } });
    expect(notApplicableReason(r, traceFor(r), CATALOG, "water_ingress")).toBe("Needs: Life-safety hazard confirmed");
  });

  it("says when the rule is for another kind of incident", () => {
    const r = rule("TS-14", { trigger: { incident_type: "condensate_leak", all: [], any: [] } });
    expect(notApplicableReason(r, traceFor(r), CATALOG, "water_ingress")).toBe("Only for condensate leak incidents");
  });

  it("puts the incident type first, as the engine does, even when conditions also fail", () => {
    const r = rule("TS-15", { trigger: { incident_type: "condensate_leak", all: [{ path: "evidence.immediate_life_safety_hazard", op: "eq", value: true }], any: [] } });
    expect(notApplicableReason(r, traceFor(r), CATALOG, "water_ingress")).toBe("Only for condensate leak incidents");
  });

  it("words numeric thresholds and falls back to a readable key", () => {
    const r = rule("TS-10", {
      trigger: {
        incident_type: "water_ingress",
        all: [
          { path: "evidence.moisture_reading_pct", op: "gt", value: 15 },
          { path: "evidence.lew_signoff", op: "eq", value: false },
        ],
        any: [],
      },
    });
    expect(notApplicableReason(r, traceFor(r), CATALOG, "water_ingress")).toBe("Needs: Moisture reading (%) above 15 · LEW sign-off: no");
  });

  it("lists the alternatives when none of the any-conditions hold", () => {
    const r = rule("TS-11", {
      trigger: {
        incident_type: "water_ingress",
        all: [],
        any: [
          { path: "evidence.immediate_life_safety_hazard", op: "eq", value: true },
          { path: "evidence.moisture_reading_pct", op: "gte", value: 20 },
        ],
      },
    });
    expect(notApplicableReason(r, traceFor(r), CATALOG, "water_ingress")).toBe(
      "Needs one of: Life-safety hazard confirmed · Moisture reading (%) at least 20",
    );
  });
});
