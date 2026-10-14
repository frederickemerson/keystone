'use client';

// Left column — the simulated call. Three states: idle (incoming call), active
// (in-call UI with waveform, live captions, controls, jump menu, contradiction
// card), and ended (summary + CTA to the Decision Canvas).

import Link from 'next/link';
import {
  Phone,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import { TranscriptLine, KpiStat, CHIP_BASE, toRoman } from '@/components/mosaic';
import type { TranscriptTurn } from '@/lib/data';
import type { Rule } from '@/lib/engine/types';
import type { CallPlayback, Speed } from './useCallPlayback';
import { PHASE_ORDER } from './phases';
import type { PhaseLabel } from './phases';
import { computeCoverage } from './CoverageMeter';
import { ContradictionCard } from './ContradictionCard';

type Contradiction = import('@/lib/data').ContradictionFixture['contradiction'];

const SPEEDS: Speed[] = [1, 2, 4];
const JUMP_MOMENTS = [
  { t: '00:14:32', label: 'LEW rule', ruleId: 'TS-07' },
  { t: '00:23:10', label: 'Contradiction caught', ruleId: null },
];

/**
 * Shown wherever the call is heard: the audio is synthesised speech reading
 * the transcript, never the expert's own voice.
 */
export const SYNTHETIC_VOICE_CAPTION = 'Synthetic voice reading his recorded words';

/**
 * The same caption, naming what produced the audio. Which tier is speaking —
 * a file rendered ahead of time, a live synthesis call, or the browser's own
 * voice — is the difference between this sounding like a person and sounding
 * like a machine, so it is printed rather than left to be guessed from the
 * audio (lib/speech/useVoice).
 */
function voiceCaption(label: string | null): string {
  return label ? `${SYNTHETIC_VOICE_CAPTION} · ${label}` : SYNTHETIC_VOICE_CAPTION;
}

function Waveform({ active, expert }: { active: boolean; expert: boolean }) {
  const heights = [45, 75, 100, 60, 85];
  return (
    <span className="inline-flex h-5 items-end gap-0.5" aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            'w-1 rounded-full',
            expert ? 'bg-marker' : 'bg-charcoal',
            active ? 'animate-pulse' : 'opacity-40',
            'motion-reduce:animate-none',
          )}
          style={{ height: active ? `${h}%` : '30%', animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

function PhaseChips({ current }: { current: string }) {
  const currentIndex = PHASE_ORDER.indexOf(current as PhaseLabel);
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Interview phases">
      {PHASE_ORDER.map((p, i) => {
        const isCurrent = i === currentIndex;
        const done = currentIndex > -1 && i < currentIndex;
        return (
          <li
            key={p}
            className={cn(
              CHIP_BASE,
              'py-1.5 transition-[background-color,border-color,color] duration-200',
              isCurrent
                ? 'border-line-strong bg-surface text-ink shadow-button'
                : done
                  ? 'border-line bg-dew-drop text-ink'
                  : 'border-line bg-transparent text-ink-muted',
            )}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span
              aria-hidden="true"
              className={cn('font-display-soft font-semibold', isCurrent ? 'text-marker-ink' : 'text-ink-muted')}
            >
              {toRoman(i + 1)}
            </span>
            {p}
            {done ? <span className="sr-only"> (done)</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

function ControlButton({
  label,
  onClick,
  primary = false,
  children,
}: {
  label: string;
  onClick: () => void;
  /** The one filled control in the call view (play / pause). */
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn('btn-pill size-10 px-0', primary && 'btn-pill-primary')}
    >
      {children}
    </button>
  );
}

export function CallPanel({
  playback,
  expert,
  contradiction,
  turns,
  revealedRules,
  pillId,
  pillName,
  duration,
  focusAccept,
}: {
  playback: CallPlayback;
  expert: { name: string; role: string; asset: string; retiring: string };
  contradiction: Contradiction;
  turns: TranscriptTurn[];
  revealedRules: Rule[];
  pillId: string;
  pillName: string;
  /** Recorded call length from the transcript ("HH:MM:SS"). */
  duration: string;
  /** Focus "Accept call" on load. False while a ?at= seek offers its own "Play from" button. */
  focusAccept: boolean;
}) {
  const { status } = playback;

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-line-strong bg-surface p-6 shadow-card"
      aria-label="Expert onboarding call"
    >
      {status === 'idle' ? (
        <IdleView expert={expert} onAccept={playback.accept} autoFocus={focusAccept} />
      ) : status === 'ended' ? (
        <EndedView
          playback={playback}
          coverage={computeCoverage(revealedRules).overall}
          pillId={pillId}
          pillName={pillName}
          duration={duration}
        />
      ) : (
        <ActiveView playback={playback} expert={expert} contradiction={contradiction} turns={turns} />
      )}
    </section>
  );
}

function IdleView({
  expert,
  onAccept,
  autoFocus,
}: {
  expert: { name: string; role: string; asset: string; retiring: string };
  onAccept: () => void;
  autoFocus: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <span className="relative grid size-20 place-items-center rounded-full border-[1.5px] border-line-strong bg-dew-drop">
        <span className="absolute inset-0 animate-ping rounded-full bg-marker/15 motion-reduce:animate-none" />
        <Phone className="size-8 text-ink" aria-hidden="true" />
      </span>
      <div>
        <p className="text-[13px] text-ink-muted">Incoming onboarding call</p>
        <h2 className="mt-1 text-[28px] font-semibold leading-tight">{expert.name}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {expert.role} · {expert.asset} · {expert.retiring}
        </p>
      </div>
      <button
        type="button"
        onClick={onAccept}
        autoFocus={autoFocus}
        className="btn-pill btn-pill-primary min-h-12 px-7 text-[15px]"
      >
        <Phone className="size-4" aria-hidden="true" />
        Accept call
      </button>
      <p className="text-xs text-ink-muted">
        Simulated, fully offline voice call — no network, no API key. {SYNTHETIC_VOICE_CAPTION}; it is not his own
        voice.
      </p>
    </div>
  );
}

function ActiveView({
  playback,
  expert,
  contradiction,
  turns,
}: {
  playback: CallPlayback;
  expert: { name: string; role: string; asset: string; retiring: string };
  contradiction: Contradiction;
  turns: TranscriptTurn[];
}) {
  const { currentTurn, paused, muted, speed, turnIndex } = playback;
  const running = playback.status === 'active' && !paused;
  const isExpert = currentTurn?.speaker === expert.name;
  const extracted = currentTurn?.extracted_rule_ids ?? [];

  return (
    <>
      {/* Header: avatar, name, timer, phase */}
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line-strong bg-dew-drop font-display-soft text-[15px] font-semibold text-heading">
          {expert.name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{expert.name}</p>
          <p className="truncate text-[13px] text-ink-muted">
            {expert.role} · {expert.asset}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-full border border-line bg-dew-drop px-3 py-1.5">
          <Clock className="size-3.5 text-ink-muted" aria-hidden="true" />
          <span className="font-mono text-sm font-medium tabular-nums text-ink" aria-label="Call time">
            {playback.callTime}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Waveform active={running} expert={isExpert} />
        <span className="text-[13px] font-medium text-ink">
          {isExpert ? `${expert.name}'s words` : 'Keystone'}
          {paused ? ' · paused' : running && !isExpert ? ' is speaking…' : ''}
        </span>
        {/* Honest audio label: the voice is browser text-to-speech, not a recording of him. */}
        {isExpert ? (
          <span
            className="rounded-full border border-line bg-dew-drop px-2 py-0.5 text-[11px] text-ink-muted"
            aria-label={`Audio: ${voiceCaption(playback.voiceLabel)}. This is not ${expert.name}'s own voice.`}
          >
            {voiceCaption(playback.voiceLabel)}
          </span>
        ) : null}
      </div>

      <PhaseChips current={playback.phase as PhaseLabel} />

      {/* Live caption (always visible, polite live region for screen readers) */}
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-line-strong bg-dew-drop p-5"
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-ink">{currentTurn?.speaker}</span>
          {currentTurn?.t ? (
            <span className="font-mono text-xs tabular-nums text-ink-muted">{currentTurn.t}</span>
          ) : null}
        </div>
        <p className="mt-1.5 text-[17px] leading-relaxed text-ink">{currentTurn?.text}</p>
        {extracted.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1" aria-label="Extracted rule candidates">
            {extracted.map((id) => (
              <span
                key={id}
                className="rounded-full border border-line-strong bg-surface px-2 py-0.5 font-mono text-[11px] font-medium text-ink"
              >
                {id}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Contradiction card */}
      {playback.contradictionVisible ? (
        <ContradictionCard data={contradiction} resolved={playback.contradictionResolved} />
      ) : null}

      {/* Running transcript log (historical context; the live region above is the
          single aria-live source). */}
      <div aria-hidden="true" className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
        {turns.slice(0, turnIndex + 1).map((turn, i) => (
          <TranscriptLine
            key={i}
            speaker={turn.speaker}
            timestamp={turn.t}
            text={turn.text}
            probeId={turn.probe_id ?? null}
            extractedRuleIds={turn.extracted_rule_ids}
            active={i === turnIndex}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <ControlButton label={paused ? 'Resume' : 'Pause'} onClick={playback.togglePause} primary>
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </ControlButton>
        <ControlButton label="Skip to next turn" onClick={playback.skipNext}>
          <SkipForward className="size-4" />
        </ControlButton>
        <ControlButton
          label={muted ? 'Unmute (captions continue)' : 'Mute (captions continue)'}
          onClick={playback.toggleMute}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </ControlButton>

        <div
          className="ml-auto flex items-center gap-0.5 rounded-full border border-line-strong/70 bg-dew-drop p-0.5"
          role="group"
          aria-label="Playback speed"
        >
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => playback.setSpeed(s)}
              aria-pressed={speed === s}
              className={cn(
                'min-h-8 rounded-full px-3 text-xs font-medium tabular-nums transition-[background-color,color,box-shadow] duration-150',
                speed === s ? 'bg-surface text-ink shadow-button' : 'text-ink-muted hover:text-ink',
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Jump to key moments */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Jump to key moments">
        <span className="text-[13px] text-ink-muted">Jump to</span>
        {JUMP_MOMENTS.map((m) => (
          <button
            key={m.t}
            type="button"
            onClick={() => playback.jumpTo(m.t)}
            className="btn-pill text-xs"
          >
            <span className="font-mono tabular-nums text-ink-muted">{m.t}</span>
            {m.label}
            {m.ruleId ? <span className="font-mono text-ink-muted">{m.ruleId}</span> : null}
          </button>
        ))}
      </div>
    </>
  );
}

function EndedView({
  playback,
  coverage,
  pillId,
  pillName,
  duration,
}: {
  playback: CallPlayback;
  coverage: number;
  pillId: string;
  pillName: string;
  duration: string;
}) {
  const rulesCaptured = playback.revealedRuleIds.length;
  const contradictionsResolved = playback.contradictionResolved ? 1 : 0;

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-5 text-recommend" aria-hidden="true" />
        <h2 className="text-[24px] font-semibold leading-tight">Call complete</h2>
      </div>
      <p className="text-sm text-ink-muted">
        The interview is transcribed and {rulesCaptured} rule candidates were extracted, each
        linked to its transcript span. Review and confirm them on the Decision Canvas.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiStat label="Duration" value={duration} />
        <KpiStat label="Rules captured" value={rulesCaptured} />
        <KpiStat label="Contradictions resolved" value={contradictionsResolved} />
        <KpiStat label="Coverage" value={`${coverage}%`} />
      </div>

      <Link
        href={`/canvas/${pillId}`}
        className="btn-pill btn-pill-primary min-h-11 self-start px-6 text-sm"
      >
        Review on the decision canvas
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <p className="text-xs text-ink-muted">
        {pillName} · <span className="font-mono">{pillId}</span>
      </p>
    </div>
  );
}
