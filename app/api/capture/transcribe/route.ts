import { readAudioUpload, selectServerAsr, serverAsrSummary, transcribe } from '@/lib/capture/asr';
import { callerOf, signInRequired } from '@/lib/ratelimit/caller';
import { retryHeaders, takeLlmCall } from '@/lib/ratelimit/policies';

export const runtime = 'nodejs';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'no-store' };

/** Which server ASR providers are usable (no secrets). The client picks its capture mode from this. */
export async function GET(request: Request) {
  if (!(await callerOf(request))) return signInRequired();
  return Response.json(serverAsrSummary(), { headers: NO_STORE });
}

/**
 * Transcribe one hold-to-talk recording. Body: the raw audio (webm/ogg/mp4/
 * mpeg/wav, ≤ 2 MB); header x-capture-duration: seconds (≤ 120). The audio is
 * held in memory for this call only and never stored. With no configured
 * provider the answer is 503 — never a recorded transcript passed off as this audio.
 */
export async function POST(request: Request) {
  const caller = await callerOf(request);
  if (!caller) return signInRequired();
  const provider = selectServerAsr();
  if (!provider) {
    return Response.json(
      { error: 'No server speech recognition is configured.', ...serverAsrSummary() },
      { status: 503, headers: NO_STORE },
    );
  }
  const upload = await readAudioUpload(request);
  if (upload instanceof Response) return upload;
  // Paid call: shares the live-AI cost budget.
  const quota = takeLlmCall(caller);
  if (!quota.ok) {
    return Response.json({ error: 'Transcription is rate-limited right now.' }, { status: 429, headers: { ...NO_STORE, ...retryHeaders(quota) } });
  }
  try {
    const result = await transcribe(upload, provider);
    return Response.json({ ...result, durationSec: upload.durationSec }, { headers: NO_STORE });
  } catch {
    return Response.json({ error: 'Transcription failed; type the note instead.' }, { status: 502, headers: NO_STORE });
  }
}
