// Incident room: the loaded-pill summary ("Chilled water leak v1.2.0 · 13 rules"),
// what each pill is doing at a replay step, the version-drift note, and the
// links to the expert call that only exist for quotes the call contains.

import { describe, expect, it } from "vitest";
import { evaluate } from "@/lib/engine/evaluate";
import {
  accumulateEvidence,
  findRule,
  toEngineAsset,
  toEngineEvidence,
  toEngineIncident,
} from "@/components/incident/engineInputs";
import { activityLabel, driftLabel, loadedPillLabel, pillsInUse } from "@/components/incident/pill-usage";
import { expertCallHref, parseCallTime, EXPERT_CALL_INTERVIEW_ID } from "@/components/incident/expertCall";
import { expertQuoteFor } from "@/components/incident/provenance";
import type { ApprovedPill, BoardItem } from "@/components/incident/types";
import { loadAsset, loadIncident, loadTimeline } from "@/lib/data";
import { loadAllPills } from "@/lib/pills/load";
import { routes } from "@/lib/journey";

const INC = "INC-2026-1011";
const TS = "technical-services-chilled-water-leak";

function approvedAt(versionOf: (id: string) => string): ApprovedPill[] {
  return loadAllPills().map((b) => ({
    bundle: { id: b.id, domain: b.domain, name: b.name, pill: b.pill },
    pill: { ...b.pill, manifest: { ...b.pill.manifest, version: versionOf(b.id) } },
    version: versionOf(b.id),
  }));
}

/** Board items at a replay step, built the way the room builds them. */
function itemsAt(approved: ApprovedPill[], step: number): BoardItem[] {
  const incident = loadIncident(INC)!;
  const evidence = toEngineEvidence(accumulateEvidence(loadTimeline(INC)!.events, step));
  return approved.flatMap((entry) => {
    const result = evaluate(entry.pill, toEngineAsset(loadAsset(incident.asset_id)!), toEngineIncident(incident), evidence);
    return result.actions.flatMap((action) => {
      const trace = result.trace.find((t) => t.ruleId === action.ruleId);
      const rule = findRule(entry.pill, action.ruleId);
      return trace && rule ? [{ entry, action, trace, rule }] : [];
    });
  });
}

describe("pillsInUse", () => {
  const incident = loadIncident(INC)!;

  it("names every evaluated pill with its loaded version and rule count", () => {
    const approved = approvedAt((id) => loadAllPills().find((b) => b.id === id)!.pill.manifest.version);
    const used = pillsInUse(approved, itemsAt(approved, 10), incident);
    expect(used.map((p) => p.pillId)).toEqual(approved.map((a) => a.bundle.id));
    const ts = used.find((p) => p.pillId === TS)!;
    expect(loadedPillLabel(ts)).toBe(`Chilled water leak v${ts.version} · ${ts.ruleCount} rules`);
    expect(ts.ruleCount).toBe(approved.find((a) => a.bundle.id === TS)!.pill.rules.length);
  });

  it("counts triggered and blocked rules from the engine at the gate step (TS-07 blocks)", () => {
    const approved = approvedAt((id) => loadAllPills().find((b) => b.id === id)!.pill.manifest.version);
    const items = itemsAt(approved, 10);
    const ts = pillsInUse(approved, items, incident).find((p) => p.pillId === TS)!;
    expect(ts.triggered).toBe(items.filter((i) => i.entry.bundle.id === TS).length);
    expect(ts.blocked).toBeGreaterThanOrEqual(1);
    expect(activityLabel(ts)).toMatch(/^\d+ triggered · \d+ blocked$/);
    expect(activityLabel({ triggered: 0, blocked: 0 })).toBe("None triggered yet");
  });

  it("notes drift only for the recorded pill, when the evaluated version differs from the one at open", () => {
    const same = pillsInUse(approvedAt(() => incident.pill_version), [], incident);
    expect(same.every((p) => p.openedUnder === undefined)).toBe(true);
    const moved = pillsInUse(approvedAt(() => "9.9.0"), [], incident);
    expect(moved.find((p) => p.pillId === TS)!.openedUnder).toBe(incident.pill_version);
    expect(moved.filter((p) => p.pillId !== TS).every((p) => p.openedUnder === undefined)).toBe(true);
    expect(driftLabel(moved.find((p) => p.pillId === TS)!)).toBe(`Opened under v${incident.pill_version}; now evaluated with v9.9.0`);
  });
});

describe("expert call links", () => {
  it("links TS-07's quote into the call at the moment it was said", () => {
    const pill = loadAllPills().find((b) => b.id === TS)!.pill;
    const quote = expertQuoteFor(pill, pill.rules.find((r) => r.id === "TS-07")!)!;
    expect(quote.source).toBe(EXPERT_CALL_INTERVIEW_ID);
    expect(expertCallHref(quote.source, quote.start)).toBe(routes.capture("00:14:32"));
  });

  it("offers no link for a quote from a call the app cannot play, or without a time", () => {
    expect(expertCallHref("te-interview-2026-10-03", "00:01:00")).toBeNull();
    expect(expertCallHref(EXPERT_CALL_INTERVIEW_ID, "")).toBeNull();
    expect(expertCallHref(undefined, "00:14:32")).toBeNull();
  });

  it("accepts only HH:MM:SS seeks", () => {
    expect(parseCallTime("00:14:32")).toBe("00:14:32");
    expect(parseCallTime(["00:14:32", "x"])).toBe("00:14:32");
    expect(parseCallTime("14:32")).toBeUndefined();
    expect(parseCallTime("javascript:alert(1)")).toBeUndefined();
    expect(parseCallTime(undefined)).toBeUndefined();
  });
});
