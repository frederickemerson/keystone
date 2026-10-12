import { describe, expect, it } from "vitest";
import {
  bumpMinor,
  EmptyProposalError,
  currentApproved,
  diffVersions,
  correctionFor,
  inReview,
  liveVersion,
  markApproved,
  nextMinorVersion,
  promoteToShadow,
  proposeVersion,
  rollback,
  rollbackFrom,
  seedVersion,
  type PillVersion,
} from "../versions";
import { AOM, CE, HTS, PILL_ID, pill, rule } from "./fixtures";

const AT = "2026-10-11T08:00:00.000Z";

function seeded(): PillVersion {
  return seedVersion(PILL_ID, pill(), { createdBy: CE, approvedBy: HTS }, AT);
}

describe("proposeVersion", () => {
  it("bumps the minor version, starts as Draft and links its parent", () => {
    const base = seeded();
    const v = proposeVersion(base, [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], CE, "eval flag", [base], AT);
    expect(v.version).toBe("1.3.0");
    expect(v.status).toBe("Draft");
    expect(v.parentVersion).toBe("1.2.0");
    expect(v.rules.find((r) => r.id === "TS-03")?.deadline_minutes).toBe(10);
    // base is untouched
    expect(base.rules.find((r) => r.id === "TS-03")?.deadline_minutes).toBe(15);
  });

  it("never collides with an existing version", () => {
    const base = seeded();
    const v13 = proposeVersion(base, [TS03_TO_10], CE, "a", [base], AT);
    const v14 = proposeVersion(base, [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 11 } }], CE, "b", [base, v13], AT);
    expect(v14.version).toBe("1.4.0");
    expect(bumpMinor("1.2")).toBe("1.3.0");
  });
});

describe("proposeVersion refuses empty proposals", () => {
  it("no changes, a restated value, or changes that cancel out are refused", () => {
    const base = seeded();
    const noOps = [
      [],
      [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 15 } }],
      [
        { op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } },
        { op: "update", ruleId: "TS-03", patch: { deadline_minutes: 15 } },
      ],
      [{ op: "remove", ruleId: "TS-03" }, { op: "add", rule: base.rules.find((r) => r.id === "TS-03")! }],
    ] as const;
    for (const changes of noOps) {
      expect(() => proposeVersion(base, changes as never, CE, "noop", [base], AT)).toThrow(EmptyProposalError);
      expect(() => proposeVersion(base, changes as never, CE, "noop", [base], AT)).toThrow(/Nothing to propose/);
    }
  });

  it("a missing reason is still malformed input, not an empty-proposal refusal", () => {
    const base = seeded();
    expect(() => proposeVersion(base, [], CE, "  ", [base], AT)).toThrow(/needs a reason/);
  });
});

describe("diffVersions", () => {
  it('produces "TS-xx field a → b" strings keyed by rule id', () => {
    const base = seeded();
    const v = proposeVersion(
      base,
      [
        { op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } },
        { op: "update", ruleId: "TS-01", patch: { action_class: "must_escalate" } },
      ],
      CE,
      "correction",
      [base],
      AT,
    );
    const diff = diffVersions(base, v);
    expect(diff.delta).toBeDefined();
    expect(diff.changes).toContain("TS-03 deadline_minutes 15 → 10");
    expect(diff.changes).toContain("TS-01 action_class recommend → must_escalate");
    expect(diff.changes).toHaveLength(2);
  });

  it("keys by rule id, not position, and reports list edits, adds and removals", () => {
    const base = seeded();
    const v = proposeVersion(
      base,
      [
        { op: "remove", ruleId: "TS-01" },
        { op: "add", rule: rule("TS-13") },
        { op: "update", ruleId: "TS-02", patch: { required_evidence: ["location_confirmed", "shutoff_map_available"] } },
      ],
      CE,
      "restructure",
      [base],
      AT,
    );
    const { changes } = diffVersions(base, v);
    expect(changes).toContain("TS-01 removed");
    expect(changes).toContain("TS-13 added");
    expect(changes).toContain("TS-02 required_evidence + shutoff_map_available");
    // TS-02/TS-03 shifted position but are not reported as changed wholesale
    expect(changes.some((c) => c.startsWith("TS-03"))).toBe(false);
  });

  it("identical versions have no changes", () => {
    const base = seeded();
    expect(diffVersions(base, { ...base, version: "1.3.0" }).changes).toEqual([]);
  });
});

describe("rollback", () => {
  it("creates a new version, retires the rolled-back one, and preserves history", () => {
    const base = seeded();
    const v13 = proposeVersion(base, [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], CE, "fix", [base], AT);
    let history = markApproved(promoteToShadow([base, v13], "1.3.0", AOM, AT), "1.3.0", HTS, AT);
    expect(history.find((v) => v.version === "1.2.0")?.status).toBe("Retired");

    const before = structuredClone(history);
    history = rollback(history, PILL_ID, "1.2.0", AOM, "1.3 regressed in production", AT);

    expect(history).toHaveLength(3);
    // all prior entries still present, same rules, only status changed
    for (const old of before) {
      const now = history.find((v) => v.version === old.version);
      expect(now).toBeDefined();
      expect(now?.rules).toEqual(old.rules);
    }
    expect(history.find((v) => v.version === "1.3.0")?.status).toBe("Retired");

    const restored = history[history.length - 1];
    expect(restored.version).toBe("1.4.0");
    expect(restored.status).toBe("Approved");
    expect(restored.rollbackOf).toBe("1.2.0");
    expect(restored.parentVersion).toBe("1.3.0");
    expect(restored.rules).toEqual(base.rules);
    expect(currentApproved(history)?.version).toBe("1.4.0");
    expect(history.filter((v) => v.status === "Approved")).toHaveLength(1);
  });

  it("does not mutate its input and requires a reason", () => {
    const base = seeded();
    const v13 = proposeVersion(base, [TS03_TO_10], CE, "x", [base], AT);
    const history = Object.freeze(markApproved(promoteToShadow([base, v13], "1.3.0", AOM, AT), "1.3.0", HTS, AT));
    expect(() => rollback(history, PILL_ID, "1.2.0", AOM, "  ", AT)).toThrow(/reason/);
    rollback(history, PILL_ID, "1.2.0", AOM, "ok", AT);
    expect(history).toHaveLength(2);
  });
});

const TS03_TO_10 = { op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } } as const;

describe("correctionFor / inReview / rollbackFrom (what Learning resumes from)", () => {
  const INC = "INC-2026-1011";

  it("follows the correction through Draft → Shadow → Approved → rolled back, never the seed or the rollback", () => {
    const base = seeded();
    expect(correctionFor([base], INC)).toBeUndefined();
    const v13 = { ...proposeVersion(base, [TS03_TO_10], CE, "a", [base], AT), correction: { incidentId: INC, ruleId: "TS-03" } };
    expect(correctionFor([base, v13], INC)).toMatchObject({ version: "1.3.0", status: "Draft" });
    expect(inReview([base, v13])?.version).toBe("1.3.0");
    const shadowedH = promoteToShadow([base, v13], "1.3.0", AOM, AT);
    expect(correctionFor(shadowedH, INC)).toMatchObject({ version: "1.3.0", status: "Shadow", shadowedBy: AOM });
    const approved = markApproved(shadowedH, "1.3.0", HTS, AT);
    expect(correctionFor(approved, INC)).toMatchObject({ version: "1.3.0", status: "Approved" });
    expect(inReview(approved)).toBeUndefined();
    expect(rollbackFrom(approved, "1.3.0")).toBeUndefined();
    const rolled = rollback(approved, PILL_ID, "1.2.0", HTS, "regression", AT);
    expect(correctionFor(rolled, INC)).toMatchObject({ version: "1.3.0", status: "Retired" });
    expect(rollbackFrom(rolled, "1.3.0")).toMatchObject({ version: "1.4.0", rollbackOf: "1.2.0" });
  });

  it("an uncorrelated version in review is in review, but is not the correction", () => {
    const base = seeded();
    const v13 = proposeVersion(base, [TS03_TO_10], CE, "a", [base], AT);
    expect(inReview([base, v13])?.version).toBe("1.3.0");
    expect(correctionFor([base, v13], INC)).toBeUndefined();
  });
});

describe("liveVersion", () => {
  it("follows approvals and rollbacks rather than the seed", () => {
    const base = seeded();
    expect(liveVersion([base])?.version).toBe("1.2.0");
    const v13 = proposeVersion(base, [TS03_TO_10], CE, "a", [base], AT);
    // A draft does not go live.
    expect(liveVersion([base, v13])?.version).toBe("1.2.0");
    const approved = markApproved(promoteToShadow([base, v13], "1.3.0", AOM, AT), "1.3.0", HTS, AT);
    expect(liveVersion(approved)).toMatchObject({ version: "1.3.0", status: "Approved" });
    const rolled = rollback(approved, PILL_ID, "1.2.0", HTS, "regression", AT);
    expect(liveVersion(rolled)).toMatchObject({ version: "1.4.0", status: "Approved", rollbackOf: "1.2.0" });
    expect(nextMinorVersion(rolled)).toBe("1.5.0");
  });

  it("falls back to the highest version when nothing is approved", () => {
    const base = { ...seeded(), status: "Retired" as const };
    const v13 = proposeVersion(base, [TS03_TO_10], CE, "a", [base], AT);
    expect(liveVersion([base, v13])?.version).toBe("1.3.0");
    expect(liveVersion([])).toBeUndefined();
  });
});
