'use client';

// Outcome & Learning (SPEC §1 step 3 — "how does it get smarter after
// deployment?"). One page, seven numbered steps, all state through the
// governance store so every action lands in the append-only audit log.
//
//   1 outcome capture → 2 expert correction → 3 diff → 4 eval replay
//   → 5 shadow → 6 approve → 7 rollback

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, GraduationCap, Lock } from 'lucide-react';
import { RomanList, SectionHeader, type RomanListItem } from '@/components/mosaic';
import { compareVersions, type EvalCase } from '@/lib/engine';
import { canApprove, type ApprovalCheck } from '@/lib/governance/approval';
import { hasCapability } from '@/lib/governance/access';
import {
  shadowKey,
  useGovernanceStore,
  type PillSeed,
} from '@/lib/governance/store';
import {
  bumpMinor,
  currentApproved,
  diffVersions,
  findVersion,
  nextMinorVersion,
  pillAtVersion,
  type PillVersion,
} from '@/lib/governance/versions';
import type { PillBundle } from '@/lib/pills/load';
import type { IncidentRecord } from '@/lib/data/schemas';
import { ApprovalPanel } from './ApprovalPanel';
import { CorrectionForm } from './CorrectionForm';
import { DiffPanel } from './DiffPanel';
import { EvalMatrix } from './EvalMatrix';
import { HistoryRail } from './HistoryRail';
import { OutcomeForm } from './OutcomeForm';
import { RollbackPanel } from './RollbackPanel';
import { ShadowPanel } from './ShadowPanel';
import { goToStep, type StepState } from './StepRail';
import { VersionChip } from './VersionChip';
import {
  buildEvalMatrix,
  CORRECTION_FIELD,
  correctionReason,
  defaultOutcome,
  fieldAssertion,
  findCorrectionCaseId,
  roleDisplayName,
  simulateShadowRuns,
  type CorrectionDraft,
  type OutcomeDraft,
} from './learning-utils';

const STEP_IDS = ['learn-step-1', 'learn-step-2', 'learn-step-3', 'learn-step-4', 'learn-step-5', 'learn-step-6', 'learn-step-7'] as const;

const STEP_TITLES = [
  'Capture outcome',
  'Expert correction',
  'Diff',
  'Validate evals',
  'Shadow',
  'Approve',
  'Roll back',
] as const;

function LockedStep({ n, title, reason }: { n: number; title: string; reason: string }) {
  return (
    <section aria-labelledby={`learn-step-${n}-title`} id={`learn-step-${n}`} tabIndex={-1} className="scroll-mt-4">
      <SectionHeader title={`${n}. ${title}`} />
      <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-dashed border-line bg-surface/50 px-3 py-3 text-xs text-ink-muted">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {reason}
      </p>
    </section>
  );
}

// The seven-step navigation: a notebook index (RomanList) plus the progress
// summary. Steps link to their section anchors; the flow state is unchanged.
function LearningStepsNav({ steps }: { steps: StepState[] }) {
  const done = steps.filter((s) => s.status === 'done').length;
  const current = Math.min(done + 1, steps.length);
  const items: RomanListItem[] = steps.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.status === 'todo' ? s.blockedReason : undefined,
    href: `#${s.id}`,
    current: s.status === 'active',
    done: s.status === 'done',
  }));

  return (
    <nav aria-label="Learning flow progress" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted">
          <span className="font-medium text-ink">
            Step {current} of {steps.length}
          </span>{' '}
          · {done} complete
        </p>
        <div
          className="h-1.5 w-40 overflow-hidden rounded-full bg-dew-drop"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={done}
          aria-label="Steps complete"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${(done / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <RomanList items={items} aria-label="Learning flow steps" />
    </nav>
  );
}

export function LearningFlow({
  bundle,
  incident,
}: {
  bundle: PillBundle;
  incident: IncidentRecord | null;
}) {
  const seedPills = useGovernanceStore((s) => s.seedPills);
  const setRole = useGovernanceStore((s) => s.setRole);
  const proposeVersion = useGovernanceStore((s) => s.proposeVersion);
  const promoteToShadow = useGovernanceStore((s) => s.promoteToShadow);
  const recordShadowRun = useGovernanceStore((s) => s.recordShadowRun);
  const approveVersion = useGovernanceStore((s) => s.approveVersion);
  const rollback = useGovernanceStore((s) => s.rollback);

  const currentActor = useGovernanceStore((s) => s.currentActor);
  const history = useGovernanceStore((s) => s.versions[bundle.id]);
  const audit = useGovernanceStore((s) => s.audit);
  const shadowRuns = useGovernanceStore((s) => s.shadowRuns);

  const seeded = useRef(false);

  // Seed this pill into the governance store once; the demo opens as the
  // Chief Engineer because step 2 is his correction.
  useEffect(() => {
    const seed: PillSeed = { id: bundle.id, pill: bundle.pill };
    seedPills([seed]);
    if (!seeded.current) {
      seeded.current = true;
      setRole('chief_engineer');
    }
  }, [bundle, seedPills, setRole]);

  const [outcome, setOutcome] = useState<OutcomeDraft>(() => defaultOutcome(incident));
  const [outcomeSaved, setOutcomeSaved] = useState(false);
  const [correction, setCorrection] = useState<CorrectionDraft>(() => ({
    ruleId: bundle.pill.rules.find((r) => r.id === 'TS-02')?.id ?? bundle.pill.rules[0]?.id ?? '',
    verdict: 'wrong_for_asset',
    after: 10,
    reason:
      'Branch-before-riser isolation must be decided in 10 minutes, not 15. At 15 minutes the team went to the riser valve and took out L17–L19. If tenant access is not granted in 10 minutes, isolate at the riser.',
  }));
  const [proposalVersion, setProposalVersion] = useState<string | null>(null);
  const [rolledBack, setRolledBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const versions = history ?? [];
  const approved = currentApproved(versions);
  const target = proposalVersion ? findVersion(versions, proposalVersion) : undefined;
  const baseVersion = target?.parentVersion ?? approved?.version ?? bundle.pill.manifest.version;
  const base = findVersion(versions, baseVersion) ?? approved;

  const cases = useMemo<EvalCase[]>(() => Object.values(bundle.pill.evals), [bundle.pill.evals]);
  const liveRules = base?.rules ?? bundle.pill.rules;

  const basePill = useMemo(
    () => (base ? pillAtVersion(bundle.pill, base) : bundle.pill),
    [base, bundle.pill],
  );
  const targetPill = useMemo(
    () => (target ? pillAtVersion(bundle.pill, target) : null),
    [target, bundle.pill],
  );

  const comparison = useMemo(
    () => (targetPill ? compareVersions(basePill, targetPill, cases) : null),
    [basePill, targetPill, cases],
  );
  const matrixRows = useMemo(
    () => (comparison ? buildEvalMatrix(cases, comparison) : []),
    [comparison, cases],
  );

  const diff = useMemo(
    () => (base && target ? diffVersions(base, target) : null),
    [base, target],
  );

  const correctionCaseId = useMemo(() => findCorrectionCaseId(cases), [cases]);
  // The correction's field-level result comes straight from the engine
  // (compareVersions asserts status *and* deadline_minutes per case).
  const assertion = useMemo(
    () =>
      comparison && correctionCaseId
        ? fieldAssertion(comparison, correctionCaseId, correction.ruleId, CORRECTION_FIELD)
        : null,
    [comparison, correctionCaseId, correction.ruleId],
  );

  const runs = target ? shadowRuns[shadowKey(bundle.id, target.version)] ?? [] : [];
  const nextVersion = versions.length
    ? nextMinorVersion(versions)
    : bumpMinor(bundle.pill.manifest.version);

  // A Draft or Shadow version is already in flight; proposing another would
  // fork the history, so the propose button is disabled with an explanation.
  const pending = versions.find((v) => v.status === 'Draft' || v.status === 'Shadow');
  const proposeDisabledReason = pending
    ? pending.status === 'Draft'
      ? `Draft v${pending.version} is already awaiting promotion — run it through Shadow and approve it before proposing another version.`
      : `Shadow v${pending.version} is already awaiting approval — approve it in step 6 before proposing another version.`
    : undefined;

  const canRollback =
    hasCapability(currentActor.role, 'rollback_pill') || currentActor.role === base?.approverRole;
  const evalReport = comparison ? { regressions: comparison.regressions } : null;
  const check: ApprovalCheck | null = target ? canApprove(target, evalReport, currentActor) : null;
  const canOverride = Boolean(
    target && check && check.regressions > 0 && currentActor.role === target.approverRole,
  );

  // -------------------------------------------------------------------------
  // Step gating / progress
  // -------------------------------------------------------------------------

  const doneMap: Record<string, boolean> = {
    'learn-step-1': outcomeSaved,
    'learn-step-2': Boolean(target),
    'learn-step-3': Boolean(diff),
    'learn-step-4': Boolean(comparison),
    'learn-step-5': Boolean(target && target.status !== 'Draft' && runs.length > 0),
    'learn-step-6': Boolean(target && target.status === 'Approved'),
    'learn-step-7': rolledBack,
  };
  const blockedMap: Record<string, string> = {
    'learn-step-2': 'Confirm the outcome in step 1 first.',
    'learn-step-3': 'Propose the correction in step 2 first.',
    'learn-step-4': 'Propose the correction in step 2 first.',
    'learn-step-5': 'Propose the correction in step 2 first.',
    'learn-step-6': target
      ? target.status === 'Draft'
        ? 'Promote v' + target.version + ' to Shadow in step 5 first.'
        : ''
      : 'Propose the correction in step 2 first.',
    'learn-step-7': target && target.status === 'Approved' ? '' : 'Available once the new version is approved.',
  };

  let activeIndex = STEP_IDS.findIndex((id) => !doneMap[id]);
  if (activeIndex === -1) activeIndex = STEP_IDS.length - 1;

  const steps: StepState[] = STEP_IDS.map((id, i) => ({
    id,
    n: i + 1,
    title: STEP_TITLES[i],
    status: doneMap[id] ? 'done' : i === activeIndex ? 'active' : 'todo',
    blockedReason: i === activeIndex ? undefined : blockedMap[id] || undefined,
  }));

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  function handlePropose() {
    if (!base) return;
    setError(null);
    try {
      const proposed: PillVersion = proposeVersion(
        bundle.id,
        base.version,
        [{ op: 'update', ruleId: correction.ruleId, patch: { deadline_minutes: correction.after } }],
        correctionReason(correction),
      );
      setProposalVersion(proposed.version);
      goToStep('learn-step-3');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handlePromote() {
    if (!target) return;
    setError(null);
    try {
      promoteToShadow(bundle.id, target.version);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleRunShadow() {
    if (!target || !targetPill) return;
    setError(null);
    for (const run of simulateShadowRuns(basePill, targetPill, cases)) {
      recordShadowRun(bundle.id, target.version, run);
    }
  }

  function handleApprove(): ApprovalCheck {
    if (!target) throw new Error('No version to approve');
    setError(null);
    return approveVersion(bundle.id, target.version, evalReport);
  }

  function handleOverride(reason: string): ApprovalCheck {
    if (!target) throw new Error('No version to approve');
    setError(null);
    return approveVersion(bundle.id, target.version, evalReport, { reason });
  }

  function handleRollback(reason: string) {
    setError(null);
    try {
      rollback(bundle.id, baseVersion, reason);
      setRolledBack(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const liveVersion = approved?.version ?? bundle.pill.manifest.version;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2">
            <GraduationCap className="size-5 text-ink-muted" aria-hidden="true" />
            outcome &amp; learning
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">
            {incident ? `${incident.id} · ${incident.location}. ` : ''}
            Capture the outcome, correct the rule, replay every past incident, run it in shadow,
            then approve — or roll back.
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span className="font-medium text-ink">
              {bundle.domain}/{bundle.name}
            </span>
            {approved ? (
              <VersionChip status={approved.status} version={approved.version} />
            ) : (
              <VersionChip status="Approved" version={liveVersion} />
            )}
            <span>{bundle.pill.rules.length} rules</span>
            <span>·</span>
            <span>{cases.length} eval cases</span>
          </p>
        </div>

        {/* Read-only: the app-shell RoleSwitcher is the single place to change
            role, so this screen only reflects who is acting. */}
        <p className="flex items-center gap-2 text-[13px] text-ink-muted">
          <span>Acting as</span>
          <span className="text-ink">{currentActor.name}</span>
          <span aria-hidden="true">·</span>
          <span className="text-ink">{roleDisplayName(currentActor.role)}</span>
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-lg border border-blocked/30 bg-blocked-tint px-3 py-2 text-xs text-blocked"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <LearningStepsNav steps={steps} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          <OutcomeForm
            incident={incident}
            draft={outcome}
            saved={outcomeSaved}
            onChange={setOutcome}
            onSave={() => setOutcomeSaved(true)}
            onEdit={() => setOutcomeSaved(false)}
          />

          <CorrectionForm
            rules={liveRules}
            baseVersion={baseVersion}
            nextVersion={nextVersion}
            actor={currentActor}
            draft={correction}
            before={
              liveRules.find((r) => r.id === correction.ruleId)?.deadline_minutes ?? null
            }
            disabledReason={
              outcomeSaved
                ? proposeDisabledReason
                : 'Confirm the outcome in step 1 first.'
            }
            onChange={setCorrection}
            onPropose={handlePropose}
          />

          {diff ? (
            <DiffPanel from={diff.from} to={diff.to} changes={diff.changes} />
          ) : (
            <LockedStep n={3} title="What changed" reason={blockedMap['learn-step-3']} />
          )}

          {comparison && target ? (
            <EvalMatrix
              cases={cases}
              comparison={comparison}
              rows={matrixRows}
              baseVersion={baseVersion}
              nextVersion={target.version}
              correctionCaseId={correctionCaseId}
              assertion={assertion}
            />
          ) : (
            <LockedStep n={4} title="Validate against every past incident" reason={blockedMap['learn-step-4']} />
          )}

          {target ? (
            <ShadowPanel
              version={target}
              approvedVersion={approved?.version ?? null}
              canRun={target.status === 'Shadow'}
              blockedReason={`Promote v${target.version} to Shadow first — a Draft version has not run anywhere yet.`}
              runs={runs}
              totalCases={cases.length}
              onPromote={handlePromote}
              onRun={handleRunShadow}
            />
          ) : (
            <LockedStep n={5} title="Run it in Shadow" reason={blockedMap['learn-step-5']} />
          )}

          {target && check ? (
            <ApprovalPanel
              version={target}
              actor={currentActor}
              check={check}
              canOverride={canOverride}
              disabledReason={
                target.status === 'Approved'
                  ? `v${target.version} is already approved.`
                  : target.status === 'Draft'
                    ? `Promote v${target.version} to Shadow in step 5 first.`
                    : undefined
              }
              onApprove={handleApprove}
              onOverride={handleOverride}
            />
          ) : (
            <LockedStep n={6} title="Steward approval" reason={blockedMap['learn-step-6']} />
          )}

          <RollbackPanel
            baseVersion={baseVersion}
            approvedVersion={approved?.version ?? null}
            canRollback={canRollback && Boolean(target) && target?.status === 'Approved'}
            disabledReason={
              !target
                ? 'Available once a new version is proposed and approved.'
                : target.status !== 'Approved'
                  ? `Approve v${target.version} in step 6 first — rollback restores what is live.`
                  : canRollback
                    ? undefined
                    : `Only ${roleDisplayName(base?.approverRole ?? 'head_technical_services')} may roll back a pill version.`
            }
            rolledBackTo={rolledBack ? baseVersion : null}
            onRollback={handleRollback}
          />
        </div>

        <aside
          aria-label="Version history and audit"
          className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto"
        >
          <HistoryRail history={versions} audit={audit} pillId={bundle.id} />
        </aside>
      </div>
    </div>
  );
}
