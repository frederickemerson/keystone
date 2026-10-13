import 'server-only';

import {
  ADP_CHAT_URL,
  ADP_DEFAULT_TIMEOUT_MS,
  ADP_MAX_ANSWER_CHARS,
  adpAppKey,
  adpChatRequestSchema,
  adpErrorSchema,
  adpTextDeltaSchema,
  deltaText,
  newAdpId,
} from './contract';
import { createSseParser, type SseEvent } from './sse';
import { recordAdpSuccess, type Env } from './status';

/**
 * Tencent Cloud ADP Chat API client (SSE).
 *
 * ADP is the enterprise host a pill would be published to, so Keystone can also
 * ask an ADP agent a question. Like every model in this codebase it does
 * LANGUAGE work only: its answer is a draft for a named person to read. No gate
 * decision reads it — lib/engine takes no model input at all.
 *
 * The AppKey is read from the server environment and never logged, returned, or
 * put in an error message. Never throws: every failure is a typed `ok: false`.
 */

export type AdpFailureReason =
  | 'not_configured'
  | 'invalid_request'
  | 'timeout'
  | 'http_error'
  | 'api_error'
  | 'invalid_response'
  | 'network_error';

export type AdpChatResult =
  | {
      ok: true;
      text: string;
      /** Knowledge-base citations the agent attached. */
      references: number;
      requestId: string;
      conversationId: string;
      latencyMs: number;
    }
  | {
      ok: false;
      reason: AdpFailureReason;
      latencyMs: number;
      /** HTTP status, when the failure was one. */
      status?: number;
      /** ADP's own error code (e.g. 4505004 "App key invalid"). */
      code?: number;
      /** A short explanation, safe to show: never the AppKey, never the prompt. */
      detail?: string;
    };

export interface AdpAskOptions {
  /** Who is asking, for ADP's own session bookkeeping. A role or session id — never a person's name. */
  visitorId: string;
  /** Continue an existing ADP conversation; a new 32-character id by default. */
  conversationId?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
  env?: Env;
}

/** An SSE event that carries ADP's error envelope with a non-zero code. */
function errorEnvelope(event: SseEvent): { code: number; message: string } | null {
  if (event.data === '') return null;
  let body: unknown;
  try {
    body = JSON.parse(event.data);
  } catch {
    return null;
  }
  const parsed = adpErrorSchema.safeParse(body);
  return parsed.success && parsed.data.Code !== 0 ? { code: parsed.data.Code, message: parsed.data.Message } : null;
}

/** The error envelope in a non-streamed body, e.g. the bogus-AppKey answer. */
function bodyEnvelope(raw: string): { code: number; message: string } | null {
  return errorEnvelope({ event: '', data: raw });
}

export async function askAdp(prompt: string, options: AdpAskOptions): Promise<AdpChatResult> {
  const {
    visitorId,
    conversationId = newAdpId(),
    timeoutMs = ADP_DEFAULT_TIMEOUT_MS,
    fetchImpl = fetch,
    now = () => performance.now(),
    env = process.env,
  } = options;
  const started = now();
  const elapsed = () => Math.round(now() - started);

  const appKey = adpAppKey(env);
  if (!appKey) return { ok: false, reason: 'not_configured', latencyMs: 0 };

  const requestId = newAdpId();
  const request = adpChatRequestSchema.safeParse({
    RequestId: requestId,
    ConversationId: conversationId,
    AppKey: appKey,
    Contents: [{ Type: 'text', Text: prompt }],
    VisitorId: visitorId,
    Stream: true,
  });
  if (!request.success) {
    // ADP pins ConversationId/VisitorId formats; a bad one is our bug, not theirs.
    return { ok: false, reason: 'invalid_request', latencyMs: 0, detail: 'The ADP request did not match the documented field rules.' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(ADP_CHAT_URL, {
      method: 'POST',
      // No signature: the AppKey in the body is the whole credential.
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(request.data),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const envelope = bodyEnvelope(await response.text().catch(() => ''));
      return envelope
        ? { ok: false, reason: 'api_error', latencyMs: elapsed(), status: response.status, code: envelope.code, detail: envelope.message }
        : { ok: false, reason: 'http_error', latencyMs: elapsed(), status: response.status };
    }

    // A JSON body where a stream was asked for is ADP reporting a problem
    // (the live bogus-key probe answered {"Code":4505004,"Message":…}).
    if (response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      const envelope = bodyEnvelope(await response.text().catch(() => ''));
      return envelope
        ? { ok: false, reason: 'api_error', latencyMs: elapsed(), code: envelope.code, detail: envelope.message }
        : { ok: false, reason: 'invalid_response', latencyMs: elapsed(), detail: 'ADP answered with JSON where an event stream was expected.' };
    }

    const reader = response.body?.getReader();
    if (!reader) return { ok: false, reason: 'invalid_response', latencyMs: elapsed(), detail: 'ADP answered with no body.' };

    const decoder = new TextDecoder();
    const parser = createSseParser();
    let text = '';
    let references = 0;
    let finished = false;

    const handle = (event: SseEvent): AdpChatResult | null => {
      const envelope = errorEnvelope(event);
      if (envelope) return { ok: false, reason: 'api_error', latencyMs: elapsed(), code: envelope.code, detail: envelope.message };
      switch (event.event) {
        case 'text.delta': {
          const parsed = adpTextDeltaSchema.safeParse(JSON.parse(event.data));
          if (!parsed.success) {
            return { ok: false, reason: 'invalid_response', latencyMs: elapsed(), detail: 'A text.delta event did not carry readable text.' };
          }
          text += deltaText(parsed.data);
          if (text.length > ADP_MAX_ANSWER_CHARS) {
            return { ok: false, reason: 'invalid_response', latencyMs: elapsed(), detail: 'The ADP answer exceeded the size Keystone accepts.' };
          }
          return null;
        }
        case 'reference.added':
          references += 1;
          return null;
        case 'response.completed':
        case 'done':
          finished = true;
          return null;
        default:
          // An event ADP added since the docs were written: ignored, not failed.
          return null;
      }
    };

    try {
      for (;;) {
        const { done, value } = await reader.read();
        const events = done ? parser.flush() : parser.push(value ? decoder.decode(value, { stream: true }) : '');
        for (const event of events) {
          let outcome: AdpChatResult | null;
          try {
            outcome = handle(event);
          } catch {
            // Unparseable JSON in a data: line.
            outcome = { ok: false, reason: 'invalid_response', latencyMs: elapsed(), detail: 'An ADP event carried a body that is not JSON.' };
          }
          if (outcome) {
            await reader.cancel().catch(() => undefined);
            return outcome;
          }
        }
        if (done || finished) break;
      }
    } finally {
      reader.releaseLock();
    }

    if (!finished || text === '') {
      return {
        ok: false,
        reason: 'invalid_response',
        latencyMs: elapsed(),
        detail: finished ? 'ADP completed the response with no text.' : 'The ADP stream ended before the response was complete.',
      };
    }

    const latencyMs = elapsed();
    // The one place a status can become "verified": a real answer, in hand.
    recordAdpSuccess({ requestId, at: new Date().toISOString(), latencyMs, answerChars: text.length });
    return { ok: true, text, references, requestId, conversationId, latencyMs };
  } catch (err) {
    const aborted = controller.signal.aborted || (err as { name?: string } | null)?.name === 'AbortError';
    return { ok: false, reason: aborted ? 'timeout' : 'network_error', latencyMs: elapsed() };
  } finally {
    clearTimeout(timer);
  }
}
