import { describe, expect, it } from "vitest";
import { appendAudit, AUDIT_ACTIONS, EMPTY_AUDIT_LOG, type AuditAction, type AuditInput, type AuditLog } from "../audit";
import {
  AUDIT_SIGNAL,
  EMPTY_OVERRIDE_SUMMARY,
  formatOverrideCount,
  MIN_RATE_DENOMINATOR,
  overridePercent,
  overrideRateNote,
  summariseOverrides,
  type OverrideSignal,
} from "../overrides";

const PRIYA = { actor: "Priya Nair", role: "asset_operations_manager" };
const HAFIZ = { actor: "Muhammad Hafiz", role: "technical_services_lead" };

/** Build a log from decisions in order, oldest first. */
function logOf(...events: readonly Omit<AuditInput, "detail">[]): AuditLog {
  return events.reduce<AuditLog>((log, e) => appendAudit(log, { ...e, detail: `${e.action} recorded` }), EMPTY_AUDIT_LOG);
}

const decided = (action: AuditAction, who: typeof PRIYA, ruleId: string) => ({
  ...who,
  action,
  incidentId: "INC-2026-1011",
  pillId: "technical-services-chilled-water-leak",
  ruleId,
});

describe("override-rate KPI — classification", () => {
  it("classifies every audit action, so a new one cannot land outside the figure", () => {
    // Arrange — guard against a vacuous pass if the vocabulary ever reads empty.
    expect(AUDIT_ACTIONS.length).toBeGreaterThan(20);
    const signals: readonly OverrideSignal[] = [
      "decision_overrode_pill",
      "decision_followed_pill",
      "decision_escalated",
      "decision_held_for_evidence",
      "approval_overrode_evals",
      "approval_followed_evals",
      "approved_version_withdrawn",
      "refused_by_governance",
      "not_counted",
    ];

    // Act + Assert — every action is classified, and nothing else is.
    for (const action of AUDIT_ACTIONS) {
      expect(Object.hasOwn(AUDIT_SIGNAL, action), action).toBe(true);
      expect(signals, action).toContain(AUDIT_SIGNAL[action]);
    }
    expect(Object.keys(AUDIT_SIGNAL).sort()).toEqual([...AUDIT_ACTIONS].sort());
  });

  it("counts a refused recommendation as the override, and escalation as the gate working", () => {
    // Arrange — one of each decision outcome.
    const log = logOf(
      decided("action_approved", PRIYA, "TS-02"),
      decided("action_rejected", PRIYA, "TS-05"),
      decided("action_escalated", PRIYA, "TS-07"),
      decided("action_evidence_requested", PRIYA, "TS-07"),
    );

    // Act
    const summary = summariseOverrides(log);

    // Assert
    expect(summary.decisions).toBe(4);
    expect(summary.overrides).toBe(1);
    expect(summary.escalations).toBe(1);
    expect(summary.evidenceHolds).toBe(1);
  });

  it("never counts a refused attempt as an override — it did not happen", () => {
    // Arrange — governance blocked the decision and the approval.
    const log = logOf(
      { ...PRIYA, action: "action_decision_blocked", ruleId: "TS-07" },
      { ...PRIYA, action: "version_approval_blocked", pillId: "technical-services-chilled-water-leak" },
    );

    // Act
    const summary = summariseOverrides(log);

    // Assert
    expect(summary.refusedAttempts).toBe(2);
    expect(summary.decisions).toBe(0);
    expect(summary.overrides).toBe(0);
    expect(summary.byActor).toEqual([]);
  });

  it("counts an approval over eval regressions against the approvals, not the gate decisions", () => {
    // Arrange
    const log = logOf(
      { ...HAFIZ, action: "version_approved", pillId: "p", pillVersion: "1.2.0" },
      { ...HAFIZ, action: "version_approval_overridden", pillId: "p", pillVersion: "1.3.0" },
      { ...HAFIZ, action: "version_rolled_back", pillId: "p", pillVersion: "1.2.0" },
    );

    // Act
    const summary = summariseOverrides(log);

    // Assert
    expect(summary.approvals).toEqual({ total: 2, overEvalRegressions: 1 });
    expect(summary.rollbacks).toBe(1);
    expect(summary.decisions).toBe(0);
  });

  it("leaves a rule review out: one action covers confirmed, edited and rejected tiles", () => {
    // Arrange
    const log = logOf({ ...HAFIZ, action: "rule_reviewed", pillId: "p", ruleId: "TS-05" });

    // Act
    const summary = summariseOverrides(log);

    // Assert — counted nowhere rather than guessed from the detail text.
    expect(summary).toEqual(EMPTY_OVERRIDE_SUMMARY);
  });
});

describe("override-rate KPI — attribution", () => {
  it("names who overrode and which rule, most overrides first", () => {
    // Arrange — Priya overrides TS-05 twice, Hafiz once on TS-07.
    const log = logOf(
      decided("action_rejected", PRIYA, "TS-05"),
      decided("action_rejected", PRIYA, "TS-05"),
      decided("action_approved", PRIYA, "TS-02"),
      decided("action_rejected", HAFIZ, "TS-07"),
      decided("action_escalated", HAFIZ, "TS-07"),
    );

    // Act
    const summary = summariseOverrides(log);

    // Assert
    expect(summary.byActor).toEqual([
      { actor: "Priya Nair", role: "asset_operations_manager", overrides: 2, decisions: 3 },
      { actor: "Muhammad Hafiz", role: "technical_services_lead", overrides: 1, decisions: 2 },
    ]);
    expect(summary.byRule).toEqual([
      { ruleId: "TS-05", pillId: "technical-services-chilled-water-leak", overrides: 2, decisions: 2 },
      { ruleId: "TS-07", pillId: "technical-services-chilled-water-leak", overrides: 1, decisions: 2 },
      { ruleId: "TS-02", pillId: "technical-services-chilled-water-leak", overrides: 0, decisions: 1 },
    ]);
  });

  it("counts only the current run: a demo reset starts the denominator again", () => {
    // Arrange — two decisions, a reset, then one more.
    const log = logOf(
      decided("action_rejected", PRIYA, "TS-05"),
      decided("action_approved", PRIYA, "TS-02"),
      { ...PRIYA, action: "demo_reset" },
      decided("action_approved", PRIYA, "TS-02"),
    );

    // Act
    const summary = summariseOverrides(log);

    // Assert — the reset returned the decisions to the seed, so they are not counted.
    expect(summary.decisions).toBe(1);
    expect(summary.overrides).toBe(0);
    expect(summary.byRule.map((r) => r.ruleId)).toEqual(["TS-02"]);
  });

  it("never mutates the log it reads", () => {
    // Arrange
    const log = logOf(decided("action_rejected", PRIYA, "TS-05"));

    // Act
    summariseOverrides(log);

    // Assert
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe("action_rejected");
  });
});

describe("override-rate KPI — honest numbers", () => {
  it("an empty log reads as nothing recorded yet, not as a measured zero", () => {
    // Act
    const summary = summariseOverrides(EMPTY_AUDIT_LOG);

    // Assert
    expect(summary).toEqual(EMPTY_OVERRIDE_SUMMARY);
    expect(overridePercent(summary)).toBeNull();
    expect(overrideRateNote(summary)).toBe("No overrides recorded yet — nothing has been decided on a gate in this run.");
  });

  it("shows the count and its denominator, and no percentage, while the denominator is small", () => {
    // Arrange — one override out of four decisions (the demo's scale).
    const log = logOf(
      decided("action_rejected", PRIYA, "TS-05"),
      decided("action_approved", PRIYA, "TS-02"),
      decided("action_escalated", PRIYA, "TS-07"),
      decided("action_evidence_requested", PRIYA, "TS-07"),
    );

    // Act
    const summary = summariseOverrides(log);

    // Assert
    expect(summary.decisions).toBeLessThan(MIN_RATE_DENOMINATOR);
    expect(formatOverrideCount(summary)).toBe("1 of 4");
    expect(overridePercent(summary)).toBeNull();
    expect(overrideRateNote(summary)).not.toContain("%");
    expect(overrideRateNote(summary)).toContain("not a rate");
  });

  it("becomes a percentage once enough decisions carry one", () => {
    // Arrange — 5 overrides out of 20 decisions (a pilot's scale).
    const events = Array.from({ length: MIN_RATE_DENOMINATOR }, (_, i) =>
      decided(i % 4 === 0 ? "action_rejected" : "action_approved", PRIYA, "TS-05"),
    );

    // Act
    const summary = summariseOverrides(logOf(...events));

    // Assert
    expect(summary).toMatchObject({ decisions: 20, overrides: 5 });
    expect(overridePercent(summary)).toBe(25);
    expect(overrideRateNote(summary)).toBe("25% of 20 recorded decisions.");
  });
});
