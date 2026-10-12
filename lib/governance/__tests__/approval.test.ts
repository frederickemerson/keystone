import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { ActionDecision, Regression } from "@/lib/engine";
import { canApprove, makeShadowRun, rollbackAuthority, shadowPromotionAuthority, shadowSummary } from "../approval";
import { personaFor } from "../access";
import { markApproved, promoteToShadow, proposeVersion, rollback, seedVersion, type Actor, type PillVersion } from "../versions";
import { AOM, CE, HTS, PILL_ID, TECH, pill } from "./fixtures";

/** canApprove for a version with one trial run on record (the no-trial gate is tested in trial.test.ts). */
const canApproveTrialled = (...[v, report, actor, override]: Parameters<typeof canApprove>) =>
  canApprove(v, report, actor, override, { trialRuns: 1 });

const AT = "2026-10-11T08:00:00.000Z";
const CLEAN = { regressions: [] as Regression[] };
const REGRESSED = {
  regressions: [
    { caseId: "eval-2024-08-sprinkler-leak", ruleId: "TS-05", field: "status", expected: "needs_approval", oldActual: "needs_approval", newActual: "allowed" },
  ] satisfies Regression[],
};
const EXEC = personaFor("executive");

function base(): PillVersion {
  return seedVersion(PILL_ID, pill(), { createdBy: CE, approvedBy: HTS }, AT);
}

function draft(author: Actor = CE): PillVersion {
  const b = base();
  return proposeVersion(b, [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], author, "fix", [b], AT);
}

/** A version that ran in Shadow: `author` proposed it, `promoter` put it into Shadow. */
function shadowed(author: Actor = CE, promoter: Actor = AOM): PillVersion {
  const d = draft(author);
  return promoteToShadow([d], d.version, promoter, AT)[0];
}

describe("canApprove — three different people", () => {
  it("allows a third person (the pill approver) on a clean eval report", () => {
    const check = canApproveTrialled(shadowed(CE, AOM), CLEAN, HTS);
    expect(check).toMatchObject({ allowed: true, blockers: [], reasons: [], regressions: 0, overridden: false });
  });

  it("a Draft cannot be approved: it must run in Shadow first", () => {
    const check = canApproveTrialled(draft(), CLEAN, HTS);
    expect(check.allowed).toBe(false);
    expect(check.reasons.map((r) => r.code)).toEqual(["not_shadowed"]);
    expect(check.blockers[0]).toBe("v1.3.0 is still a Draft. It must run in Shadow before anyone can approve it");
  });

  it("the author cannot approve their own version", () => {
    const v = shadowed(HTS, AOM);
    const check = canApproveTrialled(v, CLEAN, HTS);
    expect(check.allowed).toBe(false);
    expect(check.reasons.map((r) => r.code)).toEqual(["author_cannot_approve"]);
    expect(check.blockers[0]).toBe("Separation of duties: Goh Boon Kheng wrote v1.3.0, so someone else must approve it");
    expect(canApproveTrialled(v, REGRESSED, HTS, { reason: "accept" }).allowed).toBe(false);
  });

  it("the person who promoted the version to Shadow cannot approve it", () => {
    const check = canApproveTrialled(shadowed(CE, AOM), CLEAN, AOM);
    expect(check.allowed).toBe(false);
    expect(check.reasons.map((r) => r.code)).toEqual(["shadow_promoter_cannot_approve"]);
    expect(check.blockers[0]).toBe("Separation of duties: Priya Nair put v1.3.0 into Shadow, so someone else must approve it");
  });

  it("a role granted pill promotion may approve when it neither wrote nor shadowed the version", () => {
    expect(canApproveTrialled(shadowed(CE, HTS), CLEAN, AOM).allowed).toBe(true);
  });

  it("property: an approval is only ever allowed for three distinct identities", () => {
    const people = [CE, AOM, HTS, EXEC, TECH];
    const pick = fc.constantFrom(...people);
    fc.assert(
      fc.property(pick, pick, pick, (author, promoter, approver) => {
        const v = { ...draft(author), status: "Shadow" as const, shadowedBy: promoter, shadowedAt: AT };
        const check = canApproveTrialled(v, CLEAN, approver);
        if (check.allowed) {
          expect(new Set([author.name, promoter.name, approver.name]).size).toBe(3);
        }
        if (approver.name === author.name || approver.name === promoter.name) expect(check.allowed).toBe(false);
      }),
    );
  });

  it("rejects roles without approval authority", () => {
    const check = canApproveTrialled(shadowed(), CLEAN, TECH);
    expect(check.allowed).toBe(false);
    expect(check.reasons.map((r) => r.code)).toContain("not_authorised");
  });

  it("eval regressions block approval", () => {
    const check = canApproveTrialled(shadowed(CE, HTS), REGRESSED, AOM);
    expect(check.allowed).toBe(false);
    expect(check.regressions).toBe(1);
    expect(check.reasons.map((r) => r.code)).toEqual(["regressions"]);
  });

  it("only head_technical_services can override regressions, and only with a reason", () => {
    expect(canApproveTrialled(shadowed(CE, HTS), REGRESSED, AOM, { reason: "accept" }).allowed).toBe(false);
    const v = shadowed(CE, AOM);
    expect(canApproveTrialled(v, REGRESSED, HTS).allowed).toBe(false);
    expect(canApproveTrialled(v, REGRESSED, HTS, { reason: "   " }).allowed).toBe(false);
    const ok = canApproveTrialled(v, REGRESSED, HTS, { reason: "Regression is the intended correction" });
    expect(ok).toMatchObject({ allowed: true, overridden: true, regressions: 1 });
  });

  it("requires an eval report and a version in review", () => {
    expect(canApproveTrialled(shadowed(), null, HTS).allowed).toBe(false);
    const approved = { ...shadowed(), status: "Approved" as const };
    expect(canApproveTrialled(approved, CLEAN, HTS).reasons.map((r) => r.code)).toEqual(["not_in_review"]);
  });
});

describe("shadowPromotionAuthority", () => {
  it("the author can never put their own version into Shadow, even with the grant", () => {
    const r = shadowPromotionAuthority(draft(AOM), AOM);
    expect(r).toEqual({ allowed: false, reason: "Separation of duties: Priya Nair wrote v1.3.0, so someone else must put it into Shadow" });
  });

  it("someone with the promotion grant who did not write it may", () => {
    expect(shadowPromotionAuthority(draft(CE), AOM).allowed).toBe(true);
    expect(shadowPromotionAuthority(draft(CE), TECH).allowed).toBe(false);
  });

  it("promoteToShadow records who promoted it", () => {
    expect(shadowed(CE, AOM)).toMatchObject({ status: "Shadow", shadowedBy: AOM, shadowedAt: AT });
  });
});

describe("rollbackAuthority", () => {
  function live(author: Actor, promoter: Actor, approver: Actor) {
    const b = base();
    const d = proposeVersion(b, [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], author, "fix", [b], AT);
    return markApproved(promoteToShadow([b, d], d.version, promoter, AT), d.version, approver, AT);
  }

  it("lets the approver of record roll back a version someone else wrote and shadowed", () => {
    const h = live(EXEC, AOM, HTS);
    expect(rollbackAuthority(h[0], h[1], HTS)).toEqual({ allowed: true });
    expect(rollback(h, PILL_ID, "1.2.0", HTS, "regression", AT).at(-1)).toMatchObject({ version: "1.4.0", rollbackOf: "1.2.0" });
  });

  it("refuses the author or Shadow promoter of the version being retired", () => {
    const h = live(EXEC, HTS, AOM);
    expect(rollbackAuthority(h[0], h[1], HTS)).toEqual({
      allowed: false,
      reason: "Separation of duties: Goh Boon Kheng put v1.3.0 into Shadow, so someone else must retire it",
    });
    const h2 = live(HTS, AOM, EXEC);
    expect(rollbackAuthority(h2[0], h2[1], HTS).reason).toBe(
      "Separation of duties: Goh Boon Kheng wrote v1.3.0, so someone else must retire it",
    );
  });

  it("refuses the author of the version being restored", () => {
    const b = seedVersion(PILL_ID, pill(), { createdBy: EXEC, approvedBy: HTS }, AT);
    const d = proposeVersion(b, [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], CE, "fix", [b], AT);
    const h = markApproved(promoteToShadow([b, d], d.version, AOM, AT), d.version, HTS, AT);
    expect(rollbackAuthority(h[0], h[1], EXEC).reason).toBe(
      "Separation of duties: Tan Siew Leng wrote v1.2.0, so someone else must restore it",
    );
  });

  it("still needs the rollback grant", () => {
    const h = live(EXEC, AOM, HTS);
    expect(rollbackAuthority(h[0], h[1], TECH).allowed).toBe(false);
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
