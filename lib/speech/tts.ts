// Speaking in a real voice — server-side synthesis provider chain.
//
// Why this exists: every voice in Keystone was the browser's own
// `speechSynthesis`, which on a stock macOS install means a 1990s formant
// voice. lib/speech/voices got the best out of what the browser offers, but
// the ceiling there is low. Real synthesis is a network call.
//
// Chain order, and the honest state of each (measured 14 Oct 2026):
//
//   1. TokenHub (Tencent Cloud, ap-singapore) — the right home for this. Its
//      /models list does include speech models: minimax-speech-2.8-hd,
//      minimax-speech-2.8-turbo, indextts-2, minimax-voice-design. But the
//      gateway serves no synthesis path: /audio/speech, /audio/generations,
//      /audio/tts, /audio/synthesize, /speech, /speech/synthesis,
//      /text_to_speech and /tts/generations all return 404 "page not found",
//      while /images/generations returns 402 (billing) — so a path that exists
//      answers differently from one that does not, and none of the speech
//      paths exist. On top of that every model outside the dedicated
//      TOKENHUB_ENDPOINT_ID answers 402: "No free trial quota is available
//      for the service and postpaid billing is not enabled."
//      So this reports `not_available` with that reason rather than shipping
//      an adapter against a URL nobody has seen work. Enabling postpaid
//      billing and deploying minimax-speech-2.8-hd as an online inference
//      service is what unblocks it, and then this is the first choice.
//   2. OpenAI gpt-4o-mini-tts — verified working, and the only provider here
//      that has actually produced audio. Audio is synthesised offshore, which
//      is why the region is recorded as "us" and said out loud in the UI.
//
// When neither is usable the route says so and the browser falls back to
// `speechSynthesis` (lib/speech/voices). A missing provider never silently
// becomes a worse voice with no explanation.

import 'server-only';
import { z } from '@/lib/zod';
import { TTS_ROLES, type TtsRole } from './roles';

export { TTS_ROLES, type TtsRole } from './roles';

export type TtsProviderId = 'tokenhub_minimax' | 'openai_tts';

/** Where a piece of audio came from, stamped on every response. */
export interface TtsSource {
  provider: TtsProviderId;
  model: string;
  /** The provider's own voice id. */
  voice: string;
  /** Where the audio was synthesised. Documented, never guessed. */
  region: string;
}

export type TtsStatus =
  | { provider: TtsProviderId; state: 'ready'; model: string; region: string }
  | { provider: TtsProviderId; state: 'not_configured' | 'not_available'; reason: string };

type Env = Readonly<Record<string, string | undefined>>;

export const OPENAI_TTS_MODEL = 'gpt-4o-mini-tts';
export const OPENAI_TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';
/** The speech model TokenHub lists and would be used first, once it is reachable. */
export const TOKENHUB_SPEECH_MODEL = 'minimax-speech-2.8-hd';

/** Longer than any single transcript turn in data/transcripts (the longest is 1,034 characters). */
export const MAX_SPEECH_CHARS = 1_200;

/**
 * Per-role voice and delivery.
 *
 * `instructions` is a gpt-4o-mini-tts feature and is the difference between a
 * newsreader and a person: without it the expert reads his own words like an
 * announcement. It steers delivery only — the words spoken are always exactly
 * the text passed in.
 */
const OPENAI_VOICES: Record<TtsRole, { voice: string; instructions: string }> = {
  expert: {
    voice: 'onyx',
    instructions:
      'You are a chief engineer in his late fifties in Singapore, eighteen years in building services, ' +
      'talking to a colleague about a job he remembers well. Measured and unhurried, matter-of-fact, ' +
      'a little gravelly. Not a presenter: no brightness, no selling. Let the technical phrases sit flat ' +
      'and land the short sentences firmly.',
  },
  interviewer: {
    voice: 'sage',
    instructions:
      'You are a careful interviewer asking one question at a time. Calm, neutral, genuinely curious, ' +
      'slightly slower than conversational. Never bright or salesy. The question should sound like it ' +
      'is being asked, not read.',
  },
};

/** TokenHub: credentials exist, the gateway exposes no synthesis path. See the note at the top. */
export function tokenhubTtsStatus(env: Env): TtsStatus {
  if (!env.TOKENHUB_API_KEY) {
    return {
      provider: 'tokenhub_minimax',
      state: 'not_configured',
      reason: 'TokenHub is not configured.',
    };
  }
  return {
    provider: 'tokenhub_minimax',
    state: 'not_available',
    reason:
      `TokenHub lists ${TOKENHUB_SPEECH_MODEL}, but its gateway serves no synthesis path (every /audio/* ` +
      'and /speech/* path answers 404 while /images/generations answers 402), and models outside the ' +
      'dedicated endpoint answer 402 "postpaid billing is not enabled". Enable billing and deploy the ' +
      'speech model as an online inference service to make this the first choice.',
  };
}

/** OpenAI: ready whenever the key is present. Verified against the live API. */
export function openAiTtsStatus(env: Env): TtsStatus {
  if (!env.OPENAI_API_KEY) {
    return { provider: 'openai_tts', state: 'not_configured', reason: 'OPENAI_API_KEY is missing.' };
  }
  return { provider: 'openai_tts', state: 'ready', model: OPENAI_TTS_MODEL, region: 'us' };
}

/** Every provider's status, in chain order. */
export function serverTtsChain(env: Env = process.env): TtsStatus[] {
  return [tokenhubTtsStatus(env), openAiTtsStatus(env)];
}

/** The first ready provider, or null when the browser must speak for itself. */
export function selectServerTts(env: Env = process.env): Extract<TtsStatus, { state: 'ready' }> | null {
  for (const status of serverTtsChain(env)) if (status.state === 'ready') return status;
  return null;
}

/** Public summary for GET /api/speech (no secrets). */
export function serverTtsSummary(env: Env = process.env): {
  available: boolean;
  providers: { provider: TtsProviderId; state: TtsStatus['state']; detail: string }[];
} {
  const chain = serverTtsChain(env);
  return {
    available: chain.some((s) => s.state === 'ready'),
    providers: chain.map((s) => ({
      provider: s.provider,
      state: s.state,
      detail: s.state === 'ready' ? `${s.model} · ${s.region}` : s.reason,
    })),
  };
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export const speechRequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_SPEECH_CHARS),
  role: z.enum(TTS_ROLES),
});

export type SpeechRequest = z.infer<typeof speechRequestSchema>;

export interface Spoken {
  audio: ArrayBuffer;
  contentType: string;
  source: TtsSource;
}

/**
 * Synthesise one piece of text. Throws on a provider failure; the caller turns
 * that into a 502 so the client can fall back to the browser voice.
 */
export async function synthesize(
  request: SpeechRequest,
  provider: Extract<TtsStatus, { state: 'ready' }>,
  env: Env = process.env,
): Promise<Spoken> {
  if (provider.provider !== 'openai_tts') {
    throw new Error(`No adapter for ${provider.provider}.`);
  }
  const { voice, instructions } = OPENAI_VOICES[request.role];
  const response = await fetch(OPENAI_TTS_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      input: request.text,
      voice,
      instructions,
      response_format: 'mp3',
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Synthesis failed: ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('audio/')) throw new Error(`Synthesis returned ${contentType || 'no content type'}.`);
  return {
    audio: await response.arrayBuffer(),
    contentType,
    source: { provider: 'openai_tts', model: OPENAI_TTS_MODEL, voice, region: provider.region },
  };
}
