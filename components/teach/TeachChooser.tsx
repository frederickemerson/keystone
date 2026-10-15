// What would you like to teach today?
//
// Why this exists. The screen taught whichever pill it was pointed at and said
// so nowhere, so the honest reading of the demo was "this is a chilled-water
// app". The first fix was a row of links, which made the capability visible
// and still answered none of the questions a person actually has before
// giving up ten minutes of their time: what situation is this, who is
// involved, what will it ask me.
//
// So each choice is shown the way the session itself opens — with the drawn
// situation where there is one, the expert whose knowledge it is, the roles
// the rules route decisions to, and how many questions there are. Every line
// of that comes from the pill (lib/teach/choices); nothing here is written
// about a pill, only assembled from it.
//
// The origin of the questions still travels with the choice. "Written for this
// pill" and "derived from this pill's own rules" are different claims, and a
// card that hid the difference would let generated content pass as authored.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { routes } from '@/lib/journey/routes';
import { cn } from '@/lib/ui/cn';
import type { TeachChoiceData } from '@/lib/teach/choices';
import { ScenarioStage } from './ScenarioStage';

/** A pill offered on the chooser: its data, plus the title only the UI knows. */
export interface TeachChoice extends TeachChoiceData {
  name: string;
}

export interface TeachChooserProps {
  choices: readonly TeachChoice[];
  currentId: string;
}

const ORIGIN_NOTE: Record<TeachChoice['origin'], string> = {
  authored: 'Questions written for this pill.',
  generated:
    'Nobody wrote these questions. They are derived from this pill’s own rules and evidence catalogue — the wrong answers included, which are lifted from what the pill says is required or allowed elsewhere.',
};

/** Four is as many roles as reads as a sentence; the rest are counted. */
const ROLES_SHOWN = 4;

function rolesLine(roles: readonly string[]): string {
  if (roles.length <= ROLES_SHOWN) return roles.join(' · ');
  const rest = roles.length - ROLES_SHOWN;
  return `${roles.slice(0, ROLES_SHOWN).join(' · ')} · +${rest} more`;
}

function ChoiceCard({ choice, current }: { choice: TeachChoice; current: boolean }) {
  // The last stage, because it is the one that holds the whole situation —
  // the first is a quiet ceiling void and tells a chooser nothing.
  const lastStage = choice.stages?.[choice.stages.length - 1];

  return (
    <article
      className={cn(
        'flex flex-col rounded-xl border bg-surface p-4',
        current ? 'border-marker/40 bg-dew-drop' : 'border-line',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-ink">{choice.name}</h3>
        {/* The rule count on every card, including the one being taught: a
            badge that changes meaning between cards is not a comparison. The
            current pill is already marked by its tint and its button. */}
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
          {choice.ruleCount} rules
        </span>
      </div>

      {choice.stages && lastStage ? (
        <div className="mt-3">
          <ScenarioStage stage={lastStage.id} stages={choice.stages} idPrefix={`scn-${choice.id}`} />
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-line bg-cream-paper p-4 text-[13px] leading-relaxed text-ink-muted">
          Nobody has drawn this situation yet, so this one opens straight at the questions rather than
          showing you another pill&rsquo;s drawing over the top of them.
        </p>
      )}

      <dl className="mt-4 space-y-2 text-[13px] leading-snug">
        {choice.expert ? (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Whose judgement</dt>
            <dd className="text-ink">
              {choice.expert.name} · {choice.expert.role}
              {choice.expert.years ? `, ${choice.expert.years} years` : ''}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Who it involves</dt>
          <dd className="text-ink">{rolesLine(choice.roles)}</dd>
        </div>
        {choice.rule ? (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">The rule it writes</dt>
            <dd className="text-ink">
              <span className="font-mono text-[12px]">{choice.rule.id}</span> · {choice.rule.title}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">What it asks</dt>
          <dd className="text-ink">
            One open question, then up to {choice.questionCount - 1} chosen by what your answer leaves open.
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">{ORIGIN_NOTE[choice.origin]}</p>

      {/* Pinned to the foot so the two cards' buttons line up however tall
          their situations are. */}
      <div className="mt-auto pt-4">
        {current ? (
          <span className="btn-pill cursor-default text-xs font-semibold shadow-none" aria-current="page">
            You are teaching this one
          </span>
        ) : (
          <Link href={routes.teach(choice.id)} className="btn-pill btn-pill-primary text-xs">
            Teach {choice.name.toLowerCase()} <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}

export function TeachChooser({ choices, currentId }: TeachChooserProps) {
  // One teachable pill is not a choice, and a chooser of one reads as a mistake.
  if (choices.length < 2) return null;

  return (
    <section aria-labelledby="teach-chooser" className="rounded-2xl border border-line bg-cream-paper p-5">
      <h2 id="teach-chooser" className="text-[17px] font-semibold text-ink">
        What would you like to teach today?
      </h2>
      <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-ink-muted">
        Teaching is not tied to one situation. Every pill below opens the same way — the situation first where
        someone has drawn one, then one wide question, then only what that answer left open. Each session
        ends in a draft rule for whoever may edit that pill, never in a change.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {choices.map((choice) => (
          <ChoiceCard key={choice.id} choice={choice} current={choice.id === currentId} />
        ))}
      </div>
    </section>
  );
}
