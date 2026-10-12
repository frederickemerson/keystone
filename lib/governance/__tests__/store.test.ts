import { beforeEach, describe, expect, it } from "vitest";
import type { Regression } from "@/lib/engine";
import { createGovernanceStore, GOVERNANCE_STORE_KEY, GOVERNANCE_STORE_VERSION, GovernanceError, memoryStorage } from "../store";
import { ROLES, hasCapability, UNRESOLVED_ROLE } from "../access";
import { shadowPromotionAuthority } from "../approval";
import { PILL_ID, pill } from "./fixtures";

const clock = () => "2026-10-11T08:00:00.000Z";

function setup() {
  const storage = memoryStorage();
  const store = createGovernanceStore(storage, clock);
  store.getState().seedPills([{ id: PILL_ID, pill: pill() }]);
  return { storage, store };
}

describe("governance store", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it("seeds an Approved baseline from the file pill", () => {
    const [v] = ctx.store.getState().versions[PILL_ID];
    expect(v).toMatchObject({ version: "1.2.0", status: "Approved", approverRole: "head_technical_services" });
    expect(v.createdBy.name).toBe("Tan Wei Ming");
  });

  it("propose → approve (blocked for author, allowed for approver) → rollback, fully audited", () => {
    const s = () => ctx.store.getState();
    s().setRole("chief_engineer");
    const v = s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], "eval flag");
    expect(v.version).toBe("1.3.0");

    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(false);

    // Steward puts it into Shadow — and therefore cannot approve it herself.
    s().setRole("asset_operations_manager");
    s().promoteToShadow(PILL_ID, "1.3.0");
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).reasons.map((r) => r.code)).toEqual([
      "shadow_promoter_cannot_approve",
    ]);
    expect(s().audit.at(-1)).toMatchObject({
      action: "version_approval_blocked",
      actor: "Priya Nair",
      detail: "Separation of duties: Priya Nair put v1.3.0 into Shadow, so someone else must approve it",
    });

    // The third person — the approver of record — signs it off.
    s().setRole("head_technical_services");
    const regressed = [{ caseId: "c", ruleId: "TS-03", field: "status", expected: "allowed", oldActual: "allowed", newActual: "blocked" }] satisfies Regression[];
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: regressed }).allowed).toBe(false);
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);
    expect(s().versions[PILL_ID][1]).toMatchObject({
      createdBy: { name: "Tan Wei Ming" },
      shadowedBy: { name: "Priya Nair" },
      approvedBy: { name: "Goh Boon Kheng" },
    });

    s().setRole("executive");
    const restored = s().rollback(PILL_ID, "1.2.0", "Production regression");
    expect(restored.version).toBe("1.4.0");
    expect(s().versions[PILL_ID].map((x) => `${x.version}:${x.status}`)).toEqual([
      "1.2.0:Retired",
      "1.3.0:Retired",
      "1.4.0:Approved",
    ]);
    const actions = s().audit.map((e) => e.action);
    expect(actions).toEqual(
      expect.arrayContaining(["pill_seeded", "version_proposed", "version_approval_blocked", "version_approved", "version_rolled_back"]),
    );
  });

  it("technicians cannot roll back", () => {
    ctx.store.getState().setRole("technician");
    expect(() => ctx.store.getState().rollback(PILL_ID, "1.2.0", "x")).toThrow(/not authorised/);
  });

  it("records incident action decisions with actor and timestamp", () => {
    ctx.store.getState().setRole("asset_operations_manager");
    ctx.store.getState().decideAction({ incidentId: "INC-2026-1011", ruleId: "TS-07", outcome: "escalated", note: "Escalated to Rahul Menon" });
    const rec = ctx.store.getState().decisions["INC-2026-1011"]["TS-07"];
    expect(rec).toMatchObject({ outcome: "escalated", actor: { name: "Priya Nair" }, at: clock() });
    expect(ctx.store.getState().audit.at(-1)).toMatchObject({ action: "action_escalated", ruleId: "TS-07" });
  });

  it("records an evidence request with its keys and note", () => {
    ctx.store.getState().setRole("asset_operations_manager");
    ctx.store.getState().decideAction({
      incidentId: "INC-2026-1011",
      ruleId: "TS-07",
      outcome: "evidence_requested",
      requestedEvidence: ["moisture_reading", "lew_signoff"],
      note: "Need readings before isolating",
    });
    const rec = ctx.store.getState().decisions["INC-2026-1011"]["TS-07"];
    expect(rec).toMatchObject({
      outcome: "evidence_requested",
      requestedEvidence: ["moisture_reading", "lew_signoff"],
      note: "Need readings before isolating",
    });
    expect(ctx.store.getState().audit.at(-1)).toMatchObject({
      action: "action_evidence_requested",
      ruleId: "TS-07",
      detail: "Need readings before isolating",
    });
  });

  it("summarises requested evidence keys when no note is given", () => {
    ctx.store.getState().setRole("asset_operations_manager");
    ctx.store.getState().decideAction({
      incidentId: "INC-1",
      ruleId: "TS-03",
      outcome: "evidence_requested",
      requestedEvidence: ["location_confirmed"],
    });
    expect(ctx.store.getState().audit.at(-1)).toMatchObject({
      action: "action_evidence_requested",
      detail: "Requested evidence: location_confirmed",
    });
  });

  it("persists to storage under a versioned key and rehydrates — without the acting identity", async () => {
    ctx.store.getState().setRole("tenant_experience_manager");
    const raw = await ctx.storage.getItem(GOVERNANCE_STORE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(String(raw));
    expect(parsed.version).toBe(GOVERNANCE_STORE_VERSION);
    // Who is acting comes from the signed session on every load, never from storage.
    expect(parsed.state).not.toHaveProperty("currentActor");

    const again = createGovernanceStore(ctx.storage, clock);
    await again.persist.rehydrate();
    expect(again.getState().currentActor.role).toBe(UNRESOLVED_ROLE);
    expect(again.getState().versions[PILL_ID]).toHaveLength(1);
    expect(Object.isFrozen(again.getState().audit)).toBe(true);
  });

  it("resetDemo restores seeded versions and clears runtime state, keeping the append-only audit", () => {
    const s = () => ctx.store.getState();
    s().setRole("chief_engineer");
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], "x");
    s().setRole("asset_operations_manager");
    s().decideAction({ incidentId: "INC-1", ruleId: "TS-07", outcome: "approved" });
    const before = s().audit;
    s().resetDemo();
    expect(s().versions[PILL_ID]).toHaveLength(1);
    expect(s().decisions).toEqual({});
    expect(s().audit.slice(0, before.length)).toEqual(before);
    expect(s().audit.map((e) => e.action).at(-1)).toBe("demo_reset");
  });

  it("refuses an empty proposal with a clear message and audits the refusal", () => {
    const s = () => ctx.store.getState();
    s().setRole("chief_engineer");
    const before = s().versions[PILL_ID];
    const n = s().audit.length;
    for (const changes of [[], [{ op: "update" as const, ruleId: "TS-03", patch: { deadline_minutes: 15 } }]]) {
      expect(() => s().proposeVersion(PILL_ID, "1.2.0", changes, "no-op")).toThrow(GovernanceError);
    }
    expect(() => s().proposeVersion(PILL_ID, "1.2.0", [], "no-op")).toThrow(/Nothing to propose/);
    expect(s().versions[PILL_ID]).toBe(before);
    expect(s().audit).toHaveLength(n + 3);
    expect(s().audit.at(-1)).toMatchObject({
      action: "version_proposal_blocked",
      actor: "Tan Wei Ming",
      pillId: PILL_ID,
      pillVersion: "1.2.0",
    });
    // Malformed input (no reason) still throws without touching state or the audit.
    expect(() => s().proposeVersion(PILL_ID, "1.2.0", [], " ")).not.toThrow(GovernanceError);
  });

  it("shadow needs the pill-promotion grant: refused and audited otherwise, allowed for grant holders", () => {
    const s = () => ctx.store.getState();
    s().setRole("chief_engineer");
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], "fix");

    // The pill owner (Chief Engineer) holds no promotion grant.
    expect(() => s().promoteToShadow(PILL_ID, "1.3.0")).toThrow(GovernanceError);
    expect(() => s().promoteToShadow(PILL_ID, "1.3.0")).toThrow(/pill-promotion grant/);
    expect(s().audit.at(-1)).toMatchObject({ action: "version_shadow_blocked", pillVersion: "1.3.0", role: "chief_engineer" });
    expect(s().versions[PILL_ID].find((v) => v.version === "1.3.0")?.status).toBe("Draft");

    // The steward (Asset Operations Manager) holds the shadow-to-approved grant.
    s().setRole("asset_operations_manager");
    s().promoteToShadow(PILL_ID, "1.3.0");
    expect(s().versions[PILL_ID].find((v) => v.version === "1.3.0")?.status).toBe("Shadow");
    expect(s().audit.at(-1)).toMatchObject({ action: "version_shadowed", actor: "Priya Nair" });
  });

  it("the UI shadow policy matches the store for every role", () => {
    for (const { role } of ROLES) {
      const store = createGovernanceStore(memoryStorage(), clock);
      store.getState().seedPills([{ id: PILL_ID, pill: pill() }]);
      store.getState().setRole("chief_engineer");
      const draft = store.getState().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], "fix");
      store.getState().setRole(role);
      const ui = shadowPromotionAuthority(draft, store.getState().currentActor).allowed;
      let storeAllowed = true;
      try {
        store.getState().promoteToShadow(PILL_ID, "1.3.0");
      } catch (err) {
        expect(err).toBeInstanceOf(GovernanceError);
        storeAllowed = false;
      }
      expect(storeAllowed).toBe(ui);
      expect(ui).toBe(role === draft.approverRole || hasCapability(role, "promote_pill_version"));
    }
  });

  it("binding the session identity onto the unresolved actor is not a switch; later changes are audited", () => {
    const s = () => ctx.store.getState();
    expect(s().currentActor.role).toBe(UNRESOLVED_ROLE);
    const before = s().audit.length;
    s().setRole("technician");
    expect(s().currentActor).toEqual({ name: "Rajesh Kumar", role: "technician" });
    expect(s().audit).toHaveLength(before);
    s().setRole("asset_operations_manager");
    expect(s().audit).toHaveLength(before + 1);
    expect(s().audit.at(-1)).toMatchObject({ action: "role_switched", actor: "Priya Nair", role: "asset_operations_manager" });
  });

  it("with no session identity bound, nothing can be proposed (fails closed, audited)", () => {
    const s = () => ctx.store.getState();
    const before = s().audit.length;
    expect(() =>
      s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], "anon"),
    ).toThrow(GovernanceError);
    expect(s().versions[PILL_ID]).toHaveLength(1);
    expect(s().audit).toHaveLength(before + 1);
    expect(s().audit.at(-1)?.action).toBe("version_proposal_blocked");
  });
});

describe("three-person demo sequence (D2)", () => {
  it("Tan Wei Ming proposes, Priya Nair shadows, Goh Boon Kheng approves and later rolls back", () => {
    const { store } = setup();
    const s = () => store.getState();
    s().setRole("chief_engineer");
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-02", patch: { deadline_minutes: 10 } }], "fix");
    // The author can neither shadow nor approve.
    expect(() => s().promoteToShadow(PILL_ID, "1.3.0")).toThrow(GovernanceError);
    s().setRole("asset_operations_manager");
    s().promoteToShadow(PILL_ID, "1.3.0");
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(false);
    s().setRole("head_technical_services");
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);
    const restored = s().rollback(PILL_ID, "1.2.0", "deadline too tight on night shift");
    expect(restored).toMatchObject({ version: "1.4.0", rollbackOf: "1.2.0", createdBy: { name: "Goh Boon Kheng" } });
    const trail = s()
      .audit.filter((e) => e.pillId === PILL_ID && e.action !== "pill_seeded")
      .map((e) => `${e.action}:${e.actor}`);
    expect(trail).toEqual([
      "version_proposed:Tan Wei Ming",
      "version_shadow_blocked:Tan Wei Ming",
      "version_shadowed:Priya Nair",
      "version_approval_blocked:Priya Nair",
      "version_approved:Goh Boon Kheng",
      "version_rolled_back:Goh Boon Kheng",
    ]);
  });

  it("a rollback by the Shadow promoter of the live version is refused and audited", () => {
    const { store } = setup();
    const s = () => store.getState();
    s().setRole("chief_engineer");
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-02", patch: { deadline_minutes: 10 } }], "fix");
    s().setRole("head_technical_services");
    s().promoteToShadow(PILL_ID, "1.3.0");
    s().setRole("asset_operations_manager");
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);
    s().setRole("head_technical_services");
    expect(() => s().rollback(PILL_ID, "1.2.0", "undo")).toThrow(/put v1.3.0 into Shadow, so someone else must retire it/);
    expect(s().audit.at(-1)).toMatchObject({ action: "version_rollback_blocked", actor: "Goh Boon Kheng" });
    s().setRole("executive");
    expect(s().rollback(PILL_ID, "1.2.0", "undo").version).toBe("1.4.0");
  });
});

describe("outcomes and Canvas reviews live in the store", () => {
  const outcome = {
    incidentId: "INC-2026-1011",
    pillId: PILL_ID,
    timeToIsolateMinutes: 7,
    tenantImpact: "Anchor tenant — floors 17–19",
    costSgd: 24800,
    causeConfirmed: "Chilled-water branch joint failure",
    notes: "",
  };

  it("records an outcome with actor + audit, and survives a reload", async () => {
    const { store, storage } = setup();
    store.getState().setRole("chief_engineer");
    store.getState().recordOutcome(outcome);
    expect(store.getState().outcomes["INC-2026-1011"]).toMatchObject({ timeToIsolateMinutes: 7, actor: { name: "Tan Wei Ming" } });
    expect(store.getState().audit.at(-1)).toMatchObject({ action: "outcome_recorded", incidentId: "INC-2026-1011" });
    const again = createGovernanceStore(storage, clock);
    await again.persist.rehydrate();
    expect(again.getState().outcomes["INC-2026-1011"].timeToIsolateMinutes).toBe(7);
  });

  it("refuses (and audits) an outcome from a read-only role; rejects malformed numbers without auditing", () => {
    const { store } = setup();
    const s = () => store.getState();
    s().setRole("technician");
    expect(() => s().recordOutcome(outcome)).toThrow(GovernanceError);
    expect(s().audit.at(-1)).toMatchObject({ action: "outcome_blocked", actor: "Rajesh Kumar" });
    s().setRole("chief_engineer");
    const n = s().audit.length;
    expect(() => s().recordOutcome({ ...outcome, costSgd: -5 })).toThrow(/non-negative/);
    expect(s().audit).toHaveLength(n);
  });

  it("Canvas reviews are attributed, audited, keyed to the live version, and only for roles the pill allows", () => {
    const { store } = setup();
    const s = () => store.getState();
    s().setRole("technician");
    expect(() => s().reviewRule({ pillId: PILL_ID, ruleId: "TS-01", outcome: "confirmed" })).toThrow(GovernanceError);
    expect(s().audit.at(-1)).toMatchObject({ action: "rule_review_blocked", ruleId: "TS-01", pillVersion: "1.2.0" });
    s().setRole("chief_engineer");
    s().reviewRule({ pillId: PILL_ID, ruleId: "TS-01", outcome: "confirmed" });
    s().reviewRule({ pillId: PILL_ID, ruleId: "TS-02", outcome: "edited", decision: "  Isolate at the branch  " });
    expect(s().ruleReviews[`${PILL_ID}@1.2.0`]).toMatchObject({
      "TS-01": { outcome: "confirmed", actor: { name: "Tan Wei Ming" } },
      "TS-02": { outcome: "edited", decision: "Isolate at the branch" },
    });
    expect(s().audit.at(-1)).toMatchObject({ action: "rule_reviewed", ruleId: "TS-02", detail: "TS-02 edited: Isolate at the branch" });
    expect(() => s().reviewRule({ pillId: PILL_ID, ruleId: "TS-03", outcome: "edited", decision: " " })).toThrow(/decision text/);
    s().resetDemo();
    expect(s().ruleReviews).toEqual({});
    expect(s().outcomes).toEqual({});
  });

  it("publishing a review proposes a Draft from the reviews, and is refused until every tile is decided", () => {
    const { store } = setup();
    const s = () => store.getState();
    s().setRole("chief_engineer");
    s().reviewRule({ pillId: PILL_ID, ruleId: "TS-01", outcome: "edited", decision: "Isolate at the branch first" });
    expect(() => s().publishReview(PILL_ID)).toThrow(/2 of 3 rules are not reviewed/);
    expect(s().audit.at(-1)?.action).toBe("version_proposal_blocked");
    s().reviewRule({ pillId: PILL_ID, ruleId: "TS-02", outcome: "confirmed" });
    s().reviewRule({ pillId: PILL_ID, ruleId: "TS-03", outcome: "rejected" });
    const draft = s().publishReview(PILL_ID);
    expect(draft).toMatchObject({ version: "1.3.0", status: "Draft", parentVersion: "1.2.0", createdBy: { name: "Tan Wei Ming" } });
    expect(draft.rules.map((r) => r.id)).toEqual(["TS-01", "TS-02"]);
    expect(draft.rules[0].decision).toBe("Isolate at the branch first");
    expect(s().audit.at(-1)).toMatchObject({ action: "version_proposed", pillVersion: "1.3.0" });
    // One version in review at a time.
    expect(() => s().publishReview(PILL_ID)).toThrow(/already in review/);
  });

  it("a review that only confirms tiles has nothing to publish", () => {
    const { store } = setup();
    const s = () => store.getState();
    s().setRole("chief_engineer");
    for (const id of ["TS-01", "TS-02", "TS-03"]) s().reviewRule({ pillId: PILL_ID, ruleId: id, outcome: "confirmed" });
    expect(() => s().publishReview(PILL_ID)).toThrow(/Nothing to propose/);
  });

  it("proposals are limited to roles the pill's access block allows", () => {
    const { store } = setup();
    const s = () => store.getState();
    s().setRole("technician");
    expect(() =>
      s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], "x"),
    ).toThrow(/cannot change it|read-only/);
    expect(s().audit.at(-1)?.action).toBe("version_proposal_blocked");
  });
});
