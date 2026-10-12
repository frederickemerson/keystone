// Pill hub (/registry/[pillId]) and incidents list helpers: rule anchors,
// the words each rule rests on, "applied in" incidents from the engine's own
// replay, and the pills each incident applied.

import { describe, expect, it } from "vitest";
import {
  incidentsUsingPill,
  pillIdFromRef,
  pillsAppliedTo,
  ruleApplications,
  rulesView,
  type ReplayScenario,
} from "@/components/registry/hub-utils";
import { loadAsset, loadIncident, loadIncidents, listTimelineIds, loadTimeline } from "@/lib/data";
import { loadAllPills, loadPill } from "@/lib/pills/load";
import { ruleAnchorId, routes } from "@/lib/journey";
import type { CaptureProvenance } from "@/lib/governance/versions";

const TS = "technical-services-chilled-water-leak";
const TE = "tenant-experience-incident-comms";
const ts = loadPill(TS)!;

function scenarios(): ReplayScenario[] {
  return listTimelineIds().map((id) => {
    const incident = loadIncident(id)!;
    return { incident, asset: loadAsset(incident.asset_id)!, timeline: loadTimeline(id)! };
  });
}

describe("pillIdFromRef", () => {
  it("maps every incident's recorded pill folder to a real pill id", () => {
    const ids = new Set(loadAllPills().map((p) => p.id));
    for (const i of loadIncidents()) expect(ids.has(pillIdFromRef(i.pill_applied)), i.pill_applied).toBe(true);
  });
});

describe("rulesView", () => {
  const rows = rulesView(ts.pill, ts.pill.rules);

  it("gives every rule the shared anchor id that routes.pill links to", () => {
    expect(rows.map((r) => r.id)).toEqual(ts.pill.rules.map((r) => r.id));
    for (const row of rows) {
      expect(row.anchorId).toBe(ruleAnchorId(row.id));
      expect(routes.pill(TS, row.id).endsWith(`#${row.anchorId}`)).toBe(true);
    }
  });

  it("labels required evidence from the pill's evidence catalogue", () => {
    const ts07 = rows.find((r) => r.id === "TS-07")!;
    expect(ts07.requiredEvidence.map((e) => e.key)).toEqual(ts.pill.rules.find((r) => r.id === "TS-07")!.required_evidence);
    for (const e of ts07.requiredEvidence) expect(e.label).toBe(ts.pill.evidenceCatalog[e.key].label);
  });

  it("quotes the expert with the call timestamp for an interview rule (TS-07 at 00:14:32)", () => {
    const ts07 = rows.find((r) => r.id === "TS-07")!;
    expect(ts07.source?.kind).toBe("expert");
    expect(ts07.source?.timestamp).toBe("00:14:32");
    expect(ts07.source?.quote.length).toBeGreaterThan(20);
  });

  it("quotes the frontline note for a rule proposed from one", () => {
    const base = ts.pill.rules.find((r) => r.id === "TS-07")!;
    const added = { ...base, id: "TS-14", title: "Check the leak sensor cable first" };
    const capture: CaptureProvenance = {
      noteId: "VN-1",
      draftRuleId: "DRAFT-01",
      ruleId: "TS-14",
      quoteSpan: { start: 0, end: 12, text: "check the cable" },
      author: { name: "Rajesh Kumar", role: "technician" },
    };
    const row = rulesView(ts.pill, [...ts.pill.rules, added], [capture]).find((r) => r.id === "TS-14")!;
    expect(row.source).toEqual({ kind: "frontline", quote: "check the cable", source: "VN-1" });
  });
});

describe("ruleApplications", () => {
  const apps = ruleApplications(ts.pill, scenarios());

  it("finds TS-07 applied and blocked in the demo incident, from the engine's replay", () => {
    const inDemo = apps["TS-07"]?.find((a) => a.incidentId === "INC-2026-1011");
    expect(inDemo).toBeDefined();
    expect(inDemo!.blocked).toBe(true);
    expect(inDemo!.firstStep).toBeGreaterThan(0);
  });

  it("only lists rules that exist in the pill and incidents that have timelines", () => {
    const ruleIds = new Set(ts.pill.rules.map((r) => r.id));
    const timelines = new Set(listTimelineIds());
    for (const [ruleId, list] of Object.entries(apps)) {
      expect(ruleIds.has(ruleId)).toBe(true);
      for (const a of list) expect(timelines.has(a.incidentId)).toBe(true);
    }
  });

  it("follows the governed version: a version without TS-07 never applies it", () => {
    const without = { ...ts.pill, rules: ts.pill.rules.filter((r) => r.id !== "TS-07") };
    expect(ruleApplications(without, scenarios())["TS-07"]).toBeUndefined();
  });
});

describe("incidentsUsingPill", () => {
  it("lists incidents that recorded the pill, with the version at open, newest first", () => {
    const uses = incidentsUsingPill(TS, loadIncidents(), ruleApplications(ts.pill, scenarios()));
    expect(uses.length).toBe(loadIncidents().filter((i) => pillIdFromRef(i.pill_applied) === TS).length);
    expect(uses[0].incident.opened_at >= uses[uses.length - 1].incident.opened_at).toBe(true);
    const demo = uses.find((u) => u.incident.id === "INC-2026-1011")!;
    expect(demo.recordedVersion).toBe("1.2.0");
    expect(demo.triggeredRules).toContain("TS-07");
  });

  it("includes an incident another pill was recorded for when this pill's rules trigger there", () => {
    const te = loadPill(TE)!;
    const uses = incidentsUsingPill(TE, loadIncidents(), ruleApplications(te.pill, scenarios()));
    const demo = uses.find((u) => u.incident.id === "INC-2026-1011");
    expect(demo).toBeDefined();
    expect(demo!.recordedVersion).toBeUndefined();
    expect(demo!.triggeredRules.length).toBeGreaterThan(0);
  });
});

describe("pillsAppliedTo", () => {
  const pills = loadAllPills().map((b) => ({ id: b.id, ruleIds: b.pill.rules.map((r) => r.id) }));

  it("names the recorded pill with its version and the pill owning each recorded action", () => {
    const applied = pillsAppliedTo(loadIncident("INC-2026-1011")!, pills);
    expect(applied[0]).toEqual({ pillId: TS, version: "1.2.0" });
    expect(applied.map((p) => p.pillId)).toContain(TE);
    expect(new Set(applied.map((p) => p.pillId)).size).toBe(applied.length);
  });

  it("names only the recorded pill for an incident with no recorded actions", () => {
    const closed = loadIncidents().find((i) => (i.actions ?? []).length === 0)!;
    expect(pillsAppliedTo(closed, pills)).toEqual([{ pillId: pillIdFromRef(closed.pill_applied), version: closed.pill_version }]);
  });
});
