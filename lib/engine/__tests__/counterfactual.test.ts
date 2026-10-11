import { describe, it, expect } from "vitest";
import { counterfactual } from "../counterfactual.js";
import {
  makePill,
  officeAsset,
  dataCentreAsset,
  waterIngressIncident,
  makeEvidence,
  fullConfirmedEvidence,
} from "./fixtures.js";

describe("counterfactual — flips from blocked to escalate", () => {
  it("reports that confirming lew_signoff flips TS-07 from blocked to escalate", () => {
    const pill = makePill();
    // Start with all required evidence missing → blocked.
    const result = counterfactual(
      pill,
      officeAsset,
      waterIngressIncident,
      makeEvidence(),
      "TS-07",
    );
    expect(result.currentStatus).toBe("blocked");
    // Confirming one evidence key flips blocked → escalate (because must_escalate).
    // But we need ALL three confirmed to not be blocked, so the minimal set is all three.
    expect(result.flipsTo).toBe("escalate");
    expect(result.ifEvidence).toContain("lew_signoff");
    expect(result.ifEvidence).toContain("insulation_resistance_ok");
    expect(result.ifEvidence).toContain("area_dry");
    expect(result.summary).toContain("TS-07");
    expect(result.summary).toContain("blocked");
    expect(result.summary).toContain("escalate");
  });
});

describe("counterfactual — single-key flip", () => {
  it("finds a minimal single-key flip when only one evidence is missing", () => {
    const pill = makePill();
    // Confirm all but one required evidence.
    const ev = fullConfirmedEvidence();
    // Remove area_dry confirmation.
    ev.area_dry = { value: false, source: "s", at: "t", confirmed: false };
    const result = counterfactual(pill, officeAsset, waterIngressIncident, ev, "TS-07");
    expect(result.currentStatus).toBe("blocked");
    expect(result.ifEvidence).toEqual(["area_dry"]);
    expect(result.flipsTo).toBe("escalate");
  });
});

describe("counterfactual — no flip needed", () => {
  it("reports no flip needed when already at escalate", () => {
    const pill = makePill();
    const result = counterfactual(
      pill,
      officeAsset,
      waterIngressIncident,
      fullConfirmedEvidence(),
      "TS-07",
    );
    expect(result.currentStatus).toBe("escalate");
    expect(result.ifEvidence).toEqual([]);
  });
});

describe("counterfactual — plain-English summary format", () => {
  it("produces a readable sentence for a single key", () => {
    const pill = makePill();
    const ev = fullConfirmedEvidence();
    ev.area_dry = { value: false, source: "s", at: "t", confirmed: false };
    const result = counterfactual(pill, officeAsset, waterIngressIncident, ev, "TS-07");
    expect(result.summary).toBe(
      "If area_dry is confirmed, TS-07 changes from blocked to escalate.",
    );
  });

  it("produces a readable sentence for multiple keys", () => {
    const pill = makePill();
    const result = counterfactual(
      pill,
      officeAsset,
      waterIngressIncident,
      makeEvidence(),
      "TS-07",
    );
    expect(result.summary).toContain("changes from blocked to escalate");
  });
});

describe("counterfactual — data_centre override", () => {
  it("data_centre exception does not unblock the gate — still blocked", () => {
    const pill = makePill();
    const result = counterfactual(
      pill,
      dataCentreAsset,
      waterIngressIncident,
      makeEvidence(),
      "TS-07",
    );
    // Exception annotates but cannot relax the gate: still blocked.
    expect(result.currentStatus).toBe("blocked");
  });
});

describe("counterfactual — error on unknown rule", () => {
  it("throws for a rule id that does not exist", () => {
    const pill = makePill();
    expect(() =>
      counterfactual(pill, officeAsset, waterIngressIncident, makeEvidence(), "NOPE-99"),
    ).toThrow("not found");
  });
});
