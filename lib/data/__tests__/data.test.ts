import { describe, expect, it } from "vitest";
import {
  listLlmFixtureIds,
  loadAllTimelines,
  loadAssets,
  loadContradictionFixture,
  loadExtractionFixture,
  loadIncident,
  loadIncidentSummaryFixture,
  loadIncidents,
  loadRoles,
  loadTenantMessageFixture,
  loadTimeline,
  loadTranscript,
} from "..";

describe("data loaders (zod-validated)", () => {
  it("loads assets, incidents and roles", () => {
    expect(loadAssets().map((a) => a.id)).toEqual(expect.arrayContaining(["asset-hf1", "asset-hfdc1"]));
    expect(loadIncidents().length).toBeGreaterThanOrEqual(2);
    expect(loadIncident("INC-2026-1011")?.affected_tenant?.sensitivity).toBe("tenant_pii");
    expect(loadRoles().map((r) => r.role)).toEqual(["technician", "asset_operations_manager", "tenant_experience", "executive"]);
  });

  it("every incident timeline_ref resolves to a timeline", () => {
    for (const inc of loadIncidents().filter((i) => i.timeline_ref)) {
      expect(loadTimeline(inc.id)?.incident_id).toBe(inc.id);
    }
    expect(loadAllTimelines().length).toBe(2);
    expect(loadTimeline("INC-NOPE")).toBeUndefined();
  });

  it("loads the transcript and all LLM fixtures", () => {
    expect(loadTranscript("ce-interview-2026-10-02")?.turns.length).toBeGreaterThan(0);
    expect(listLlmFixtureIds()).toHaveLength(4);
    expect(loadExtractionFixture().rule_candidates.length).toBeGreaterThan(0);
    expect(loadContradictionFixture().contradiction.detected).toBe(true);
    expect(loadTenantMessageFixture("INC-2026-1011")?.drafts.length).toBeGreaterThan(0);
    expect(loadIncidentSummaryFixture("INC-2026-1011")?.summary.incident_id).toBe("INC-2026-1011");
  });
});
