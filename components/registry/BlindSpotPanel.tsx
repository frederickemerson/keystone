'use client';

// What the operational record captures that no approved pill reads yet.
//
// A pill answers the questions its expert thought to ask. The record is a
// second witness: connectors, technicians and tenants keep writing facts down
// whether or not a rule consults them. A fact the record keeps repeating that
// nothing reads is the next interview's agenda — not a defect, and this panel
// is careful not to call it one.

import { Lightbulb } from 'lucide-react';
import { SectionHeader } from '@/components/mosaic';
import type { CoverageReport } from '@/lib/learning/coverage';

export function BlindSpotPanel({ report, sentence }: { report: CoverageReport; sentence: string }) {
  return (
    <section className="space-y-3" aria-labelledby="hub-blind-spots">
      <SectionHeader
        title="Questions the record is asking"
        description="Facts operations keep recording that no rule reads. Searched across every approved pill, so one pill's scope is not mistaken for a gap."
      />
      <div className="card-paper space-y-3 p-5">
        <p className="text-sm text-ink">{sentence}</p>

        {report.uncovered.length === 0 ? (
          <p className="text-[13px] text-ink-muted">
            Nothing to raise: every fact the record captures is read by a rule somewhere.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {report.uncovered.map((entry) => (
                <li key={entry.key} className="rounded-lg border border-line bg-surface p-3">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[13px] font-medium text-ink">{entry.label}</span>
                    <code className="font-mono text-[11px] text-ink-muted">{entry.key}</code>
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-ink-muted">
                    Recorded in {entry.seenIn.length} incident{entry.seenIn.length === 1 ? '' : 's'} (
                    {entry.seenIn.join(', ')}), read by no rule.
                  </p>
                </li>
              ))}
            </ul>
            <p className="flex items-start gap-1.5 text-[12px] leading-snug text-ink-muted">
              <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                This is a prompt, not a finding. A fact can be recorded for a reason that needs no rule. But a fact
                the record keeps and the pill never consults is worth putting to the expert — it is the kind of gap
                nobody notices, because the pill only ever answers the questions it was asked. Shown for the
                incidents your role can see.
              </span>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
