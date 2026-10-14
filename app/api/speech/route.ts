// Speaking in a real voice. POST text + role -> audio.
//
// GET reports which providers are usable (no secrets) so the client knows
// whether to ask for audio at all or go straight to the browser voice.
//
// The text spoken is whatever the caller sends, so this is a paid call behind
// the same budget as the other live-AI routes, and the answer is cached by
// content: replaying the call does not re-bill every turn.

import { readSpeech, speechKey, writeSpeech } from '@/lib/speech/cache';
import { selectServerTts, serverTtsSummary, speechRequestSchema, synthesize } from '@/lib/speech/tts';
import { callerOf, signInRequired } from '@/lib/ratelimit/caller';
import { retryHeaders, takeLlmCall } from '@/lib/ratelimit/policies';

export const runtime = 'nodejs';
export const maxDuration = 30;

const NO_STORE = { 'Cache-Control': 'no-store' };
/** Audio for a given text never changes, and the ETag is that text's hash. */
const CACHE_AUDIO = { 'Cache-Control': 'private, max-age=86400' };

export async function GET(request: Request) {
  if (!(await callerOf(request))) return signInRequired();
  return Response.json(serverTtsSummary(), { headers: NO_STORE });
}

export async function POST(request: Request) {
  const caller = await callerOf(request);
  if (!caller) return signInRequired();

  const provider = selectServerTts();
  if (!provider) {
    return Response.json(
      { error: 'No speech synthesis is configured.', ...serverTtsSummary() },
      { status: 503, headers: NO_STORE },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400, headers: NO_STORE });
  }
  const parsed = speechRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Expected { text, role }.' }, { status: 400, headers: NO_STORE });
  }

  const key = speechKey({
    role: parsed.data.role,
    text: parsed.data.text,
    model: provider.model,
    voice: parsed.data.role,
  });

  // Served before the quota check: audio already paid for costs nothing to send again.
  const cached = readSpeech(key);
  if (cached) return audioResponse(cached, key, true);
  if (request.headers.get('if-none-match') === `"${key}"`) {
    return new Response(null, { status: 304, headers: { ETag: `"${key}"`, ...CACHE_AUDIO } });
  }

  const quota = takeLlmCall(caller);
  if (!quota.ok) {
    return Response.json(
      { error: 'Speech is rate-limited right now.' },
      { status: 429, headers: { ...NO_STORE, ...retryHeaders(quota) } },
    );
  }

  try {
    const spoken = await synthesize(parsed.data, provider);
    writeSpeech(key, spoken);
    return audioResponse(spoken, key, false);
  } catch {
    return Response.json(
      { error: 'Synthesis failed; the browser voice can read this instead.' },
      { status: 502, headers: NO_STORE },
    );
  }
}

function audioResponse(
  spoken: {
    audio: ArrayBuffer;
    contentType: string;
    source: { provider: string; model: string; voice: string; region: string };
  },
  key: string,
  fromCache: boolean,
): Response {
  return new Response(spoken.audio, {
    headers: {
      'Content-Type': spoken.contentType,
      ETag: `"${key}"`,
      ...CACHE_AUDIO,
      // The UI says out loud whose voice this is and where it was made.
      'X-Speech-Provider': spoken.source.provider,
      'X-Speech-Model': spoken.source.model,
      'X-Speech-Voice': spoken.source.voice,
      'X-Speech-Region': spoken.source.region,
      'X-Speech-Cached': fromCache ? '1' : '0',
    },
  });
}
