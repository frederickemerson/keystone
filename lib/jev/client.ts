import 'server-only';

import { z } from 'zod';

/**
 * Typed client for TypeSafe AI's Jev "System One" decision model
 * (POST https://api.typesafe.ai/v1/systemone, docs.typesafe.ai).
 *
 * Jev returns probabilities for typed questions. In Keystone it only ever
 * produces SUGGESTIONS — it never decides a gate. Gates open only on
 * human-confirmed evidence (lib/engine isEvidenceSatisfied).
 *
 * The API key is read from the server environment and is never logged,
 * returned, or included in an error message. Nor is the prompt (state).
 */

export const JEV_DEFAULT_BASE_URL = 'https://api.typesafe.ai';
export const JEV_DEFAULT_MODEL = 'jev-latest';
export const JEV_DEFAULT_TIMEOUT_MS = 3_000;

/** One Noul (yes/no) question: Jev answers P(yes). */
export interface NoulQuestion {
  type: 'noul';
  instructions: string;
}

const noulAnswerSchema = z.object({ type: z.literal('noul'), noul: z.number().min(0).max(1) });

/** Response body of /v1/systemone, narrowed to what Keystone asks (Noul only). */
export const systemOneResponseSchema = z.object({
  model: z.string().min(1),
  answers: z.record(z.string(), noulAnswerSchema),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }).partial().optional(),
});

export type JevResult =
  | { ok: true; model: string; probabilities: Record<string, number>; latencyMs: number }
  | { ok: false; reason: 'not_configured' | 'timeout' | 'http_error' | 'invalid_response' | 'network_error'; latencyMs: number; status?: number };

/**
 * The bearer token. The key is stored as `jev:apikey_…`; verified against the
 * live API (2026-10-12): `Bearer jev:apikey_…` → 401, `Bearer apikey_…` → 200.
 * The `jev:` part is a provider label, not part of the TypeSafe key.
 */
export function jevBearerToken(raw: string | undefined): string | null {
  const key = raw?.trim();
  if (!key) return null;
  return key.startsWith('jev:') ? key.slice('jev:'.length) : key;
}

export function isJevConfigured(): boolean {
  return jevBearerToken(process.env.JEV_API_KEY) !== null;
}

export interface NoulOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

/**
 * Ask Jev a batch of Noul questions about `state`. Never throws: every failure
 * (no key, timeout, HTTP error, malformed body) is a typed `ok: false`.
 */
export async function askNoul(
  state: string,
  questions: Record<string, NoulQuestion>,
  { timeoutMs = JEV_DEFAULT_TIMEOUT_MS, fetchImpl = fetch, now = () => performance.now() }: NoulOptions = {},
): Promise<JevResult> {
  const started = now();
  const elapsed = () => Math.round(now() - started);
  const token = jevBearerToken(process.env.JEV_API_KEY);
  if (!token) return { ok: false, reason: 'not_configured', latencyMs: 0 };

  const baseUrl = process.env.JEV_BASE_URL || JEV_DEFAULT_BASE_URL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${baseUrl}/v1/systemone`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, model: process.env.JEV_MODEL || JEV_DEFAULT_MODEL, questions }),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, reason: 'http_error', status: res.status, latencyMs: elapsed() };
    const parsed = systemOneResponseSchema.safeParse(await res.json());
    if (!parsed.success) return { ok: false, reason: 'invalid_response', latencyMs: elapsed() };
    const probabilities: Record<string, number> = {};
    for (const id of Object.keys(questions)) {
      const answer = parsed.data.answers[id];
      // Every asked question must come back answered — a partial answer set is not trusted.
      if (!answer) return { ok: false, reason: 'invalid_response', latencyMs: elapsed() };
      probabilities[id] = answer.noul;
    }
    return { ok: true, model: parsed.data.model, probabilities, latencyMs: elapsed() };
  } catch (err) {
    const aborted = controller.signal.aborted || (err as { name?: string } | null)?.name === 'AbortError';
    return { ok: false, reason: aborted ? 'timeout' : 'network_error', latencyMs: elapsed() };
  } finally {
    clearTimeout(timer);
  }
}
