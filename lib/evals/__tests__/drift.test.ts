// Replaying one pill version against the whole corpus: authored cases plus
// the cases derived from operational history.

import { describe, expect, it } from "vitest";
import { pastIncidentScore } from "@/lib/governance/evalScore";
import { loadPill } from "@/lib/pills/load";
import { makePill, makeRule } from "../../engine/__tests__/fixtures";
import { authoredCase, buildCorpus } from "../corpus";
import { describeCorpus, driftReport } from "../drift";
import { loadIncidentHistory } from "../history";
import type { EvalCorpus } from "../types";
import { makeAction, makeAssetRecord, makeHistory, makeIncident, makeTimeline } from "./fixtures";

/** The authored case the pill ships: the same snapshot, expecting `blocked`. */
function authoredCorpus(): EvalCorpus {
  return {
    authored: [
      authoredCase({
        id: "eval-2024-11-riser-leak-near-db",
        asset: { id: "asset-hf1", name: "Harbourfront One", type: "grade_a_office", attributes: {} },
        incident: { id: "INC-2024-11", type: "water_ingress" },
        evidence: {
          water_near_electrical: { value: true, source: "eval", at: "2024-11-06", confirmed: true },
        },
        expected: { "TS-07": { status: "blocked" } },
      }),
    ],
    derived: [],
    excluded: [],
    incidentsConsidered: 0,
  };
}

describe("driftReport", () => {
  it("replays authored and derived cases in one report and names the version replayed", () => {
    // Arrange
    const pill = makePill();
    const corpus = buildCorpus(pill, makeHistory());
    const withAuthored: EvalCorpus = { ...corpus, authored: authoredCorpus().authored };

    // Act
    const report = driftReport(pill, withAuthored);

    // Assert
    expect(report.pillVersion).toBe("1.0.0");
    expect(report.pillStatus).toBe("approved");
    expect(report.cases.map((entry) => entry.authorship)).toEqual(["authored", "derived"]);
    expect(report.agreements).toBe(2);
    expect(report.disagreements).toBe(0);
  });

  it("gives a derived row its origin and leaves an authored row without one", () => {
    // Arrange
    const pill = makePill();
    const corpus: EvalCorpus = { ...buildCorpus(pill, makeHistory()), authored: authoredCorpus().authored };

    // Act
    const report = driftReport(pill, corpus);
    const [authored, derived] = report.cases;

    // Assert
    expect(authored.authorship).toBe("authored");
    expect(Object.hasOwn(authored, "origin")).toBe(false);
    if (derived.authorship !== "derived") throw new Error("expected a derived row");
    expect(derived.origin.incidentId).toBe("INC-2026-0855");
    expect(derived.origin.eventId).toBe("EV-0855-01");
  });

  it("marks version drift when the incident was decided under another version", () => {
    // Arrange: the record says 1.1.0, the pill replayed is 1.0.0.
    const pill = makePill();
    const history = makeHistory(makeIncident({ pill_version: "1.1.0" }));

    // Act
    const report = driftReport(pill, buildCorpus(pill, history));
    const [row] = report.cases;

    // Assert
    if (row.authorship !== "derived") throw new Error("expected a derived row");
    expect(row.versionDrift).toBe(true);
  });

  it("reports a disagreement per assertion, with the engine's expected and actual", () => {
    // Arrange
    const pill = makePill();
    const history = makeHistory(makeIncident({ actions: [makeAction({ status: "allowed" })] }));

    // Act
    const report = driftReport(pill, buildCorpus(pill, history));

    // Assert
    expect(report.disagreements).toBe(1);
    expect(report.cases[0].disagreements[0]).toMatchObject({
      ruleId: "TS-07",
      field: "status",
      expected: "allowed",
      actual: "blocked",
    });
  });

  it("names the rules no case in the corpus asserts", () => {
    // Arrange: a second rule nothing expects anything about.
    const pill = makePill([makeRule(), makeRule({ id: "TS-11", title: "Standing water" })]);

    // Act
    const report = driftReport(pill, buildCorpus(pill, makeHistory()));

    // Assert
    expect(report.coverage.totalRules).toBe(2);
    expect(report.coverage.rulesAsserted).toBe(1);
    expect(report.coverage.rulesNotAsserted).toEqual(["TS-11"]);
  });

  it("carries the exclusion ledger, so a thin corpus cannot be shown as a full one", () => {
    // Arrange
    const pill = makePill();
    const history = {
      incidents: [makeIncident({ actions: undefined })],
      timelines: [],
      assets: [makeAssetRecord()],
    };

    // Act
    const report = driftReport(pill, buildCorpus(pill, history));

    // Assert
    expect(report.coverage.derivedCases).toBe(0);
    expect(report.coverage.incidentsConsidered).toBe(1);
    expect(report.coverage.incidentsExcluded).toBe(1);
    expect(report.excluded[0].reasons).toEqual(["no_timeline", "no_recorded_actions"]);
  });

  it("stands a derived case down when an authored case already owns its id", () => {
    // Arrange
    const pill = makePill();
    const derivedId = buildCorpus(pill, makeHistory()).derived[0].id;
    const collidingPill = {
      ...pill,
      evals: {
        [derivedId]: {
          id: derivedId,
          asset: { id: "asset-hf1", name: "Harbourfront One", type: "grade_a_office", attributes: {} },
          incident: { id: "INC-2026-0855", type: "water_ingress" },
          evidence: {},
          expected: {},
        },
      },
    };

    // Act
    const collided = buildCorpus(collidingPill, makeHistory());

    // Assert
    expect(collided.derived).toEqual([]);
    expect(collided.excluded[0].reasons).toEqual(["case_id_collision"]);
  });
});

describe("describeCorpus", () => {
  it("states the derived count even when it is zero", () => {
    // Arrange
    const pill = makePill();
    const history = { incidents: [makeIncident({ actions: undefined })], timelines: [], assets: [] };

    // Act
    const sentence = describeCorpus(driftReport(pill, buildCorpus(pill, history)));

    // Assert
    expect(sentence).toBe("0 authored cases, 0 derived from closed incidents (1 incident considered, 1 excluded).");
  });

  it("counts a single authored case in the singular", () => {
    // Arrange
    const pill = makePill();
    const corpus: EvalCorpus = { ...buildCorpus(pill, makeHistory()), authored: authoredCorpus().authored };

    // Act / Assert
    expect(describeCorpus(driftReport(pill, corpus))).toContain("1 authored case,");
  });
});

describe("driftReport — the real pill against the real history", () => {
  const bundle = loadPill("technical-services-chilled-water-leak")!;
  const pill = bundle.pill;
  const corpus = buildCorpus(pill, loadIncidentHistory());
  const report = driftReport(pill, corpus);

  it("replays the pill's own authored cases", () => {
    // Guard against a vacuous pass if the pill ever ships no evals.
    expect(report.coverage.authoredCases).toBeGreaterThanOrEqual(6);
    expect(report.coverage.totalRules).toBe(pill.rules.length);
    expect(report.coverage.rulesNotAsserted).toEqual([]);
  });

  it("counts the authored half exactly as the governance score does", () => {
    // Arrange: one pill must never show two different numbers for the same
    // replay, so the authored rows are reconciled against the existing score.
    const score = pastIncidentScore(pill);
    const authored = report.cases.filter((entry) => entry.authorship === "authored");

    // Act
    const agreements = authored.reduce((total, entry) => total + entry.agreements, 0);
    const disagreements = authored.reduce((total, entry) => total + entry.disagreements.length, 0);

    // Assert
    expect(agreements).toBe(score.checksPassed);
    expect(agreements + disagreements).toBe(score.checks);
  });

  it("still finds the one intended disagreement: the TS-02 isolation deadline", () => {
    // The approved version keeps a 15-minute deadline while the Chief
    // Engineer's outcome review says 10 — the drift the pill exists to show.
    const disagreements = report.cases.flatMap((entry) => entry.disagreements);
    expect(disagreements).toHaveLength(1);
    expect(disagreements[0]).toMatchObject({
      caseId: "eval-2025-09-tenant-area-isolation-deadline",
      ruleId: "TS-02",
      field: "deadline_minutes",
      expected: 10,
      actual: 15,
    });
  });

  it("reports the corpus honestly, derived cases and exclusions included", () => {
    expect(report.coverage.derivedCases).toBe(corpus.derived.length);
    expect(report.coverage.incidentsExcluded).toBe(corpus.excluded.length);
    expect(report.coverage.derivedCases + report.coverage.incidentsExcluded).toBe(
      report.coverage.incidentsConsidered,
    );
    expect(describeCorpus(report)).toContain(`${corpus.derived.length} derived from closed incidents`);
  });
});
