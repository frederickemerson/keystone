// Frontline capture — server ASR provider chain (docs/capture/PLAN.md, "ASR decision").
//
// Server-only: reads credentials from the environment. Chain order:
//   1. Tencent Cloud ASR, ap-singapore — the only option with documented
//      Singapore-region processing. The adapter is typed and tested but NOT
//      implemented against the live API: no Tencent ASR account was available
//      to verify the 16k_en engine in ap-singapore, so it always reports
//      "not configured" / "not verified" rather than pretending to transcribe.
//   2. OpenAI transcription — explicit opt-in only (CAPTURE_SERVER_ASR=openai),
//      because audio is processed offshore (region recorded as "us").
// No server provider ever substitutes a recorded fixture for real audio: when
// none is usable the route says so and the client falls back to the browser
// recogniser, typing, or an explicitly labelled demo transcript.

import "server-only";
import { z } from "@/lib/zod";
import { MAX_NOTE_DURATION_SEC, MAX_TRANSCRIPT_CHARS, type TranscriptSource } from "./contract";
import { ASR_LANGUAGE, ASR_REGIONS } from "./asr-sources";

/** About 2 MB: 120 s of opus at ~128 kbit/s, with headroom. */
export const MAX_AUDIO_BYTES = 2_000_000;
/** Containers MediaRecorder produces in current browsers. */
export const ACCEPTED_AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"] as const;

export type ServerAsrProviderId = "tencent_asr" | "openai_transcribe";

export type ServerAsrStatus =
  | { provider: ServerAsrProviderId; state: "ready"; source: Omit<TranscriptSource, "languageHint"> }
  | { provider: ServerAsrProviderId; state: "not_configured" | "not_verified" | "not_enabled"; reason: string };

type Env = Readonly<Record<string, string | undefined>>;

export const TENCENT_ASR_ENDPOINT = "asr.ap-singapore.tencentcloudapi.com";
export const OPENAI_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

/** Tencent ASR: typed adapter, deliberately not live (unverified). */
export function tencentAsrStatus(env: Env): ServerAsrStatus {
  if (!env.TENCENT_ASR_SECRET_ID || !env.TENCENT_ASR_SECRET_KEY) {
    return { provider: "tencent_asr", state: "not_configured", reason: "Tencent Cloud ASR (ap-singapore) is not configured." };
  }
  return {
    provider: "tencent_asr",
    state: "not_verified",
    reason: `Tencent Cloud ASR credentials are set, but the ${TENCENT_ASR_ENDPOINT} adapter has not been verified for 16k_en; it is not used.`,
  };
}

/** OpenAI transcription: only when explicitly enabled, because audio leaves Singapore. */
export function openAiTranscribeStatus(env: Env): ServerAsrStatus {
  if (env.CAPTURE_SERVER_ASR !== "openai") {
    return { provider: "openai_transcribe", state: "not_enabled", reason: "OpenAI transcription is off (set CAPTURE_SERVER_ASR=openai to allow offshore processing)." };
  }
  if (!env.OPENAI_API_KEY) {
    return { provider: "openai_transcribe", state: "not_configured", reason: "OpenAI transcription is enabled but OPENAI_API_KEY is missing." };
  }
  return {
    provider: "openai_transcribe",
    state: "ready",
    source: { provider: "openai_transcribe", model: OPENAI_TRANSCRIBE_MODEL, region: ASR_REGIONS.openAi },
  };
}

/** Every server provider's status, in chain order. */
export function serverAsrChain(env: Env = process.env): ServerAsrStatus[] {
  return [tencentAsrStatus(env), openAiTranscribeStatus(env)];
}

/** The first ready provider, or null. */
export function selectServerAsr(env: Env = process.env): Extract<ServerAsrStatus, { state: "ready" }> | null {
  for (const s of serverAsrChain(env)) if (s.state === "ready") return s;
  return null;
}

/** Public summary for GET /api/capture/transcribe (no secrets). */
export function serverAsrSummary(env: Env = process.env): { available: boolean; providers: { provider: ServerAsrProviderId; state: ServerAsrStatus["state"]; detail: string }[] } {
  const chain = serverAsrChain(env);
  return {
    available: chain.some((s) => s.state === "ready"),
    providers: chain.map((s) => ({
      provider: s.provider,
      state: s.state,
      detail: s.state === "ready" ? `${s.source.model} · ${s.source.region}` : s.reason,
    })),
  };
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

export const transcribeMetaSchema = z.object({
  durationSec: z.coerce.number().positive().max(MAX_NOTE_DURATION_SEC),
});

export type AudioUpload = { audio: Uint8Array; contentType: string; durationSec: number };

/** Base media type, lower-cased, without parameters ("audio/webm;codecs=opus" → "audio/webm"). */
export function baseMediaType(header: string | null): string {
  return (header ?? "").split(";")[0].trim().toLowerCase();
}

/**
 * Validate and read a raw audio upload: accepted container, declared duration
 * (x-capture-duration header) within the hold-to-talk cap, and a streamed body
 * of at most MAX_AUDIO_BYTES (the stream is counted, not just Content-Length).
 */
export async function readAudioUpload(request: Request): Promise<AudioUpload | Response> {
  const contentType = baseMediaType(request.headers.get("content-type"));
  if (!(ACCEPTED_AUDIO_TYPES as readonly string[]).includes(contentType)) {
    return Response.json({ error: "Expected an audio recording (webm, ogg, mp4, mpeg or wav)." }, { status: 415 });
  }
  const meta = transcribeMetaSchema.safeParse({ durationSec: request.headers.get("x-capture-duration") ?? undefined });
  if (!meta.success) {
    return Response.json({ error: `Recording length must be between 0 and ${MAX_NOTE_DURATION_SEC} s.` }, { status: 400 });
  }
  if (Number(request.headers.get("content-length")) > MAX_AUDIO_BYTES) {
    return Response.json({ error: "Recording too large." }, { status: 413 });
  }
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Missing audio body." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_AUDIO_BYTES) {
        await reader.cancel();
        return Response.json({ error: "Recording too large." }, { status: 413 });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (size === 0) return Response.json({ error: "Empty recording." }, { status: 400 });
  const audio = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    audio.set(c, offset);
    offset += c.byteLength;
  }
  return { audio, contentType, durationSec: meta.data.durationSec };
}

// ---------------------------------------------------------------------------
// Transcription
// ---------------------------------------------------------------------------

export interface TranscribeResult {
  transcript: string;
  source: TranscriptSource;
}

const EXTENSION: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

/**
 * Transcribe with the selected provider. The audio buffer is used for this
 * call only and never written anywhere (PDPA default: transcript kept, audio
 * discarded). Throws on provider failure; the route reports it.
 */
export async function transcribe(
  upload: AudioUpload,
  provider: Extract<ServerAsrStatus, { state: "ready" }>,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<TranscribeResult> {
  if (provider.provider !== "openai_transcribe") throw new Error(`${provider.provider} is not implemented`);
  const form = new FormData();
  form.set("model", provider.source.model);
  form.set("language", "en");
  form.set("response_format", "json");
  const buffer = upload.audio.buffer.slice(upload.audio.byteOffset, upload.audio.byteOffset + upload.audio.byteLength) as ArrayBuffer;
  form.set("file", new Blob([buffer], { type: upload.contentType }), `note.${EXTENSION[upload.contentType] ?? "webm"}`);
  const response = await fetchImpl("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY ?? ""}` },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`transcription failed (${response.status})`);
  const parsed = z.object({ text: z.string() }).safeParse(await response.json());
  if (!parsed.success) throw new Error("transcription response was malformed");
  const transcript = parsed.data.text.trim().slice(0, MAX_TRANSCRIPT_CHARS);
  if (!transcript) throw new Error("no speech recognised");
  return { transcript, source: { ...provider.source, languageHint: ASR_LANGUAGE } };
}
