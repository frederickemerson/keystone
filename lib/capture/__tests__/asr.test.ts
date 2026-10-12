import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAllLimits } from "@/lib/ratelimit/policies";
import { transcriptSourceSchema } from "../contract";
import {
  availableCaptureModes,
  fixtureSource,
  transcriptSourceLabel,
  typedSource,
  webSpeechSource,
} from "../asr-sources";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  getVerifiedSession: vi.fn(async () => ({ role: "technician", name: "Test", sessionId: crypto.randomUUID() })),
}));

const asr = await import("../asr");
const { GET, POST } = await import("@/app/api/capture/transcribe/route");

beforeEach(() => {
  resetAllLimits();
  vi.unstubAllEnvs();
  for (const k of ["TENCENT_ASR_SECRET_ID", "TENCENT_ASR_SECRET_KEY", "CAPTURE_SERVER_ASR", "OPENAI_API_KEY"]) vi.stubEnv(k, "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("transcript source labels", () => {
  it("every source is valid against the contract and names where audio went", () => {
    const cases = [
      [webSpeechSource(false), "browser-vendor", /browser vendor's service/],
      [webSpeechSource(true), "on-device", /on this device/],
      [typedSource(), "no-audio", /no audio recorded/],
      [fixtureSource("capture-qr-ahu-23-01"), "no-audio", /^Recorded demo transcript · no audio$/],
      [{ provider: "openai_transcribe", model: "gpt-4o-mini-transcribe", region: "us", languageHint: "en-SG" }, "us", /offshore \(us\)/],
      [{ provider: "tencent_asr", model: "16k_en", region: "ap-singapore", languageHint: "en-SG" }, "ap-singapore", /processed in ap-singapore/],
    ] as const;
    for (const [source, region, label] of cases) {
      expect(transcriptSourceSchema.parse(source).region).toBe(region);
      expect(source.languageHint).toBe("en-SG");
      expect(transcriptSourceLabel(source)).toMatch(label);
    }
  });
});

describe("capture mode selection", () => {
  it("prefers configured server ASR, then the browser recogniser; typing and demo notes are always offered", () => {
    expect(availableCaptureModes({ webSpeech: true, mediaRecorder: true, serverAsr: true })).toEqual(["server_asr", "web_speech", "typed", "fixture"]);
    expect(availableCaptureModes({ webSpeech: true, mediaRecorder: true, serverAsr: false })).toEqual(["web_speech", "typed", "fixture"]);
    expect(availableCaptureModes({ webSpeech: false, mediaRecorder: false, serverAsr: true })).toEqual(["typed", "fixture"]);
  });
});

describe("server ASR provider chain", () => {
  it("reports nothing configured by default; Tencent is never used while unverified", () => {
    expect(asr.selectServerAsr()).toBeNull();
    expect(asr.serverAsrChain().map((s) => [s.provider, s.state])).toEqual([
      ["tencent_asr", "not_configured"],
      ["openai_transcribe", "not_enabled"],
    ]);
    vi.stubEnv("TENCENT_ASR_SECRET_ID", "id");
    vi.stubEnv("TENCENT_ASR_SECRET_KEY", "key");
    expect(asr.tencentAsrStatus(process.env).state).toBe("not_verified");
    expect(asr.selectServerAsr()).toBeNull();
  });

  it("OpenAI needs an explicit opt-in and a key, and is labelled as processed in the US", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    expect(asr.selectServerAsr()).toBeNull();
    vi.stubEnv("CAPTURE_SERVER_ASR", "openai");
    expect(asr.selectServerAsr()).toMatchObject({ provider: "openai_transcribe", source: { region: "us", model: "gpt-4o-mini-transcribe" } });
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(asr.openAiTranscribeStatus(process.env).state).toBe("not_configured");
  });

  it("the summary carries no secrets", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-secret-value");
    vi.stubEnv("CAPTURE_SERVER_ASR", "openai");
    expect(JSON.stringify(asr.serverAsrSummary())).not.toContain("sk-secret-value");
  });
});

function audioRequest(body: BodyInit | null, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/capture/transcribe", {
    method: "POST",
    headers: { "content-type": "audio/webm;codecs=opus", "x-capture-duration": "12", ...headers },
    body,
  });
}

describe("POST /api/capture/transcribe", () => {
  it("answers 503 with the chain status when no provider is configured (never a fixture)", async () => {
    const res = await POST(audioRequest(new Uint8Array([1, 2, 3])));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.available).toBe(false);
    expect(json).not.toHaveProperty("transcript");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  describe("with a provider enabled", () => {
    beforeEach(() => {
      vi.stubEnv("CAPTURE_SERVER_ASR", "openai");
      vi.stubEnv("OPENAI_API_KEY", "sk-test");
    });

    it.each([
      ["a non-audio content type", audioRequest("{}", { "content-type": "application/json" }), 415],
      ["a missing duration", audioRequest(new Uint8Array([1]), { "x-capture-duration": "" }), 400],
      ["a duration over 120 s", audioRequest(new Uint8Array([1]), { "x-capture-duration": "121" }), 400],
      ["a zero duration", audioRequest(new Uint8Array([1]), { "x-capture-duration": "0" }), 400],
      ["an empty body", audioRequest(new Uint8Array([])), 400],
      ["a body over 2 MB", audioRequest(new Uint8Array(asr.MAX_AUDIO_BYTES + 1)), 413],
    ])("rejects %s", async (_name, request, status) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      expect((await POST(request)).status).toBe(status);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns the transcript stamped with the real provider, model and region", async () => {
      const fetchMock = vi.fn(async () => Response.json({ text: " Isolate AHU-23-01. " }));
      vi.stubGlobal("fetch", fetchMock);
      const res = await POST(audioRequest(new Uint8Array([1, 2, 3])));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        transcript: "Isolate AHU-23-01.",
        durationSec: 12,
        source: { provider: "openai_transcribe", model: "gpt-4o-mini-transcribe", region: "us", languageHint: "en-SG" },
      });
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("reports a provider failure as 502 without a transcript", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
      const res = await POST(audioRequest(new Uint8Array([1])));
      expect(res.status).toBe(502);
      expect(await res.json()).not.toHaveProperty("transcript");
    });
  });

  it("GET reports availability", async () => {
    const res = await GET(new Request("http://localhost/api/capture/transcribe"));
    expect((await res.json()).available).toBe(false);
  });
});
