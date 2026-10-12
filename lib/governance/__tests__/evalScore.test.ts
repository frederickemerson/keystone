import { describe, expect, it } from "vitest";
import type { EvalCase } from "@/lib/engine";
import { loadPill } from "@/lib/pills/load";
import { addScores, describeScore, EMPTY_SCORE, pastIncidentScore } from "../evalScore";
import { PAST_LEAK, pill, rule } from "./fixtures";

const FAILING: EvalCase = { ...PAST_LEAK, id: "eval-failing", expected: { "TS-01": { status: "blocked" }, "TS-02": { status: "allowed" } } };

describe("past-incident score (one count for every screen)", () => {
  it("counts a past incident as passed only when all its checks pass", () => {
    const score = pastIncidentScore(pill([rule("TS-01"), rule("TS-02")], { [PAST_LEAK.id]: PAST_LEAK, [FAILING.id]: FAILING }));
    expect(score).toEqual({ incidents: 2, incidentsPassed: 1, checks: 3, checksPassed: 2 });
    expect(describeScore(score)).toBe("1 of 2 past incidents pass (2 of 3 checks)");
  });

  it("adds across pills", () => {
    const one = pastIncidentScore(pill());
    expect(addScores(addScores(EMPTY_SCORE, one), one)).toEqual({ incidents: 2, incidentsPassed: 2, checks: 2, checksPassed: 2 });
  });

  it("the chilled-water pill on disk: the tenant-area case is the one known failure", () => {
    const bundle = loadPill("technical-services-chilled-water-leak");
    const score = pastIncidentScore(bundle!.pill);
    expect(score.incidents).toBe(6);
    expect(score.incidentsPassed).toBe(5);
    expect(score.checksPassed).toBe(score.checks - 1);
  });
});
