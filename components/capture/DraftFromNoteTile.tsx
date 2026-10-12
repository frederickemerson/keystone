'use client';

// One DRAFT rule extracted from a voice note: the verbatim quote it rests on
// (with its read-back chips), who said it (creditFor), where the transcript and
// the draft came from, the audio-retention status, and Propose — enabled only
// when draftProposalReadiness allows and the acting role may change the pill.

import { useId, useState } from 'react';
import { FileText } from 'lucide-react';
import { ActionClassChip } from '@/components/mosaic/ActionClassChip';
import {
  audioExpired,
  creditFor,
  draftProposalReadiness,
  quoteMatchesNote,
  type DraftFromNote,
  type VoiceNote,
} from '@/lib/capture';
import { transcriptSourceLabel } from '@/lib/capture/asr-sources';
import { nextRuleId } from '@/lib/capture/note-flow';
import { pillEditAuthority, roleLabel, type PillEditPolicy } from '@/lib/governance/access';
import { MarkedTranscript, ReadBackChips } from './ReadBackChips';

export interface ProposablePill {
  id: string;
  name: string;
  ruleIds: string[];
  policy: PillEditPolicy;
}

export interface DraftOrigin {
  /** "Live · model via provider · 3.1 s" or the recorded-demo label. */
  label: string;
  detail?: string;
}

export interface DraftFromNoteTileProps {
  draft: DraftFromNote;
  note: VoiceNote;
  origin: DraftOrigin;
  actingRole: string;
  /** The signed-in person recorded the note (only they answer its read-back). */
  isSpeaker: boolean;
  pills: readonly ProposablePill[];
  /** Record a read-back answer in the store; returns the refusal message, if any. */
  onAnswer: (index: number, answer: { confirmed: boolean; correctedText?: string }) => string | null;
  /** Amend the note with this draft's corrections and draft again. */
  onAmend: () => void;
  onPropose: (input: { pillId: string; ruleId: string; reason: string }) => string | null;
}

export function DraftFromNoteTile({ draft, note, origin, actingRole, isSpeaker, pills, onAnswer, onAmend, onPropose }: DraftFromNoteTileProps) {
  const titleId = useId();
  const selectId = useId();
  const [pillId, setPillId] = useState(pills[0]?.id ?? '');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const corrected = draft.readBack.some((c) => c.correctedText !== undefined);
  const needsSpeaker = draft.readBack.some((c) => c.confirmed !== true) || corrected;
  const answer = (index: number, a: { confirmed: boolean; correctedText?: string }) => setAnswerError(onAnswer(index, a));
  const pill = pills.find((p) => p.id === pillId);
  const verbatim = quoteMatchesNote(draft, note);
  const readiness = draftProposalReadiness(draft, note);
  const authority = pill ? pillEditAuthority(actingRole, pill.policy) : { allowed: false, reason: 'No pill covers this asset.' };
  const blockedReason = !readiness.allowed ? readiness.reason : !authority.allowed ? authority.reason : undefined;
  const audio = audioExpired(note, note.recordedAt)
    ? note.transcriptSource.provider === 'typed' || note.transcriptSource.provider === 'fixture'
      ? 'No audio recorded'
      : 'Audio not kept · discarded after transcription'
    : `Audio kept until ${new Date(note.audio.expiresAt ?? '').toLocaleDateString('en-SG')}`;

  function propose() {
    if (!pill) return;
    const ruleId = nextRuleId(pill.ruleIds);
    const error = onPropose({ pillId: pill.id, ruleId, reason: `From voice note ${note.id} on ${note.assetId}: ${draft.rule.title}` });
    setResult(error ? { ok: false, message: error } : { ok: true, message: `Proposed as ${ruleId}, a Draft version of ${pill.name}. It needs a peer confirmation before Shadow.` });
  }

  return (
    <article aria-labelledby={titleId} className="card-paper space-y-4 p-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1 rounded-full border border-approval/40 bg-approval-tint px-2.5 py-1 font-medium text-approval">
            <FileText aria-hidden className="size-3.5" /> Draft
          </span>
          <span className="font-mono">{draft.rule.id}</span>
          <ActionClassChip actionClass={draft.rule.action_class} />
        </div>
        <h3 id={titleId} className="text-[17px] font-semibold leading-snug text-heading">
          {draft.rule.title}
        </h3>
        <p className="text-[15px] leading-relaxed text-ink">{draft.rule.decision}</p>
        {draft.rule.escalate_to?.role ? (
          <p className="text-sm text-ink-muted">Escalate to {roleLabel(draft.rule.escalate_to.role)}</p>
        ) : null}
      </header>

      <figure className="space-y-2 border-l-2 border-charcoal/70 pl-4">
        <figcaption className="text-xs font-medium text-ink-muted">
          {verbatim ? 'Quote from the note (verbatim)' : 'Quote does not match the note'}
        </figcaption>
        <blockquote>
          <MarkedTranscript text={draft.quoteSpan.text} chips={draft.readBack.map((c) => ({ ...c, spanStart: c.spanStart - draft.quoteSpan.start, spanEnd: c.spanEnd - draft.quoteSpan.start }))} className="text-[15px]" />
        </blockquote>
        <p className="text-sm text-ink-muted">
          {creditFor(note)} · <span className="font-mono">{note.id}</span> · {new Date(note.recordedAt).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </figure>

      {needsSpeaker ? (
        isSpeaker ? (
          <div className="space-y-3 rounded-lg border border-approval/30 bg-approval-tint/40 p-3">
            <ReadBackChips
              chips={draft.readBack}
              onConfirm={(i) => answer(i, { confirmed: true })}
              onFlag={(i) => answer(i, { confirmed: false })}
              onCorrect={(i, text) => answer(i, { confirmed: true, correctedText: text })}
            />
            {corrected ? (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn-pill min-h-11" onClick={onAmend}>
                  Apply correction and draft again
                </button>
                <span className="text-sm text-ink-muted">The extractor read the old value, so the draft is made again from the corrected note.</span>
              </div>
            ) : null}
            {answerError ? <p role="alert" className="text-sm text-blocked">{answerError}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Waiting for {note.author.name} to check the highlighted values.</p>
        )
      ) : null}

      <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[9rem_1fr]">
        <dt className="text-ink-muted">Read-back</dt>
        <dd>{readiness.pending.length === 0 ? `All ${draft.readBack.length} values checked` : `${readiness.pending.length} of ${draft.readBack.length} values unchecked`}</dd>
        <dt className="text-ink-muted">Transcript</dt>
        <dd>{transcriptSourceLabel(note.transcriptSource)}</dd>
        <dt className="text-ink-muted">Draft from</dt>
        <dd title={origin.detail}>{origin.label}</dd>
        <dt className="text-ink-muted">Audio</dt>
        <dd>{audio}</dd>
      </dl>

      <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
        {pills.length > 1 ? (
          <label htmlFor={selectId} className="flex flex-col gap-1 text-sm text-ink-muted">
            Pill
            <select id={selectId} value={pillId} onChange={(e) => setPillId(e.target.value)} className="min-h-11 rounded-lg border border-line-strong bg-surface px-3 text-ink">
              {pills.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : pill ? (
          <span className="text-sm text-ink-muted">Pill: {pill.name}</span>
        ) : null}
        <button type="button" className="btn-pill min-h-11 px-5" disabled={!!blockedReason || result?.ok} onClick={propose}>
          Propose
        </button>
        <p className="min-w-0 flex-1 basis-56 text-sm text-ink-muted" role="status">
          {result ? <span className={result.ok ? 'text-recommend' : 'text-blocked'}>{result.message}</span> : blockedReason ?? 'Proposing creates a Draft version. It is not a live rule.'}
        </p>
      </div>
    </article>
  );
}
