'use client';

// Read-back: every number, asset tag, role and time in a transcript, extracted
// deterministically (lib/capture extractReadBack — never the LLM), shown in
// place and as a list. Each must be confirmed ("Right") or corrected ("Wrong" →
// type the correction) by the speaker. An asset tag that is not in the asset
// register is flagged.

import { useId, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, Pencil } from 'lucide-react';
import type { ReadBackItem, ReadBackKind } from '@/lib/capture';
import { roleLabel } from '@/lib/governance/access';
import { cn } from '@/lib/ui/cn';

const KIND_LABEL: Record<ReadBackKind, string> = {
  number: 'Number',
  asset_tag: 'Asset tag',
  role: 'Role',
  time: 'Time',
};

function canonicalText(chip: ReadBackItem): string | null {
  if (chip.kind === 'asset_tag') return chip.canonical ? 'In the asset register' : null;
  if (chip.kind === 'role') return chip.canonical ? roleLabel(chip.canonical) : null;
  if (chip.kind === 'time' && chip.canonical) {
    const d = /^PT(\d+(?:\.\d+)?)([HMS])$/.exec(chip.canonical);
    if (d) return `${d[1]} ${{ H: 'hour', M: 'minute', S: 'second' }[d[2] as 'H' | 'M' | 'S']}${d[1] === '1' ? '' : 's'}`;
    const day = /^P(\d+)D$/.exec(chip.canonical);
    if (day) return `${day[1]} day${day[1] === '1' ? '' : 's'}`;
    return chip.canonical;
  }
  return null;
}

function stateOf(chip: ReadBackItem): 'open' | 'right' | 'corrected' | 'wrong' {
  if (chip.confirmed === null) return 'open';
  if (chip.confirmed === false) return 'wrong';
  return chip.correctedText !== undefined ? 'corrected' : 'right';
}

/** The transcript with each chip's span marked (screen readers get the plain text). */
export function MarkedTranscript({ text, chips, className }: { text: string; chips: readonly ReadBackItem[]; className?: string }) {
  const parts: React.ReactNode[] = [];
  let at = 0;
  chips.forEach((c, i) => {
    if (c.spanStart < at) return;
    if (c.spanStart > at) parts.push(text.slice(at, c.spanStart));
    parts.push(
      <mark
        key={`${c.spanStart}-${i}`}
        className={cn(
          'rounded-[4px] px-0.5 text-ink',
          c.confirmed === true ? 'bg-recommend-tint underline decoration-recommend/60' : 'bg-approval-tint underline decoration-approval decoration-dotted',
        )}
      >
        {text.slice(c.spanStart, c.spanEnd)}
      </mark>,
    );
    at = c.spanEnd;
  });
  if (at < text.length) parts.push(text.slice(at));
  return <p className={cn('whitespace-pre-wrap text-[16px] leading-relaxed', className)}>{parts}</p>;
}

export interface ReadBackChipsProps {
  chips: readonly ReadBackItem[];
  onConfirm: (index: number) => void;
  onFlag: (index: number) => void;
  onCorrect: (index: number, text: string) => void;
  /** e.g. while drafting. */
  disabled?: boolean;
}

export function ReadBackChips({ chips, onConfirm, onFlag, onCorrect, disabled }: ReadBackChipsProps) {
  const headingId = useId();
  const done = chips.filter((c) => c.confirmed === true).length;
  if (chips.length === 0) {
    return <p className="text-sm text-ink-muted">No numbers, asset tags, roles or times to check in this note.</p>;
  }
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="text-[15px] font-semibold text-heading">
          Check what we heard
        </h3>
        <span className="text-sm tabular-nums text-ink-muted" aria-live="polite">
          {done} of {chips.length} checked
        </span>
      </div>
      <ul className="space-y-2">
        {chips.map((chip, i) => (
          <ChipRow
            key={`${chip.kind}-${chip.spanStart}-${chip.spanEnd}-${chip.text}`}
            chip={chip}
            disabled={disabled}
            onConfirm={() => onConfirm(i)}
            onFlag={() => onFlag(i)}
            onCorrect={(text) => onCorrect(i, text)}
          />
        ))}
      </ul>
    </section>
  );
}

function ChipRow({
  chip,
  disabled,
  onConfirm,
  onFlag,
  onCorrect,
}: {
  chip: ReadBackItem;
  disabled?: boolean;
  onConfirm: () => void;
  onFlag: () => void;
  onCorrect: (text: string) => void;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState(chip.text);
  const state = stateOf(chip);
  const unregistered = chip.kind === 'asset_tag' && !chip.canonical;
  const meaning = canonicalText(chip);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (draft.trim()) onCorrect(draft.trim());
  }

  return (
    <li
      className={cn(
        'rounded-lg border px-3 py-2.5',
        state === 'right' || state === 'corrected' ? 'border-recommend/40 bg-recommend-tint/60' : 'border-line-strong bg-surface',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-[11rem] flex-1">
          <p className="text-xs font-medium text-ink-muted">{KIND_LABEL[chip.kind]}</p>
          <p>
            <span className="font-mono text-[15px] font-medium text-ink">{chip.text}</span>
            {chip.correctedText !== undefined ? (
              <span className="ml-2 text-sm text-ink">
                → <span className="font-mono font-medium">{chip.correctedText}</span>
              </span>
            ) : meaning && meaning !== chip.text ? (
              <span className="ml-2 text-sm text-ink-muted">{meaning}</span>
            ) : null}
          </p>
          {unregistered ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium text-escalate">
              <AlertTriangle aria-hidden className="size-3.5" /> Not in the asset register
            </p>
          ) : null}
        </div>
        {state === 'right' ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-recommend">
            <Check aria-hidden className="size-4" /> Right
          </span>
        ) : null}
        {state === 'corrected' ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-recommend">
            <Pencil aria-hidden className="size-4" /> Corrected
          </span>
        ) : null}
        {state === 'open' ? (
          <span className="flex shrink-0 gap-2">
            <button type="button" className="btn-pill min-h-11 px-4" disabled={disabled} onClick={onConfirm} aria-label={`${chip.text} is right`}>
              <Check aria-hidden className="size-4" /> Right
            </button>
            <button type="button" className="btn-pill min-h-11 px-4" disabled={disabled} onClick={onFlag} aria-label={`${chip.text} is wrong`}>
              Wrong
            </button>
          </span>
        ) : null}
      </div>
      {state === 'wrong' ? (
        <form onSubmit={submit} className="mt-2 flex flex-wrap items-center gap-2">
          <label htmlFor={inputId} className="text-sm text-ink-muted">
            What should it say?
          </label>
          <input
            id={inputId}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-3 font-mono text-[15px]"
          />
          <button type="submit" className="btn-pill min-h-11 px-4" disabled={disabled || !draft.trim()}>
            Save correction
          </button>
        </form>
      ) : null}
    </li>
  );
}
