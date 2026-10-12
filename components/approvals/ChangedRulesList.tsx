'use client';

// The rules a version changes, in full words, each linked to where it lives
// now: a changed or removed rule to its anchor in the pill hub (the live
// version still has it); an added rule exists only in this version.

import Link from 'next/link';
import type { Rule } from '@/lib/engine/types';
import { routes } from '@/lib/journey/routes';
import { changedRules, type RuleChangeKind } from './changedRules';

const KIND_LABEL: Record<RuleChangeKind, string> = {
  added: 'New rule',
  changed: 'Changed',
  removed: 'Removed',
};

export function ChangedRulesList({
  pillId,
  parentRules,
  rules,
}: {
  pillId: string;
  parentRules: readonly Rule[];
  rules: readonly Rule[];
}) {
  const changes = changedRules(parentRules, rules);
  if (changes.length === 0) return null;
  return (
    <ul className="space-y-2" aria-label="Rules in this change">
      {changes.map((c) => (
        <li key={c.id} className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px]">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[11px] font-medium text-ink-muted">{KIND_LABEL[c.kind]}</span>
            {c.kind === 'added' ? (
              <span className="font-mono font-medium text-ink">{c.id}</span>
            ) : (
              <Link href={routes.pill(pillId, c.id)} className="font-mono font-medium text-ink underline underline-offset-2">
                {c.id}
              </Link>
            )}
            <span className="font-medium text-ink">{c.title}</span>
          </p>
          {c.kind === 'removed' ? null : <p className="mt-1 leading-relaxed text-ink">{c.decision}</p>}
        </li>
      ))}
    </ul>
  );
}
