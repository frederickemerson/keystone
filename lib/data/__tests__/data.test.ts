import { describe, expect, it } from "vitest";
import {
  listLlmFixtureIds,
  loadAiProposalFixture,
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
    expect(loadRoles().map((r) => r.role)).toEqual(
      expect.arrayContaining([
        "technician",
        "asset_operations_manager",
        "tenant_experience_manager",
        "executive",
        "head_technical_services",
        "chief_engineer",
        "duty_lew",
      ]),
    );
    expect(loadRoles().every((r) => r.person.length > 0)).toBe(true);
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
    expect(listLlmFixtureIds()).toHaveLength(6);
    expect(loadAiProposalFixture("INC-2026-1011")?.proposals[0]?.rule_id).toBe("TS-07");
    expect(loadAiProposalFixture("INC-2026-1012")?.proposals[0]?.rule_id).toBe("TS-07");
    expect(loadExtractionFixture().rule_candidates.length).toBeGreaterThan(0);
    expect(loadContradictionFixture().contradiction.detected).toBe(true);
    expect(loadTenantMessageFixture("INC-2026-1011")?.drafts.length).toBeGreaterThan(0);
    expect(loadIncidentSummaryFixture("INC-2026-1011")?.summary.incident_id).toBe("INC-2026-1011");
  });
});
