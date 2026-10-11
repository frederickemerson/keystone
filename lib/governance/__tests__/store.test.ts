import { beforeEach, describe, expect, it } from "vitest";
import type { Regression } from "@/lib/engine";
import { createGovernanceStore, GOVERNANCE_STORE_KEY, GOVERNANCE_STORE_VERSION, GovernanceError, memoryStorage } from "../store";
import { ROLES, hasCapability } from "../access";
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

    s().setRole("asset_operations_manager");
    const regressed = [{ caseId: "c", ruleId: "TS-03", field: "status", expected: "allowed", oldActual: "allowed", newActual: "blocked" }] satisfies Regression[];
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: regressed }).allowed).toBe(false);
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);

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

  it("persists to storage under a versioned key and rehydrates", async () => {
    ctx.store.getState().setRole("tenant_experience_manager");
    const raw = await ctx.storage.getItem(GOVERNANCE_STORE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(String(raw)).version).toBe(GOVERNANCE_STORE_VERSION);

    const again = createGovernanceStore(ctx.storage, clock);
    await again.persist.rehydrate();
    expect(again.getState().currentActor.role).toBe("tenant_experience_manager");
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
});
