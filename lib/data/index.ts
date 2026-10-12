// Keystone demo data — typed, zod-validated loaders for data/*.json.
// Server-only (node:fs). Client components receive the parsed values as props;
// pure schemas/types live in ./schemas so client code can import them.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "@/lib/zod";
import {
  aiProposalFixtureSchema,
  assetsSchema,
  contradictionFixtureSchema,
  extractionFixtureSchema,
  incidentSummaryFixtureSchema,
  incidentsSchema,
  rolesSchema,
  tenantMessageFixtureSchema,
  timelineSchema,
  transcriptSchema,
  type AiProposalFixture,
  type AssetRecord,
  type ContradictionFixture,
  type ExtractionFixture,
  type IncidentRecord,
  type IncidentSummaryFixture,
  type RoleDefinition,
  type TenantMessageFixture,
  type Timeline,
  type Transcript,
} from "./schemas";

export * from "./schemas";

/** Absolute path of the repository's data/ directory. */
export function dataDir(): string {
  return join(process.cwd(), "data");
}

function readJson<T>(relPath: string, schema: z.ZodType<T>): T {
  const file = join(dataDir(), relPath);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`data/${relPath}: ${(err as Error).message}`);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Schema validation error in data/${relPath}: ${issues}`);
  }
  return result.data;
}

function jsonStems(relDir: string): string[] {
  const dir = join(dataDir(), relDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length))
    .sort();
}

// ---------------------------------------------------------------------------
// Assets / incidents / roles
// ---------------------------------------------------------------------------

export function loadAssets(): AssetRecord[] {
  return readJson("assets.json", assetsSchema);
}

export function loadAsset(id: string): AssetRecord | undefined {
  return loadAssets().find((a) => a.id === id);
}

export function loadIncidents(): IncidentRecord[] {
  return readJson("incidents.json", incidentsSchema);
}

export function loadIncident(id: string): IncidentRecord | undefined {
  return loadIncidents().find((i) => i.id === id);
}

export function loadRoles(): RoleDefinition[] {
  return readJson("roles.json", rolesSchema);
}

// ---------------------------------------------------------------------------
// Timelines (data/timelines/<incidentId>.json)
// ---------------------------------------------------------------------------

export function listTimelineIds(): string[] {
  return jsonStems("timelines");
}

/** Timeline for an incident, or undefined when the incident has none. */
export function loadTimeline(incidentId: string): Timeline | undefined {
  if (!listTimelineIds().includes(incidentId)) return undefined;
  return readJson(join("timelines", `${incidentId}.json`), timelineSchema);
}

export function loadAllTimelines(): Timeline[] {
  return listTimelineIds().map((id) => readJson(join("timelines", `${id}.json`), timelineSchema));
}

// ---------------------------------------------------------------------------
// Transcripts (data/transcripts/<interviewId>.json)
// ---------------------------------------------------------------------------

export function listTranscriptIds(): string[] {
  return jsonStems("transcripts");
}

export function loadTranscript(interviewId: string): Transcript | undefined {
  if (!listTranscriptIds().includes(interviewId)) return undefined;
  return readJson(join("transcripts", `${interviewId}.json`), transcriptSchema);
}

// ---------------------------------------------------------------------------
// Recorded LLM fallbacks (data/fixtures/llm/*.json)
// ---------------------------------------------------------------------------

const FIXTURES = join("fixtures", "llm");

export function listLlmFixtureIds(): string[] {
  return jsonStems(FIXTURES);
}

export function loadExtractionFixture(): ExtractionFixture {
  return readJson(join(FIXTURES, "extraction.json"), extractionFixtureSchema);
}

export function loadContradictionFixture(): ContradictionFixture {
  return readJson(join(FIXTURES, "contradiction.json"), contradictionFixtureSchema);
}

export function loadTenantMessageFixture(incidentId: string): TenantMessageFixture | undefined {
  const stem = `tenant-message-${incidentId}`;
  if (!listLlmFixtureIds().includes(stem)) return undefined;
  return readJson(join(FIXTURES, `${stem}.json`), tenantMessageFixtureSchema);
}

export function loadIncidentSummaryFixture(incidentId: string): IncidentSummaryFixture | undefined {
  const stem = `incident-summary-${incidentId}`;
  if (!listLlmFixtureIds().includes(stem)) return undefined;
  return readJson(join(FIXTURES, `${stem}.json`), incidentSummaryFixtureSchema);
}

export function loadAiProposalFixture(incidentId: string): AiProposalFixture | undefined {
  const stem = `ai-proposals-${incidentId}`;
  if (!listLlmFixtureIds().includes(stem)) return undefined;
  return readJson(join(FIXTURES, `${stem}.json`), aiProposalFixtureSchema);
}
