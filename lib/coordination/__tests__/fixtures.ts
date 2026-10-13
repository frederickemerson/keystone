// Real pills + real demo data, assembled the way the Incident Room assembles
// them, so the coordination tests run on the input the room actually gives the
// detector — not on a hand-made shape that could agree with the code and
// disagree with the product.

import { loadAsset, loadIncident, loadTimeline } from "@/lib/data";
import type { Asset, Evidence, Incident } from "@/lib/engine/types";
import { listPillRefs, loadPill } from "@/lib/pills/load";
import type { CoordinationInput, CoordinationPill } from "../detect";

/** The incident data/coordination.yaml grounds XP-01 in. */
export const GROUNDED_INCIDENT = "INC-2026-1011";

/** Every pill on disk, at its authored version, as the room holds them. */
export function roomPills(): CoordinationPill[] {
  return listPillRefs().map((ref) => {
    const bundle = loadPill(ref.id);
    if (bundle === undefined) throw new Error(`pill ${ref.id} is listed but did not load`);
    return { pillId: bundle.id, pillVersion: bundle.pill.manifest.version, pill: bundle.pill };
  });
}

export function timelineLength(incidentId: string): number {
  const timeline = loadTimeline(incidentId);
  if (timeline === undefined) throw new Error(`no timeline for ${incidentId}`);
  return timeline.events.length;
}

/** Engine inputs for `incidentId` after the first `step` timeline events. */
export function roomInput(incidentId: string, step: number): CoordinationInput {
  const incident = loadIncident(incidentId);
  if (incident === undefined) throw new Error(`no incident ${incidentId}`);
  const record = loadAsset(incident.asset_id);
  if (record === undefined) throw new Error(`no asset ${incident.asset_id}`);
  const timeline = loadTimeline(incidentId);
  if (timeline === undefined) throw new Error(`no timeline for ${incidentId}`);

  const evidence: Evidence = {};
  for (const event of timeline.events.slice(0, step)) {
    for (const [key, update] of Object.entries(event.evidence_updates)) {
      evidence[key] = { value: update.value, confirmed: update.confirmed, source: event.source, at: event.at };
    }
  }

  const { id, name, type, ...attributes } = record;
  const asset: Asset = { id, name, type, attributes };
  const engineIncident: Incident = { ...incident };
  return { pills: roomPills(), asset, incident: engineIncident, evidence };
}

/** The same inputs with one evidence key forced to a confirmed value. */
export function withEvidence(input: CoordinationInput, keys: readonly string[], value: unknown): CoordinationInput {
  const evidence: Evidence = { ...input.evidence };
  for (const key of keys) {
    evidence[key] = { value, confirmed: true, source: "test", at: "2026-10-11T12:00:00+08:00" };
  }
  return { ...input, evidence };
}
