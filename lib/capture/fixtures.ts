// Recorded demo transcripts for frontline capture (data/fixtures/capture).
//
// Client-safe. These are AUTHORED demo notes: no audio was recorded and no
// recogniser produced them, so a note built from one is stamped
// provider "fixture" (asr-sources fixtureSource). A fixture's recorded
// extraction is only ever used for a note whose transcript is exactly the
// fixture's (note-flow extractionForNote), never for anything a worker said.

import closeoutChwR2 from "@/data/fixtures/capture/closeout-chw-r2.json";
import qrAhu2301 from "@/data/fixtures/capture/qr-ahu-23-01.json";
import { isKnownRole } from "@/lib/governance/access";
import { draftExtractionSchema, type CandidateParse } from "@/lib/llm/candidates";
import { z } from "@/lib/zod";
import { MAX_NOTE_DURATION_SEC, MAX_TRANSCRIPT_CHARS, resolveAssetRef } from "./contract";

/** Placeholder note id in a fixture's provenance ("NOTE#00:00:00"), bound to the real note id on use. */
const NOTE_REF = "NOTE";

const captureFixtureSchema = z.object({
  fixture_id: z.string().regex(/^capture-[a-z0-9-]+$/),
  fixture_type: z.literal("capture_transcript"),
  description: z.string().min(1),
  asset_id: z.string().refine((id) => resolveAssetRef(id) !== null, { message: "asset_id not in the register" }),
  speaker_role: z.string().refine(isKnownRole, { message: "speaker_role is not a roles.json role" }),
  duration_sec: z.number().positive().max(MAX_NOTE_DURATION_SEC),
  transcript: z.string().trim().min(1).max(MAX_TRANSCRIPT_CHARS),
  recorded_extraction: z
    .object({
      model: z.string().min(1),
      generated_at: z.iso.datetime({ offset: true }),
      rule_candidates: z.array(z.record(z.string(), z.unknown())).max(4),
    })
    .nullable(),
});

export interface CaptureFixture {
  id: string;
  description: string;
  assetId: string;
  speakerRole: string;
  durationSec: number;
  transcript: string;
  /** The model (or "authored demo extraction") the recorded drafts came from; null when there are none. */
  extractionModel: string | null;
  /** Recorded drafts for this exact transcript, provenance bound to `noteId`. */
  extractionFor: (noteId: string) => CandidateParse | null;
}

function load(raw: unknown): CaptureFixture {
  const f = captureFixtureSchema.parse(raw);
  const extraction = f.recorded_extraction;
  if (extraction) draftExtractionSchema.parse({ rule_candidates: extraction.rule_candidates });
  return {
    id: f.fixture_id,
    description: f.description,
    assetId: f.asset_id,
    speakerRole: f.speaker_role,
    durationSec: f.duration_sec,
    transcript: f.transcript,
    extractionModel: extraction?.model ?? null,
    extractionFor: (noteId) =>
      extraction
        ? draftExtractionSchema.parse({
            rule_candidates: extraction.rule_candidates.map((c) => ({
              ...c,
              provenance: (Array.isArray(c.provenance) ? c.provenance : []).map((p) =>
                typeof p === "string" && p.startsWith(`${NOTE_REF}#`) ? `${noteId}${p.slice(NOTE_REF.length)}` : p,
              ),
            })),
          })
        : null,
  };
}

export const CAPTURE_FIXTURES: readonly CaptureFixture[] = [load(qrAhu2301), load(closeoutChwR2)];

/** Demo transcripts for an asset: those recorded on it first, then the rest. */
export function fixturesForAsset(assetId: string): CaptureFixture[] {
  return [...CAPTURE_FIXTURES].sort((a, b) => Number(b.assetId === assetId) - Number(a.assetId === assetId));
}
