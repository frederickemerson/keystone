'use client';

// Peer gate for a capture-derived pill version (PLAN F4): the badge
// ("Peer-confirmed by …" / "Disputed by …"), and Confirm as peer / Dispute for
// eligible people. Eligibility and the gate come from the contract
// (peerConfirmAuthority / peerGate); the store re-checks and audits.

import { useId, useState } from 'react';
import { BadgeCheck, CircleDashed, ShieldX, ThumbsDown, ThumbsUp } from 'lucide-react';
import { CHIP_BASE, TONE_CHIP } from '@/components/mosaic';
import { formatSgtClock } from '@/components/incident/labels';
import {
  peerConfirmAuthority,
  peerGate,
  type CaptureStoreActions,
  type PeerConfirmation,
  type PeerGate,
} from '@/lib/capture';
import { identityKey, roleLabel, type PillEditPolicy } from '@/lib/governance/access';
import type { Actor, VersionStatus } from '@/lib/governance/versions';
import { cn } from '@/lib/ui/cn';

export interface PeerTarget {
  pillId: string;
  pillVersion: string;
  ruleId: string;
  noteId: string;
}

/** The gate for one target; shared by the badge, the panel and Promote to Shadow. */
export function peerGateFor(
  confirmations: readonly PeerConfirmation[],
  target: PeerTarget,
  author: { name: string },
  policy: PillEditPolicy,
): PeerGate {
  return peerGate(confirmations, target, author, policy);
}

export function PeerBadge({ gate }: { gate: PeerGate }) {
  if (gate.disputers.length > 0) {
    return (
      <span className={cn(CHIP_BASE, TONE_CHIP.blocked, 'whitespace-normal')}>
        <ShieldX className="size-3.5 shrink-0" aria-hidden="true" />
        Disputed by {gate.disputers.join(', ')}
      </span>
    );
  }
  if (gate.allowed) {
    return (
      <span className={cn(CHIP_BASE, TONE_CHIP.recommend, 'whitespace-normal')}>
        <BadgeCheck className="size-3.5 shrink-0" aria-hidden="true" />
        Peer-confirmed by {gate.confirmers.join(', ')}
      </span>
    );
  }
  return (
    <span className={cn(CHIP_BASE, TONE_CHIP.approval, 'whitespace-normal')}>
      <CircleDashed className="size-3.5 shrink-0" aria-hidden="true" />
      Awaiting peer confirmation
    </span>
  );
}

export function PeerConfirmPanel({
  target,
  author,
  authorCredit,
  versionStatus,
  policy,
  confirmations,
  currentActor,
  peerConfirm,
}: {
  target: PeerTarget;
  /** Who recorded the note the rule came from (the gate excludes them). */
  author: { name: string; role: string };
  /** How the speaker is credited on screen (by name only with their opt-in). */
  authorCredit: string;
  /** Verdicts count only while the version is a Draft (the store refuses them after). */
  versionStatus: VersionStatus;
  policy: PillEditPolicy;
  confirmations: readonly PeerConfirmation[];
  currentActor: Actor;
  peerConfirm: CaptureStoreActions['peerConfirm'];
}) {
  const [disputing, setDisputing] = useState(false);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const reasonId = useId();
  const noteId = useId();

  const gate = peerGateFor(confirmations, target, author, policy);
  const open = versionStatus === 'Draft';
  const policyAuthority = peerConfirmAuthority(currentActor, author, policy);
  const authority = open
    ? policyAuthority
    : { allowed: false, reason: `Peer verdicts close when v${target.pillVersion} leaves Draft (it is ${versionStatus}).` };
  const mine = confirmations
    .filter(
      (c) =>
        c.pillId === target.pillId &&
        c.pillVersion === target.pillVersion &&
        c.ruleId === target.ruleId &&
        c.noteId === target.noteId,
    )
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const latestOwn = [...mine].reverse().find((c) => identityKey(c.confirmer.name) === identityKey(currentActor.name));
  const confirmGate = !authority.allowed
    ? authority.reason
    : latestOwn?.verdict === 'confirm'
      ? `You confirmed this at ${formatSgtClock(latestOwn.at)}.`
      : undefined;

  const record = (verdict: 'confirm' | 'dispute', text?: string) => {
    try {
      peerConfirm({ ...target, verdict, ...(text ? { note: text } : {}) });
      setMessage(verdict === 'confirm' ? 'Peer confirmation recorded.' : 'Dispute recorded.');
      setDisputing(false);
      setNote('');
    } catch (err) {
      setMessage(`Not recorded: ${(err as Error).message}`);
    }
  };

  return (
    <section aria-label="Peer confirmation" className="rounded-lg border border-line bg-dew-drop/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-[13px] font-semibold text-ink">Peer gate</h4>
        <PeerBadge gate={gate} />
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-ink-muted">
        Recorded by {authorCredit}. Someone else whose role may edit this pill confirms it before Shadow. An open
        dispute holds it.
      </p>

      {mine.length > 0 ? (
        <ul className="mt-2 space-y-1 text-[12px] text-ink">
          {mine.map((c) => (
            <li key={`${c.confirmer.name}:${c.at}`} className="flex flex-wrap gap-x-1.5">
              <span className="font-medium">{c.confirmer.name}</span>
              <span className="text-ink-muted">({roleLabel(c.confirmer.role)})</span>
              <span>{c.verdict === 'confirm' ? 'confirmed' : 'disputed'}</span>
              <time dateTime={c.at} className="font-mono text-[11px] tabular-nums text-ink-muted">
                {formatSgtClock(c.at)}
              </time>
              {c.note ? <span className="w-full text-ink-muted">“{c.note}”</span> : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => record('confirm')}
          disabled={Boolean(confirmGate)}
          aria-describedby={confirmGate ? reasonId : undefined}
          className="btn-pill btn-pill-primary text-xs"
        >
          <ThumbsUp className="size-3.5" aria-hidden="true" />
          Confirm as peer
        </button>
        <button
          type="button"
          onClick={() => setDisputing((d) => !d)}
          aria-expanded={disputing}
          disabled={!authority.allowed}
          aria-describedby={authority.allowed ? undefined : reasonId}
          className="btn-pill text-xs"
        >
          <ThumbsDown className="size-3.5" aria-hidden="true" />
          Dispute
        </button>
      </div>
      {confirmGate ? (
        <p id={reasonId} className="mt-2 text-[12px] text-ink-muted">
          {confirmGate}
        </p>
      ) : null}

      {disputing && authority.allowed ? (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim()) record('dispute', note.trim());
          }}
        >
          <label htmlFor={noteId} className="block text-[12px] font-medium text-ink">
            What is wrong with it?
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            required
            className="mt-1.5 w-full rounded-input border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink"
          />
          <button type="submit" disabled={!note.trim()} className="btn-pill mt-2 text-xs">
            Record dispute
          </button>
        </form>
      ) : null}

      {message ? (
        <p role="status" className="mt-2 text-[12px] text-ink">
          {message}
        </p>
      ) : null}
    </section>
  );
}
