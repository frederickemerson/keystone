import { askAdp } from '@/lib/adp/client';
import { adpAskRequestSchema, composeAdpPrompt, failureDetail, type AdpAskResponse } from '@/lib/adp/ask';
import { readRequest } from '@/lib/llm/requests';
import { callerOf, signInRequired } from '@/lib/ratelimit/caller';
import { retryHeaders, takeAdpCall } from '@/lib/ratelimit/policies';

// Ask the published Tencent Cloud ADP agent a question about the approved pill.
//
// COST GUARD. Every call here spends the account's own ADP quota, and the demo
// passcode ships with the submission, so a session alone proves nothing about
// who is asking. takeAdpCall() carries the tightest limits in the project
// (lib/ratelimit/policies.ts) and runs BEFORE the outbound call, so a refused
// request costs nothing at Tencent. Over quota is a plain 429 — there is no
// recorded fallback here, because a recorded answer would be indistinguishable
// from the live agent's and this endpoint exists precisely to show the
// difference between a grounded answer and an ungrounded one.
//
// The answer is a DRAFT for a person to read. No gate decision reads it:
// lib/engine takes no model input at all.

export const runtime = 'nodejs';
export const maxDuration = 30;

const NO_STORE = { 'Cache-Control': 'no-store' };

function reply(body: AdpAskResponse, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export async function POST(request: Request) {
  const caller = await callerOf(request);
  if (!caller) return signInRequired();

  const input = await readRequest(request, adpAskRequestSchema);
  if (input instanceof Response) return input;

  const quota = takeAdpCall(caller);
  if (!quota.ok) {
    return reply(
      {
        ok: false,
        reason: 'rate_limited',
        detail: `This demo caps how often the live ADP agent can be asked, because every call spends real agent quota. Try again in ${quota.retryAfterSeconds}s.`,
      },
      429,
      retryHeaders(quota),
    );
  }

  const result = await askAdp(composeAdpPrompt(input.question), { visitorId: caller.sessionId });
  if (!result.ok) {
    return reply({ ok: false, reason: result.reason, detail: failureDetail(result.reason, result.detail) }, 502);
  }

  return reply({
    ok: true,
    text: result.text,
    knowledgePassages: result.knowledgePassages,
    latencyMs: result.latencyMs,
    requestId: result.requestId,
  });
}
