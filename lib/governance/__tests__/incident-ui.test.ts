// The Why drawer lists the evidence keys the ENGINE gates on — including keys
// added by matching exceptions — not a re-derivation from required_evidence.

import { describe, expect, it } from "vitest";
import {
  accumulateEvidence,
  evidenceKeysForRule,
  toEngineAsset,
  toEngineEvidence,
  toEngineIncident,
} from "@/components/incident/engineInputs";
import { loadAsset, loadIncident, loadTimeline } from "@/lib/data";
import { loadPill } from "@/lib/pills/load";

describe("evidenceKeysForRule", () => {
  const pill = loadPill("technical-services-chilled-water-leak")!.pill;
  const ts07 = pill.rules.find((r) => r.id === "TS-07")!;
  const ctxFor = (incidentId: string) => {
    const incident = loadIncident(incidentId)!;
    const events = loadTimeline(incidentId)!.events;
    return {
      asset: toEngineAsset(loadAsset(incident.asset_id)!),
      incident: toEngineIncident(incident),
      evidence: toEngineEvidence(accumulateEvidence(events, events.length)),
    };
  };

  it("includes exception-added gating keys where the exception applies (TS-07 at a data centre → cfm_cosign)", () => {
    const keys = evidenceKeysForRule(ts07, ctxFor("INC-2026-1012"));
    expect(keys).toEqual(expect.arrayContaining([...ts07.required_evidence, "cfm_cosign"]));
  });

  it("does not list them where it does not (TS-07 at an office)", () => {
    const keys = evidenceKeysForRule(ts07, ctxFor("INC-2026-1011"));
    expect(keys).toEqual(expect.arrayContaining(ts07.required_evidence));
    expect(keys).not.toContain("cfm_cosign");
  });
});
