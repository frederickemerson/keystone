'use client';

// Hold-to-talk recording for VoiceCapture. Two engines:
//   - web_speech: the browser's SpeechRecognition (lang en-SG). Chrome sends
//     the audio to the vendor's service unless on-device processing is
//     available and granted; the source records which (asr-sources).
//   - server_asr: MediaRecorder → POST /api/capture/transcribe. Only offered
//     when the server reports a ready provider.
// Recording runs only while held, and stops itself at MAX_NOTE_DURATION_SEC.

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_NOTE_DURATION_SEC, type TranscriptSource } from '@/lib/capture';
import { ASR_LANGUAGE, webSpeechSource } from '@/lib/capture/asr-sources';

export interface SpeechResult {
  transcript: string;
  source: TranscriptSource;
  durationSec: number;
}

type Engine = 'web_speech' | 'server_asr';
export type RecorderState = 'idle' | 'recording' | 'transcribing';

interface RecognitionResultList {
  length: number;
  [i: number]: { isFinal: boolean; 0: { transcript: string } };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  onresult: ((e: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
interface RecognitionCtor {
  new (): Recognition;
  available?: (opts: { langs: string[]; processLocally: boolean }) => Promise<string>;
}

export function speechRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function mediaRecorderSupported(): boolean {
  return typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;
}

const RECOGNITION_ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access was refused. Allow it in the browser, or type the note.',
  'service-not-allowed': 'This browser’s speech service is unavailable. Type the note instead.',
  network: 'The browser’s speech service could not be reached. Type the note instead.',
  'no-speech': 'No speech was heard. Hold the button while you talk.',
  'audio-capture': 'No microphone was found. Type the note instead.',
  'language-not-supported': 'Singapore English recognition is not supported in this browser. Type the note instead.',
};

export function useSpeechCapture(engine: Engine | null, onResult: (r: SpeechResult) => void, onError: (message: string) => void) {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [interim, setInterim] = useState('');
  const startedAt = useRef(0);
  const cancelled = useRef(false);
  const recognition = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const finals = useRef<string[]>([]);
  const onDevice = useRef(false);
  const stopRef = useRef<() => void>(() => {});
  /** Released before the engine finished starting: stop as soon as it has. */
  const pendingStop = useRef(false);
  const callbacks = useRef({ onResult, onError });
  callbacks.current = { onResult, onError };

  const seconds = () => Math.min(MAX_NOTE_DURATION_SEC, Math.max(0.1, (Date.now() - startedAt.current) / 1000));

  // Visible timer + the 120 s auto-stop.
  useEffect(() => {
    if (state !== 'recording') return;
    const tick = setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000;
      setElapsed(Math.floor(s));
      if (s >= MAX_NOTE_DURATION_SEC) stopRef.current();
    }, 200);
    return () => clearInterval(tick);
  }, [state]);

  useEffect(
    () => () => {
      cancelled.current = true;
      recognition.current?.abort();
      if (recorder.current?.state === 'recording') recorder.current.stop();
    },
    [],
  );

  const finish = useCallback((transcript: string, source: TranscriptSource, durationSec: number) => {
    setState('idle');
    setInterim('');
    if (cancelled.current) return;
    if (!transcript.trim()) {
      callbacks.current.onError('No speech was recognised. Try again, or type the note.');
      return;
    }
    callbacks.current.onResult({ transcript: transcript.trim(), source, durationSec });
  }, []);

  const startWebSpeech = useCallback(async () => {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = ASR_LANGUAGE;
    rec.continuous = true;
    rec.interimResults = true;
    onDevice.current = false;
    try {
      if (Ctor.available && (await Ctor.available({ langs: [ASR_LANGUAGE], processLocally: true })) === 'available') {
        rec.processLocally = true;
        onDevice.current = true;
      }
    } catch {
      onDevice.current = false;
    }
    finals.current = [];
    rec.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals.current.push(r[0].transcript.trim());
        else live += r[0].transcript;
      }
      setInterim([...finals.current, live.trim()].filter(Boolean).join(' '));
    };
    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      cancelled.current = true;
      setState('idle');
      callbacks.current.onError(RECOGNITION_ERRORS[e.error] ?? 'Speech recognition stopped. Type the note instead.');
    };
    const duration = { value: 0 };
    rec.onend = () => {
      recognition.current = null;
      finish(finals.current.join(' '), webSpeechSource(onDevice.current), duration.value || seconds());
    };
    stopRef.current = () => {
      duration.value = seconds();
      setState('transcribing');
      rec.stop();
    };
    recognition.current = rec;
    rec.start();
    if (pendingStop.current) stopRef.current();
  }, [finish]);

  const startServer = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState('idle');
      callbacks.current.onError(RECOGNITION_ERRORS['not-allowed']);
      return;
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    const duration = { value: 0 };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      recorder.current = null;
      if (cancelled.current) return;
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      try {
        const res = await fetch('/api/capture/transcribe', {
          method: 'POST',
          headers: { 'content-type': blob.type, 'x-capture-duration': duration.value.toFixed(1) },
          body: blob,
        });
        const json = (await res.json()) as { transcript?: string; source?: TranscriptSource; error?: string };
        if (!res.ok || !json.transcript || !json.source) throw new Error(json.error ?? 'Transcription failed.');
        finish(json.transcript, json.source, duration.value);
      } catch (err) {
        setState('idle');
        callbacks.current.onError(err instanceof Error ? err.message : 'Transcription failed. Type the note instead.');
      }
    };
    stopRef.current = () => {
      duration.value = seconds();
      setState('transcribing');
      rec.stop();
    };
    recorder.current = rec;
    rec.start();
    if (pendingStop.current) stopRef.current();
  }, [finish]);

  const start = useCallback(() => {
    if (!engine || state !== 'idle') return;
    cancelled.current = false;
    pendingStop.current = false;
    stopRef.current = () => {
      pendingStop.current = true;
    };
    startedAt.current = Date.now();
    setElapsed(0);
    setInterim('');
    setState('recording');
    void (engine === 'web_speech' ? startWebSpeech() : startServer());
  }, [engine, state, startWebSpeech, startServer]);

  const stop = useCallback(() => {
    if (state === 'recording') stopRef.current();
  }, [state]);

  const cancel = useCallback(() => {
    if (state === 'idle') return;
    cancelled.current = true;
    pendingStop.current = true;
    recognition.current?.abort();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    setState('idle');
    setInterim('');
    setElapsed(0);
  }, [state]);

  return { state, elapsed, interim, start, stop, cancel };
}
