'use client';

// Frontline voice capture (docs/capture/PLAN.md F2 + F3):
//   consent notice → hold to talk (or type, or a recorded demo note)
//   → read-back chips (confirm or correct every value) → Draft rule
//   → DRAFT tiles from /api/llm/extract → Propose.
// Every transcript carries its true source (provider, model, region); the
// LLM only ever drafts; read-back chips are deterministic. All state changes
// go through the governance store's capture actions (each one audited; a
// refusal throws GovernanceError, whose message is shown).

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Keyboard, Mic, RotateCcw, Square, X } from 'lucide-react';
import { LlmBadge } from '@/components/mosaic/LlmBadge';
import {
  DEFAULT_AUDIO_RETENTION,
  MAX_NOTE_DURATION_SEC,
  MAX_TRANSCRIPT_CHARS,
  type Consent,
  type DraftFromNote,
  type ReadBackItem,
  type TranscriptSource,
  type VoiceNote,
} from '@/lib/capture';
import {
  availableCaptureModes,
  fixtureSource,
  transcriptSourceLabel,
  typedSource,
  type CaptureMode,
} from '@/lib/capture/asr-sources';
import { forgetConsent, recallConsent, rememberConsent, sessionStore } from '@/lib/capture/consent-session';
import { CAPTURE_FIXTURES, fixturesForTask } from '@/lib/capture/fixtures';
import {
  carriedAnswers,
  confirmChip,
  correctChip,
  correctedReadBack,
  correctedTranscript,
  draftInputs,
  extractRequestFor,
  extractionForNote,
  isRecordedDemoNote,
  flagChip,
  hasCorrections,
  noteDraftGate,
  startReadBack,
  type NoteDraft,
} from '@/lib/capture/note-flow';
import { roleLabel, UNRESOLVED_ROLE } from '@/lib/governance/access';
import { getGovernanceStore, useGovernanceStore } from '@/lib/governance/store';
import { generationLabel, LLM_CLIENT_WAIT_MS, type Generation } from '@/lib/llm/attribution';
import type { CandidateParse } from '@/lib/llm/candidates';
import { requestLive } from '@/lib/llm/live-request';
import { cn } from '@/lib/ui/cn';
import { ConsentNotice } from './ConsentNotice';
import { DraftFromNoteTile, type DraftOrigin, type ProposablePill } from './DraftFromNoteTile';
import { MarkedTranscript, ReadBackChips } from './ReadBackChips';
import { mediaRecorderSupported, speechRecognitionCtor, useSpeechCapture, type SpeechResult } from './useSpeechCapture';

export interface VoiceCaptureProps {
  assetId: string;
  taskId?: string;
  /** Pills a draft from this note may be proposed into (they must be seeded in the governance store). */
  pills?: readonly ProposablePill[];
  onNote?: (note: VoiceNote, drafts: DraftFromNote[]) => void;
}

interface Captured {
  transcript: string;
  source: TranscriptSource;
  durationSec: number;
  fixtureId?: string;
}

type DraftOutcome =
  | { kind: 'drafts'; noteId: string; origin: DraftOrigin; generation: Generation<CandidateParse> | null }
  | { kind: 'none'; noteId: string; reason: string };

/** A short, unique capture id (CT-/VN- ids allow [A-Za-z0-9-]). */
export function newCaptureId(prefix: 'CT' | 'VN'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function message(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const NO_DRAFTS: DraftFromNote[] = [];

/** A "recorded" generation result: no model was called. */
function recordedGeneration(reason: string): Generation<CandidateParse> {
  return { data: { candidates: [], rejected: [] }, source: 'recorded', provider: 'fixtures', model: 'none', latencyMs: 0, attempts: [], reason };
}

export function VoiceCapture({ assetId, taskId, pills = [], onNote }: VoiceCaptureProps) {
  const actor = useGovernanceStore((s) => s.currentActor);
  const signedIn = actor.role !== UNRESOLVED_ROLE;
  const speaker = roleLabel(actor.role);
  const [consent, setConsent] = useState<Consent | null>(null);
  // The stored decision is read after mount; until then show neither the notice nor the recorder.
  const [consentRead, setConsentRead] = useState(false);
  const [modes, setModes] = useState<CaptureMode[]>(['typed', 'fixture']);
  const [mode, setMode] = useState<CaptureMode>('typed');
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [readBack, setReadBack] = useState<NoteDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState<null | 'drafting' | 'redrafting'>(null);
  const [draftSecs, setDraftSecs] = useState(0);
  const [outcome, setOutcome] = useState<DraftOutcome | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const note = useGovernanceStore((s) => (outcome ? s.voiceNotes[outcome.noteId] : undefined));
  const drafts = useGovernanceStore((s) => (outcome ? s.draftsFromNotes[outcome.noteId] : undefined)) ?? NO_DRAFTS;
  // The incident whose task this note answers: its own recorded demo note is offered first.
  const incidentId = useGovernanceStore((s) => (taskId ? s.captureTasks[taskId]?.incidentId : undefined));

  useEffect(() => {
    // Asked once per person per session; the stored decision is shown and can be withdrawn.
    if (signedIn) setConsent(recallConsent(sessionStore(), actor.name));
    setConsentRead(true);
  }, [signedIn, actor.name]);

  // Which capture modes this device offers (server ASR only when the server says it is ready).
  useEffect(() => {
    let live = true;
    const webSpeech = speechRecognitionCtor() !== null;
    const media = mediaRecorderSupported();
    const apply = (serverAsr: boolean) => {
      if (!live) return;
      const m = availableCaptureModes({ webSpeech, mediaRecorder: media, serverAsr });
      setModes(m);
      setMode(m[0]);
    };
    apply(false);
    fetch('/api/capture/transcribe', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((j: { available?: boolean }) => apply(j.available === true))
      .catch(() => apply(false));
    return () => {
      live = false;
      inFlight.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (outcome) resultRef.current?.focus();
  }, [outcome]);

  // Visible wait while the extractor runs (bounded by LLM_CLIENT_WAIT_MS).
  useEffect(() => {
    if (!drafting) return;
    const t0 = Date.now();
    setDraftSecs(0);
    const tick = setInterval(() => setDraftSecs(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(tick);
  }, [drafting]);

  function accept(c: Captured) {
    setError(null);
    setOutcome(null);
    setCaptured(c);
    setReadBack(startReadBack(c.transcript));
  }

  function restart() {
    inFlight.current?.abort();
    setCaptured(null);
    setReadBack(null);
    setOutcome(null);
    setError(null);
  }

  const gate = readBack ? noteDraftGate(readBack) : null;

  /** Record the note as heard, then draft from it. */
  async function draftRule() {
    if (!captured || !readBack || !gate?.allowed || !consent) return;
    const store = getGovernanceStore().getState();
    setError(null);
    let recorded: VoiceNote;
    try {
      recorded = store.recordVoiceNote({
        id: newCaptureId('VN'),
        ...(taskId ? { taskId } : {}),
        assetId,
        recordedAt: new Date().toISOString(),
        durationSec: captured.durationSec,
        transcript: readBack.transcript,
        transcriptSource: captured.source,
        audio: DEFAULT_AUDIO_RETENTION,
        consent,
      });
      if (taskId) store.answerCaptureTask(taskId, recorded.id);
    } catch (err) {
      setError(message(err, 'The note could not be saved.'));
      return;
    }
    await extractAndRecord(recorded, readBack.chips, hasCorrections(readBack) ? readBack : null);
  }

  /**
   * Extract drafts from `n.transcript`, store them, and record the speaker's
   * answers on their chips. When `pendingCorrections` is given, the store then
   * amends the note with them and the drafts are re-extracted from the
   * corrected text (the LLM never keeps a misheard value).
   */
  async function extractAndRecord(n: VoiceNote, answers: readonly ReadBackItem[], pendingCorrections: NoteDraft | null) {
    const controller = new AbortController();
    inFlight.current?.abort();
    inFlight.current = controller;
    setDrafting(n.amendedFrom ? 'redrafting' : 'drafting');
    try {
      const fixture = captured?.fixtureId ? CAPTURE_FIXTURES.find((f) => f.id === captured.fixtureId) : undefined;
      const recordedDrafts = fixture?.extractionFor(n.id) ?? null;
      const recorded = fixture && recordedDrafts ? { transcript: fixture.transcript, extraction: recordedDrafts } : null;
      // The unedited recorded demo note always drafts the same rule (the guided
      // demo depends on it); anything a person typed or said goes to the live extractor.
      const generation = isRecordedDemoNote(n, recorded)
        ? recordedGeneration('This is the recorded demo note, so its recorded draft is used.')
        : await requestLive<CandidateParse>('/api/llm/extract', extractRequestFor(n, speaker), {
            signal: controller.signal,
            fallback: recordedGeneration,
          });
      const chosen = extractionForNote(generation, n, recorded);
      if (chosen.data === null || chosen.data.candidates.length === 0) {
        const reason = chosen.data === null ? chosen.reason : 'The extractor found no rule in this note. It is saved as a note.';
        setOutcome({ kind: 'none', noteId: n.id, reason });
        onNote?.(n, []);
        return;
      }
      const store = getGovernanceStore().getState();
      const stored = store.recordDraftsFromNote(n.id, draftInputs(n, chosen.data.candidates));
      for (const d of stored) {
        for (const { index, answer } of carriedAnswers(d, answers)) store.confirmReadBack(n.id, d.rule.id, index, answer);
      }
      if (pendingCorrections) {
        const holder = getGovernanceStore().getState().draftsFromNotes[n.id]?.find((d) => d.readBack.some((c) => c.correctedText !== undefined));
        if (holder) {
          const amended = store.amendNoteFromReadBack(n.id, holder.rule.id);
          await extractAndRecord(amended, correctedReadBack(pendingCorrections), null);
          return;
        }
      }
      const origin: DraftOrigin =
        chosen.from === 'live'
          ? { label: generationLabel(generation), detail: 'Live model output, a draft only.' }
          : {
              label: `Recorded demo draft · ${fixture?.extractionModel ?? 'recorded'}`,
              detail: `${generation.reason ?? 'Live drafting unavailable.'} This is the recorded draft for this exact demo note.`,
            };
      setOutcome({ kind: 'drafts', noteId: n.id, origin, generation: chosen.from === 'live' ? generation : null });
      onNote?.(n, getGovernanceStore().getState().draftsFromNotes[n.id] ?? []);
    } catch (err) {
      if (controller.signal.aborted) return;
      setOutcome({ kind: 'none', noteId: n.id, reason: message(err, 'Drafting failed.') });
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setDrafting(null);
      }
    }
  }

  /** A correction made on a draft tile: amend the note with it and re-draft. */
  async function amendAndRedraft(draft: DraftFromNote) {
    const store = getGovernanceStore().getState();
    const current = store.voiceNotes[draft.noteId];
    if (!current) return;
    const answers = correctedReadBack({ transcript: current.transcript, chips: draft.readBack });
    try {
      const amended = store.amendNoteFromReadBack(draft.noteId, draft.rule.id);
      setOutcome(null);
      await extractAndRecord(amended, answers, null);
    } catch (err) {
      setError(message(err, 'The correction could not be applied.'));
    }
  }

  if (!signedIn) {
    return <p className="text-sm text-ink-muted">Sign in to record a note.</p>;
  }
  if (!consentRead) return null;
  if (!consent) {
    return (
      <ConsentNotice
        speakerName={actor.name}
        speakerRole={speaker}
        onConsent={(c) => {
          rememberConsent(sessionStore(), actor.name, c);
          setConsent(c);
        }}
      />
    );
  }

  const shownText = note?.transcript ?? (readBack ? correctedTranscript(readBack) : '');
  const shownChips = readBack && !note ? (hasCorrections(readBack) ? correctedReadBack(readBack) : readBack.chips) : [];

  return (
    <div className="space-y-5">
      {!captured ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-muted">
          <span>
            {actor.name} agreed to recording this session · credited {consent.namedCredit ? 'by name' : `as ${speaker}`}.
          </span>
          <button
            type="button"
            className="underline underline-offset-2 hover:text-ink"
            onClick={() => {
              forgetConsent(sessionStore(), actor.name);
              setConsent(null);
            }}
          >
            Withdraw consent
          </button>
        </p>
      ) : null}
      {!captured ? (
        <CaptureInput assetId={assetId} incidentId={incidentId} modes={modes} mode={mode} onMode={setMode} onCaptured={accept} onError={setError} />
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg border border-blocked/35 bg-blocked-tint px-3 py-2 text-sm text-blocked">
          {error}
        </p>
      ) : null}

      {captured && readBack ? (
        <section aria-label="Your note" className="card-paper space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full border border-line bg-dew-drop px-2.5 py-1 text-xs text-ink-muted">{transcriptSourceLabel(captured.source)}</span>
            <button type="button" className="btn-pill min-h-11" onClick={restart} disabled={drafting !== null}>
              <RotateCcw aria-hidden className="size-4" /> Start again
            </button>
          </div>
          {note ? (
            <MarkedTranscript text={note.transcript} chips={[]} />
          ) : (
            <MarkedTranscript text={shownText} chips={shownChips} />
          )}
          {note?.amendedFrom ? (
            <p className="text-sm text-ink-muted">
              Corrected by the speaker. Heard as: <span className="italic">“{note.amendedFrom}”</span>
            </p>
          ) : hasCorrections(readBack) && !note ? (
            <p className="text-sm text-ink-muted">
              Shown with your corrections. Heard as: <span className="italic">“{readBack.transcript}”</span>
            </p>
          ) : null}
          {outcome || note ? null : (
            <>
              <ReadBackChips
                chips={readBack.chips}
                disabled={drafting !== null}
                onConfirm={(i) => setReadBack((s) => (s ? confirmChip(s, i) : s))}
                onFlag={(i) => setReadBack((s) => (s ? flagChip(s, i) : s))}
                onCorrect={(i, text) => setReadBack((s) => (s ? correctChip(s, i, text) : s))}
              />
              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  className="btn-pill btn-pill-primary min-h-12 px-6 text-[15px]"
                  disabled={!gate?.allowed || drafting !== null}
                  aria-describedby="draft-rule-why"
                  onClick={draftRule}
                >
                  Draft rule
                </button>
                <span id="draft-rule-why" role="status" className="text-sm text-ink-muted">
                  {gate?.allowed ? 'Every value is checked.' : gate?.reason}
                </span>
              </div>
            </>
          )}
          {drafting ? (
            <p role="status" className="border-t border-line pt-4 text-sm text-ink-muted">
              {drafting === 'redrafting' ? 'Applying your corrections and drafting again' : 'Drafting from your checked note'}: {draftSecs} s of up to{' '}
              {LLM_CLIENT_WAIT_MS / 1000} s. The result is a draft, not a rule.
            </p>
          ) : null}
        </section>
      ) : null}

      {outcome && note ? (
        <div ref={resultRef} tabIndex={-1} className="space-y-4 outline-none" aria-live="polite">
          {outcome.kind === 'none' ? (
            <div className="card-paper space-y-3 p-5">
              <p className="text-[15px] text-ink">
                Note saved as <span className="font-mono">{note.id}</span>. No draft yet.
              </p>
              <p className="text-sm text-ink-muted">{outcome.reason}</p>
              <button type="button" className="btn-pill min-h-11" disabled={drafting !== null} onClick={() => extractAndRecord(note, [], null)}>
                Try drafting again
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[17px] font-semibold text-heading">
                  {drafts.length} draft{drafts.length === 1 ? '' : 's'} from your note
                </h3>
                {outcome.generation ? <LlmBadge result={outcome.generation} /> : null}
              </div>
              {drafts.map((d) => (
                <DraftFromNoteTile
                  key={`${d.noteId}-${d.rule.id}`}
                  draft={d}
                  note={note}
                  origin={outcome.origin}
                  actingRole={actor.role}
                  isSpeaker={note.author.name === actor.name}
                  pills={pills}
                  onAnswer={(index, answer) => {
                    try {
                      getGovernanceStore().getState().confirmReadBack(d.noteId, d.rule.id, index, answer);
                      return null;
                    } catch (err) {
                      return message(err, 'Answer refused.');
                    }
                  }}
                  onAmend={() => amendAndRedraft(d)}
                  onPropose={(input) => {
                    try {
                      getGovernanceStore().getState().proposeFromNote({ noteId: d.noteId, draftRuleId: d.rule.id, ...input });
                      return null;
                    } catch (err) {
                      return message(err, 'Proposal refused.');
                    }
                  }}
                />
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Input: hold to talk, type, or a recorded demo note
// ---------------------------------------------------------------------------

function CaptureInput({
  assetId,
  incidentId,
  modes,
  mode,
  onMode,
  onCaptured,
  onError,
}: {
  assetId: string;
  incidentId: string | undefined;
  modes: CaptureMode[];
  mode: CaptureMode;
  onMode: (m: CaptureMode) => void;
  onCaptured: (c: Captured) => void;
  onError: (message: string | null) => void;
}) {
  const speech = modes.find((m) => m === 'server_asr' || m === 'web_speech') ?? null;
  const tabs: { id: CaptureMode; label: string }[] = [
    ...(speech ? [{ id: speech, label: 'Speak' }] : []),
    { id: 'typed', label: 'Type' },
    { id: 'fixture', label: 'Demo note' },
  ];
  return (
    <section aria-label="Record a note" className="card-paper space-y-4 p-5">
      <div role="radiogroup" aria-label="How to capture" className="inline-flex rounded-full border border-line-strong bg-dew-drop p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={mode === t.id}
            onClick={() => {
              onError(null);
              onMode(t.id);
            }}
            className={cn('min-h-10 rounded-full px-4 text-sm font-medium', mode === t.id ? 'bg-charcoal text-cream-paper' : 'text-ink')}
          >
            {t.label}
          </button>
        ))}
      </div>
      {!speech ? (
        <p className="text-sm text-ink-muted">Speech recognition is not available in this browser, so type the note or use a demo note.</p>
      ) : null}
      {(mode === 'web_speech' || mode === 'server_asr') && speech ? (
        <HoldToTalk engine={speech} onCaptured={onCaptured} onError={onError} />
      ) : null}
      {mode === 'typed' ? <TypedNote onCaptured={onCaptured} /> : null}
      {mode === 'fixture' ? <FixturePicker assetId={assetId} incidentId={incidentId} onCaptured={onCaptured} /> : null}
    </section>
  );
}

function HoldToTalk({ engine, onCaptured, onError }: { engine: 'server_asr' | 'web_speech'; onCaptured: (c: Captured) => void; onError: (m: string | null) => void }) {
  const hintId = useId();
  const { state, elapsed, interim, start, stop, cancel } = useSpeechCapture(
    engine,
    (r: SpeechResult) => onCaptured(r),
    (m) => onError(m),
  );
  const recording = state === 'recording';
  const left = Math.max(0, MAX_NOTE_DURATION_SEC - elapsed);

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onError(null);
    start();
  };
  const keyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') return cancel();
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      onError(null);
      start();
    }
  };
  const keyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      stop();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <button
        type="button"
        aria-describedby={hintId}
        aria-pressed={recording}
        disabled={state === 'transcribing'}
        onPointerDown={down}
        onPointerUp={stop}
        onPointerCancel={stop}
        onKeyDown={keyDown}
        onKeyUp={keyUp}
        onBlur={stop}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          'flex size-36 touch-none select-none flex-col items-center justify-center gap-2 rounded-full border-2 border-charcoal text-[15px] font-semibold transition-[background-color,scale] duration-150 sm:size-40',
          recording ? 'scale-105 bg-blocked text-cream-paper' : 'bg-charcoal text-cream-paper hover:bg-[#2e2b28]',
          'disabled:opacity-60',
        )}
      >
        {recording ? <Square aria-hidden className="size-7" /> : <Mic aria-hidden className="size-8" />}
        {recording ? 'Release to stop' : state === 'transcribing' ? 'Transcribing…' : 'Hold to talk'}
      </button>
      <p id={hintId} className="text-sm text-ink-muted">
        Hold the button (or Space) while you talk. Up to {MAX_NOTE_DURATION_SEC} s. Esc cancels.
      </p>
      <p role="timer" aria-live="off" className={cn('font-mono text-lg tabular-nums', recording ? 'text-blocked' : 'text-ink-muted')}>
        {String(Math.floor(elapsed / 60)).padStart(1, '0')}:{String(elapsed % 60).padStart(2, '0')} · {left} s left
      </p>
      {recording || state === 'transcribing' ? (
        <>
          <p className="min-h-6 max-w-prose text-[15px] text-ink" aria-live="polite">
            {interim || (engine === 'web_speech' ? 'Listening…' : 'Recording…')}
          </p>
          <button type="button" className="btn-pill min-h-11" onClick={cancel}>
            <X aria-hidden className="size-4" /> Cancel
          </button>
        </>
      ) : null}
      <p className="text-xs text-ink-muted">
        {engine === 'web_speech'
          ? 'Uses the browser’s speech recognition (en-SG). In most browsers the audio is processed by the browser vendor’s service.'
          : 'Audio is sent to the configured speech service, transcribed and discarded.'}
      </p>
    </div>
  );
}

function TypedNote({ onCaptured }: { onCaptured: (c: Captured) => void }) {
  const id = useId();
  const [text, setText] = useState('');
  const startedAt = useRef<number | null>(null);
  const trimmed = text.trim();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed) return;
        // A typed note has no audio; its duration is the time spent writing it, capped at the note limit.
        const secs = startedAt.current ? (Date.now() - startedAt.current) / 1000 : 1;
        onCaptured({ transcript: trimmed, source: typedSource(), durationSec: Math.min(MAX_NOTE_DURATION_SEC, Math.max(1, Math.round(secs))) });
      }}
    >
      <label htmlFor={id} className="flex items-center gap-2 text-[15px] font-medium text-heading">
        <Keyboard aria-hidden className="size-4" /> Type your note
      </label>
      <textarea
        id={id}
        rows={5}
        maxLength={MAX_TRANSCRIPT_CHARS}
        value={text}
        onFocus={() => {
          startedAt.current ??= Date.now();
        }}
        onChange={(e) => setText(e.target.value)}
        placeholder="What should the next person know about this equipment?"
        className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[16px] leading-relaxed"
      />
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-pill min-h-11 px-5" disabled={!trimmed}>
          Check the note
        </button>
        <span className="text-xs tabular-nums text-ink-muted">
          {text.length} / {MAX_TRANSCRIPT_CHARS.toLocaleString('en-SG')}
        </span>
      </div>
    </form>
  );
}

function FixturePicker({
  assetId,
  incidentId,
  onCaptured,
}: {
  assetId: string;
  incidentId: string | undefined;
  onCaptured: (c: Captured) => void;
}) {
  const fixtures = fixturesForTask({ assetId, incidentId });
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">Recorded demo notes are written for the demo. No audio was recorded, and the note is labelled that way.</p>
      <ul className="space-y-2">
        {fixtures.map((f) => {
          const forThisIncident = incidentId !== undefined && f.incidentId === incidentId;
          return (
            <li key={f.id} className={cn('rounded-lg border bg-surface p-3', forThisIncident ? 'border-ink/60' : 'border-line')}>
              {forThisIncident ? (
                <p className="mb-1.5 text-[12px] font-semibold text-heading">Recorded demo note for {incidentId} · use this one for the guided demo</p>
              ) : (
                <p className="mb-1.5 text-[12px] text-ink-muted">Another demo note (written for {f.assetId})</p>
              )}
              <p className="text-[15px] leading-relaxed text-ink">{f.transcript}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={cn('btn-pill min-h-11', forThisIncident && 'btn-pill-primary')}
                  onClick={() => onCaptured({ transcript: f.transcript, source: fixtureSource(f.id), durationSec: f.durationSec, fixtureId: f.id })}
                >
                  Use this demo note
                </button>
                <span className="font-mono text-xs text-ink-muted">
                  {f.assetId} · {f.durationSec} s
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
