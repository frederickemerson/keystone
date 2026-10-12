'use client';

// A rule that was proposed from a frontline voice note (PillVersion.capture):
// the verbatim quote it rests on, how the speaker is credited, what happened
// to the raw audio, the read-back state, and the peer gate before Shadow.
// Unproposed drafts use components/capture/DraftFromNoteTile instead.

import { AudioLines, FileAudio } from 'lucide-react';
import { CHIP_BASE, TONE_CHIP } from '@/components/mosaic';
import { audioExpired, creditFor, type CaptureStoreActions, type DraftFromNote, type PeerConfirmation, type VoiceNote } from '@/lib/capture';
import { transcriptSourceLabel } from '@/lib/capture/asr-sources';
import { roleLabel, type PillEditPolicy } from '@/lib/governance/access';
import type { Actor, CaptureProvenance, VersionStatus } from '@/lib/governance/versions';
import { cn } from '@/lib/ui/cn';
import { PeerConfirmPanel, type PeerTarget } from './PeerConfirmPanel';

const SGT_DATE = new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric' });

function audioLine(note: VoiceNote | undefined, now: string): string {
  if (!note) return 'Raw audio is never kept without the speaker’s consent; this device does not hold the note.';
  if (note.transcriptSource.provider === 'typed' || note.transcriptSource.provider === 'fixture') {
    return 'No audio was recorded: the note was typed.';
  }
  if (audioExpired(note, now)) {
    return note.audio.retained
      ? 'Raw audio was deleted when its consented retention ended. The transcript is the record.'
      : 'Raw audio was not kept: the speaker did not consent to keeping it. The transcript is the record.';
  }
  return `Raw audio kept with the speaker’s consent until ${SGT_DATE.format(new Date(note.audio.expiresAt ?? now))}, then deleted.`;
}

export function CapturedRulePanel({
  pillId,
  pillVersion,
  versionStatus,
  capture,
  proposer,
  note,
  draft,
  policy,
  confirmations,
  currentActor,
  peerConfirm,
  now,
}: {
  pillId: string;
  pillVersion: string;
  versionStatus: VersionStatus;
  capture: CaptureProvenance;
  /** Who proposed this version (cannot also be its peer). */
  proposer: { name: string };
  /** The note and its draft, when this device holds them (persisted governance state). */
  note: VoiceNote | undefined;
  draft: DraftFromNote | undefined;
  policy: PillEditPolicy;
  confirmations: readonly PeerConfirmation[];
  currentActor: Actor;
  peerConfirm: CaptureStoreActions['peerConfirm'];
  now: string;
}) {
  const target: PeerTarget = { pillId, pillVersion, ruleId: capture.ruleId, noteId: capture.noteId };
  // Named credit is opt-in: without the note's consent on this device, credit the role only.
  const credit = note ? creditFor(note) : roleLabel(capture.author.role);
  const checked = draft ? draft.readBack.filter((c) => c.confirmed === true).length : undefined;

  return (
    <section
      aria-label={`${capture.ruleId} came from a frontline note`}
      className="space-y-3 rounded-xl border border-line-strong/60 bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn(CHIP_BASE, TONE_CHIP.neutral)}>
          <AudioLines className="size-3.5" aria-hidden="true" />
          From a frontline note
        </span>
        <span className="font-mono text-[12px] text-ink">{capture.ruleId}</span>
        <span className="font-mono text-[12px] text-ink-muted">{capture.noteId}</span>
      </div>

      <figure className="border-l-2 border-ink/70 pl-3">
        <blockquote className="text-[15px] leading-relaxed text-ink">“{capture.quoteSpan.text}”</blockquote>
        <figcaption className="mt-1 text-[12px] text-ink-muted">
          {credit}
          {note ? ` · ${transcriptSourceLabel(note.transcriptSource)}` : ''}
        </figcaption>
      </figure>

      <dl className="grid gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-[7.5rem_1fr]">
        <dt className="text-ink-muted">Read-back</dt>
        <dd className="text-ink">
          {draft && checked !== undefined
            ? draft.readBack.length === 0
              ? 'No numbers, tags, roles or times to check'
              : `All ${checked} of ${draft.readBack.length} values checked by the speaker`
            : 'Checked by the speaker before it could be proposed'}
        </dd>
        <dt className="text-ink-muted">Audio</dt>
        <dd className="flex items-start gap-1.5 text-ink">
          <FileAudio className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
          {audioLine(note, now)}
        </dd>
      </dl>

      <PeerConfirmPanel
        target={target}
        author={capture.author}
        proposer={proposer}
        authorCredit={credit}
        versionStatus={versionStatus}
        policy={policy}
        confirmations={confirmations}
        currentActor={currentActor}
        peerConfirm={peerConfirm}
      />
    </section>
  );
}
