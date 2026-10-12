'use client';

// Right column — "Captured so far". As expert turns reveal rule ids, RuleTile
// cards animate in with provenance, above the coverage meter that shows the
// interviewer targeting gaps. Confirmation state and actions come from the
// caller (the governance store's Canvas review), so a verdict given on the call
// is the same verdict the Decision Canvas shows.

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
  confirmed,
  onConfirm,
  onEdit,
  onReject,
}: {
  rules: Rule[];
  provenance: Record<string, ProvenanceInfo>;
  playback: CallPlayback;
  totalRules: number;
  /** ruleId -> true confirmed, false rejected, undefined pending (the Canvas review). */
  confirmed: Readonly<Record<string, boolean | undefined>>;
  /** Absent when the viewer may not review this pill. */
  onConfirm?: (ruleId: string) => void;
  onEdit?: (ruleId: string) => void;
  onReject?: (ruleId: string) => void;
}) {
  const revealed = playback.revealedRuleIds
    .map((id) => rules.find((r) => r.id === id))
    .filter((r): r is Rule => Boolean(r));

  const decided = revealed.filter((r) => confirmed[r.id] !== undefined).length;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Captured so far"
        description={`${revealed.length} of ${totalRules} candidates · ${decided} decided by the expert`}
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
                <span className={cn(CHIP_BASE, TONE_CHIP.approval)}>Draft</span>
                <ActionClassChip actionClass={rule.action_class} />
              </div>
              <RuleTile
                rule={rule}
                confirmed={confirmed[rule.id]}
                provenance={provenance[rule.id]}
                onConfirm={onConfirm ? () => onConfirm(rule.id) : undefined}
                onEdit={onEdit ? () => onEdit(rule.id) : undefined}
                onReject={onReject ? () => onReject(rule.id) : undefined}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
