'use client';

// Decision Canvas: rules drafted from frontline voice notes for this pill.
// The note's speaker reads back every number / tag / role / time; someone the
// pill lets edit it proposes the draft as a Draft version; a different,
// eligible peer confirms it before Shadow. The store enforces and audits
// every step — this view only offers what policy allows and shows refusals.

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHeader } from '@/components/mosaic';
import { DraftFromNoteTile } from '@/components/capture/DraftFromNoteTile';
import { CapturedRulePanel } from '@/components/approvals/CapturedRulePanel';
import { noteById, taskForNote, useCaptureActions, useCaptureView } from '@/components/incident/useCapture';
import type { DraftFromNote, VoiceNote } from '@/lib/capture';
import { identityKey, pillEditAuthority } from '@/lib/governance/access';
import { routes, suggestHandoff } from '@/lib/journey';
import { HandoffButton } from '@/components/journey/HandoffButton';
import { useGovernanceStore } from '@/lib/governance/store';
import type { PillVersion } from '@/lib/governance/versions';
import type { PillBundle } from '@/lib/pills/load';
import type { PillEditPolicy as ProposablePillPolicy } from '@/lib/governance/access';
import { proposablePill, versionForDraft } from './noteDraftUtils';

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Refused.');

export function NoteDrafts({ pill }: { pill: PillBundle }) {
  const view = useCaptureView();
  const actions = useCaptureActions();
  const currentActor = useGovernanceStore((s) => s.currentActor);
  const history = useGovernanceStore((s) => s.versions[pill.id]);
  const [notice, setNotice] = useState<string | null>(null);

  const items = view.drafts.flatMap((draft) => {
    const note = noteById(view, draft.noteId);
    if (!note) return [];
    const task = taskForNote(view, note);
    // A gate task names its pill; a close-out or QR note is offered to every pill's canvas.
    if (task?.pillId && task.pillId !== pill.id) return [];
    return [{ draft, note, version: versionForDraft(history, draft) }];
  });
  if (items.length === 0) return null;

  // Rendered only after mount (capture state is client-only), so a live clock is safe here.
  const now = new Date().toISOString();
  const proposable = proposablePill(pill, history);
  // A draft not yet proposed, and the acting person may not propose it: hand to
  // someone the pill's own edit policy allows (the store enforces the same check).
  const unproposed = items.some((i) => !i.version?.capture);
  const editor =
    unproposed && !pillEditAuthority(currentActor.role, proposable.policy).allowed
      ? suggestHandoff((p) => pillEditAuthority(p.role, proposable.policy).allowed, currentActor)
      : undefined;

  return (
    <section aria-label="Drafts from frontline notes" className="space-y-3">
      <SectionHeader
        title="Drafts from frontline notes"
        description="Short notes from the people doing the work: read back by the speaker, proposed by the pill's editors, confirmed by a peer before Shadow."
      />
      {editor ? (
        <HandoffButton
          to={editor}
          href={routes.canvas(pill.id)}
          reason={`${pillEditAuthority(currentActor.role, proposable.policy).reason ?? ''} A draft becomes part of the pill only when one of its editors proposes it.`}
          action="propose the draft"
        />
      ) : null}
      {notice ? (
        <p role="status" className="rounded-lg bg-dew-drop px-3 py-1.5 text-xs text-ink">
          {notice}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {items.map(({ draft, note, version }) =>
          version?.capture ? (
            <ProposedDraft
              key={`${draft.noteId}:${draft.rule.id}`}
              pillId={pill.id}
              version={version}
              note={note}
              draft={draft}
              now={now}
              policy={proposable.policy}
              view={view}
              actions={actions}
              currentActor={currentActor}
            />
          ) : (
            <DraftFromNoteTile
              key={`${draft.noteId}:${draft.rule.id}`}
              draft={draft}
              note={note}
              origin={{
                label: 'Drafted when the note was recorded',
                detail: 'Model output, a draft only. The read-back and the quote check are deterministic.',
              }}
              actingRole={currentActor.role}
              isSpeaker={identityKey(currentActor.name) === identityKey(note.author.name)}
              pills={[proposable]}
              onAnswer={(index, answer) => {
                try {
                  actions.confirmReadBack(note.id, draft.rule.id, index, answer);
                  return null;
                } catch (err) {
                  return errorText(err);
                }
              }}
              onAmend={() =>
                setNotice(
                  'A corrected value means the rule must be drafted again from the corrected note. Open the task or the asset page where the note was recorded to apply it.',
                )
              }
              onPropose={(input) => {
                try {
                  actions.proposeFromNote({ noteId: note.id, draftRuleId: draft.rule.id, ...input });
                  return null;
                } catch (err) {
                  return errorText(err);
                }
              }}
            />
          ),
        )}
      </div>
    </section>
  );
}

function ProposedDraft({
  pillId,
  version,
  note,
  draft,
  now,
  policy,
  view,
  actions,
  currentActor,
}: {
  pillId: string;
  version: PillVersion;
  note: VoiceNote;
  draft: DraftFromNote;
  now: string;
  policy: ProposablePillPolicy;
  view: ReturnType<typeof useCaptureView>;
  actions: ReturnType<typeof useCaptureActions>;
  currentActor: { name: string; role: string };
}) {
  if (!version.capture) return null;
  return (
    <article aria-label={`${draft.rule.title}, proposed`} className="card-paper space-y-3 p-5">
      <h3 className="text-[17px] font-semibold leading-snug text-heading">{draft.rule.title}</h3>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="min-w-0 flex-1 basis-56 text-[13px] leading-snug text-ink">
          Proposed as <span className="font-mono">{version.capture.ruleId}</span> in{' '}
          <span className="font-mono">v{version.version}</span> ({version.status}) by {version.createdBy.name}.
        </p>
        <Link href={routes.approvals()} className="btn-pill text-xs">
          Approvals <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <CapturedRulePanel
        pillId={pillId}
        pillVersion={version.version}
        versionStatus={version.status}
        capture={version.capture}
        proposer={version.createdBy}
        note={note}
        draft={draft}
        policy={policy}
        confirmations={view.peerConfirmations}
        currentActor={currentActor}
        peerConfirm={actions.peerConfirm}
        now={now}
      />
    </article>
  );
}
