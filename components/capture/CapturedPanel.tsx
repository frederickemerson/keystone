'use client';

// Right column — "Captured so far". As expert turns reveal rule ids, RuleTile
// cards animate in (status: draft — awaiting your confirmation) with provenance,
// above the coverage meter that shows the interviewer targeting gaps.

import { useState } from 'react';
import { SectionHeader, RuleTile, ActionClassChip, CHIP_BASE, TONE_CHIP } from '@/components/mosaic';
import { cn } from '@/lib/ui/cn';
import type { Rule } from '@/lib/engine/types';
import type { CallPlayback } from './useCallPlayback';
import { CoverageMeter } from './CoverageMeter';
import type { ProvenanceInfo } from './types';

export function CapturedPanel({
  rules,
  provenance,
  playback,
  totalRules,
}: {
  rules: Rule[];
  provenance: Record<string, ProvenanceInfo>;
  playback: CallPlayback;
  totalRules: number;
}) {
  const revealed = playback.revealedRuleIds
    .map((id) => rules.find((r) => r.id === id))
    .filter((r): r is Rule => Boolean(r));

  // Local confirmation preview only — the authoritative confirm/edit/reject
  // happens on the Decision Canvas.
  const [confirmed, setConfirmed] = useState<Record<string, boolean | undefined>>({});
  const locked = playback.status === 'ended';

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Captured so far"
        description={`${revealed.length} of ${totalRules} candidates · draft, awaiting your confirmation`}
      />

      <CoverageMeter rules={revealed} />

      <div className="space-y-3">
        {revealed.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface p-5 text-sm text-ink-muted">
            Rule candidates will appear here as the expert speaks. Each carries the exact
            transcript span as provenance.
          </p>
        ) : (
          revealed.map((rule, i) => (
            <div
              key={rule.id}
              className="mosaic-capture-in"
              style={{ animationDelay: `${Math.min(i, 6) * 80}ms` }}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className={cn(CHIP_BASE, TONE_CHIP.approval)}>Draft · awaiting your confirmation</span>
                <ActionClassChip actionClass={rule.action_class} />
              </div>
              <RuleTile
                rule={rule}
                confirmed={confirmed[rule.id]}
                provenance={provenance[rule.id]}
                onConfirm={locked ? undefined : () => setConfirmed((c) => ({ ...c, [rule.id]: true }))}
                onEdit={locked ? undefined : () => setConfirmed((c) => ({ ...c, [rule.id]: undefined }))}
                onReject={locked ? undefined : () => setConfirmed((c) => ({ ...c, [rule.id]: false }))}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
