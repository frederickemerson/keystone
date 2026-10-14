'use client';

// One question: prose, a pick, a multi-pick, or true/false.
//
// Why taps and not only prose. The recorded call is 31 questions of free
// speech, which is how you elicit an account but a terrible way to pin a
// value: "how close is too close" has one right shape of answer and asking for
// it in prose means someone has to parse the prose. A tap is two seconds on a
// walkway, and it arrives already structured — a choice carries a `claim`
// (lib/teach/exercise), so the rule drafted from it needs no extraction and a
// disagreement between two answers is arithmetic rather than a model's
// opinion.
//
// The open question keeps its place as the FIRST one, because nothing
// multiple-choice can elicit the thing nobody thought to list.

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import { PART_LABELS } from '@/lib/teach/parts';
import { MIN_OPEN_CHARS, type Question } from '@/lib/teach/exercise';

export interface QuestionCardProps {
  question: Question;
  /** Prose answers only. */
  onAnswerText: (text: string) => void;
  onAnswerChoices: (choiceIds: string[]) => void;
  /**
   * Rendered under the textarea. Receives an `append` so dictated words land
   * in the same box the person is typing in — the card owns that text, so a
   * plain node could not reach it.
   */
  renderDictation?: (append: (text: string) => void) => React.ReactNode;
  disabled?: boolean;
}

export function QuestionCard({ question, onAnswerText, onAnswerChoices, renderDictation, disabled }: QuestionCardProps) {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const promptRef = useRef<HTMLParagraphElement>(null);

  // A new question resets the form and is announced, so a keyboard or screen
  // reader user is not left on the previous answer's controls.
  useEffect(() => {
    setText('');
    setPicked([]);
    promptRef.current?.focus();
  }, [question.id]);

  const isOpen = question.kind === 'open';
  const isMulti = question.kind === 'multi_choice';
  const enough = isOpen ? text.trim().length >= MIN_OPEN_CHARS : picked.length > 0;

  /** Dictation adds to what is there; it never replaces a half-typed answer. */
  const append = (dictated: string) => {
    setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${dictated}` : dictated));
  };

  const toggle = (choiceId: string) => {
    if (disabled) return;
    if (isMulti) {
      setPicked((prev) => (prev.includes(choiceId) ? prev.filter((c) => c !== choiceId) : [...prev, choiceId]));
      return;
    }
    // Single pick and true/false answer immediately: a confirm step on a
    // two-second question is friction with nothing to show for it.
    setPicked([choiceId]);
    onAnswerChoices([choiceId]);
  };

  return (
    <section className="rounded-xl border border-line-strong bg-surface p-5 shadow-button">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
        {PART_LABELS[question.covers].label}
        {question.refines ? ' · pinning the value' : null}
      </p>

      {question.given ? (
        <p className="mb-3 rounded-lg border-l-2 border-marker bg-dew-drop/60 px-3 py-2 text-[13px] leading-relaxed text-ink">
          {question.given}
        </p>
      ) : null}

      <p
        ref={promptRef}
        tabIndex={-1}
        aria-live="polite"
        className="text-[17px] leading-snug text-ink outline-none"
      >
        {question.prompt}
      </p>

      {isOpen ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="sr-only">Your answer</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={disabled}
              rows={7}
              placeholder="Start anywhere. The order you actually did things in is the useful part."
              className="w-full resize-y rounded-lg border border-line bg-cream-paper px-3 py-2.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-muted focus:border-line-strong"
            />
          </label>
          {renderDictation?.(append)}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={disabled || !enough}
              onClick={() => onAnswerText(text)}
              className="btn-pill btn-pill-primary text-xs disabled:opacity-40"
            >
              That is the account <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
            <span className="font-mono text-[11px] tabular-nums text-ink-muted">
              {text.trim().length < MIN_OPEN_CHARS
                ? `${MIN_OPEN_CHARS - text.trim().length} more characters`
                : `${text.trim().split(/\s+/).length} words`}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <ul className={cn('space-y-2', question.kind === 'true_false' && 'flex gap-2 space-y-0')}>
            {question.choices?.map((choice) => {
              const isPicked = picked.includes(choice.id);
              return (
                <li key={choice.id} className={question.kind === 'true_false' ? 'flex-1' : undefined}>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={isMulti ? isPicked : undefined}
                    onClick={() => toggle(choice.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-[background-color,border-color,transform] duration-150',
                      'hover:-translate-y-px hover:border-line-strong motion-reduce:hover:translate-y-0',
                      isPicked ? 'border-charcoal bg-dew-drop' : 'border-line bg-cream-paper',
                      disabled && 'opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid size-4 shrink-0 place-items-center border',
                        isMulti ? 'rounded-[4px]' : 'rounded-full',
                        isPicked ? 'border-charcoal bg-charcoal text-cream-paper' : 'border-line-strong',
                      )}
                      aria-hidden="true"
                    >
                      {isPicked ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="text-[15px] leading-snug text-ink">{choice.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {isMulti ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                disabled={disabled || !enough}
                onClick={() => onAnswerChoices(picked)}
                className="btn-pill btn-pill-primary text-xs disabled:opacity-40"
              >
                That is all of them <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
              <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                {picked.length} selected
              </span>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
