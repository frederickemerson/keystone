'use client';

// Step 4 — Validate. Replays the pill's evals through v1.2.0 and v1.3.0
// (runEvals + compareVersions) and shows the case × version matrix, the
// regressions, and the correction assertion the whole flow hangs on.

import { CheckCircle2, FlaskConical, XCircle } from 'lucide-react';
import { KpiStat, SectionHeader } from '@/components/mosaic';
import type { ComparisonResult, EvalCase } from '@/lib/engine';
import type { EvalMatrixRow, FieldAssertion } from './learning-utils';

function PassCell({ pass, failed, total }: { pass: boolean; failed: number; total: number }) {
  return (
    <span
      className={
        pass
          ? 'inline-flex items-center gap-1 text-xs font-medium text-recommend'
          : 'inline-flex items-center gap-1 text-xs font-medium text-escalate'
      }
    >
      {pass ? (
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
      ) : (
        <XCircle className="size-3.5" aria-hidden="true" />
      )}
      {pass ? 'Pass' : 'Fail'}
      <span className="text-ink-muted">
        ({total - failed}/{total})
      </span>
    </span>
  );
}

export function EvalMatrix({
  cases,
  comparison,
  rows,
  baseVersion,
  nextVersion,
  correctionCaseId,
  assertion,
}: {
  cases: readonly EvalCase[];
  comparison: ComparisonResult;
  rows: EvalMatrixRow[];
  baseVersion: string;
  nextVersion: string;
  correctionCaseId?: string;
  assertion: FieldAssertion | null;
}) {
  const oldTotal = comparison.oldSummary.passed + comparison.oldSummary.failed;
  const newTotal = comparison.newSummary.passed + comparison.newSummary.failed;
  const correctionRow = correctionCaseId ? rows.find((r) => r.caseId === correctionCaseId) : undefined;
  /** The engine itself flipped this case from failing to passing. */
  const engineFlip = Boolean(correctionRow && !correctionRow.oldPass && correctionRow.newPass);

  return (
    <section aria-labelledby="learn-step-4-title" id="learn-step-4" tabIndex={-1} className="scroll-mt-4">
      <SectionHeader
        title="4. Validate against every past incident"
        description="The engine replays all six closed incidents through both versions. Gates are deterministic — the same evidence gives the same decision every time."
        icon={<FlaskConical className="size-4" />}
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <KpiStat label={`v${baseVersion} assertions passed`} value={`${comparison.oldSummary.passed}/${oldTotal}`} />
        <KpiStat label={`v${nextVersion} assertions passed`} value={`${comparison.newSummary.passed}/${newTotal}`} />
        <KpiStat label="Regressions" value={comparison.regressions.length} />
        <KpiStat label="Improvements" value={comparison.improvements.length} />
      </div>

      {cases.length === 0 ? (
        <p className="mt-3 text-xs text-ink-muted">This pill ships no eval cases.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Eval case result under v{baseVersion} and v{nextVersion}
            </caption>
            <thead className="border-b border-line bg-surface-raised text-xs text-ink-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Eval case (past incident)
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  v{baseVersion}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  v{nextVersion}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.caseId}
                  className={
                    row.caseId === correctionCaseId
                      ? 'border-b border-line bg-accent/5 last:border-0'
                      : 'border-b border-line last:border-0'
                  }
                >
                  <th scope="row" className="px-3 py-2 font-mono text-xs font-normal text-ink">
                    {row.caseId}
                    {row.caseId === correctionCaseId ? (
                      <span className="ml-2 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-ink">
                        the correction
                      </span>
                    ) : null}
                  </th>
                  <td className="px-3 py-2">
                    <PassCell pass={row.oldPass} failed={row.oldFailed} total={row.total} />
                  </td>
                  <td className="px-3 py-2">
                    <PassCell pass={row.newPass} failed={row.newFailed} total={row.total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {engineFlip ? (
        <div className="mt-3 rounded-xl border border-recommend/30 bg-recommend/5 p-3">
          <p className="flex items-start gap-1.5 text-xs font-semibold text-recommend">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            The correction eval now passes
          </p>
          <p className="mt-1.5 text-xs text-ink">
            <span className="font-mono">{correctionCaseId}</span> failed on v{baseVersion} and passes
            on v{nextVersion} — the engine now reproduces the expert&apos;s decision.
            {assertion ? (
              <>
                {' '}
                The corrected field:{' '}
                <span className="font-mono">
                  {assertion.ruleId} {assertion.field}
                </span>{' '}
                {assertion.before ?? '—'} → {assertion.after ?? '—'} minutes.
              </>
            ) : null}
          </p>
        </div>
      ) : assertion ? (
        <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
          <p className="text-xs font-semibold text-ink">Correction assertion</p>
          <p className="mt-1.5 text-xs text-ink">
            <span className="font-mono">
              {assertion.ruleId} {assertion.field}
            </span>{' '}
            must be {assertion.expected} minutes: v{baseVersion} carries {assertion.before ?? '—'}{' '}
            <span className={assertion.oldPass ? 'font-medium text-recommend' : 'font-medium text-escalate'}>
              — {assertion.oldPass ? 'pass' : 'fail'}
            </span>
            ; v{nextVersion} carries {assertion.after ?? '—'}{' '}
            <span className={assertion.newPass ? 'font-medium text-recommend' : 'font-medium text-escalate'}>
              — {assertion.newPass ? 'pass' : 'fail'}
            </span>
            .
          </p>
          <p className="mt-1.5 text-[11px] text-ink-muted">
            The engine replays every field each eval asserts — status and deadline_minutes — so this
            value is checked in the matrix above, not separately.
            {correctionRow && !correctionRow.newPass
              ? ' Other assertions in this case may still fail; they are listed above and are not part of this correction.'
              : ''}
          </p>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <XCircle className="size-3.5" aria-hidden="true" /> Regressions
          </p>
          {comparison.regressions.length === 0 ? (
            <p className="mt-1 text-[11px] text-ink-muted">
              None — no past incident that passed on v{baseVersion} fails on v{nextVersion}.
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1 text-[11px] font-mono">
              {comparison.regressions.map((r) => (
                <li key={`${r.caseId}:${r.ruleId}`}>
                  {r.caseId}/{r.ruleId}: {r.oldActual} → {r.newActual}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <CheckCircle2 className="size-3.5" aria-hidden="true" /> Improvements
          </p>
          {comparison.improvements.length === 0 ? (
            <p className="mt-1 text-[11px] text-ink-muted">
              {engineFlip
                ? `v${nextVersion} fixes ${correctionCaseId} — see above.`
                : 'None recorded — see the correction assertion above.'}
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1 text-[11px] font-mono">
              {comparison.improvements.map((r) => (
                <li key={`${r.caseId}:${r.ruleId}`}>
                  {r.caseId}/{r.ruleId}: {r.oldActual} → {r.newActual}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
