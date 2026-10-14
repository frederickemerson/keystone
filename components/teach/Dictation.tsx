'use client';

// Hold-to-talk for the open question, on top of the recogniser the frontline
// capture screen already uses (components/capture/useSpeechCapture).
//
// Reused rather than rebuilt so there is one place that knows how recording
// works, and one place that records WHERE the audio went: Chrome sends it to
// the browser vendor unless on-device processing was granted, and the label
// under the button says so instead of leaving it to be assumed.
//
// Typing is always available and is never the lesser path. An expert on a
// walkway talks; an expert at a desk types; neither is the fallback.

import { useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import { transcriptSourceLabel } from '@/lib/capture/asr-sources';
import { useSpeechCapture, type SpeechResult } from '@/components/capture/useSpeechCapture';

export interface DictationProps {
  engine: 'web_speech' | 'server_asr' | null;
  /** Appended to whatever is already typed, never replacing it. */
  onTranscript: (text: string) => void;
}

export function Dictation({ engine, onTranscript }: DictationProps) {
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<SpeechResult['source'] | null>(null);

  const capture = useSpeechCapture(
    engine,
    (result) => {
      setError(null);
      setSource(result.source);
      onTranscript(result.transcript);
    },
    (message) => setError(message),
  );

  if (!engine) {
    return (
      <p className="text-[12px] leading-snug text-ink-muted">
        This browser offers no speech recognition, and no server recogniser is configured. Type the account instead —
        it is the same answer either way.
      </p>
    );
  }

  const recording = capture.state === 'recording';
  const busy = capture.state === 'transcribing';

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onPointerDown={capture.start}
          onPointerUp={capture.stop}
          onPointerLeave={recording ? capture.stop : undefined}
          disabled={busy}
          className={cn(
            'btn-pill text-xs',
            recording && 'border-blocked bg-blocked-tint text-blocked',
          )}
          aria-pressed={recording}
        >
          {recording ? <Square className="size-3.5" aria-hidden="true" /> : <Mic className="size-3.5" aria-hidden="true" />}
          {recording ? `Recording… ${capture.elapsed}s — release to stop` : busy ? 'Transcribing…' : 'Hold to talk'}
        </button>
        {capture.interim ? (
          <span className="min-w-0 flex-1 truncate text-[12px] italic text-ink-muted" aria-live="polite">
            {capture.interim}
          </span>
        ) : null}
      </div>

      {source ? (
        <p className="font-mono text-[11px] text-ink-muted">{transcriptSourceLabel(source)}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-[12px] text-blocked">
          {error}
        </p>
      ) : null}
    </div>
  );
}
