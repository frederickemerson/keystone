import { askAdp } from '@/lib/adp/client';
import {
  MAX_THREAD_TURNS,
  adpAskRequestSchema,
  composeAdpPrompt,
  failureDetail,
  type AdpAskResponse,
} from '@/lib/adp/ask';
import { commitTurn, newThreadId, threadFor } from '@/lib/adp/conversations';
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
//
// FOLLOW-UPS. A reader can continue the exchange, because what the challenge
// owner asked for is a discussion with the agent and not a question box. The
// ADP conversation id is resolved server-side from the signed session
// (lib/adp/conversations.ts) and never crosses the wire, so one session cannot
// resume another's thread. Resolving it runs BEFORE the quota check: a
// follow-up with no thread left to continue is refused for free, since a
// reader who lands on a cold instance should not lose one of very few calls to
// a refusal they did not cause.

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

  const now = Date.now();
  const thread = input.turn === 'follow_up' ? threadFor(caller.sessionId, now) : null;
  if (input.turn === 'follow_up') {
    if (!thread) return reply({ ok: false, reason: 'no_thread', detail: failureDetail('no_thread') }, 409);
    if (thread.turns >= MAX_THREAD_TURNS) {
      return reply({ ok: false, reason: 'thread_full', detail: failureDetail('thread_full') }, 409);
    }
  }
  const conversationId = thread?.conversationId ?? newThreadId();
  const turn = (thread?.turns ?? 0) + 1;

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

  const result = await askAdp(composeAdpPrompt(input.question, input.turn, thread?.lastQuestion ?? null), {
    visitorId: caller.sessionId,
    conversationId,
  });
  if (!result.ok) {
    // Nothing is committed: a failed call must not consume a turn, and must not
    // leave the reader in a thread whose first answer never arrived.
    return reply({ ok: false, reason: result.reason, detail: failureDetail(result.reason, result.detail) }, 502);
  }
  commitTurn(caller.sessionId, conversationId, input.question, now);

  return reply({
    ok: true,
    text: result.text,
    knowledgePassages: result.knowledgePassages,
    turn,
    turnsLeft: MAX_THREAD_TURNS - turn,
    latencyMs: result.latencyMs,
    requestId: result.requestId,
  });
}
