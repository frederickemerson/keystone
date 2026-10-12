// Adversarial property tests for governance: random action sequences against
// the real store, name-variant attacks on separation of duties, and the
// invariants every published state must satisfy.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Regression } from "@/lib/engine";
import {
  decisionAuthority,
  identityKey,
  ROLES,
  sameIdentity,
  UNRESOLVED_ROLE,
  type DecisionOutcome,
  type DecisionSubject,
} from "../access";
import { canApprove } from "../approval";
import { parseGovernanceSnapshot } from "../snapshot";
import {
  createGovernanceStore,
  GovernanceError,
  memoryStorage,
  type GovernanceData,
  type GovernanceStore,
} from "../store";
import { compareSemver, proposeVersion, seedVersion, type PillVersion } from "../versions";
import { CE, HTS, PILL_ID, pill } from "./fixtures";

const ROLE_IDS = ROLES.map((r) => r.role);
const clock = () => "2026-10-11T08:00:00.000Z";
const REGRESSION: Regression = {
  caseId: "c1",
  ruleId: "TS-03",
  field: "status",
  expected: "allowed",
  oldActual: "allowed",
  newActual: "blocked",
};

function freshStore(): GovernanceStore {
  const store = createGovernanceStore(memoryStorage(), clock);
  store.getState().seedPills([{ id: PILL_ID, pill: pill() }]);
  return store;
}

function dataOf(store: GovernanceStore): GovernanceData {
  const s = store.getState();
  return {
    currentActor: s.currentActor,
    versions: s.versions,
    seedVersions: s.seedVersions,
    audit: s.audit,
    decisions: s.decisions,
    shadowRuns: s.shadowRuns,
    evidenceConfirmations: s.evidenceConfirmations,
    outcomes: s.outcomes,
    ruleReviews: s.ruleReviews,
  };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const versionArb = fc.oneof(
  { weight: 4, arbitrary: fc.constantFrom("1.2.0", "1.3.0", "1.4.0", "1.5.0") },
  { weight: 1, arbitrary: fc.constantFrom("1.6.0", "9.9.9", "../1.2.0", "") },
);
const reasonArb = fc.constantFrom("", "   ", "​", "production regression", "ok");
const outcomeArb = fc.constantFrom<DecisionOutcome>("approved", "rejected", "escalated", "evidence_requested");
const subjectArb = fc.option(
  fc.record({
    kind: fc.constant("tenant_message" as const),
    approverRole: fc.constantFrom(...ROLE_IDS, "nobody"),
  }),
  { nil: undefined },
);

type Command =
  | { op: "setRole"; role: string }
  | { op: "propose"; base: string; deadline: number; reason: string }
  | { op: "promote"; version: string }
  | { op: "approve"; version: string; regressed: boolean; override: string | null }
  | { op: "rollback"; version: string; reason: string }
  | { op: "decide"; outcome: DecisionOutcome; subject: DecisionSubject | undefined }
  | { op: "reset" };

// Weighted towards the roles that hold grants so approvals/rollbacks actually
// succeed often enough to be checked; every role (and non-roles) still appear.
const roleArb = fc.oneof(
  { weight: 3, arbitrary: fc.constantFrom("head_technical_services", "executive", "asset_operations_manager", "chief_engineer") },
  { weight: 1, arbitrary: fc.constantFrom(...ROLE_IDS, "intruder", UNRESOLVED_ROLE) },
);

const commandArb: fc.Arbitrary<Command> = fc.oneof(
  { weight: 4, arbitrary: fc.record({ op: fc.constant("setRole" as const), role: roleArb }) },
  {
    weight: 3,
    arbitrary: fc.record({
      op: fc.constant("propose" as const),
      base: versionArb,
      deadline: fc.integer({ min: 1, max: 60 }),
      reason: reasonArb,
    }),
  },
  { weight: 2, arbitrary: fc.record({ op: fc.constant("promote" as const), version: versionArb }) },
  {
    weight: 4,
    arbitrary: fc.record({
      op: fc.constant("approve" as const),
      version: versionArb,
      regressed: fc.boolean(),
      override: fc.option(reasonArb, { nil: null }),
    }),
  },
  { weight: 2, arbitrary: fc.record({ op: fc.constant("rollback" as const), version: versionArb, reason: reasonArb }) },
  { weight: 2, arbitrary: fc.record({ op: fc.constant("decide" as const), outcome: outcomeArb, subject: subjectArb }) },
  { weight: 1, arbitrary: fc.constant({ op: "reset" as const }) },
);

/** A realistic start (proposal approved by a second human) so later commands meet a non-trivial history. */
const APPROVED_PREFIX: Command[] = [
  { op: "setRole", role: "chief_engineer" },
  { op: "propose", base: "1.2.0", deadline: 10, reason: "fix" },
  { op: "setRole", role: "asset_operations_manager" },
  { op: "promote", version: "1.3.0" },
  { op: "setRole", role: "head_technical_services" },
  { op: "approve", version: "1.3.0", regressed: false, override: null },
];
const sequenceArb = fc
  .tuple(fc.boolean(), fc.array(commandArb, { minLength: 1, maxLength: 40 }))
  .map(([prefixed, rest]) => (prefixed ? [...APPROVED_PREFIX, ...rest] : rest));

/**
 * A sequence that drives every privileged action to both outcomes. Run as an
 * explicit example before the random sequences, so the "really exercises both
 * outcomes" check below holds on every run instead of depending on the random
 * generator hitting rare preconditions (e.g. an empty proposal needs exactly the
 * base deadline, 15 of 1..60, with a non-blank reason).
 */
const BOTH_OUTCOMES: Command[] = [
  { op: "setRole", role: "chief_engineer" },
  { op: "propose", base: "1.2.0", deadline: 15, reason: "ok" }, // refused: rules unchanged
  { op: "propose", base: "1.2.0", deadline: 10, reason: "fix" }, // ok → 1.3.0 Draft
  { op: "setRole", role: "technician" },
  { op: "promote", version: "1.3.0" }, // refused: no promotion grant
  { op: "approve", version: "1.3.0", regressed: false, override: null }, // refused
  { op: "rollback", version: "1.2.0", reason: "x" }, // refused: no rollback grant
  { op: "decide", outcome: "approved", subject: undefined }, // refused: no approval grant
  { op: "setRole", role: "head_technical_services" },
  { op: "promote", version: "1.3.0" }, // ok → Shadow
  { op: "setRole", role: "executive" },
  { op: "approve", version: "1.3.0", regressed: false, override: null }, // ok
  { op: "rollback", version: "1.2.0", reason: "production regression" }, // ok
  { op: "setRole", role: "asset_operations_manager" },
  { op: "decide", outcome: "escalated", subject: undefined }, // ok
  { op: "reset" }, // ok
];

/** Run one command; returns whether it threw a policy refusal, a malformed-input error, or succeeded. */
function run(store: GovernanceStore, c: Command): "ok" | "refused" | "invalid" {
  const s = store.getState();
  try {
    switch (c.op) {
      case "setRole":
        s.setRole(c.role);
        break;
      case "propose":
        s.proposeVersion(PILL_ID, c.base, [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: c.deadline } }], c.reason);
        break;
      case "promote":
        s.promoteToShadow(PILL_ID, c.version);
        break;
      case "approve": {
        const check = s.approveVersion(
          PILL_ID,
          c.version,
          { regressions: c.regressed ? [REGRESSION] : [] },
          c.override === null ? undefined : { reason: c.override },
        );
        return check.allowed ? "ok" : "refused";
      }
      case "rollback":
        s.rollback(PILL_ID, c.version, c.reason);
        break;
      case "decide":
        s.decideAction({ incidentId: "INC-2026-1011", ruleId: "TS-07", outcome: c.outcome, subject: c.subject });
        break;
      case "reset":
        s.resetDemo();
        break;
    }
    return "ok";
  } catch (err) {
    return err instanceof GovernanceError ? "refused" : "invalid";
  }
}

function assertInvariants(store: GovernanceStore): void {
  const data = dataOf(store);
  const history = data.versions[PILL_ID];
  // One Approved version at most; numbers strictly increasing in append order.
  expect(history.filter((v) => v.status === "Approved").length).toBeLessThanOrEqual(1);
  for (let i = 1; i < history.length; i++) {
    expect(compareSemver(history[i - 1].version, history[i].version)).toBeLessThan(0);
  }
  // Nobody approved their own (non-rollback) version; every approved version has an approver.
  for (const v of history.slice(1)) {
    if (v.status === "Approved" || v.status === "Retired") expect(v.approvedBy).toBeDefined();
    if (v.approvedBy && v.rollbackOf === undefined) {
      // Three different people: author, Shadow promoter, approver.
      expect(v.shadowedBy).toBeDefined();
      expect(new Set([v.createdBy.name, v.shadowedBy!.name, v.approvedBy.name].map(identityKey)).size).toBe(3);
    }
  }
  // Whatever the store publishes, its own snapshot validator accepts.
  const parsed = parseGovernanceSnapshot(JSON.parse(JSON.stringify(data)));
  expect(parsed.ok ? "ok" : parsed.reason).toBe("ok");
}

describe("governance store under random action sequences", () => {
  it("every action appends exactly one audit event (or throws on malformed input, changing nothing); audit is append-only; invariants hold", () => {
    const seen = { ok: new Set<string>(), refused: new Set<string>() };
    fc.assert(
      fc.property(sequenceArb, (commands) => {
        const store = freshStore();
        for (const c of commands) {
          const before = store.getState();
          const result = run(store, c);
          if (result !== "invalid") seen[result].add(c.op);
          const after = store.getState();
          if (result === "invalid") {
            // Malformed input (unknown role / base version / empty reason): no state change at all.
            expect(after).toBe(before);
          } else if (c.op === "setRole" && before.currentActor.role === UNRESOLVED_ROLE) {
            // Binding the first (session) identity is session start, not a switch: not audited.
            expect(after.audit.length).toBe(before.audit.length);
          } else {
            expect(after.audit.length).toBe(before.audit.length + 1);
          }
          // Append-only: every earlier event is the very same frozen object.
          before.audit.forEach((e, i) => expect(after.audit[i]).toBe(e));
          assertInvariants(store);
        }
      }),
      { numRuns: 500, examples: [[BOTH_OUTCOMES]] },
    );
    // Every privileged action really reaches both outcomes (guaranteed by BOTH_OUTCOMES).
    for (const op of ["propose", "promote", "approve", "rollback", "decide", "reset", "setRole"]) {
      expect(seen.ok.has(op), `${op} never succeeded`).toBe(true);
    }
    for (const op of ["propose", "promote", "approve", "rollback", "decide"]) {
      expect(seen.refused.has(op), `${op} never refused`).toBe(true);
    }
  });

  it("an approval succeeds only for an authorised human who neither wrote nor shadowed a Shadow version from the live base — and a regression override only for the pill's approver with a non-blank reason", () => {
    fc.assert(
      fc.property(sequenceArb, (commands) => {
        const store = freshStore();
        for (const c of commands) {
          const before = store.getState();
          const target = before.versions[PILL_ID].find((v) => v.version === (c as { version?: string }).version);
          const live = before.versions[PILL_ID].find((v) => v.status === "Approved");
          const result = run(store, c);
          if (c.op !== "approve" || result !== "ok") continue;
          const actor = before.currentActor;
          expect(target).toBeDefined();
          expect(target!.status).toBe("Shadow");
          expect(sameIdentity(actor.name, target!.createdBy.name)).toBe(false);
          expect(sameIdentity(actor.name, target!.shadowedBy!.name)).toBe(false);
          expect(target!.parentVersion).toBe(live?.version);
          if (c.regressed) {
            expect(actor.role).toBe(target!.approverRole);
            expect((c.override ?? "").trim().length).toBeGreaterThan(0);
          }
        }
      }),
      { numRuns: 300 },
    );
  });

  it("a decision is recorded only when the acting role holds the grant", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ROLE_IDS),
        outcomeArb,
        subjectArb,
        (role, outcome, subject) => {
          const store = freshStore();
          store.getState().setRole(role);
          const allowed = decisionAuthority(role, outcome, subject).allowed;
          const result = run(store, { op: "decide", outcome, subject });
          expect(result).toBe(allowed ? "ok" : "refused");
          const recorded = store.getState().decisions["INC-2026-1011"]?.["TS-07"];
          expect(recorded !== undefined).toBe(allowed);
          expect(store.getState().audit.at(-1)?.action).toBe(allowed ? `action_${outcome}` : "action_decision_blocked");
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Separation of duties vs. name variants
// ---------------------------------------------------------------------------

const ZERO_WIDTH = ["​", "‌", "‍", "⁠", "﻿"];

/** Same human, different bytes: case, whitespace, zero-width, full-width forms. */
function variantArb(name: string): fc.Arbitrary<string> {
  return fc
    .array(fc.constantFrom("upper", "lower", "fullwidth", "zw", "space", "pad", "nfd"), { minLength: 1, maxLength: 6 })
    .chain((ops) =>
      fc.integer({ min: 0, max: Math.max(0, name.length - 1) }).map((at) => {
        let out = name;
        for (const op of ops) {
          switch (op) {
            case "upper":
              out = out.toUpperCase();
              break;
            case "lower":
              out = out.toLowerCase();
              break;
            case "fullwidth":
              out = [...out]
                .map((ch) => {
                  const code = ch.charCodeAt(0);
                  return code >= 0x21 && code <= 0x7e ? String.fromCharCode(code + 0xfee0) : ch;
                })
                .join("");
              break;
            case "zw":
              out = out.slice(0, at) + ZERO_WIDTH[at % ZERO_WIDTH.length] + out.slice(at);
              break;
            case "space":
              out = out.replace(" ", "   \t ");
              break;
            case "pad":
              out = `  ${out}\n`;
              break;
            case "nfd":
              out = out.normalize("NFD");
              break;
          }
        }
        return out;
      }),
    );
}

describe("separation of duties", () => {
  const AT = "2026-10-11T08:00:00.000Z";
  const base = seedVersion(PILL_ID, pill(), { createdBy: CE, approvedBy: HTS }, AT);

  it("an author can never approve their own version under any spelling of their name", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ROLES.map((r) => r.person)),
        fc.constantFrom(...ROLE_IDS),
        fc.boolean(),
        (author, approverRole, shadow) =>
          fc.assert(
            fc.property(variantArb(author), (alias) => {
              const draft: PillVersion = {
                ...proposeVersion(base, [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], { name: author, role: "chief_engineer" }, "x", [base], AT),
                status: shadow ? "Shadow" : "Draft",
              };
              const check = canApprove(draft, { regressions: [] }, { name: alias, role: approverRole }, { reason: "ok" });
              expect(check.allowed).toBe(false);
              expect(check.blockers.some((b) => b.startsWith("Separation of duties"))).toBe(true);
            }),
            { numRuns: 20 },
          ),
      ),
      { numRuns: 40 },
    );
  });

  it("identityKey keeps distinct people distinct", () => {
    const keys = new Set(ROLES.map((r) => identityKey(r.person)));
    expect(keys.size).toBe(new Set(ROLES.map((r) => r.person)).size);
  });

  it("switching roles always acts as that role's persona — a name cannot be chosen", () => {
    const store = freshStore();
    for (const role of ROLE_IDS) {
      store.getState().setRole(role);
      expect(store.getState().currentActor).toEqual({ name: ROLES.find((r) => r.role === role)!.person, role });
    }
    expect(() => store.getState().setRole("intruder")).toThrow(/not defined/);
    expect(() => store.getState().setRole(UNRESOLVED_ROLE)).toThrow(/not defined/);
  });

  it("the author cannot approve by switching to another role they do not hold", () => {
    const store = freshStore();
    const s = () => store.getState();
    s().setRole("head_technical_services");
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 9 } }], "self-serve");
    s().setRole("asset_operations_manager");
    s().promoteToShadow(PILL_ID, "1.3.0");
    s().setRole("head_technical_services");
    // Same role → same human → blocked.
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(false);
    // Another authorised role is another human (the demo's role switch models a hand-off).
    s().setRole("executive");
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);
    expect(s().versions[PILL_ID].find((v) => v.version === "1.3.0")?.approvedBy?.name).not.toBe(
      s().versions[PILL_ID].find((v) => v.version === "1.3.0")?.createdBy.name,
    );
  });
});

// ---------------------------------------------------------------------------
// Targeted state-machine attacks
// ---------------------------------------------------------------------------

describe("version state machine", () => {
  /** 1.3.0 proposed by the Chief Engineer; with `shadow`, the steward puts it into Shadow. */
  function withDraft(shadow = false) {
    const store = freshStore();
    const s = () => store.getState();
    s().setRole("chief_engineer");
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], "fix");
    if (shadow) {
      s().setRole("asset_operations_manager");
      s().promoteToShadow(PILL_ID, "1.3.0");
      s().setRole("chief_engineer");
    }
    return { store, s };
  }

  it("approving an Approved, Retired or non-existent version is rejected and audited", () => {
    const { s } = withDraft(true);
    s().setRole("head_technical_services");
    for (const v of ["1.2.0", "7.7.7", "", "../../etc/passwd"]) {
      const n = s().audit.length;
      const check = s().approveVersion(PILL_ID, v, { regressions: [] });
      expect(check.allowed).toBe(false);
      expect(s().audit).toHaveLength(n + 1);
      expect(s().audit.at(-1)?.action).toBe("version_approval_blocked");
    }
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);
    // 1.2.0 is now Retired; 1.3.0 Approved — neither can be approved again.
    expect(s().approveVersion(PILL_ID, "1.2.0", { regressions: [] }).allowed).toBe(false);
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(false);
    expect(s().approveVersion("no-such-pill", "1.3.0", { regressions: [] }).allowed).toBe(false);
  });

  it("rollback to a Draft/Shadow or non-existent version is refused — never-approved rules cannot go live", () => {
    const { s } = withDraft();
    s().setRole("head_technical_services");
    expect(() => s().rollback(PILL_ID, "1.3.0", "sneak the draft live")).toThrow(/Draft/);
    s().setRole("chief_engineer");
    // (chief_engineer has no rollback grant either)
    expect(() => s().rollback(PILL_ID, "1.3.0", "x")).toThrow(GovernanceError);
    s().setRole("executive");
    s().promoteToShadow(PILL_ID, "1.3.0");
    expect(() => s().rollback(PILL_ID, "1.3.0", "sneak the shadow live")).toThrow(/Shadow/);
    expect(() => s().rollback(PILL_ID, "9.9.9", "x")).toThrow(/Unknown version/);
    expect(s().versions[PILL_ID].filter((v) => v.status === "Approved").map((v) => v.version)).toEqual(["1.2.0"]);
    expect(s().audit.at(-1)?.action).toBe("version_rollback_blocked");
  });

  it("a double rollback does not mint a duplicate version", () => {
    const { s } = withDraft(true);
    s().setRole("head_technical_services");
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);
    const restored = s().rollback(PILL_ID, "1.2.0", "regression in prod");
    expect(restored).toMatchObject({ version: "1.4.0", rollbackOf: "1.2.0", status: "Approved" });
    expect(() => s().rollback(PILL_ID, "1.2.0", "again")).toThrow(/nothing to roll back/);
    expect(() => s().rollback(PILL_ID, "1.4.0", "to itself")).toThrow(/already the approved/);
    expect(s().versions[PILL_ID].map((v) => `${v.version}:${v.status}`)).toEqual([
      "1.2.0:Retired",
      "1.3.0:Retired",
      "1.4.0:Approved",
    ]);
  });

  it("a regression override needs a non-blank reason AND the pill's approver role", () => {
    const { s } = withDraft(true);
    const regressed = { regressions: [REGRESSION] };
    // Asset Operations Manager may promote, but is not this pill's approver → cannot override.
    s().setRole("asset_operations_manager");
    expect(s().approveVersion(PILL_ID, "1.3.0", regressed, { reason: "trust me" }).allowed).toBe(false);
    s().setRole("head_technical_services");
    for (const reason of ["", "   ", "\n\t"]) {
      expect(s().approveVersion(PILL_ID, "1.3.0", regressed, { reason }).allowed).toBe(false);
    }
    const check = s().approveVersion(PILL_ID, "1.3.0", regressed, { reason: "accepted: case is obsolete" });
    expect(check).toMatchObject({ allowed: true, overridden: true });
    expect(s().audit.at(-1)).toMatchObject({ action: "version_approval_overridden", pillVersion: "1.3.0" });
  });

  it("a stale draft (proposed from a since-retired base) cannot be approved over the live version", () => {
    const { s } = withDraft(); // 1.3.0 from 1.2.0
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-02", patch: { deadline_minutes: 5 } }], "other fix"); // 1.4.0 from 1.2.0
    s().setRole("asset_operations_manager");
    s().promoteToShadow(PILL_ID, "1.3.0");
    s().promoteToShadow(PILL_ID, "1.4.0");
    s().setRole("head_technical_services");
    expect(s().approveVersion(PILL_ID, "1.4.0", { regressions: [] }).allowed).toBe(true);
    const stale = s().approveVersion(PILL_ID, "1.3.0", { regressions: [] });
    expect(stale.allowed).toBe(false);
    expect(stale.blockers.join(" ")).toMatch(/re-propose from v1\.4\.0/);
  });
});

describe("audit and state immutability", () => {
  it("returned arrays and objects cannot be mutated", () => {
    const store = freshStore();
    store.getState().setRole("asset_operations_manager");
    const { audit, versions, decisions } = store.getState();
    expect(() => (audit as unknown as unknown[]).push({})).toThrow(TypeError);
    expect(() => ((audit as unknown as unknown[]).length = 0)).toThrow(TypeError);
    expect(() => {
      (audit[0] as { detail: string }).detail = "rewritten";
    }).toThrow(TypeError);
    expect(() => versions[PILL_ID].push({ ...versions[PILL_ID][0], version: "9.0.0" })).toThrow(TypeError);
    expect(() => {
      (versions[PILL_ID][0] as { status: string }).status = "Retired";
    }).toThrow(TypeError);
    expect(() => {
      versions[PILL_ID][0].rules[0].action_class = "recommend";
    }).toThrow(TypeError);
    expect(() => {
      (decisions as Record<string, unknown>)["INC-X"] = {};
    }).toThrow(TypeError);
  });
});
