'use client';

// Accumulated evidence at the current replay step (role-redacted values).

import { redactText } from '@/lib/governance/access';
import { cn } from '@/lib/ui/cn';
import type { EvidenceState } from './engineInputs';

export function EvidenceStatePanel({ evidence, role }: { evidence: EvidenceState; role: string }) {
  const entries = Object.entries(evidence);
  const confirmed = entries.filter(([, e]) => e.confirmed).length;
  return (
    <details className="rounded-xl border border-line bg-surface px-4 py-3 text-xs">
      <summary className="cursor-pointer select-none text-[13px] font-medium text-ink">
        Evidence state · {entries.length} key(s), {confirmed} confirmed
      </summary>
      {entries.length === 0 ? (
        <p className="mt-2 text-ink-muted">No evidence yet.</p>
      ) : (
        <ul className="mt-2 max-h-60 space-y-0.5 overflow-y-auto">
          {entries.map(([key, e]) => (
            <li key={key} className="flex gap-2">
              <span className={cn('font-mono', e.confirmed ? 'text-recommend' : 'text-approval')}>{key}</span>
              <span className="truncate text-ink-muted">
                {redactText(JSON.stringify(e.value), role, e.sensitivity)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
