// The guided demo's recorded note must pay off where it was asked: the
// "Tell us why" task in INC-2026-1011 offers the recorded demo note first, the
// note drafts exactly ONE rule, and that rule — added to the pill exactly as
// proposeFromNote adds it — fires in INC-2026-1011 at the gate step, so the
// incident room visibly shows it once the version is approved.

import { describe, expect, it } from "vitest";
import { accumulateEvidence, toEngineAsset, toEngineEvidence, toEngineIncident } from "@/components/incident/engineInputs";
import { evaluate } from "@/lib/engine";
import { fixturesForTask } from "@/lib/capture/fixtures";
import { incidentOfCapture, nextRuleId } from "@/lib/capture/note-flow";
import { loadAsset, loadIncident, loadTimeline } from "@/lib/data";
import { DEMO_GATE_STEP, DEMO_INCIDENT_ID, DEMO_PILL_ID } from "@/lib/journey/routes";
import { loadPill } from "@/lib/pills/load";
import { applyRuleChanges } from "../versions";

const incident = loadIncident(DEMO_INCIDENT_ID)!;

describe("the recorded demo note for the guided demo", () => {
  const [first] = fixturesForTask({ assetId: incident.asset_id, incidentId: DEMO_INCIDENT_ID });

  it("is offered first on the demo incident's task, and says which incident it was written for", () => {
    expect(first.id).toBe("capture-closeout-chw-r2");
    expect(first.incidentId).toBe(DEMO_INCIDENT_ID);
  });

  it("drafts exactly one rule", () => {
    expect(first.extractionFor("VN-DEMO")!.candidates).toHaveLength(1);
  });

  const timeline = loadTimeline(DEMO_INCIDENT_ID)!;

  // At the gate step (where the task is asked) and at the end of the replay
  // (where the approval's "See it in" link opens the room).
  it.each([
    ["the gate step", DEMO_GATE_STEP],
    ["the end of the replay", timeline.events.length],
  ])("fires in the demo incident at %s once added to the pill", (_label, step) => {
    const base = loadPill(DEMO_PILL_ID)!.pill;
    const [draft] = first.extractionFor("VN-DEMO")!.candidates;
    const id = nextRuleId(base.rules.map((r) => r.id));
    const pill = { ...base, rules: applyRuleChanges(base.rules, [{ op: "add", rule: { ...draft.rule, id } }]) };
    const evidence = toEngineEvidence(accumulateEvidence(timeline.events, step));
    const result = evaluate(pill, toEngineAsset(loadAsset(incident.asset_id)!), toEngineIncident(incident), evidence);
    const action = result.actions.find((a) => a.ruleId === id);
    expect(action, result.trace.find((t) => t.ruleId === id)?.triggerReason).toBeDefined();
    expect(action!.status).toBe("allowed");
    expect(action!.decision).toMatch(/LD-23-04/);
  });

  it("keeps a different asset's own note first elsewhere", () => {
    expect(fixturesForTask({ assetId: "AHU-23-01" })[0].id).toBe("capture-qr-ahu-23-01");
  });
});

describe("incidentOfCapture", () => {
  const notes = [{ id: "VN-1", taskId: "CT-1" }, { id: "VN-2" }];
  const tasks = [{ id: "CT-1", incidentId: "INC-2026-1011" }];

  it("follows the note to the task that asked for it", () => {
    expect(incidentOfCapture({ noteId: "VN-1" }, notes, tasks)).toBe("INC-2026-1011");
  });

  it("is undefined for a note no incident task asked for", () => {
    expect(incidentOfCapture({ noteId: "VN-2" }, notes, tasks)).toBeUndefined();
    expect(incidentOfCapture({ noteId: "VN-404" }, notes, tasks)).toBeUndefined();
  });
});
