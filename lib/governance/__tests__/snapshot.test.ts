// Persisted-state tampering: whatever is in localStorage, rehydration never
// crashes and never trusts a snapshot that breaks a governance invariant.

import { describe, expect, it, vi } from "vitest";
import { personaFor } from "../access";
import {
  createGovernanceStore,
  GOVERNANCE_STORE_KEY,
  GOVERNANCE_STORE_VERSION,
  memoryStorage,
  type GovernanceStore,
} from "../store";
import { applyRuleChanges } from "../versions";
import { PILL_ID, pill, rule } from "./fixtures";

const clock = () => "2026-10-11T08:00:00.000Z";

/** A storage holding a realistic snapshot: proposed, approved, decided. */
function populated() {
  const storage = memoryStorage();
  const store = createGovernanceStore(storage, clock);
  const s = () => store.getState();
  s().seedPills([{ id: PILL_ID, pill: pill() }]);
  s().setRole("chief_engineer");
  s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], "fix");
  s().setRole("head_technical_services");
  s().approveVersion(PILL_ID, "1.3.0", { regressions: [] });
  s().decideAction({ incidentId: "INC-2026-1011", ruleId: "TS-07", outcome: "escalated" });
  const raw = JSON.parse(String(storage.getItem(GOVERNANCE_STORE_KEY)));
  return { storage, raw };
}

async function rehydrateFrom(value: string): Promise<GovernanceStore> {
  const storage = memoryStorage();
  storage.setItem(GOVERNANCE_STORE_KEY, value);
  const store = createGovernanceStore(storage, clock);
  await store.persist.rehydrate();
  return store;
}

function expectFresh(store: GovernanceStore) {
  const s = store.getState();
  expect(s.currentActor).toEqual(personaFor("asset_operations_manager"));
  expect(s.versions).toEqual({});
  expect(s.audit).toEqual([]);
  expect(s.decisions).toEqual({});
}

type Tamper = (raw: { version: number; state: Record<string, any> }) => unknown;

const TAMPERS: Record<string, Tamper> = {
  "wrong store version": (r) => ({ ...r, version: GOVERNANCE_STORE_VERSION + 1 }),
  "version as a string (bypasses migrate)": (r) => ({ ...r, version: String(r.version) }),
  "state is null": (r) => ({ ...r, state: null }),
  "state is an array": (r) => ({ ...r, state: [] }),
  "injected Approved version without approver": (r) => {
    const h = r.state.versions[PILL_ID];
    h.push({ ...h[1], version: "1.4.0", status: "Approved", approvedBy: undefined, approvedAt: undefined });
    return r;
  },
  "injected Approved version with a forged approver but no audit trail": (r) => {
    const h = r.state.versions[PILL_ID];
    h[1].status = "Retired";
    h.push({
      ...h[1],
      version: "1.4.0",
      status: "Approved",
      parentVersion: "1.3.0",
      rules: [],
      approvedBy: personaFor("executive"),
    });
    return r;
  },
  "self-approved version": (r) => {
    const v = r.state.versions[PILL_ID][1];
    v.approvedBy = { ...v.createdBy, name: v.createdBy.name.toUpperCase() };
    return r;
  },
  "two Approved versions": (r) => {
    r.state.versions[PILL_ID][0].status = "Approved";
    return r;
  },
  "removed audit entry (middle)": (r) => {
    r.state.audit.splice(1, 1);
    return r;
  },
  "removed approval audit entry and renumbered": (r) => {
    r.state.audit = r.state.audit
      .filter((e: { action: string }) => e.action !== "version_approved")
      .map((e: object, i: number) => ({ ...e, id: `AUD-${String(i + 1).padStart(5, "0")}` }));
    return r;
  },
  "audit entry with an unknown action": (r) => {
    r.state.audit[0].action = "rules_rewritten";
    return r;
  },
  "acting as a role not in roles.json": (r) => {
    r.state.currentActor = { name: "Mallory", role: "superuser" };
    return r;
  },
  "acting role with a forged name": (r) => {
    r.state.currentActor = { name: "Mallory", role: "executive" };
    return r;
  },
  "rule with an unknown field (strict engine schema)": (r) => {
    r.state.versions[PILL_ID][1].rules[0].bypass_gate = true;
    return r;
  },
  "rule relaxed by an asset override": (r) => {
    const target = r.state.versions[PILL_ID][1].rules[0];
    target.action_class = "must_escalate";
    target.asset_overrides = { office: { action_class: "recommend" } };
    return r;
  },
  "baseline edited away from its seed": (r) => {
    r.state.versions[PILL_ID][0].rules[0].deadline_minutes = 999;
    return r;
  },
  "decision with no audit event": (r) => {
    r.state.decisions["INC-9"] = {
      "TS-07": { ...r.state.decisions["INC-2026-1011"]["TS-07"], incidentId: "INC-9" },
    };
    return r;
  },
  "prototype pollution keys": (r) => JSON.parse(JSON.stringify(r).replace('"decisions":{', '"decisions":{"__proto__":{"polluted":true},')),
};

describe("persisted snapshot tampering", () => {
  it("the untampered snapshot round-trips", async () => {
    const { raw } = populated();
    const store = await rehydrateFrom(JSON.stringify(raw));
    expect(store.getState().versions[PILL_ID].map((v) => v.status)).toEqual(["Retired", "Approved"]);
    expect(store.getState().currentActor.role).toBe("head_technical_services");
  });

  for (const [name, tamper] of Object.entries(TAMPERS)) {
    it(`discards: ${name}`, async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { raw } = populated();
      const store = await rehydrateFrom(JSON.stringify(tamper(raw)));
      expectFresh(store);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      warn.mockRestore();
    });
  }

  for (const garbage of ["{not json", "", "null", "42", '"a string"', "[]", "{}", '{"state":{}}', "\u0000\u0000"]) {
    it(`discards corrupted storage ${JSON.stringify(garbage).slice(0, 20)} without crashing`, async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const store = await rehydrateFrom(garbage);
      expectFresh(store);
      // and keeps working
      store.getState().seedPills([{ id: PILL_ID, pill: pill() }]);
      expect(store.getState().versions[PILL_ID]).toHaveLength(1);
      warn.mockRestore();
    });
  }

  it("storage that throws on read/write does not crash the store", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const hostile = {
      getItem: () => {
        throw new DOMException("denied", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
      removeItem: () => {},
    };
    const store = createGovernanceStore(hostile, clock);
    await store.persist.rehydrate();
    expectFresh(store);
    store.getState().setRole("technician");
    expect(store.getState().currentActor.role).toBe("technician");
    warn.mockRestore();
  });

  it("a stored baseline that no longer matches the pill files is discarded on seed (deploy changed the pill)", async () => {
    const { raw } = populated();
    const store = await rehydrateFrom(JSON.stringify(raw));
    const changed = pill([rule("TS-01"), rule("TS-02"), rule("TS-03", { deadline_minutes: 20 })]);
    store.getState().seedPills([{ id: PILL_ID, pill: changed }]);
    const s = store.getState();
    expect(s.versions[PILL_ID]).toHaveLength(1);
    expect(s.versions[PILL_ID][0].rules[2].deadline_minutes).toBe(20);
    expect(s.audit.map((e) => e.action)).toEqual(["snapshot_discarded", "pill_seeded"]);
  });

  it("before hydration the actor is unresolved (no grants), never a privileged default", () => {
    const store = createGovernanceStore(memoryStorage(), clock);
    expect(store.getInitialState().currentActor.role).toBe("unresolved");
  });
});

describe("proposals are re-validated through the engine rule schema", () => {
  const base = pill().rules;
  it("rejects a correction that relaxes a gate via an asset override", () => {
    const gated = [rule("TS-07", { action_class: "must_escalate", forbidden_if_missing_evidence: true })];
    expect(() =>
      applyRuleChanges(gated, [
        { op: "update", ruleId: "TS-07", patch: { asset_overrides: { office: { action_class: "recommend" } } } },
      ]),
    ).toThrow(/relaxes/);
  });
  it("rejects unknown fields, renamed ids and duplicates", () => {
    expect(() =>
      applyRuleChanges(base, [{ op: "update", ruleId: "TS-01", patch: { bypass: true } as never }]),
    ).toThrow(/Invalid proposed rules/);
    expect(() => applyRuleChanges(base, [{ op: "update", ruleId: "TS-01", patch: { id: "TS-02" } as never }])).toThrow(
      /rule id/,
    );
    expect(() => applyRuleChanges(base, [{ op: "add", rule: rule("TS-01") }])).toThrow(/already exists/);
  });
});
