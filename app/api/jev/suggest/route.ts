import { loadTimeline } from '@/lib/data';
import { sessionRole } from '@/lib/auth/session';
import { canSee } from '@/lib/governance/access';
import { askNoul, type NoulQuestion } from '@/lib/jev/client';
import { readRequest } from '@/lib/llm/requests';
import { loadPill } from '@/lib/pills/load';
import { callerOf, signInRequired } from '@/lib/ratelimit/caller';
import { retryHeaders, takeJevCall } from '@/lib/ratelimit/policies';
import {
  isSuggestableKey,
  questionFor,
  suggestRequestSchema,
  suggestResponseSchema,
  type SuggestResponse,
} from '@/lib/jev/suggestions';

// Fast, UNCONFIRMED evidence suggestions from Jev for one timeline event.
// Never changes engine state: the response is probabilities only. Evidence
// becomes confirmed solely through a human's confirmEvidence (governance store).
// On timeout / any failure → "suggestions unavailable" (no LLM fallback).

export const runtime = 'nodejs';
export const maxDuration = 10;

const NO_STORE = { 'Cache-Control': 'no-store' };

function reply(body: SuggestResponse, status = 200, headers: Record<string, string> = {}) {
  return Response.json(suggestResponseSchema.parse(body), { status, headers: { ...NO_STORE, ...headers } });
}

export async function POST(request: Request) {
  const caller = await callerOf(request);
  if (!caller) return signInRequired();
  const input = await readRequest(request, suggestRequestSchema);
  if (input instanceof Response) return input;

  const bundle = loadPill(input.pillId);
  if (!bundle) return Response.json({ error: 'Unknown pill.' }, { status: 404 });
  const catalog = bundle.pill.evidenceCatalog;
  // Only boolean keys the pill's evidence.yaml declares may be asked about;
  // question text is the expert-authored label/description, never caller text.
  if (!input.keys.every((k) => isSuggestableKey(catalog, k))) {
    return Response.json({ error: 'Keys must be boolean evidence declared by the pill.' }, { status: 400 });
  }

  const event = loadTimeline(input.incidentId)?.events.find((e) => e.id === input.eventId);
  if (!event) return Response.json({ error: 'Unknown timeline event.' }, { status: 404 });
  // The event text goes to Jev only for a caller cleared to read it.
  if (!canSee(await sessionRole(), event.sensitivity)) {
    return reply({ available: false, reason: 'Event is above your clearance.' }, 403);
  }

  // Cost guard: each call below is one metered Jev request.
  const quota = takeJevCall(caller);
  if (!quota.ok) return reply({ available: false, reason: 'Rate limit' }, 429, retryHeaders(quota));

  const questions: Record<string, NoulQuestion> = Object.fromEntries(
    input.keys.map((k) => [k, { type: 'noul', instructions: questionFor(catalog, k) }]),
  );
  const result = await askNoul(event.text, questions);
  if (!result.ok) {
    return reply({ available: false, reason: result.reason === 'timeout' ? 'Jev timed out' : 'Suggestions unavailable' });
  }
  return reply({
    available: true,
    model: result.model,
    latencyMs: result.latencyMs,
    suggestions: input.keys
      .map((key) => ({ key, label: catalog[key].label, probability: result.probabilities[key] }))
      .sort((a, b) => b.probability - a.probability),
  });
}
