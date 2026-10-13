// Tencent Cloud ADP (Agent Development Platform) Chat API — the wire contract.
//
// Pure: endpoint, id rules and schemas only. No credentials, no I/O, so the
// shapes can be tested and the status code can import them anywhere.
//
// Probed live on 2026-10-13 from an international account: the Chat API needs
// NO request signing and NO SecretId/SecretKey — a plain HTTPS POST carrying an
// AppKey string in the JSON body. A POST with a bogus key answered
// {"Code":4505004,"Message":"App key invalid"}, which is how we know the
// endpoint is real and the AppKey alone is the whole credential.
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

const adpIdSchema = z.string().regex(ADP_ID_PATTERN);

export const adpChatRequestSchema = z.strictObject({
  RequestId: adpIdSchema,
  ConversationId: adpIdSchema,
  AppKey: z.string().min(1),
  Contents: z.array(z.strictObject({ Type: z.literal('text'), Text: z.string().min(1) })).min(1),
  VisitorId: z.string().min(1).max(64),
  Stream: z.boolean(),
});

export type AdpChatRequest = z.infer<typeof adpChatRequestSchema>;

/** The SSE event names the ADP docs list for this endpoint. */
export const ADP_EVENTS = ['text.delta', 'reference.added', 'response.completed', 'done'] as const;
export type AdpEventName = (typeof ADP_EVENTS)[number];

/**
 * One streamed text fragment.
 *
 * HONEST LIMITATION: the docs spell the request side `Contents[].Text`, while
 * published response examples show `Content`. With no AppKey on this account no
 * live response has settled which it is, so both spellings are accepted and
 * anything else is an `invalid_response` — the client never guesses an empty
 * answer into existence.
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

/** A knowledge-base citation the agent attached. Only its presence is used. */
export const adpReferenceSchema = z.looseObject({});

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
