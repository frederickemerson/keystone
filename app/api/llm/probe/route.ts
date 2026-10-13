import contradictionFixture from '@/data/fixtures/llm/contradiction.json';
import type { Generation } from '@/lib/llm/attribution';
import {
  buildProbePrompt, interviewContext, probeDraftSchema, recordedProbe, type ProbeDraft,
} from '@/lib/llm/interview';
import { expectedLiveProvider, generateJson, type LlmTask } from '@/lib/llm/providers';
import { probeRequestSchema, readRequest } from '@/lib/llm/requests';
import { callerOf, signInRequired } from '@/lib/ratelimit/caller';
import { retryHeaders, takeLlmCall } from '@/lib/ratelimit/policies';

export const runtime = 'nodejs';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * providers.ts keys both its decode-time contract (STRUCTURED_OUTPUT) and its
 * recorded-fixture registry by LlmTask and does not list 'probe' yet. That file
 * belongs to another workstream, so registering it is an integration note, not
 * an edit here. Two consequences, both measured against live hy4-preview on
 * 13 Oct 2026:
 *
 *  - No decode contract. In free JSON mode the model omitted the resolution
 *    fields that keep both statements in three of six answers and the guard
 *    refused them; decoding against `probeWireSchema` instead, four of four
 *    passed. Until the task is registered a refused answer falls back below,
 *    with the reason, rather than claiming anything.
 *  - No terminal fixture. Chain exhaustion raises inside generateJson rather
 *    than returning, so this route owns the recorded probe — which it has to
 *    anyway: the guard is bound to the submitted window, and no static fixture
 *    can be grounded in a window it has never seen.
 *
 * The `string` annotation is what keeps the call below a single narrowing
 * assertion; registering the task removes the annotation and the assertion.
 */
const PROBE_TASK: string = 'probe';

export async function POST(request: Request) {
  const caller = await callerOf(request);
  if (!caller) return signInRequired();
  const input = await readRequest(request, probeRequestSchema);
  if (input instanceof Response) return input;

  // Retrieve: the expert's own statements, grouped by the captured rule each produced.
  const context = interviewContext(input);
  const recorded = (reason: string): Generation<ProbeDraft> => ({
    data: recordedProbe(context, contradictionFixture.contradiction), source: 'recorded', provider: 'fixtures',
    model: contradictionFixture.model, latencyMs: 0, attempts: [], reason,
  });

  // Cost guard: over quota → the recorded probe (same guard as live output), status 429.
  const quota = takeLlmCall(caller);
  if (!quota.ok) {
    return Response.json(recorded('Live rate limit reached; showing the recorded probe.'), {
      status: 429, headers: { ...NO_STORE, ...retryHeaders(quota) },
    });
  }
  // Nothing in the chain has credentials: say so instead of spending the budget
  // discovering it. Same selection the page's badge reads.
  if (!expectedLiveProvider()) {
    return Response.json(recorded('No live provider is configured; showing the recorded probe.'), { headers: NO_STORE });
  }

  // Why a live answer was refused, for the status line. The chain only reports
  // that an attempt was "rejected", and a fallback that cannot say why is a
  // weaker status than one that can. Fixed guard text, never model output.
  const refusals: string[] = [];
  const result = await generateJson(
    PROBE_TASK as LlmTask, buildProbePrompt(context), probeDraftSchema(context, (reason) => refusals.push(reason)),
  ).catch(() => recorded(refusals.length
    ? `Live output failed the grounding guard (${refusals[0]}); showing the recorded probe.`
    : 'No live provider answered; showing the recorded probe.'));
  return Response.json(result, { headers: NO_STORE });
}
