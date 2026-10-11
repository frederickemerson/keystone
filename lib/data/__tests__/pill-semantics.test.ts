// Behaviour of the authored pill CONTENT through the real engine.
//
// consistency.test.ts checks the files agree with each other; this file checks
// that what the experts said is what the engine does. Every requirement a rule
// states must be enforced by structure — required_evidence, an exception's
// add_required_evidence, or a rule of its own — never by note text alone,
// because the engine never lets an exception relax a gate.
//
// Expectations are derived from the rules (and the experts' words they cite),
// not copied from engine output.

import { describe, expect, it } from "vitest";
import { evaluate } from "../../engine/evaluate";
import type { Asset, Evidence, Pill } from "../../engine/types";
import { loadAsset, loadIncident, loadTimeline } from "../index";
import { loadAllPills, loadPill } from "../../pills/load";

const TS = loadPill("technical-services-chilled-water-leak")!.pill;
const TE = loadPill("tenant-experience-incident-comms")!.pill;

const OFFICE: Asset = { id: "office", name: "Harbourfront One", type: "grade_a_office", attributes: {} };
const DC: Asset = { id: "dc", name: "Harbourfront DC1", type: "data_centre", attributes: {} };
const INCIDENT = { id: "INC-T", type: "water_ingress" };

/** Evidence map: `true`/`false`/string → confirmed; `{ value, confirmed: false }` → unconfirmed. */
function ev(facts: Record<string, unknown>): Evidence {
  const out: Evidence = {};
  for (const [key, v] of Object.entries(facts)) {
    out[key] =
      typeof v === "object" && v !== null && "confirmed" in v && "value" in v
        ? { value: v.value, confirmed: false, source: "test", at: "2026-10-11" }
        : { value: v, confirmed: true, source: "test", at: "2026-10-11" };
  }
  return out;
}

function decide(pill: Pill, asset: Asset, facts: Record<string, unknown>, ruleId: string) {
  const r = evaluate(pill, asset, INCIDENT, ev(facts));
  const action = r.actions.find((a) => a.ruleId === ruleId);
  return { status: action?.status ?? "not_applicable", missing: action?.missingEvidence ?? [] };
}

const LEW_KEYS = { lew_signoff: true, insulation_resistance_ok: true, area_dry: true };

describe("TS-07 — data-centre return to service needs the CFM co-signature too", () => {
  it("office: the three LEW keys clear the gate (escalate, nothing missing)", () => {
    expect(decide(TS, OFFICE, { equipment_wetted_or_isolated: true, ...LEW_KEYS }, "TS-07")).toEqual({ status: "escalate", missing: [] });
  });

  it("data centre: LEW keys alone leave it blocked on cfm_cosign", () => {
    expect(decide(TS, DC, { equipment_wetted_or_isolated: true, ...LEW_KEYS }, "TS-07")).toEqual({
      status: "blocked",
      missing: ["cfm_cosign"],
    });
  });

  it("data centre: the CFM co-sign never substitutes for the LEW sign-off", () => {
    const d = decide(TS, DC, { equipment_wetted_or_isolated: true, cfm_cosign: true }, "TS-07");
    expect(d.status).toBe("blocked");
    expect(d.missing).toEqual(["lew_signoff", "insulation_resistance_ok", "area_dry"]);
  });

  it("data centre: an unconfirmed co-sign does not count", () => {
    const d = decide(TS, DC, { equipment_wetted_or_isolated: true, ...LEW_KEYS, cfm_cosign: { value: true, confirmed: false } }, "TS-07");
    expect(d).toEqual({ status: "blocked", missing: ["cfm_cosign"] });
  });

  it("data centre: all four confirmed → escalate", () => {
    expect(decide(TS, DC, { equipment_wetted_or_isolated: true, ...LEW_KEYS, cfm_cosign: true }, "TS-07").status).toBe("escalate");
  });
});

describe("TS-03 — a tripped breaker needs the LEW's inspection before anything else", () => {
  const base = { water_near_electrical: false, tenant_request_power_down: true, lew_or_evidence_confirms_risk: true };

  it("no trip: confirmed risk → needs approval", () => {
    expect(decide(TS, OFFICE, base, "TS-03")).toEqual({ status: "needs_approval", missing: [] });
  });

  it("breaker tripped: blocked until the LEW has inspected the tripped circuit", () => {
    expect(decide(TS, OFFICE, { ...base, breaker_tripped: true }, "TS-03")).toEqual({
      status: "blocked",
      missing: ["lew_inspected_tripped_breaker"],
    });
    expect(decide(TS, OFFICE, { ...base, breaker_tripped: true, lew_inspected_tripped_breaker: true }, "TS-03").status).toBe(
      "needs_approval",
    );
  });
});

describe("TS-05 / TS-13 — emergency isolation is its own rule; the FSM gate never relaxes", () => {
  const fire = { source_is_fire_protection: true };

  it("TS-05 stays blocked without FSM authorisation, life-safety hazard or not", () => {
    for (const facts of [fire, { ...fire, immediate_life_safety_hazard: true }])
      expect(decide(TS, OFFICE, facts, "TS-05")).toEqual({ status: "blocked", missing: ["fsm_authorisation"] });
  });

  it("TS-13 does not apply without a life-safety hazard", () => {
    expect(decide(TS, OFFICE, fire, "TS-13").status).toBe("not_applicable");
    expect(decide(TS, OFFICE, { immediate_life_safety_hazard: true }, "TS-13").status).toBe("not_applicable");
  });

  it("TS-13 on a confirmed hazard: escalate to the FSM within 5 minutes", () => {
    const r = evaluate(TS, OFFICE, INCIDENT, ev({ ...fire, immediate_life_safety_hazard: true }));
    const a = r.actions.find((x) => x.ruleId === "TS-13")!;
    expect(a.status).toBe("escalate");
    expect(a.escalateTo).toEqual({ role: "fire_safety_manager", fallback: "head_technical_services" });
    expect(a.deadline).toBe(5);
  });

  it("TS-13 on an unconfirmed hazard claim: blocked (no emergency path on an unverified claim)", () => {
    expect(decide(TS, OFFICE, { ...fire, immediate_life_safety_hazard: { value: true, confirmed: false } }, "TS-13")).toEqual({
      status: "blocked",
      missing: ["immediate_life_safety_hazard"],
    });
  });
});

describe("TE-01 / TE-07 — a life-safety instruction is its own rule; TE-01 approval never relaxes", () => {
  const tenant = { tenant_premises_affected: true, affected_units_confirmed: true };

  it("TE-01 still needs a named approver during a life-safety instruction", () => {
    expect(decide(TE, OFFICE, { ...tenant, life_safety_instruction_called: true }, "TE-01").status).toBe("needs_approval");
  });

  it("TE-07 on a confirmed FSM / FCC call: allowed immediately", () => {
    expect(decide(TE, OFFICE, { life_safety_instruction_called: true }, "TE-07")).toEqual({ status: "allowed", missing: [] });
    expect(decide(TE, DC, { life_safety_instruction_called: true }, "TE-07").status).toBe("allowed");
  });

  it("TE-07 on an unconfirmed call: blocked; absent: not applicable", () => {
    expect(decide(TE, OFFICE, { life_safety_instruction_called: { value: true, confirmed: false } }, "TE-07").status).toBe("blocked");
    expect(decide(TE, OFFICE, tenant, "TE-07").status).toBe("not_applicable");
  });
});

// ---------------------------------------------------------------------------
// The demo stories, stepped through the timelines as the Incident Room does
// ---------------------------------------------------------------------------

function replay(incidentId: string) {
  const tl = loadTimeline(incidentId)!;
  const incident = loadIncident(incidentId)!;
  const rec = loadAsset(tl.asset_id)!;
  const { id, name, type, ...attributes } = rec;
  const asset: Asset = { id, name, type, attributes };
  const pills = loadAllPills().map((b) => b.pill);
  return tl.events.map((event, i) => {
    const evidence: Evidence = {};
    for (const e of tl.events.slice(0, i + 1))
      for (const [k, u] of Object.entries(e.evidence_updates))
        evidence[k] = { value: u.value, confirmed: u.confirmed, source: e.source, at: e.at };
    const actions = pills.flatMap((p) => evaluate(p, asset, { id: incidentId, type: incident.type }, evidence).actions);
    return { eventId: event.id, ts07: actions.find((a) => a.ruleId === "TS-07") };
  });
}

describe("demo stories", () => {
  it("INC-2026-1011 (office): TS-07 first appears BLOCKED at step 10 (EV-1011-10) missing exactly the three LEW keys", () => {
    const steps = replay("INC-2026-1011");
    const first = steps.findIndex((s) => s.ts07);
    expect(first).toBe(9);
    expect(steps[9].eventId).toBe("EV-1011-10");
    expect(steps[9].ts07!.status).toBe("blocked");
    expect(steps[9].ts07!.missingEvidence).toEqual(["lew_signoff", "insulation_resistance_ok", "area_dry"]);
  });

  it("INC-2026-1012 (data centre): TS-07 stays blocked after the LEW sign-off until the CFM co-signs", () => {
    const steps = replay("INC-2026-1012");
    const lew = steps.find((s) => s.eventId === "EV-1012-08")!;
    expect(lew.ts07!.status).toBe("blocked");
    expect(lew.ts07!.missingEvidence).toEqual(["cfm_cosign"]);
    const triggered = steps.filter((s) => s.ts07);
    const last = triggered[triggered.length - 1];
    expect(last.eventId).toBe("EV-1012-09");
    expect(last.ts07!.status).toBe("escalate");
    for (const s of triggered.slice(0, -1)) {
      expect(s.ts07!.status, s.eventId).toBe("blocked");
      expect(s.ts07!.missingEvidence, s.eventId).toContain("cfm_cosign");
    }
  });
});
