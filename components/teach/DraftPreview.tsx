'use client';

// What the answers would become — shown, not claimed.
//
// The end of the exercise used to assert that a draft existed and that someone
// had to review it. Nothing had been written, so the sentence was false. This
// is the draft it was talking about: built from the structured claims, with
// only the fields the answers actually settled, each one next to the words it
// came from.
//
// It stops short of proposing itself into the pill. These answers span more
// than one rule — isolation is TS-02, the re-energisation gate is TS-07 — and
// deciding which rule a statement amends is a judgement, not a lookup. The
// screen says that instead of guessing.

import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import { routes } from '@/lib/journey/routes';
import { PART_LABELS, type RulePart } from '@/lib/teach/parts';
import type { Rule } from '@/lib/engine/types';
import type { DraftedRule } from '@/lib/teach/draft';
import type { Claim } from '@/lib/teach/exercise';

export interface DraftPreviewProps {
  draft: DraftedRule;
  provenance: readonly Claim[];
  pillId: string;
  /** Parts no answer settled — named, so the gap is visible rather than implied. */
  missing: RulePart[];
  /**
   * Candidates a model read out of the typed account and the expert then
   * confirmed. Kept separate from the tapped fields above, because how a line
   * got here changes how much it should be trusted: a tap is a structured
   * answer, a confirmed candidate is a model's reading that a person agreed
   * with.
   */
  fromAccount: readonly Rule[];
}

/** The patch field each part writes, so the preview shows the real shape. */
function valueFor(draft: DraftedRule, part: RulePart): string[] {
  const { patch } = draft;
  switch (part) {
    case 'decision':
      return patch.decision ? [patch.decision] : [];
    case 'required_evidence':
      return patch.required_evidence ?? [];
    case 'forbidden_actions':
      return patch.forbidden_actions ?? [];
    case 'escalate_to':
      return patch.escalate_to ? [patch.escalate_to.role] : [];
    case 'deadline_minutes':
      return patch.deadline_minutes === undefined
        ? []
        : [patch.deadline_minutes === null ? 'no fixed clock' : `${patch.deadline_minutes} minutes`];
    case 'trigger':
      return (patch.trigger?.all ?? []).map((c) => `${c.path} ${c.op} ${String(c.value)}`);
    case 'exceptions':
      return draft.exception ? [draft.exception] : [];
    default:
      return [];
  }
}

export function DraftPreview({ draft, provenance, pillId, missing, fromAccount }: DraftPreviewProps) {
  return (
    <section className="rounded-xl border border-line-strong bg-surface p-5">
      <h2 className="text-[17px] text-ink">What this would become</h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">
        Built from your answers, in the shape the engine reads. Only the fields you settled are here — nothing has
        been filled in on your behalf.
      </p>

      <dl className="mt-4 space-y-3">
        {draft.filled.map((part) => {
          const values = valueFor(draft, part);
          const sources = provenance.filter((claim) => claim.part === part);
          return (
            <div key={part} className="rounded-lg border border-line bg-cream-paper px-3.5 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
                {PART_LABELS[part].label}
              </dt>
              <dd className="mt-1 space-y-1">
                {values.length > 0 ? (
                  values.map((value) => (
                    <p key={value} className="font-mono text-[12.5px] leading-snug text-ink">
                      {value}
                    </p>
                  ))
                ) : (
                  <p className="text-[13px] italic leading-snug text-ink-muted">
                    Answered, but it adds nothing the engine can check.
                  </p>
                )}
                {sources.length > 0 ? (
                  <p className="pt-1 text-[12px] leading-snug text-ink-muted">
                    From: {sources.map((s) => `“${s.label}”`).join(', ')}
                  </p>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>

      {fromAccount.length > 0 ? (
        <div className="mt-4">
          <h3 className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
            Also, from your written account
          </h3>
          <ul className="mt-2 space-y-2">
            {fromAccount.map((rule) => (
              <li key={rule.id} className="rounded-lg border border-line bg-cream-paper px-3.5 py-3">
                <p className="text-[13.5px] leading-snug text-ink">{rule.title}</p>
                <p className="mt-1 text-[12px] leading-snug text-ink-muted">
                  Read out of your prose by a model, and confirmed by you. The fields above came from answers you
                  tapped, which need no reading at all.
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {missing.length > 0 ? (
        <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
          Still blank:{' '}
          <span className="text-ink">{missing.map((part) => PART_LABELS[part].label.toLowerCase()).join(', ')}</span>.
          No question here asks about {missing.length === 1 ? 'it' : 'those'}, so nothing has been assumed.
        </p>
      ) : null}

      {draft.unmapped.length > 0 ? (
        <p className="mt-2 text-[13px] leading-relaxed text-blocked">
          {draft.unmapped.length} answer{draft.unmapped.length === 1 ? '' : 's'} had no declared meaning and were
          left out rather than guessed at.
        </p>
      ) : null}

      <div className="mt-5 rounded-lg border border-line bg-dew-drop/60 px-3.5 py-3">
        <p className="text-[13px] leading-relaxed text-ink">
          This is not a rule yet, and nothing has been written to the pill. These answers touch more than one rule
          — isolation is TS-02, the re-energisation gate is TS-07 — and choosing which rule a statement amends is a
          judgement someone with authority over this pill has to make, not a lookup.
        </p>
        <Link href={routes.canvas(pillId)} className="btn-pill btn-pill-primary mt-3 text-xs">
          <LayoutGrid className="size-3.5" aria-hidden="true" /> Open the decision canvas
        </Link>
      </div>
    </section>
  );
}
