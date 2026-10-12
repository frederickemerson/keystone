// Frontline capture — where a transcript came from, said truthfully.
//
// Client-safe (no secrets, no SDKs). The server-side provider chain lives in
// ./asr.ts. This file owns:
//   - the TranscriptSource stamped on every note for each capture mode, and
//   - the human label shown next to every transcript (provider · model · where
//     the audio was processed), and
//   - which capture modes a device can offer, in preference order.
//
// The region field records what each provider DOCUMENTS (docs/capture/PLAN.md,
// "ASR decision"); it is never guessed. Chrome's Web Speech recognition is
// server-based by default and its vendor's region is undocumented, so it is
// "browser-vendor" unless on-device processing was actually granted.

import type { TranscriptSource } from "./contract";

/** Singapore English: the hint passed to every recogniser. */
export const ASR_LANGUAGE = "en-SG";

/** Regions recorded on a TranscriptSource (where audio was processed). */
export const ASR_REGIONS = {
  /** Audio streamed to the browser vendor's speech service; region undocumented. */
  browserVendor: "browser-vendor",
  /** Recognised on this device (Web Speech processLocally granted). */
  onDevice: "on-device",
  /** Tencent Cloud ASR, Singapore endpoint. */
  tencentSingapore: "ap-singapore",
  /** OpenAI: no Singapore inference residency, treat as processed in the US. */
  openAi: "us",
  /** Nothing was recorded (typed note or authored demo transcript). */
  noAudio: "no-audio",
} as const;

/** Web Speech API source. `onDevice` only when the browser granted local processing. */
export function webSpeechSource(onDevice: boolean, languageHint: string = ASR_LANGUAGE): TranscriptSource {
  return {
    provider: "web_speech",
    model: "browser SpeechRecognition",
    region: onDevice ? ASR_REGIONS.onDevice : ASR_REGIONS.browserVendor,
    languageHint,
  };
}

/** Typed fallback: no audio, no recogniser. */
export function typedSource(languageHint: string = ASR_LANGUAGE): TranscriptSource {
  return { provider: "typed", model: "keyboard", region: ASR_REGIONS.noAudio, languageHint };
}

/** An authored demo transcript from data/fixtures/capture (no audio, no recogniser). */
export function fixtureSource(fixtureId: string, languageHint: string = ASR_LANGUAGE): TranscriptSource {
  return { provider: "fixture", model: `recorded transcript ${fixtureId}`, region: ASR_REGIONS.noAudio, languageHint };
}

/** One line for the transcript's source badge: what produced it and where audio went. */
export function transcriptSourceLabel(source: TranscriptSource): string {
  switch (source.provider) {
    case "web_speech":
      return source.region === ASR_REGIONS.onDevice
        ? `Browser speech recognition (${source.languageHint}) · processed on this device`
        : `Browser speech recognition (${source.languageHint}) · audio processed by the browser vendor's service`;
    case "tencent_asr":
      return `Tencent Cloud ASR ${source.model} (${source.languageHint}) · processed in ${source.region}`;
    case "openai_transcribe":
      return `OpenAI ${source.model} (${source.languageHint}) · processed offshore (${source.region})`;
    case "typed":
      return "Typed note · no audio recorded";
    case "fixture":
      return `Recorded demo transcript · ${source.model.replace(/^recorded transcript /, "")} · no audio`;
  }
}

/** How a note can be captured on this device. */
export type CaptureMode = "server_asr" | "web_speech" | "typed" | "fixture";

export interface CaptureEnvironment {
  /** window.SpeechRecognition or webkitSpeechRecognition exists. */
  webSpeech: boolean;
  /** MediaRecorder + getUserMedia exist (needed for server ASR). */
  mediaRecorder: boolean;
  /** The server reported a configured, Singapore-or-labelled ASR provider. */
  serverAsr: boolean;
}

/**
 * Modes this device can offer, best first. A configured server provider wins
 * (it is the documented-region path); the browser recogniser is the no-key
 * demo baseline; typing and the recorded demo transcripts are always offered.
 */
export function availableCaptureModes(env: CaptureEnvironment): CaptureMode[] {
  const modes: CaptureMode[] = [];
  if (env.serverAsr && env.mediaRecorder) modes.push("server_asr");
  if (env.webSpeech) modes.push("web_speech");
  modes.push("typed", "fixture");
  return modes;
}

export const CAPTURE_MODE_LABEL: Readonly<Record<CaptureMode, string>> = {
  server_asr: "Hold to talk",
  web_speech: "Hold to talk",
  typed: "Type instead",
  fixture: "Use a recorded demo note",
};
