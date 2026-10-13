// Tencent Cloud ADP (Agent Development Platform) Chat API — the wire contract.
//
// Pure: endpoint, id rules and schemas only. No credentials, no I/O, so the
// shapes can be tested and the status code can import them anywhere.
//
// The Chat API needs NO request signing and NO SecretId/SecretKey — a plain
// HTTPS POST carrying an AppKey string in the JSON body. A POST with a bogus
// key answers {"Code":4505004,"Message":"App key invalid"}, which is how we
// know the endpoint is real and the AppKey alone is the whole credential.
//
// PROBED LIVE on 2026-10-13 against the published "Keystone Pill Agent" app.
// The live stream disagrees with the written docs in three ways, and every one
// of them silently breaks a client built from the docs alone:
//
//   1. `Stream` is a STRING, not a boolean. Sending `true` is refused with
//      {"Code":999,"Message":"json: cannot unmarshal bool into Go struct field
//      RequestV2.Stream of type string"}. The field is the literal "true".
//   2. There is no `text.delta` event. The live stream sends `text.replace`,
//      which carries the whole answer so far and REPLACES it, then closes with
//      `message.done` holding the final `Message.Contents[].Text`. A client
//      that only appends `text.delta` fragments finishes with an empty answer.
//   3. `reference.added` never fires. Knowledge-base grounding is reported
//      structurally instead, on `response.completed`, as `Response.Procedures[]`
//      entries of `Type: "knowledge"` whose `Knowledge.Outputs[]` are the
//      retrieved passages.
//
// The documented `text.delta` spellings are still accepted, so an account whose
// agent does emit them keeps working — but nothing depends on them.
//
// Docs: tencentcloud.com/document/product/1254/69977 and /1254/81449.

import { z } from '@/lib/zod';

/** SSE chat endpoint. Not signed: the AppKey in the body is the credential. */
export const ADP_CHAT_URL = 'https://wss.lke.tencentcloud.com/adp/v2/chat';

/** RequestId and ConversationId must both match this. */
export const ADP_ID_PATTERN = /^[a-zA-Z0-9_-]{32,64}$/;

/** ADP streams token by token; a whole answer can take a while. */
export const ADP_DEFAULT_TIMEOUT_MS = 20_000;

/** Longest answer we keep, so a runaway stream cannot fill memory. */
export const ADP_MAX_ANSWER_CHARS = 20_000;

/** The `done` event's data is this sentinel, not JSON. */
export const ADP_DONE_SENTINEL = '[DONE]';

const adpIdSchema = z.string().regex(ADP_ID_PATTERN);

export const adpChatRequestSchema = z.strictObject({
  RequestId: adpIdSchema,
  ConversationId: adpIdSchema,
  AppKey: z.string().min(1),
  Contents: z.array(z.strictObject({ Type: z.literal('text'), Text: z.string().min(1) })).min(1),
  VisitorId: z.string().min(1).max(64),
  /** A string, not a bool — see note 1 in the header. */
  Stream: z.literal('true'),
});

export type AdpChatRequest = z.infer<typeof adpChatRequestSchema>;

/** Every SSE event name seen on the live stream, plus the documented delta. */
export const ADP_EVENTS = [
  'request_ack',
  'response.created',
  'response.processing',
  'message.added',
  'content.added',
  'text.delta',
  'text.replace',
  'message.done',
  'response.completed',
  'done',
] as const;
export type AdpEventName = (typeof ADP_EVENTS)[number];

/**
 * One streamed fragment, APPENDED to the answer.
 *
 * Documented but never observed live. The docs spell the request side
 * `Contents[].Text` while published response examples show `Content`, so both
 * spellings are accepted and anything else is an `invalid_response` — the
 * client never guesses an empty answer into existence.
 */
export const adpTextDeltaSchema = z.union([
  z.looseObject({ Content: z.string() }),
  z.looseObject({ Text: z.string() }),
]);

/** Either spelling of a parsed fragment, narrowed to the field that matters. */
export type AdpTextDelta = { Content: string } | { Text: string };

/** The fragment's text, whichever of the two documented spellings carried it. */
export function deltaText(payload: AdpTextDelta): string {
  return 'Content' in payload ? payload.Content : payload.Text;
}

/** `text.replace`: the whole answer so far, REPLACING what came before. */
export const adpTextReplaceSchema = z.looseObject({ Text: z.string() });

const adpContentsSchema = z.array(z.looseObject({ Text: z.string().optional() }));

/** The text of a finished reply's Contents, concatenated in order. */
function contentsText(contents: readonly { Text?: string }[] | undefined): string {
  return (contents ?? []).map((c) => c.Text ?? '').join('');
}

/** `message.done`: the finished reply and its authoritative final text. */
export const adpMessageDoneSchema = z.looseObject({
  Message: z.looseObject({ Contents: adpContentsSchema.optional() }),
});

/** The final answer a `message.done` carries, or '' when it carried none. */
export function messageDoneText(payload: z.infer<typeof adpMessageDoneSchema>): string {
  return contentsText(payload.Message.Contents);
}

/**
 * One step the agent ran. `Type: "knowledge"` is a knowledge-base lookup, and
 * its `Outputs` are the passages that were retrieved.
 */
export const adpProcedureSchema = z.looseObject({
  Type: z.string(),
  Knowledge: z
    .looseObject({ Outputs: z.array(z.looseObject({ Content: z.string().optional() })).optional() })
    .optional(),
});

/** `response.completed`: the final reply plus the steps that produced it. */
export const adpResponseCompletedSchema = z.looseObject({
  Response: z.looseObject({
    Messages: z.array(z.looseObject({ Contents: adpContentsSchema.optional() })).optional(),
    Procedures: z.array(adpProcedureSchema).optional(),
  }),
});

export type AdpResponseCompleted = z.infer<typeof adpResponseCompletedSchema>;

/** The final answer a `response.completed` carries, or '' when it carried none. */
export function responseCompletedText(payload: AdpResponseCompleted): string {
  return (payload.Response.Messages ?? []).map((m) => contentsText(m.Contents)).join('');
}

/**
 * How many knowledge-base passages the agent retrieved before answering.
 *
 * Read from the Procedures array, which is ADP's own record of the steps it
 * ran — not inferred from the wording of the answer. Zero means the agent
 * answered from its prompt alone, which is exactly the ungrounded case the
 * knowledge base exists to remove.
 *
 * ADP does NOT expose which knowledge file a passage came from as a field; the
 * file name appears only inside the passage text. Keystone therefore reports
 * the count, which is structural, and never claims a source file it would have
 * had to parse out of prose.
 */
export function knowledgePassages(payload: AdpResponseCompleted): number {
  return (payload.Response.Procedures ?? [])
    .filter((p) => p.Type === 'knowledge')
    .reduce((total, p) => total + (p.Knowledge?.Outputs?.length ?? 0), 0);
}

/** ADP's error envelope, as returned by the live bogus-key probe. */
export const adpErrorSchema = z.looseObject({ Code: z.number(), Message: z.string() });

/** A 32-character id (hex, no dashes) that satisfies ADP_ID_PATTERN. */
export function newAdpId(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, '');
}

/** The AppKey, or null when the account has none. Never logged or returned. */
export function adpAppKey(env: Readonly<Record<string, string | undefined>>): string | null {
  const key = env.ADP_APP_KEY?.trim();
  return key ? key : null;
}
