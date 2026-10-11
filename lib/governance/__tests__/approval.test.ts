import { describe, expect, it } from "vitest";
import type { ActionDecision, Regression } from "@/lib/engine";
import { canApprove, makeShadowRun, shadowSummary } from "../approval";
import { proposeVersion, seedVersion, type PillVersion } from "../versions";
import { AOM, CE, HTS, PILL_ID, TECH, pill } from "./fixtures";

const AT = "2026-10-11T08:00:00.000Z";
const CLEAN = { regressions: [] as Regression[] };
const REGRESSED = {
  regressions: [
    { caseId: "eval-2024-08-sprinkler-leak", ruleId: "TS-05", field: "status", expected: "needs_approval", oldActual: "needs_approval", newActual: "allowed" },
  ] satisfies Regression[],
};

function draft(author = CE): PillVersion {
  const base = seedVersion(PILL_ID, pill(), { createdBy: CE, approvedBy: HTS }, AT);
  return proposeVersion(base, [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], author, "fix", [base], AT);
}

describe("canApprove", () => {
  it("allows the pill approver on a clean eval report", () => {
    const check = canApprove(draft(), CLEAN, HTS);
    expect(check).toMatchObject({ allowed: true, blockers: [], regressions: 0, overridden: false });
  });

  it("allows a role granted pill promotion in roles.json (AOM steward sign-off)", () => {
    expect(canApprove(draft(), CLEAN, AOM).allowed).toBe(true);
  });

  it("separation of duties: the author cannot approve their own version", () => {
    const v = draft(HTS);
    const check = canApprove(v, CLEAN, HTS);
    expect(check.allowed).toBe(false);
    expect(check.blockers.join()).toMatch(/Separation of duties/);
    // even with an override
    expect(canApprove(v, REGRESSED, HTS, { reason: "accept" }).allowed).toBe(false);
  });

  it("rejects roles without approval authority", () => {
    const check = canApprove(draft(), CLEAN, TECH);
    expect(check.allowed).toBe(false);
    expect(check.blockers.join()).toMatch(/not authorised/);
  });

  it("eval regressions block approval", () => {
    const check = canApprove(draft(), REGRESSED, AOM);
    expect(check.allowed).toBe(false);
    expect(check.regressions).toBe(1);
    expect(check.blockers.join()).toMatch(/eval regression/);
  });

  it("only head_technical_services can override regressions, and only with a reason", () => {
    expect(canApprove(draft(), REGRESSED, AOM, { reason: "accept" }).allowed).toBe(false);
    expect(canApprove(draft(), REGRESSED, HTS).allowed).toBe(false);
    expect(canApprove(draft(), REGRESSED, HTS, { reason: "   " }).allowed).toBe(false);
    const ok = canApprove(draft(), REGRESSED, HTS, { reason: "Regression is the intended correction" });
    expect(ok).toMatchObject({ allowed: true, overridden: true, regressions: 1 });
  });

  it("requires an eval report and an approvable status", () => {
    expect(canApprove(draft(), null, HTS).allowed).toBe(false);
    const approved = { ...draft(), status: "Approved" as const };
    expect(canApprove(approved, CLEAN, HTS).allowed).toBe(false);
  });
});

describe("shadow runs", () => {
  const act = (ruleId: string, status: ActionDecision["status"]) => ({ ruleId, status }) as ActionDecision;

  it("records agreement per incident and summarises as a badge", () => {
    const a = makeShadowRun("INC-1", [act("TS-07", "blocked")], [act("TS-07", "blocked")], AT);
    const b = makeShadowRun("INC-2", [act("TS-03", "allowed")], [act("TS-03", "needs_approval")], AT);
    expect(a.agree).toBe(true);
    expect(b.agree).toBe(false);
    expect(b.approvedDecision).toEqual({ "TS-03": "allowed" });
    expect(b.shadowDecision).toEqual({ "TS-03": "needs_approval" });
    expect(shadowSummary([a, a, a, b]).label).toBe("3/4 agreements");
  });
});
