// What would you like to teach today?
//
// Why this exists. The screen taught whichever pill it was pointed at and said
// so nowhere, so the honest reading of the demo was "this is a chilled-water
// app". A row of links was the first fix: it made the capability visible and
// still answered none of the questions a person actually has before giving up
// ten minutes of their time — what situation is this, who is involved, what
// will it ask me. So this is the screen /teach opens on, and a session is
// what you get by choosing one.
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
import { DescribeSituation } from './DescribeSituation';
import { routes } from '@/lib/journey/routes';
import type { TeachChoiceData } from '@/lib/teach/choices';
import { ScenarioStage } from './ScenarioStage';

/** A pill offered on the chooser: its data, plus the title only the UI knows. */
export interface TeachChoice extends TeachChoiceData {
  name: string;
}

export interface TeachChooserProps {
  choices: readonly TeachChoice[];
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

function ChoiceCard({ choice }: { choice: TeachChoice }) {
  // The last stage, because it is the one that holds the whole situation —
  // the first is a quiet ceiling void and tells a chooser nothing.
  const lastStage = choice.stages?.[choice.stages.length - 1];

  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-ink">{choice.name}</h3>
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

      {/* Pinned to the foot so the cards' buttons line up however tall their
          situations are. */}
      <div className="mt-auto pt-4">
        <Link href={routes.teach(choice.id)} className="btn-pill btn-pill-primary text-xs">
          Teach {choice.name.toLowerCase()} <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function TeachChooser({ choices }: TeachChooserProps) {
  // A card is built around a situation, so a pill with no drawing gets a line
  // rather than a card with a hole in it. Draw one for it and it moves up.
  const drawn = choices.filter((choice) => choice.stages?.length);
  const undrawn = choices.filter((choice) => !choice.stages?.length);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: the situation nobody has captured yet. Right: the ones somebody has. */}
        <DescribeSituation />
        {drawn.map((choice) => (
          <ChoiceCard key={choice.id} choice={choice} />
        ))}
      </div>

      {undrawn.length ? (
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Also teachable, with no drawn situation yet:{' '}
          {undrawn.map((choice, index) => (
            <span key={choice.id}>
              {index > 0 ? ', ' : ''}
              <Link href={routes.teach(choice.id)} className="text-ink underline underline-offset-2">
                {choice.name}
              </Link>
              <span className="text-ink-muted">
                {' '}
                ({choice.origin === 'generated' ? 'questions derived from its own rules' : 'questions written for it'})
              </span>
            </span>
          ))}
          .
        </p>
      ) : null}
    </div>
  );
}
