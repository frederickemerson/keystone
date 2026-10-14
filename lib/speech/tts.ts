// Speaking in a real voice — server-side synthesis provider chain.
//
// Why this exists: every voice in Keystone was the browser's own
// `speechSynthesis`, which on a stock macOS install means a 1990s formant
// voice. lib/speech/voices got the best out of what the browser offers, but
// the ceiling there is low. Real synthesis is a network call.
//
// Chain order:
//
//   1. TokenHub (Tencent Cloud) — minimax-speech-2.8-hd, which is the right
//      home for this and now reachable. Finding it took an embarrassingly long
//      time: the gateway serves synthesis at
//      POST /v1/wand/minimax-tts/sync_tts, which is nothing like the
//      OpenAI-compatible shape the same host uses for chat, so every
//      /audio/* and /speech/* path probed 404ed and the model looked
//      unreachable while it was simply somewhere else. It also needs the model
//      enabled for pay-as-you-go in the console; until it was, every call
//      answered 402.
//   2. OpenAI gpt-4o-mini-tts — kept as the fallback, and the provider the
//      committed audio was first rendered with.
//
// When neither is usable the route says so and the browser falls back to
// `speechSynthesis` (lib/speech/voices). A missing provider never silently
// becomes a worse voice with no explanation.
//
// On region: this is the `tokenhub-intl` gateway and the audio came back from
// a globally accelerated bucket, so the region is recorded as `tokenhub-intl`
// rather than claimed as Singapore. The dedicated chat inference service IS
// Singapore-routed (lib/llm/client); that says nothing about this path, and
// the two must not be conflated.

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

/** The speech model TokenHub serves, enabled pay-as-you-go in the console. */
export const TOKENHUB_SPEECH_MODEL = 'minimax-speech-2.8-hd';
/** Not under /audio or /speech — see the note at the top of this file. */
export const TOKENHUB_TTS_PATH = 'wand/minimax-tts/sync_tts';
export const TOKENHUB_DEFAULT_BASE = 'https://tokenhub-intl.tencentcloudmaas.com/v1';
/** The gateway this reaches; not the Singapore-routed chat service. */
export const TOKENHUB_TTS_REGION = 'tokenhub-intl';

/**
 * Per-role MiniMax voices. Verified distinct: the same sentence through each
 * produces different audio and a different duration, so the voice id is being
 * honoured rather than quietly ignored.
 */
const TOKENHUB_VOICES: Record<TtsRole, string> = {
  expert: 'English_Trustworth_Man',
  interviewer: 'English_CalmWoman',
};

/** 32 kHz mono mp3: more than speech needs, and the renderer re-encodes anyway. */
const TOKENHUB_AUDIO = { sample_rate: 32_000, bitrate: 128_000, format: 'mp3', channel: 1 } as const;

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

/** TokenHub: ready whenever the key is present. Verified against the live endpoint. */
export function tokenhubTtsStatus(env: Env): TtsStatus {
  if (!env.TOKENHUB_API_KEY) {
    return { provider: 'tokenhub_minimax', state: 'not_configured', reason: 'TokenHub is not configured.' };
  }
  return {
    provider: 'tokenhub_minimax',
    state: 'ready',
    model: TOKENHUB_SPEECH_MODEL,
    region: TOKENHUB_TTS_REGION,
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
  return provider.provider === 'tokenhub_minimax'
    ? synthesizeTokenhub(request, provider, env)
    : synthesizeOpenAi(request, provider, env);
}

async function synthesizeTokenhub(
  request: SpeechRequest,
  provider: Extract<TtsStatus, { state: 'ready' }>,
  env: Env,
): Promise<Spoken> {
  const base = (env.TOKENHUB_BASE_URL || TOKENHUB_DEFAULT_BASE).replace(/\/$/, '');
  const voice = TOKENHUB_VOICES[request.role];
  const response = await fetch(`${base}/${TOKENHUB_TTS_PATH}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.TOKENHUB_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: TOKENHUB_SPEECH_MODEL,
      text: request.text,
      voice_setting: { voice_id: voice, speed: 1, vol: 1, pitch: 0 },
      audio_setting: TOKENHUB_AUDIO,
      subtitle_enable: false,
      // `hex` rather than `url`: the audio arrives inline, so there is no
      // second request to a bucket that can expire, rate-limit or be blocked.
      output_format: 'hex',
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Synthesis failed: ${response.status}`);

  const body = (await response.json()) as {
    base_resp?: { status_code?: number; status_msg?: string };
    data?: { audio?: string };
  };
  // A 200 with a non-zero status_code is still a failure; the HTTP status
  // alone would let one through.
  if (body.base_resp?.status_code !== 0) {
    throw new Error(`Synthesis refused: ${body.base_resp?.status_msg ?? 'unknown'}`);
  }
  const hex = body.data?.audio;
  if (!hex || !/^[0-9a-f]+$/i.test(hex) || hex.length < 200) throw new Error('Synthesis returned no audio.');

  const bytes = Buffer.from(hex, 'hex');
  return {
    audio: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    contentType: 'audio/mpeg',
    source: {
      provider: 'tokenhub_minimax',
      model: TOKENHUB_SPEECH_MODEL,
      voice,
      region: provider.region,
    },
  };
}

async function synthesizeOpenAi(
  request: SpeechRequest,
  provider: Extract<TtsStatus, { state: 'ready' }>,
  env: Env,
): Promise<Spoken> {
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
