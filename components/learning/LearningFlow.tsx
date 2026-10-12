'use client';

// Outcome & Learning (SPEC §1 step 3 — "how does it get smarter after
// deployment?"). One page, seven numbered steps.
//
//   1 outcome capture → 2 expert correction → 3 diff → 4 eval replay
//   → 5 shadow → 6 approve → 7 rollback
//
// Every step reads the shared governance store, never page-local state: the
// confirmed outcome, this incident's correction (correctionFor), who shadowed and
// approved it, and whether it was rolled back are all in the persisted,
// audited store. A reload, a role switch or navigating away and back resumes
// at the same step. Local state holds only unsaved form drafts.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Lock } from 'lucide-react';
import { PageHeader, RomanList, type RomanListItem } from '@/components/mosaic';
import { useMounted } from '@/components/mosaic/useMounted';
import { HandoffButton } from '@/components/journey/HandoffButton';
import { policyOf } from '@/components/canvas/noteDraftUtils';
import { compareVersions, type EvalCase } from '@/lib/engine';
import {
  canApprove,
  rollbackAuthority,
  shadowPromotionAuthority,
  type ApprovalCheck,
} from '@/lib/governance/approval';
import { hasCapability, pillEditAuthority } from '@/lib/governance/access';
import { describeScore, pastIncidentScore } from '@/lib/governance/evalScore';
import { shadowKey, useGovernanceStore, type PillSeed } from '@/lib/governance/store';
import {
  bumpMinor,
  correctionFor,
  currentApproved,
  diffVersions,
  findVersion,
  inReview,
  nextMinorVersion,
  pillAtVersion,
  rollbackFrom,
  type PillVersion,
} from '@/lib/governance/versions';
import { routes, suggestHandoff, type Persona } from '@/lib/journey';
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
  type CorrectionDraft,
  type OutcomeDraft,
} from './learning-utils';

/** Where a version in review came from, in plain words (from its structured provenance). */
function originOf(v: PillVersion): string {
  if (v.capture) return `a rule from ${v.capture.author.name}'s frontline note`;
  if (v.correction) return `a correction after ${v.correction.incidentId}`;
  return `a change proposed by ${v.createdBy.name}`;
}

const EMPTY_HISTORY: readonly PillVersion[] = [];

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
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2.5">
        <h2 id={`learn-step-${n}-title`} className="text-[19px] font-semibold leading-tight text-ink-muted">
          {n}. {title}
        </h2>
        <p className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
          {reason}
        </p>
      </div>
    </section>
  );
}

// The seven-step navigation: a notebook index (RomanList) plus the progress
// summary. Steps link to their section anchors; the flow state is unchanged.
function LearningStepsNav({ steps }: { steps: StepState[] }) {
  const done = steps.filter((s) => s.status === 'done').length;
  // The counter names the step that is highlighted (the first one not done).
  const current = steps.findIndex((s) => s.status === 'active') + 1 || steps.length;
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
      <RomanList items={items} layout="row" aria-label="Learning flow steps" />
    </nav>
  );
}


function outcomeFields(o: OutcomeDraft): OutcomeDraft {
  return {
    timeToIsolateMinutes: o.timeToIsolateMinutes,
    tenantImpact: o.tenantImpact,
    costSgd: o.costSgd,
    causeConfirmed: o.causeConfirmed,
    notes: o.notes,
  };
}

export function LearningFlow({
  bundle,
  incident,
}: {
  bundle: PillBundle;
  incident: IncidentRecord | null;
}) {
  const mounted = useMounted();
  const seedPills = useGovernanceStore((s) => s.seedPills);
  const proposeVersion = useGovernanceStore((s) => s.proposeVersion);
  const promoteToShadow = useGovernanceStore((s) => s.promoteToShadow);
  const approveVersion = useGovernanceStore((s) => s.approveVersion);
  const rollback = useGovernanceStore((s) => s.rollback);
  const recordOutcome = useGovernanceStore((s) => s.recordOutcome);

  const currentActor = useGovernanceStore((s) => s.currentActor);
  const storedHistory = useGovernanceStore((s) => s.versions[bundle.id]);
  const storedAudit = useGovernanceStore((s) => s.audit);
  const shadowRuns = useGovernanceStore((s) => s.shadowRuns);
  const storedOutcome = useGovernanceStore((s) => (incident ? s.outcomes[incident.id] : undefined));

  // Seed this pill into the governance store. The acting identity is the
  // signed-in user (step 2 is typically the Chief Engineer's correction); step 5
  // (Shadow) and step 6 (Approve) each need a different person, so they offer a
  // switch-user hand-off when the signed-in user may not act.
  useEffect(() => {
    const seed: PillSeed = { id: bundle.id, pill: bundle.pill };
    seedPills([seed]);
  }, [bundle, seedPills]);

  // The persisted store is read only after mount, so the server HTML and the
  // first client render agree.
  const versions = (mounted && storedHistory) || EMPTY_HISTORY;
  const audit = mounted ? storedAudit : [];
  const outcomeRecord = mounted ? storedOutcome : undefined;

  // Unsaved form drafts are the only page-local state.
  const [outcomeDraft, setOutcomeDraft] = useState<OutcomeDraft>(() => defaultOutcome(incident));
  const [editingOutcome, setEditingOutcome] = useState(false);
  const [correction, setCorrection] = useState<CorrectionDraft>(() => ({
    ruleId: bundle.pill.rules.find((r) => r.id === 'TS-02')?.id ?? bundle.pill.rules[0]?.id ?? '',
    verdict: 'incomplete',
    after: 10,
    reason:
      'Branch-before-riser isolation must be decided in 10 minutes, not 15. At 15 minutes the team went to the riser valve and took out L17–L19. If tenant access is not granted in 10 minutes, isolate at the riser.',
  }));
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Everything below is derived from the store
  // -------------------------------------------------------------------------

  const approved = currentApproved(versions);
  // This loop's change is the correction proposed for THIS incident (structured
  // provenance on the version), never whatever version happens to be newest:
  // a rule from a frontline note or a Canvas review has its own story.
  const target = incident ? correctionFor(versions, incident.id) : undefined;
  const rolledBackAs = target ? rollbackFrom(versions, target.version) : undefined;
  const pending = target && (target.status === 'Draft' || target.status === 'Shadow') ? target : undefined;
  // Another version of the pill in review (a note's rule, a Canvas review).
  const reviewing = inReview(versions);
  const otherInReview = reviewing && reviewing.version !== target?.version ? reviewing : undefined;
  // Diff, evals and shadow compare the change against the version it came from.
  const base = target?.parentVersion ? findVersion(versions, target.parentVersion) : approved;
  const baseVersion = base?.version ?? bundle.pill.manifest.version;
  const outcomeSaved = Boolean(outcomeRecord) && !editingOutcome;

  const cases = useMemo<EvalCase[]>(() => Object.values(bundle.pill.evals), [bundle.pill.evals]);
  // A new correction is proposed from what is live now.
  const liveRules = approved?.rules ?? bundle.pill.rules;
  const liveVersion = approved?.version ?? bundle.pill.manifest.version;
  const liveScore = useMemo(
    () => pastIncidentScore(approved ? pillAtVersion(bundle.pill, approved) : bundle.pill),
    [approved, bundle.pill],
  );

  const basePill = useMemo(() => (base ? pillAtVersion(bundle.pill, base) : bundle.pill), [base, bundle.pill]);
  const targetPill = useMemo(() => (target ? pillAtVersion(bundle.pill, target) : null), [target, bundle.pill]);

  const comparison = useMemo(
    () => (targetPill ? compareVersions(basePill, targetPill, cases) : null),
    [basePill, targetPill, cases],
  );
  const matrixRows = useMemo(() => (comparison ? buildEvalMatrix(cases, comparison) : []), [comparison, cases]);
  const diff = useMemo(() => (base && target ? diffVersions(base, target) : null), [base, target]);

  const correctionCaseId = useMemo(() => findCorrectionCaseId(cases), [cases]);
  // The correction's field-level result comes straight from the engine
  // (compareVersions asserts status *and* deadline_minutes per case), for the
  // rule the stored correction names.
  const changedRuleId = target?.correction?.ruleId ?? correction.ruleId;
  const assertion = useMemo(
    () =>
      comparison && correctionCaseId
        ? fieldAssertion(comparison, correctionCaseId, changedRuleId, CORRECTION_FIELD)
        : null,
    [comparison, correctionCaseId, changedRuleId],
  );

  const runs = target ? (shadowRuns[shadowKey(bundle.id, target.version)] ?? []) : [];
  const nextVersion = versions.length ? nextMinorVersion(versions) : bumpMinor(bundle.pill.manifest.version);

  // Who may change this pill (record the outcome, propose a correction): the
  // same policy the store enforces.
  const policy = useMemo(() => policyOf(bundle), [bundle]);
  const editCheck = pillEditAuthority(currentActor.role, policy);
  const editor = editCheck.allowed ? undefined : suggestHandoff((p) => pillEditAuthority(p.role, policy).allowed, currentActor);

  // One version in review at a time; proposing another would fork the history.
  const proposeDisabledReason = pending
    ? pending.status === 'Draft'
      ? `Draft v${pending.version} is already awaiting promotion: run it through Shadow and approve it before proposing another version.`
      : `Shadow v${pending.version} is already awaiting approval: approve it in step 6 before proposing another version.`
    : otherInReview
      ? `v${otherInReview.version} (${originOf(otherInReview)}) is in review. Settle it in Approvals first, so the correction builds on what is live.`
      : !editCheck.allowed
        ? editCheck.reason
        : undefined;

  // Step 5 — Shadow: the store's policy (grant + not the author).
  const promotion = target ? shadowPromotionAuthority(target, currentActor) : null;
  const holdsPromotionGrant = Boolean(
    target && (currentActor.role === target.approverRole || hasCapability(currentActor.role, 'promote_pill_version')),
  );
  const promoter =
    target && promotion && !promotion.allowed
      ? suggestHandoff((p) => shadowPromotionAuthority(target, p).allowed, currentActor)
      : undefined;
  const promoteBlockedReason =
    target && target.status === 'Draft' && promotion && !promotion.allowed
      ? holdsPromotionGrant
        ? `${promotion.reason}.`
        : `${roleDisplayName(currentActor.role)} cannot start a trial run on this pill.`
      : undefined;

  // Step 6 — Approve: the store's gate (Shadow only; trialled; neither author nor Shadow promoter).
  const evalReport = comparison ? { regressions: comparison.regressions } : null;
  const approvalContext = { liveApprovedVersion: approved?.version, trialRuns: runs.length };
  const check: ApprovalCheck | null = pending
    ? canApprove(pending, evalReport, currentActor, undefined, approvalContext)
    : null;
  // A person the gate would let approve (regressions aside: the approver may override them with a reason).
  const approver =
    pending?.status === 'Shadow' && check && !check.allowed
      ? suggestHandoff(
          (p) =>
            canApprove(pending, evalReport, p, undefined, approvalContext).reasons.every((r) => r.code === 'regressions'),
          currentActor,
        )
      : undefined;
  const canOverride = Boolean(target && check && check.regressions > 0 && currentActor.role === target.approverRole);

  // Step 7 — Roll back: only while the change is live; grant + separation of duties.
  const restoreVersion = target?.parentVersion ? findVersion(versions, target.parentVersion) : undefined;
  const targetIsLive = Boolean(target && approved && target.version === approved.version);
  const rollbackCheck = targetIsLive ? rollbackAuthority(restoreVersion, approved, currentActor) : null;

  const handoff = (to: Persona | undefined, action: string) =>
    to ? <HandoffButton to={to} action={action} /> : undefined;

  // -------------------------------------------------------------------------
  // Step gating / progress
  // -------------------------------------------------------------------------

  const doneMap: Record<string, boolean> = {
    'learn-step-1': outcomeSaved,
    'learn-step-2': Boolean(target) && !composing,
    'learn-step-3': Boolean(diff),
    'learn-step-4': Boolean(comparison),
    'learn-step-5': Boolean(target?.shadowedBy && runs.length > 0),
    'learn-step-6': Boolean(target?.approvedBy),
    'learn-step-7': Boolean(rolledBackAs),
  };
  const blockedMap: Record<string, string> = {
    'learn-step-2': 'Confirm the outcome in step 1 first.',
    'learn-step-3': 'Propose the correction in step 2 first.',
    'learn-step-4': 'Propose the correction in step 2 first.',
    'learn-step-5': 'Propose the correction in step 2 first.',
    'learn-step-6': target
      ? target.status === 'Draft'
        ? `Promote v${target.version} to Shadow in step 5 first.`
        : ''
      : 'Propose the correction in step 2 first.',
    'learn-step-7': target?.approvedBy ? '' : 'Available once the new version is approved.',
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
  // Actions — each one goes through the audited store
  // -------------------------------------------------------------------------

  function handleSaveOutcome() {
    setError(null);
    if (!incident) {
      setError('No closed incident is loaded, so there is no outcome to record.');
      return;
    }
    try {
      recordOutcome({ ...outcomeFields(outcomeDraft), incidentId: incident.id, pillId: bundle.id });
      setEditingOutcome(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleEditOutcome() {
    if (outcomeRecord) setOutcomeDraft(outcomeFields(outcomeRecord));
    setEditingOutcome(true);
  }

  function handlePropose() {
    if (!approved || !incident) return;
    setError(null);
    try {
      proposeVersion(
        bundle.id,
        approved.version,
        [{ op: 'update', ruleId: correction.ruleId, patch: { deadline_minutes: correction.after } }],
        correctionReason(correction),
        { incidentId: incident.id, ruleId: correction.ruleId },
      );
      setComposing(false);
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
    if (!restoreVersion) return;
    setError(null);
    try {
      rollback(bundle.id, restoreVersion.version, reason);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">
      <PageHeader
        eyebrow={
          <span className="font-mono text-[12px]">
            {bundle.domain}/{bundle.name}
          </span>
        }
        title="Outcome & learning"
        subtitle={
          incident ? (
            <>
              Closing the loop on{' '}
              <Link href={routes.incident(incident.id)} className="font-medium text-accent hover:underline">
                {incident.id}
              </Link>{' '}
              · {incident.location}
            </>
          ) : (
            'Capture the outcome, correct the rule, validate, trial, approve, or roll back.'
          )
        }
        meta={
          <div className="space-y-2">
            <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span>Live now:</span>
              <VersionChip status="Approved" version={liveVersion} />
              <span>{liveRules.length} rules</span>
              <span>·</span>
              <span>{describeScore(liveScore)}</span>
            </p>
            {otherInReview ? (
              <p className="text-xs text-ink-muted">
                Also in review: v{otherInReview.version}, {originOf(otherInReview)} ({otherInReview.status}).{' '}
                <Link href={routes.approvals()} className="font-medium text-accent hover:underline">
                  Open approvals
                </Link>
              </p>
            ) : null}
            {incident ? (
              <Link
                href={routes.incident(incident.id)}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to the incident room
              </Link>
            ) : null}
          </div>
        }
      />

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-lg border border-blocked/30 bg-blocked-tint px-3 py-2 text-xs text-blocked"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      {mounted && !editCheck.allowed && !target ? (
        <div className="space-y-2 rounded-card border border-dashed border-line bg-surface/50 px-4 py-3">
          <p className="text-xs text-ink-muted">
            {editCheck.reason} Recording the outcome and proposing a correction is for the people who keep this pill.
          </p>
          {handoff(editor, 'record the outcome and propose the correction')}
        </div>
      ) : null}

      <LearningStepsNav steps={steps} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          <OutcomeForm
            incident={incident}
            draft={outcomeSaved && outcomeRecord ? outcomeFields(outcomeRecord) : outcomeDraft}
            saved={outcomeSaved}
            recordedBy={outcomeSaved && outcomeRecord ? outcomeRecord.actor.name : undefined}
            onChange={setOutcomeDraft}
            onSave={handleSaveOutcome}
            onEdit={handleEditOutcome}
          />

          <CorrectionForm
            rules={liveRules}
            baseVersion={liveVersion}
            nextVersion={nextVersion}
            actor={currentActor}
            draft={correction}
            before={liveRules.find((r) => r.id === correction.ruleId)?.deadline_minutes ?? null}
            disabledReason={outcomeSaved ? proposeDisabledReason : 'Confirm the outcome in step 1 first.'}
            proposal={
              target && !composing
                ? {
                    version: target.version,
                    status: target.status,
                    author: target.createdBy.name,
                    reason: target.reason,
                    changes: diff?.changes ?? [],
                  }
                : undefined
            }
            onNewCorrection={pending ? undefined : () => setComposing(true)}
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
              promoteBlockedReason={promoteBlockedReason}
              handoff={handoff(promoter, 'start the trial run')}
              runs={runs}
              totalCases={cases.length}
              onPromote={handlePromote}
            />
          ) : (
            <LockedStep n={5} title="Trial run (Shadow)" reason={blockedMap['learn-step-5']} />
          )}

          {target ? (
            <ApprovalPanel
              version={target}
              check={check}
              canOverride={canOverride}
              disabledReason={target.status === 'Draft' ? `Promote v${target.version} to Shadow in step 5 first.` : undefined}
              record={
                target.approvedBy
                  ? {
                      approvedBy: target.approvedBy.name,
                      approvedAt: target.approvedAt ?? target.createdAt,
                      liveVersion,
                      rolledBackAs: rolledBackAs?.version,
                      restored: rolledBackAs?.rollbackOf,
                    }
                  : undefined
              }
              handoff={handoff(approver, 'approve')}
              onApprove={handleApprove}
              onOverride={handleOverride}
            />
          ) : (
            <LockedStep n={6} title="Approval" reason={blockedMap['learn-step-6']} />
          )}

          {targetIsLive && target && incident ? (
            <p className="text-sm">
              <Link href={routes.incident(incident.id)} className="font-medium text-accent hover:underline">
                See v{target.version} applied in {incident.id} →
              </Link>
            </p>
          ) : null}

          <RollbackPanel
            baseVersion={restoreVersion?.version ?? baseVersion}
            approvedVersion={approved?.version ?? null}
            canRollback={Boolean(rollbackCheck?.allowed)}
            disabledReason={
              !target
                ? 'Available once a new version is proposed and approved.'
                : !targetIsLive
                  ? target.approvedBy
                    ? `v${target.version} is no longer live (v${liveVersion} is), so there is nothing of it to roll back.`
                    : `Approve v${target.version} in step 6 first: rollback restores what was live before it.`
                  : rollbackCheck && !rollbackCheck.allowed
                    ? `${rollbackCheck.reason}.`
                    : undefined
            }
            handoff={
              targetIsLive && rollbackCheck && !rollbackCheck.allowed && !rolledBackAs
                ? handoff(
                    suggestHandoff((p) => rollbackAuthority(restoreVersion, approved, p).allowed, currentActor),
                    'roll back',
                  )
                : undefined
            }
            rolledBack={
              rolledBackAs
                ? {
                    restored: rolledBackAs.rollbackOf ?? baseVersion,
                    as: rolledBackAs.version,
                    by: rolledBackAs.createdBy.name,
                    reason: rolledBackAs.reason,
                  }
                : null
            }
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
