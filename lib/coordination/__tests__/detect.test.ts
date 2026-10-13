// What the cross-pill detector decides, replayed over the real incident.
//
// The claim under test is not "it finds a conflict" — a predicate that is
// always true finds one too. It is that the predicate TURNS OFF on input that
// really occurs: at the end of INC-2026-1011 both rules are still triggered and
// TE-04 still carries its 30-minute clock, and there is still no conflict,
// because the LEW gate has cleared. That is the test a "two triggered
// must_escalate rules in different pills" predicate cannot pass.

import { describe, expect, it } from "vitest";
import { evaluate } from "@/lib/engine/evaluate";
import { coordinate, type CoordinationCheck } from "../detect";
import { COORDINATION_POLICY } from "../policy";
import { GROUNDED_INCIDENT, roomInput, timelineLength, withEvidence } from "./fixtures";

const TOTAL = timelineLength(GROUNDED_INCIDENT);

function checkAt(step: number, incidentId = GROUNDED_INCIDENT): CoordinationCheck {
  const input = roomInput(incidentId, step);
  const check = coordinate(COORDINATION_POLICY, input).find((c) => c.conflictId === "XP-01");
  if (check === undefined) throw new Error("XP-01 is not in the policy");
  return check;
}

describe("cross-pill detection over INC-2026-1011", () => {
  // Guard against a vacuous pass: every assertion below walks this replay, so a
  // one-event (or missing) timeline would make them all trivially true.
  it("replays a timeline long enough to hold a conflict and its resolution", () => {
    expect(TOTAL).toBeGreaterThan(10);
  });

  it("finds the conflict once the anchor-tenant clock and the LEW gate are both live", () => {
    const inConflict = Array.from({ length: TOTAL + 1 }, (_, step) => checkAt(step).inConflict);
    const live = inConflict.flatMap((flag, step) => (flag ? [step] : []));

    expect(live.length).toBeGreaterThan(0);
    // One contiguous window: it opens when the gate rule triggers and closes
    // when the gate clears. No flicker in between.
    expect(live).toEqual(Array.from({ length: live.length }, (_, i) => live[0] + i));

    const opened = checkAt(live[0]);
    expect(opened.obligation?.ruleId).toBe("TE-04");
    expect(opened.gate?.ruleId).toBe("TS-07");
    expect(opened.obligation?.deadlineMinutes).toBe(30);
    expect(opened.gate?.outstanding).toEqual(["area_dry", "insulation_resistance_ok", "lew_signoff"]);
    expect(opened.reason).toContain("TE-04 is due within 30 min");
    // The sentence names the gating keys the way the pill's evidence.yaml does.
    expect(opened.gate?.gatingLabels).toMatchObject({ lew_signoff: "LEW written sign-off" });
    expect(opened.reason).toContain("LEW written sign-off");
  });

  // Finding (b): the counterexample. A realistic input on which the predicate
  // is FALSE while both rules are still triggered and still on the clock.
  it("drops the conflict when the gate's whole gating set is confirmed, with both rules still firing", () => {
    const check = checkAt(TOTAL);

    expect(check.obligation?.triggered).toBe(true);
    expect(check.gate?.triggered).toBe(true);
    expect(check.obligation?.deadlineMinutes).toBe(30);
    expect(check.obligation?.actionClass).toBe("must_escalate");
    expect(check.gate?.actionClass).toBe("must_escalate");
    // Two triggered must_escalate rules in different pills — and no conflict.
    expect(check.gate?.outstanding).toEqual([]);
    expect(check.inConflict).toBe(false);
    expect(check.reason).toBe("No conflict: TS-07's gate is clear — all 3 gating keys are confirmed.");
    expect(check.adjudication).toBeNull();
  });

  it("confirming the last gating key by hand closes the conflict at the step it was open", () => {
    const live = Array.from({ length: TOTAL + 1 }, (_, step) => step).filter((step) => checkAt(step).inConflict);
    const step = live[live.length - 1];
    const open = checkAt(step);
    expect(open.inConflict).toBe(true);

    const cleared = coordinate(
      COORDINATION_POLICY,
      withEvidence(roomInput(GROUNDED_INCIDENT, step), open.gate?.gatingSet ?? [], true),
    ).find((c) => c.conflictId === "XP-01");
    expect(cleared?.inConflict).toBe(false);
    expect(cleared?.gate?.outstanding).toEqual([]);
  });

  it("reports no conflict, with the reason, before either rule triggers", () => {
    const check = checkAt(0);
    expect(check.inConflict).toBe(false);
    expect(check.reason).toBe("No conflict: TE-04 has not triggered on this evidence.");
    expect(check.adjudication).toBeNull();
  });

  it("reports no conflict while the obligation is live but the gate has not triggered", () => {
    const steps = Array.from({ length: TOTAL + 1 }, (_, step) => checkAt(step));
    const obligationOnly = steps.filter((c) => c.obligation?.triggered === true && c.gate?.triggered === false);
    expect(obligationOnly.length).toBeGreaterThan(0);
    for (const check of obligationOnly) {
      expect(check.inConflict).toBe(false);
      expect(check.reason).toBe("No conflict: TS-07 has not triggered on this evidence.");
    }
  });

  it("names the adjudicator from data/roles.json only while the conflict is live", () => {
    const live = Array.from({ length: TOTAL + 1 }, (_, step) => checkAt(step)).filter((c) => c.inConflict);
    for (const check of live) {
      expect(check.adjudication?.chosen?.role).toBe("head_technical_services");
      expect(check.adjudication?.chosen?.person).toBe("Goh Boon Kheng");
      expect(check.adjudication?.chosen?.basis).toBe("approver");
      // The nearer shared accountability is reported, with why it was passed over.
      expect(check.adjudication?.skipped.map((s) => s.role)).toEqual(["asset_operations_manager"]);
      expect(check.adjudication?.skipped[0]?.reason).toContain("commercial");
    }
  });

  it("reports the engine's own status and gating set on each face", () => {
    const step = TOTAL - 1;
    const input = roomInput(GROUNDED_INCIDENT, step);
    const check = checkAt(step);
    for (const face of [check.obligation, check.gate]) {
      expect(face).not.toBeNull();
      const pill = input.pills.find((p) => p.pillId === face?.pillId);
      const decision = evaluate(pill!.pill, input.asset, input.incident, input.evidence).actions.find(
        (a) => a.ruleId === face?.ruleId,
      );
      expect(face?.status).toBe(decision?.status);
      expect(face?.actionClass).toBe(decision?.actionClass);
      expect(face?.outstanding).toEqual([...(decision?.missingEvidence ?? [])].sort());
    }
  });

  it("takes the gate's exception-added key from the engine, not from a fixed list", () => {
    const check = checkAt(timelineLength("INC-2026-1012"), "INC-2026-1012");
    // Same rule, data-centre asset: TS-07's exception adds the CFM co-sign.
    expect(check.gate?.gatingSet).toEqual(["area_dry", "cfm_cosign", "insulation_resistance_ok", "lew_signoff"]);
    expect(check.obligation?.triggered).toBe(false);
    expect(check.inConflict).toBe(false);
  });

  it("says which pill is missing instead of going quiet when a pill is not in the room", () => {
    const input = roomInput(GROUNDED_INCIDENT, TOTAL);
    const checks = coordinate(COORDINATION_POLICY, { ...input, pills: [] });
    expect(checks).toHaveLength(COORDINATION_POLICY.conflicts.length);
    expect(checks[0].obligation).toBeNull();
    expect(checks[0].gate).toBeNull();
    expect(checks[0].inConflict).toBe(false);
    expect(checks[0].reason).toContain("tenant-experience-incident-comms");
    expect(checks[0].reason).toContain("technical-services-chilled-water-leak");
  });

  it("gives the same answer every time for the same inputs", () => {
    const input = roomInput(GROUNDED_INCIDENT, 12);
    expect(coordinate(COORDINATION_POLICY, input)).toEqual(coordinate(COORDINATION_POLICY, input));
  });
});
