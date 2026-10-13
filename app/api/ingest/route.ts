import { loadTimeline } from '@/lib/data';
import { ingestRequestSchema, ingestResponseSchema, type IngestResponse } from '@/lib/ingest/contract';
import { catalogOf, gatingKeysOf } from '@/lib/ingest/evidence';
import { takeIngestPost } from '@/lib/ingest/limits';
import { INGEST_NOTE, dispositionOf, mapIngest } from '@/lib/ingest/map';
import { INGEST_SOURCES, ingestConnector } from '@/lib/ingest/sources';
import { readRequest } from '@/lib/llm/requests';
import { loadAllPills } from '@/lib/pills/load';
import { callerOf, signInRequired } from '@/lib/ratelimit/caller';
import { retryHeaders } from '@/lib/ratelimit/policies';

// Evidence ingestion: one building system posts its own payload (iBMS or
// leak-panel points, CMMS work orders) and gets it back as evidence keys.
//
// Nothing is stored and no gate moves. The response says, per observation,
// whether it is confirmed and whether it could gate a decision — and an item a
// gate needs is never confirmed here. That line is enforced three times over:
// in lib/ingest/map.ts where it is decided, in the response schema, which
// cannot represent a confirmed gating key, and in the data by the connectors
// and consistency tests.

export const runtime = 'nodejs';
export const maxDuration = 10;

const NO_STORE = { 'Cache-Control': 'no-store' };

function error(message: string, status: number, headers: Record<string, string> = {}): Response {
  return Response.json({ error: message }, { status, headers: { ...NO_STORE, ...headers } });
}

/** The pills' two facts about evidence, read fresh so a pill edit shows up at once. */
function evidenceFacts() {
  const pills = loadAllPills();
  return { gatingKeys: gatingKeysOf(pills), catalog: catalogOf(pills) };
}

export async function POST(request: Request) {
  const caller = await callerOf(request);
  if (!caller) return signInRequired();

  const input = await readRequest(request, ingestRequestSchema);
  if (input instanceof Response) return input;

  const quota = takeIngestPost(caller);
  if (!quota.ok) return error('Rate limit', 429, retryHeaders(quota));

  // The incident has to exist: evidence belongs to one.
  if (!loadTimeline(input.incidentId)) return error('Unknown incident.', 404);

  const { gatingKeys, catalog } = evidenceFacts();
  const outcome = mapIngest(input, { gatingKeys, catalog, receivedAt: new Date().toISOString() });
  // Only reachable if the request schema and the binding table disagree: our
  // bug, not the caller's, so it says nothing about the repository's insides.
  if (!outcome.ok) return error('Ingestion is not wired for this system.', 500);

  // Parsing our own answer is the second enforcement: the schema refuses a
  // confirmed gating key, so a future mapping bug fails here instead of lying.
  const body: IngestResponse = ingestResponseSchema.parse(outcome.response);
  return Response.json(body, { headers: NO_STORE });
}

/** The ingestion contract: what may be posted, and what it can and cannot confirm. */
export async function GET(request: Request) {
  const caller = await callerOf(request);
  if (!caller) return signInRequired();

  const { gatingKeys, catalog } = evidenceFacts();
  const systems = Object.entries(INGEST_SOURCES).map(([system, source]) => {
    const connector = ingestConnector(system);
    return {
      system,
      shape: source.shape,
      connectorId: source.connectorId,
      connectorLabel: connector?.label ?? null,
      canConfirmGateEvidence: connector?.canConfirmGateEvidence ?? false,
      signals: Object.entries(source.bindings).map(([signal, binding]) => ({
        signal,
        key: binding.key,
        label: catalog[binding.key]?.label ?? null,
        brickClass: binding.brickClass ?? null,
        gating: gatingKeys.has(binding.key),
        // The same decision the mapping makes, so this contract cannot overstate it.
        disposition: connector ? dispositionOf(binding.key, connector, gatingKeys) : 'refused_gating',
      })),
    };
  });
  return Response.json({ systems, note: INGEST_NOTE }, { headers: NO_STORE });
}
