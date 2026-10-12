// The trial run (Shadow) and the past-incident score are different numbers:
// one is agreement with the live version, the other is passing the outcome the
// experts expected. Approvals and Learning word both with these helpers.

import { describe, expect, it } from "vitest";
import { makeShadowRun } from "../approval";
import { describePastIncidents, describeTrial, TRIAL_VS_SCORE } from "../evalScore";

const agree = (id: string) => makeShadowRun(id, [], [], "t");
const differ = (id: string) =>
  makeShadowRun(
    id,
    [],
    [{ ruleId: "TS-14", status: "allowed" } as Parameters<typeof makeShadowRun>[2][number]],
    "t",
  );

describe("describeTrial", () => {
  it("says how many past incidents were replayed and on how many the versions agree", () => {
    const runs = [agree("a"), agree("b"), agree("c"), agree("d"), agree("e"), agree("f")];
    expect(describeTrial(runs)).toBe("Trial run: 6 past incidents replayed · new version agrees with the live one on 6");
  });

  it("counts disagreements", () => {
    expect(describeTrial([agree("a"), differ("b")])).toBe(
      "Trial run: 2 past incidents replayed · new version agrees with the live one on 1",
    );
  });

  it("says plainly when no trial has run", () => {
    expect(describeTrial([])).toBe("Trial run: not run yet (it runs when the version enters Shadow)");
  });
});

describe("describePastIncidents", () => {
  it("uses the shared label and counts", () => {
    expect(describePastIncidents({ incidents: 6, incidentsPassed: 5, checks: 79, checksPassed: 78 })).toBe(
      "Past incidents passed 5 of 6 (78 of 79 checks)",
    );
  });
});

describe("TRIAL_VS_SCORE", () => {
  it("explains the difference in one line", () => {
    expect(TRIAL_VS_SCORE).toMatch(/live version/);
    expect(TRIAL_VS_SCORE).toMatch(/expected/);
    expect(TRIAL_VS_SCORE.split("\n")).toHaveLength(1);
  });
});
