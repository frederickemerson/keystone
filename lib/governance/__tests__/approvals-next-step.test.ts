// Approvals: after each action the screen names the next step and hands off to
// a person the REAL authority check allows (never the current person, never
// someone the store would refuse); changed rules are found by content.

import { describe, expect, it } from "vitest";
import type { Regression } from "@/lib/engine";
import { approvalCheck, nextApprovalStep } from "@/components/approvals/nextStep";
import { changedRules } from "@/components/approvals/changedRules";
import { suggestHandoff } from "@/lib/journey";
import { personaFor } from "../access";
import { promoteToShadow, proposeVersion, seedVersion, type Actor, type PillVersion } from "../versions";
import { AOM, CE, HTS, PILL_ID, pill, rule } from "./fixtures";

const AT = "2026-10-11T08:00:00.000Z";
const CLEAN = { regressions: [] as Regression[] };
const POLICY = {
  owner: "chief_engineer",
  steward: "asset_operations_manager",
  approver: "head_technical_services",
  access: {
    roles_allowed: ["chief_engineer", "asset_operations_manager", "head_technical_services", "technical_services_lead"],
    roles_read_only: ["technician", "senior_technician"],
    roles_peer_confirm: ["technician", "senior_technician"],
  },
};
const TECH = personaFor("technician");

function base(): PillVersion {
  return seedVersion(PILL_ID, pill(), { createdBy: CE, approvedBy: HTS }, AT);
}
function draft(author: Actor = CE): PillVersion {
  const b = base();
  return proposeVersion(b, [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], author, "fix", [b], AT);
}
function fromNote(): PillVersion {
  return {
    ...draft(CE),
    capture: {
      noteId: "VN-1",
      draftRuleId: "DRAFT-01",
      ruleId: "TS-03",
      quoteSpan: { start: 0, end: 5, text: "check" },
      author: TECH,
    },
  };
}
const ctx = { liveApprovedVersion: "1.2.0" };

describe("nextApprovalStep", () => {
  it("a Draft from a frontline note needs a peer first; the hand-off is neither the speaker nor the proposer", () => {
    const step = nextApprovalStep({ version: fromNote(), evalReport: CLEAN, context: ctx, peer: { policy: POLICY, gateMet: false } })!;
    expect(step.kind).toBe("peer_confirm");
    const to = suggestHandoff(step.isAllowed, CE)!;
    expect(to).toBeDefined();
    expect([TECH.name, CE.name]).not.toContain(to.name);
  });

  it("once the peer gate is met (or for an ordinary Draft) the next step is the trial run, handed to a promoter who is not the author", () => {
    for (const step of [
      nextApprovalStep({ version: fromNote(), evalReport: CLEAN, context: ctx, peer: { policy: POLICY, gateMet: true } })!,
      nextApprovalStep({ version: draft(CE), evalReport: CLEAN, context: ctx })!,
    ]) {
      expect(step.kind).toBe("trial_run");
      expect(step.isAllowed(CE)).toBe(false);
      const to = suggestHandoff(step.isAllowed, CE)!;
      expect(to.name).not.toBe(CE.name);
      expect(step.isAllowed(to)).toBe(true);
    }
  });

  it("a Shadow version's next step is approval by a third person, using the same check as the Approve button", () => {
    const d = draft(CE);
    const shadowed = promoteToShadow([d], d.version, AOM, AT)[0];
    const step = nextApprovalStep({ version: shadowed, evalReport: CLEAN, context: ctx })!;
    expect(step.kind).toBe("approve");
    expect(step.isAllowed(AOM)).toBe(false);
    const to = suggestHandoff(step.isAllowed, AOM)!;
    expect([CE.name, AOM.name]).not.toContain(to.name);
    expect(approvalCheck({ version: shadowed, evalReport: CLEAN, context: ctx }, to).allowed).toBe(true);
  });

  it("nothing is next for a version that is not in review", () => {
    expect(nextApprovalStep({ version: base(), evalReport: CLEAN, context: ctx })).toBeNull();
  });

  it("a stale Shadow version can be approved by nobody, so no hand-off is offered", () => {
    const d = draft(CE);
    const shadowed = promoteToShadow([d], d.version, AOM, AT)[0];
    const step = nextApprovalStep({ version: shadowed, evalReport: CLEAN, context: { liveApprovedVersion: "1.9.0" } })!;
    expect(suggestHandoff(step.isAllowed, AOM)).toBeUndefined();
  });
});

describe("changedRules", () => {
  it("finds added, changed and removed rules by id and content", () => {
    const before = [rule("TS-01"), rule("TS-02"), rule("TS-03")];
    const after = [rule("TS-01"), rule("TS-02", { deadline_minutes: 10 }), rule("TS-14", { title: "New" })];
    expect(changedRules(before, after)).toEqual([
      { id: "TS-02", kind: "changed", title: "TS-02 title", decision: "TS-02 decision" },
      { id: "TS-14", kind: "added", title: "New", decision: "TS-14 decision" },
      { id: "TS-03", kind: "removed", title: "TS-03 title", decision: "TS-03 decision" },
    ]);
    expect(changedRules(before, before)).toEqual([]);
  });
});
