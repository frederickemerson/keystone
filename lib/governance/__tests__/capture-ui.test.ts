// Incident-room capture tasks (PLAN F1): which decisions raise a task, that the
// task is valid against the contract, and that an open task is never duplicated.

import { describe, expect, it } from "vitest";
import {
  buildCloseoutTask,
  buildGateTask,
  gateTaskKind,
  latestTask,
  openTasksFor,
} from "@/components/incident/captureTasks";
import { captureTaskSchema, findOpenCaptureTask, type CaptureTask } from "@/lib/capture";

const AT = "2026-10-11T08:11:00+08:00";

describe("gateTaskKind", () => {
  it("raises gate_blocked for any decision on an action the gate is blocking", () => {
    expect(gateTaskKind("blocked", "escalated")).toBe("gate_blocked");
    expect(gateTaskKind("blocked", "evidence_requested")).toBe("gate_blocked");
  });
  it("raises gate_override when a human rejects a requires-approval recommendation", () => {
    expect(gateTaskKind("needs_approval", "rejected")).toBe("gate_override");
  });
  it("asks nothing when the rule works as written", () => {
    expect(gateTaskKind("needs_approval", "approved")).toBeNull();
    expect(gateTaskKind("escalate", "escalated")).toBeNull();
    expect(gateTaskKind("allowed", "approved")).toBeNull();
  });
});

describe("built tasks satisfy the contract", () => {
  const gate = buildGateTask({
    kind: "gate_blocked",
    incidentId: "INC-2026-1011",
    assetId: "asset-hf1",
    ruleId: "TS-07",
    pillId: "technical-services-chilled-water-leak",
    role: "technician",
    step: 10,
    at: AT,
  });
  it("gate task: acting role, incident asset, open", () => {
    const parsed = captureTaskSchema.parse({ ...gate, status: "open" });
    expect(parsed.createdFor).toBe("technician");
    expect(parsed.assetId).toBe("asset-hf1");
    expect(parsed.prompt).toContain("TS-07");
    expect(parsed.prompt).toContain("(20 s)");
  });
  it("close-out task", () => {
    const t = buildCloseoutTask({ incidentId: "INC-2026-1011", assetId: "asset-hf1", role: "technician", at: AT });
    expect(captureTaskSchema.safeParse({ ...t, status: "open" }).success).toBe(true);
    expect(t.ruleId).toBeUndefined();
  });
});

describe("de-duplication and listing", () => {
  const base = buildGateTask({
    kind: "gate_blocked",
    incidentId: "INC-2026-1011",
    assetId: "asset-hf1",
    ruleId: "TS-07",
    pillId: "technical-services-chilled-water-leak",
    role: "technician",
    at: AT,
  });
  const open: CaptureTask = { ...base, status: "open" };
  const answered: CaptureTask = {
    ...base,
    id: "CT-old",
    createdAt: "2026-10-11T07:00:00+08:00",
    status: "answered",
    answeredBy: { name: "Rajesh Kumar", role: "technician" },
    noteId: "VN-1",
  };
  const key = { kind: "gate_blocked" as const, incidentId: "INC-2026-1011", ruleId: "TS-07", createdFor: "technician" };

  it("a repeated gate decision reuses the open task (contract dedupe)", () => {
    const again = { ...base, id: "CT-again", assetId: "asset-hf1" };
    expect(findOpenCaptureTask([answered, open], again)?.id).toBe(open.id);
    expect(findOpenCaptureTask([answered], again)).toBeUndefined();
    expect(findOpenCaptureTask([open], { ...again, ruleId: "TS-02" })).toBeUndefined();
    expect(key.kind).toBe("gate_blocked");
  });
  it("latest task wins on the card; pulse lists only open tasks for the role", () => {
    expect(latestTask([answered, open], { kinds: ["gate_blocked"], incidentId: "INC-2026-1011", ruleId: "TS-07", createdFor: "technician" })?.id).toBe(open.id);
    expect(openTasksFor([answered, open], "technician").map((t) => t.id)).toEqual([open.id]);
    expect(openTasksFor([open], "chief_engineer")).toEqual([]);
  });
});
