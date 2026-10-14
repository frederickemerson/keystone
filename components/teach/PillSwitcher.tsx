// What else this screen can teach.
//
// Why this exists. The screen opened on the chilled-water leak and said so,
// but nothing on it suggested there was anything else — so the honest reading
// of the demo was "this is a chilled-water app", and `?pill=` was a
// generality only someone reading the source would find. A capability nobody
// can see is indistinguishable from one that is not there.
//
// It is a row of links rather than a dropdown because there is no state here:
// each pill is its own page, shareable and back-buttonable, and the session
// for an exercise is keyed to that exercise's questions (lib/teach/session),
// so moving between pills cannot carry one pill's answers into another.
//
// Each entry says where its questions came from. "Written for this pill" and
// "derived from this pill's own rules" are different claims, and a row that
// hid the difference would let generated content pass as authored.

import Link from 'next/link';
import { routes } from '@/lib/journey/routes';
import { cn } from '@/lib/ui/cn';

export interface SwitchablePill {
  id: string;
  name: string;
  /** Hand-written questions, or questions derived from the pill's own rules. */
  origin: 'authored' | 'generated';
}

export interface PillSwitcherProps {
  pills: readonly SwitchablePill[];
  currentId: string;
}

const ORIGIN_NOTE: Record<SwitchablePill['origin'], string> = {
  authored: 'questions written for it',
  generated: 'questions derived from its own rules',
};

export function PillSwitcher({ pills, currentId }: PillSwitcherProps) {
  // One teachable pill is not a choice, and a row of one reads as a mistake.
  if (pills.length < 2) return null;

  return (
    <section className="rounded-xl border border-line bg-surface p-4" aria-labelledby="teach-switcher">
      <h2 id="teach-switcher" className="text-[13px] font-semibold text-ink">
        Teaching is not tied to this situation
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
        Any pill whose rules carry enough to ask about can be taught here, not just this one. Where nobody has
        written questions for one, they are derived from that pill&rsquo;s own{' '}
        <span className="font-mono text-[12px]">rules.yaml</span> and{' '}
        <span className="font-mono text-[12px]">evidence.yaml</span> — including the wrong answers, which are
        lifted from what the pill says is required or allowed elsewhere.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {pills.map((pill) => {
          const current = pill.id === currentId;
          return (
            <li key={pill.id}>
              {current ? (
                <span
                  className={cn('btn-pill cursor-default bg-dew-drop font-semibold shadow-none')}
                  aria-current="page"
                >
                  {pill.name}
                  <span className="font-normal text-ink-muted">· teaching now</span>
                </span>
              ) : (
                <Link href={routes.teach(pill.id)} className="btn-pill">
                  Teach {pill.name.toLowerCase()}
                  <span className="text-ink-muted">· {ORIGIN_NOTE[pill.origin]}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
