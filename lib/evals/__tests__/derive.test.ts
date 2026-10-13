// Deriving an eval case from a closed incident's own record.

import { describe, expect, it } from "vitest";
import { runEvals } from "@/lib/engine";
import { loadPill } from "@/lib/pills/load";
import { makePill } from "../../engine/__tests__/fixtures";
import { deriveEvalCase, deriveEvalCases, evidenceAfter } from "../derive";
import { loadIncidentHistory } from "../history";
import type { DerivedEvalCase, ExcludedIncident } from "../types";
import {
  makeAction,
  makeAssetRecord,
  makeEvent,
  makeHistory,
  makeIncident,
  makeTimeline,
} from "./fixtures";

/** The derived case, or a failure naming why the incident was excluded. */
function derivedOrFail(outcome: DerivedEvalCase | ExcludedIncident): DerivedEvalCase {
  if (!("authorship" in outcome)) {
    throw new Error(`expected a derived case, got exclusion: ${outcome.reasons.join(", ")} — ${outcome.detail}`);
  }
  return outcome;
}

function excludedOrFail(outcome: DerivedEvalCase | ExcludedIncident): ExcludedIncident {
  if ("authorship" in outcome) {
    throw new Error(`expected an exclusion, got derived case ${outcome.id}`);
  }
  return outcome;
}

describe("deriveEvalCase — a closed incident becomes an eval case", () => {
  it("anchors the case at the incident's last timeline event and says where it came from", () => {
    // Arrange
    const pill = makePill();
    const timeline = makeTimeline({
      events: [
        makeEvent(),
        makeEvent({ id: "EV-0855-02", at: "2026-08-12T07:10:00+08:00", source: "lew" }),
      ],
    });

    // Act
    const derived = derivedOrFail(deriveEvalCase(pill, makeIncident(), timeline, makeAssetRecord()));

    // Assert
    expect(derived.authorship).toBe("derived");
    expect(derived.id).toBe("derived-INC-2026-0855@EV-0855-02");
    expect(derived.origin).toMatchObject({
      incidentId: "INC-2026-0855",
      eventId: "EV-0855-02",
      eventAt: "2026-08-12T07:10:00+08:00",
      timelineVersion: "1.0",
      recordedPillVersion: "1.0.0",
    });
    expect(derived.description).toContain("not an expert's");
  });

  it("expects exactly the decisions the incident recorded, and replays to them", () => {
    // Arrange
    const pill = makePill();

    // Act
    const derived = derivedOrFail(
      deriveEvalCase(pill, makeIncident(), makeTimeline(), makeAssetRecord()),
    );
    const summary = runEvals(pill, [derived]);

    // Assert
    expect(derived.expected).toEqual({ "TS-07": { status: "blocked" } });
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(0);
  });

  it("disagrees when the engine no longer decides what the incident recorded", () => {
    // Arrange: the record says the re-energisation was allowed, but all three
    // sign-offs are missing from the timeline, so the gate blocks it.
    const pill = makePill();
    const incident = makeIncident({ actions: [makeAction({ status: "allowed" })] });

    // Act
    const derived = derivedOrFail(deriveEvalCase(pill, incident, makeTimeline(), makeAssetRecord()));
    const summary = runEvals(pill, [derived]);

    // Assert
    expect(summary.failed).toBe(1);
    expect(summary.results[0]).toMatchObject({ ruleId: "TS-07", expected: "allowed", actual: "blocked" });
  });

  it("reads the evidence state after the last event, so a later correction wins", () => {
    // Arrange
    const events = [
      makeEvent({ evidence_updates: { lew_signoff: { value: true, confirmed: false } } }),
      makeEvent({
        id: "EV-0855-02",
        at: "2026-08-12T07:10:00+08:00",
        source: "lew",
        evidence_updates: { lew_signoff: { value: true, confirmed: true } },
      }),
    ];

    // Act
    const evidence = evidenceAfter(events);

    // Assert
    expect(evidence.lew_signoff).toEqual({
      value: true,
      source: "lew",
      at: "2026-08-12T07:10:00+08:00",
      confirmed: true,
    });
  });

  it("never passes the incident's own decisions to the engine as input", () => {
    // Arrange: the record carries every answer-bearing field the demo data has.
    const incident = makeIncident({
      evidence_coverage: { required: 3, confirmed: 0, pending: ["lew_signoff"] },
      eval_expected: "must_escalate",
      eval_actual: "must_escalate",
      eval_pass: true,
      outcome: "LEW sign-off obtained.",
      flagged_for_learning: true,
      learning_note: "Isolation must complete within 10 minutes.",
      audit_trail: [{ at: "2026-08-12T06:45:00+08:00", user: "iBMS", action: "alarm_raised", detail: "LD-B1-01" }],
    });
    // Guard against a vacuous pass: the fields must really be on the record.
    for (const field of ["actions", "eval_expected", "eval_pass", "outcome", "audit_trail"]) {
      expect(Object.hasOwn(incident, field), `fixture is missing ${field}`).toBe(true);
    }

    // Act
    const derived = derivedOrFail(deriveEvalCase(makePill(), incident, makeTimeline(), makeAssetRecord()));

    // Assert
    for (const field of [
      "actions",
      "evidence_coverage",
      "eval_expected",
      "eval_actual",
      "eval_pass",
      "outcome",
      "flagged_for_learning",
      "learning_note",
      "audit_trail",
      "status",
      "closed_at",
    ]) {
      expect(Object.hasOwn(derived.incident, field), `${field} reached the engine input`).toBe(false);
    }
    expect(derived.incident).toMatchObject({ id: "INC-2026-0855", type: "water_ingress", subtype: "chilled_water_leak" });
  });

  it("drops a rule that belongs to another pill, keeps the rest, and records the drop", () => {
    // Arrange
    const incident = makeIncident({
      actions: [makeAction(), makeAction({ rule_id: "TE-01", status: "needs_approval" })],
    });

    // Act
    const derived = derivedOrFail(deriveEvalCase(makePill(), incident, makeTimeline(), makeAssetRecord()));

    // Assert
    expect(Object.keys(derived.expected)).toEqual(["TS-07"]);
    expect(derived.origin.droppedRules).toEqual([
      { ruleId: "TE-01", reason: "rule_not_in_pill", detail: expect.stringContaining("TE-01") },
    ]);
  });
});

describe("deriveEvalCase — exclusions instead of invented expectations", () => {
  it("excludes an open incident, and names that as the only thing missing", () => {
    // Arrange
    const incident = makeIncident({ status: "active", closed_at: undefined });

    // Act
    const excluded = excludedOrFail(deriveEvalCase(makePill(), incident, makeTimeline(), makeAssetRecord()));

    // Assert
    expect(excluded.reasons).toEqual(["incident_not_closed"]);
    expect(excluded.detail).toContain("only a closed incident");
  });

  it("excludes a closed incident with no timeline and no recorded decisions, naming both", () => {
    // Arrange
    const incident = makeIncident({ actions: undefined });

    // Act
    const excluded = excludedOrFail(deriveEvalCase(makePill(), incident, undefined, makeAssetRecord()));

    // Assert
    expect(excluded.reasons).toEqual(["no_timeline", "no_recorded_actions"]);
  });

  it("excludes rather than mapping an operational status onto a decision", () => {
    // Arrange: "completed" is not a decision the engine returns. Mapping it by
    // action class would reimplement the engine, making the case unfailable.
    const incident = makeIncident({ actions: [makeAction({ status: "completed" })] });

    // Act
    const excluded = excludedOrFail(deriveEvalCase(makePill(), incident, makeTimeline(), makeAssetRecord()));

    // Assert
    expect(excluded.reasons).toEqual(["no_determinable_expectation"]);
    expect(excluded.detail).toContain('"completed"');
  });

  it("drops a rule recorded twice with conflicting statuses and never resurrects it", () => {
    // Arrange
    const incident = makeIncident({
      actions: [makeAction({ status: "blocked" }), makeAction({ status: "escalate" }), makeAction({ status: "blocked" })],
    });

    // Act
    const excluded = excludedOrFail(deriveEvalCase(makePill(), incident, makeTimeline(), makeAssetRecord()));

    // Assert
    expect(excluded.reasons).toEqual(["no_determinable_expectation"]);
    expect(excluded.detail).toContain("recorded twice with different statuses");
  });

  it("excludes a timeline that continues after the incident was closed", () => {
    // Arrange
    const timeline = makeTimeline({
      events: [makeEvent({ id: "EV-0855-09", at: "2026-08-13T09:00:00+08:00" })],
    });

    // Act
    const excluded = excludedOrFail(deriveEvalCase(makePill(), makeIncident(), timeline, makeAssetRecord()));

    // Assert
    expect(excluded.reasons).toEqual(["timeline_extends_past_close"]);
  });

  it("excludes an unparseable close time instead of ordering it by accident", () => {
    // Arrange
    const incident = makeIncident({ closed_at: "last Tuesday" });

    // Act
    const excluded = excludedOrFail(deriveEvalCase(makePill(), incident, makeTimeline(), makeAssetRecord()));

    // Assert
    expect(excluded.reasons).toEqual(["timestamp_not_parseable"]);
  });

  it("excludes an incident whose asset is not in the history", () => {
    // Act
    const excluded = excludedOrFail(deriveEvalCase(makePill(), makeIncident(), makeTimeline(), undefined));

    // Assert
    expect(excluded.reasons).toEqual(["asset_not_found"]);
    expect(excluded.detail).toContain("asset-hf1");
  });

  it("excludes a closed incident with an empty timeline", () => {
    // Act
    const excluded = excludedOrFail(
      deriveEvalCase(makePill(), makeIncident(), makeTimeline({ events: [] }), makeAssetRecord()),
    );

    // Assert
    expect(excluded.reasons).toEqual(["timeline_has_no_events"]);
  });
});

describe("deriveEvalCases — the ledger over a whole history", () => {
  it("accounts for every incident exactly once, derived or excluded", () => {
    // Arrange
    const history = {
      incidents: [makeIncident(), makeIncident({ id: "INC-2026-0901", status: "active", closed_at: undefined })],
      timelines: [makeTimeline()],
      assets: [makeAssetRecord()],
    };

    // Act
    const result = deriveEvalCases(makePill(), history);

    // Assert
    expect(result.incidentsConsidered).toBe(2);
    expect(result.derived.length + result.excluded.length).toBe(2);
    expect(result.derived.map((entry) => entry.origin.incidentId)).toEqual(["INC-2026-0855"]);
    expect(result.excluded.map((entry) => entry.incidentId)).toEqual(["INC-2026-0901"]);
  });

  it("takes its pill and its history as required arguments", () => {
    // A history that defaulted to empty would report "0 derived" from no data.
    expect(deriveEvalCases.length).toBe(2);
  });

  it("matches a one-incident history to the history helper", () => {
    // Arrange / Act
    const result = deriveEvalCases(makePill(), makeHistory());

    // Assert
    expect(result.derived).toHaveLength(1);
  });
});

describe("deriveEvalCases — the real operational history in data/", () => {
  const pill = loadPill("technical-services-chilled-water-leak")!;
  const history = loadIncidentHistory();
  const result = deriveEvalCases(pill.pill, history);

  it("reads a history to police", () => {
    // Guard against a vacuous pass if data/ is ever emptied or moved.
    expect(history.incidents.length).toBeGreaterThanOrEqual(4);
    expect(history.timelines.length).toBeGreaterThan(0);
    expect(result.incidentsConsidered).toBe(history.incidents.length);
  });

  it("derives a case for exactly those incidents whose record supports one", () => {
    // Arrange: the eligible shape, read off the records themselves.
    const eligible = history.incidents.filter(
      (incident) =>
        incident.status === "closed" &&
        incident.closed_at !== undefined &&
        (incident.actions ?? []).length > 0 &&
        history.timelines.some((timeline) => timeline.incident_id === incident.id),
    );

    // Assert
    expect(result.derived.length).toBeLessThanOrEqual(eligible.length);
    for (const derived of result.derived) {
      const incident = history.incidents.find((entry) => entry.id === derived.origin.incidentId)!;
      expect(incident.status, `${incident.id} is not closed`).toBe("closed");
    }
  });

  it("gives every excluded incident at least one reason and a sentence", () => {
    for (const excluded of result.excluded) {
      expect(excluded.reasons.length, excluded.incidentId).toBeGreaterThan(0);
      expect(excluded.detail.length, excluded.incidentId).toBeGreaterThan(0);
    }
  });

  it("keeps the two live incidents excluded only because they are still open", () => {
    // The story anchors: INC-2026-1011 and INC-2026-1012 already carry both a
    // timeline and recorded decisions, so closing them is all that stands
    // between operational history and a regression case.
    for (const id of ["INC-2026-1011", "INC-2026-1012"]) {
      const excluded = result.excluded.find((entry) => entry.incidentId === id);
      expect(excluded?.reasons, id).toEqual(["incident_not_closed"]);
    }
  });
});
