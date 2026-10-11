import { describe, expect, it } from "vitest";
import * as audit from "../audit";
import { appendAudit, EMPTY_AUDIT_LOG } from "../audit";

const ev = { actor: "Priya Nair", role: "asset_operations_manager", action: "action_escalated" as const, detail: "TS-07 escalated" };

describe("audit log", () => {
  it("is append-only: appending returns a new log and never touches the old one", () => {
    const one = appendAudit(EMPTY_AUDIT_LOG, { ...ev, at: "2026-10-11T08:00:00Z" });
    const two = appendAudit(one, { ...ev, incidentId: "INC-2026-1011", ruleId: "TS-07" });
    expect(EMPTY_AUDIT_LOG).toHaveLength(0);
    expect(one).toHaveLength(1);
    expect(two).toHaveLength(2);
    expect(two[0]).toBe(one[0]);
    expect(two.map((e) => e.id)).toEqual(["AUD-00001", "AUD-00002"]);
    expect(two[0].at).toBe("2026-10-11T08:00:00Z");
  });

  it("logs and events are frozen — no in-place edits or deletes", () => {
    const log = appendAudit(EMPTY_AUDIT_LOG, ev);
    expect(Object.isFrozen(log)).toBe(true);
    expect(Object.isFrozen(log[0])).toBe(true);
    expect(() => {
      (log as audit.AuditEvent[]).pop();
    }).toThrow(TypeError);
    expect(() => {
      (log[0] as { detail: string }).detail = "tampered";
    }).toThrow(TypeError);
  });

  it("exposes no update/delete API", () => {
    const fns = Object.entries(audit)
      .filter(([, v]) => typeof v === "function")
      .map(([k]) => k);
    expect(fns.sort()).toEqual(["appendAudit", "auditFor"]);
  });
});
