'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Ban, ChevronDown, Clock, FileText, ScrollText, Server, Building2, Mic } from 'lucide-react';
import { routes } from '@/lib/journey/routes';
import {
  ActionCard,
  CHIP_BASE,
  ConfidenceMeter,
  EvidenceTimeline,
  PageHeader,
  TONE_CHIP,
  type Tone,
} from '@/components/mosaic';
import { useMounted } from '@/components/mosaic/useMounted';
import { pillDisplayName } from '@/components/mosaic/pillTitle';
import { AuditLogDrawer } from '@/components/shell/AuditLogDrawer';
import { evaluate } from '@/lib/engine/evaluate';
import { counterfactual } from '@/lib/engine/counterfactual';
import type { ActionStatus } from '@/lib/engine/types';
import { canSee, redact, redactText, UNRESOLVED_ACTOR } from '@/lib/governance/access';
import { auditFor } from '@/lib/governance/audit';
import {
  useGovernanceStore,
  type ActionDecisionRecord,
  type EvidenceConfirmationRecord,
} from '@/lib/governance/store';
import { currentApproved, pillAtVersion } from '@/lib/governance/versions';
import type { TimelineEvent as DisplayTimelineEvent } from '@/components/mosaic/types';
import { cn } from '@/lib/ui/cn';
import { AssetOverlayPanel } from './AssetOverlayPanel';
import {
  DecisionButtons,
  DecisionStamp,
  WRAPPING_PILL,
  type DirectOutcome,
  type MissingEvidenceOption,
} from './DecisionButtons';
import { EvidenceSuggestions } from './EvidenceSuggestions';
import {
  accumulateEvidence,
  evidenceKeysForRule,
  findRule,
  toEngineAsset,
  toEngineEvidence,
  toEngineIncident,
  type EvidenceState,
} from './engineInputs';
import {
  assetTypeLabel,
  formatClock,
  formatElapsed,
  formatSgtClock,
  humanizeKey,
  missingSummary,
  personForRole,
  personLabel,
} from './labels';
import { actionPermissions, withRecordedDecision } from './permissions';
import { expertQuoteFor } from './provenance';
import { ReplayControls, type Speed } from './ReplayControls';
import { RuleWhyDrawer } from './RuleWhyDrawer';
import { TenantMessagePanel } from './TenantMessagePanel';
import type { ApprovedPill, BoardItem, IncidentRoomProps, IncidentScenario } from './types';
import { ProposalBanner } from './ProposalBanner';
import { ResetDemoControl } from './ResetDemoControl';
import { EvidenceStatePanel } from './EvidenceStatePanel';
import { PillsInUse } from './PillsInUse';
import { pillsInUse } from './pill-usage';
import { RuleIdLink, RuleSourceLine, WhyDrawerLinks } from './RuleLinks';
import { useExpertVoice } from './useExpertVoice';
import { CaptureTaskCard } from '@/components/pulse/CaptureTaskCard';
import type { CaptureTask, VoiceNote } from '@/lib/capture';
import { findOpenCaptureTask } from '@/lib/capture';
import { buildCloseoutTask, buildGateTask, gateTaskKind, latestTask, openTasksFor } from './captureTasks';
import { ensureTaskAnswered, useCaptureActions, useCaptureView } from './useCapture';
import { proposablePill } from '@/components/canvas/noteDraftUtils';
import { sourceLabel } from '@/lib/connectors/registry';

// ---------------------------------------------------------------------------
// Types + helpers
// ---------------------------------------------------------------------------

type ScenarioKey = 'primary' | 'overlay';

const GROUPS: { status: ActionStatus; title: string; hint: string }[] = [
  {
    status: 'escalate',
    title: 'Must escalate',
    hint: 'Routes to a named human now.',
  },
  {
    status: 'needs_approval',
    title: 'Requires approval',
    hint: 'A named human approves before anything happens.',
  },
  {
    status: 'allowed',
    title: 'Recommended',
    hint: 'Recommended; still executed by a named human.',
  },
  {
    status: 'blocked',
    title: 'Blocked',
    hint: 'Deterministic gate: required evidence missing.',
  },
];

const SEVERITY_TONE: Record<string, Tone> = {
  critical: 'escalate',
  high: 'escalate',
  medium: 'approval',
  low: 'recommend',
};

const GROUP_INK: Partial<Record<ActionStatus, string>> = {
  blocked: 'text-blocked',
  escalate: 'text-escalate',
  needs_approval: 'text-approval',
  allowed: 'text-recommend',
};

function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

const EMPTY_DECISIONS: Record<string, ActionDecisionRecord> = {};
const EMPTY_CONFIRMATIONS: Record<string, EvidenceConfirmationRecord> = {};

/** Missing evidence of an action, labelled from its pill's evidence catalogue. */
function missingOptions(item: BoardItem): MissingEvidenceOption[] {
  const catalog = item.entry.pill.evidenceCatalog;
  return item.action.missingEvidence.map((key) => ({
    key,
    label: catalog[key]?.label ?? humanizeKey(key),
  }));
}

function evaluateAll(pills: readonly ApprovedPill[], scenario: IncidentScenario, evidence: EvidenceState) {
  const asset = toEngineAsset(scenario.asset);
  const incident = toEngineIncident(scenario.incident);
  const engineEvidence = toEngineEvidence(evidence);
  return pills.map((entry) => ({
    entry,
    result: evaluate(entry.pill, asset, incident, engineEvidence),
  }));
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

export function IncidentRoom({ primary, liveProvider, overlay, pills, initialStep = 0, sessionActor = null }: IncidentRoomProps) {
  const mounted = useMounted();

  // Governance store (persisted). Before mount, render the seed state so the
  // server HTML and the first client render match.
  const storeActor = useGovernanceStore((s) => s.currentActor);
  const storeVersions = useGovernanceStore((s) => s.versions);
  const storeDecisions = useGovernanceStore((s) => s.decisions);
  const storeAudit = useGovernanceStore((s) => s.audit);
  const storeDecideAction = useGovernanceStore((s) => s.decideAction);
  const storeConfirmations = useGovernanceStore((s) => s.evidenceConfirmations);
  const storeConfirmEvidence = useGovernanceStore((s) => s.confirmEvidence);
  const resetDemo = useGovernanceStore((s) => s.resetDemo);
  const seedPills = useGovernanceStore((s) => s.seedPills);

  // Server render + hydration use the verified session's identity (the same
  // one the shell binds into the store before this renders), so the first
  // paint already shows this role's buttons and redactions and nothing jumps
  // once the store is readable. No session → the unresolved actor: no grants,
  // public data only — never a privileged default.
  const actor = mounted ? storeActor : (sessionActor ?? UNRESOLVED_ACTOR);
  const role = actor.role;

  useEffect(() => {
    seedPills(pills.map((p) => ({ id: p.id, pill: p.pill })));
  }, [pills, seedPills]);

  // Approved version of each pill, from the governance store.
  const approved: ApprovedPill[] = useMemo(
    () =>
      pills.flatMap((bundle) => {
        const history = mounted ? storeVersions[bundle.id] : undefined;
        if (!history)
          return [
            {
              bundle,
              pill: bundle.pill,
              version: bundle.pill.manifest.version,
            },
          ];
        const v = currentApproved(history);
        return v
          ? [
              {
                bundle,
                pill: pillAtVersion(bundle.pill, v),
                version: v.version,
              },
            ]
          : [];
      }),
    [pills, mounted, storeVersions],
  );
  const unapproved = pills.filter((p) => !approved.some((a) => a.bundle.id === p.id));

  // Scenario (asset toggle) + replay step per scenario.
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('primary');
  const initialSteps = useMemo(
    () => ({
      primary: initialStep === 'end' ? primary.timeline.events.length : initialStep,
      overlay: overlay?.timeline.events.length ?? 0,
    }),
    [primary, overlay, initialStep],
  );
  const [steps, setSteps] = useState<Record<ScenarioKey, number>>(initialSteps);
  const scenario = scenarioKey === 'overlay' && overlay ? overlay : primary;
  const events = scenario.timeline.events;
  const total = events.length;
  const step = Math.min(steps[scenarioKey], total);
  const setStep = useCallback(
    (fn: (s: number) => number) =>
      setSteps((prev) => ({
        ...prev,
        [scenarioKey]: Math.max(0, Math.min(total, fn(prev[scenarioKey]))),
      })),
    [scenarioKey, total],
  );

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  useEffect(() => {
    if (!playing) return;
    if (step >= total) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), 1600 / speed);
    return () => clearTimeout(t);
  }, [playing, step, total, speed, setStep]);

  // Evidence + engine. Human evidence confirmations (the only path by which a
  // Jev suggestion can matter) fold in at their anchor event.
  const incidentId = scenario.incident.id;
  const confirmations = (mounted ? storeConfirmations[incidentId] : undefined) ?? EMPTY_CONFIRMATIONS;
  const evidence = useMemo(
    () => accumulateEvidence(events, step, confirmations),
    [events, step, confirmations],
  );
  const evaluations = useMemo(() => evaluateAll(approved, scenario, evidence), [approved, scenario, evidence]);

  const items: BoardItem[] = useMemo(
    () =>
      evaluations.flatMap(({ entry, result }) =>
        result.actions.flatMap((action) => {
          const trace = result.trace.find((t) => t.ruleId === action.ruleId);
          const rule = findRule(entry.pill, action.ruleId);
          return trace && rule ? [{ entry, action, trace, rule }] : [];
        }),
      ),
    [evaluations],
  );
  const inUse = useMemo(() => pillsInUse(approved, items, scenario.incident), [approved, items, scenario.incident]);
  const notApplicable = useMemo(
    () =>
      evaluations.flatMap(({ entry, result }) =>
        result.trace.filter((t) => !t.triggered).map((t) => ({ entry, trace: t })),
      ),
    [evaluations],
  );
  const confidence = evaluations.reduce(
    (acc, { result }) => ({
      required: acc.required + result.confidence.requiredEvidence,
      confirmed: acc.confirmed + result.confidence.confirmed,
    }),
    { required: 0, confirmed: 0 },
  );

  // Wow 3: which rules fire only on one asset (end of each timeline).
  const triggeredDiff = useMemo(() => {
    if (!overlay) return { onlyBase: [], onlyOverlay: [] };
    const fired = (sc: IncidentScenario) =>
      new Set(
        evaluateAll(approved, sc, accumulateEvidence(sc.timeline.events, sc.timeline.events.length)).flatMap(
          ({ result }) => result.actions.map((a) => a.ruleId),
        ),
      );
    const base = fired(primary);
    const over = fired(overlay);
    return {
      onlyBase: [...base].filter((r) => !over.has(r)),
      onlyOverlay: [...over].filter((r) => !base.has(r)),
    };
  }, [approved, primary, overlay]);

  // Decisions + audit for this incident.
  const decisions = (mounted ? storeDecisions[incidentId] : undefined) ?? EMPTY_DECISIONS;
  // The audit log is append-only and survives "Reset demo"; the footer shows
  // only the current run (events after the latest reset) and says so.
  const { auditEvents, lastReset, earlierCount } = useMemo(() => {
    if (!mounted) return { auditEvents: [], lastReset: undefined, earlierCount: 0 };
    let resetIndex = -1;
    storeAudit.forEach((e, i) => {
      if (e.action === 'demo_reset') resetIndex = i;
    });
    const all = auditFor(storeAudit, { incidentId });
    const current = resetIndex === -1 ? all : auditFor(storeAudit.slice(resetIndex + 1), { incidentId });
    return {
      auditEvents: current,
      lastReset: resetIndex === -1 ? undefined : storeAudit[resetIndex],
      earlierCount: all.length - current.length,
    };
  }, [mounted, storeAudit, incidentId]);

  // Live announcements (new evidence, gate changes, decisions).
  const [announcement, setAnnouncement] = useState('');

  // The store enforces decision authority itself (and audits refusals); the
  // buttons are already gated, so a refusal here is announced, not thrown.
  const decideAction = useCallback(
    (input: Parameters<typeof storeDecideAction>[0]): ActionDecisionRecord | null => {
      try {
        return storeDecideAction(input);
      } catch (err) {
        setAnnouncement(`Not recorded: ${(err as Error).message}`);
        return null;
      }
    },
    [storeDecideAction],
  );
  const prevBlocked = useRef<string[]>([]);
  useEffect(() => {
    const blocked = items.filter((i) => i.action.status === 'blocked').map((i) => i.action.ruleId);
    const newlyBlocked = blocked.filter((r) => !prevBlocked.current.includes(r));
    prevBlocked.current = blocked;
    const ev = events[step - 1];
    if (!ev) return;
    // Never read a mask placeholder aloud: say the content is restricted.
    const body = canSee(role, ev.sensitivity) ? `: ${ev.text.slice(0, 160)}` : ` (restricted for your role)`;
    setAnnouncement(
      `New evidence, event ${step} of ${total}, ${sourceLabel(ev.source)} ${ev.type}${body}` +
        (newlyBlocked.length ? ` Gate now blocking: ${newlyBlocked.join(', ')}.` : ''),
    );
    // Announce only on step / scenario change; role is read for redaction.
  }, [step, scenarioKey]);

  // Why drawer + expert voice.
  const voice = useExpertVoice();
  const [drawer, setDrawer] = useState<{
    pillId: string;
    ruleId: string;
  } | null>(null);
  const drawerItem = drawer
    ? items.find((i) => i.entry.bundle.id === drawer.pillId && i.action.ruleId === drawer.ruleId)
    : undefined;
  const drawerCounterfactual = useMemo(() => {
    if (!drawerItem) return null;
    return counterfactual(
      drawerItem.entry.pill,
      toEngineAsset(scenario.asset),
      toEngineIncident(scenario.incident),
      toEngineEvidence(evidence),
      drawerItem.action.ruleId,
    );
  }, [drawerItem, scenario, evidence]);
  const drawerExpert = drawerItem ? expertQuoteFor(drawerItem.entry.pill, drawerItem.rule) : null;
  const stopVoice = voice.stop;
  const closeDrawer = useCallback(() => {
    stopVoice();
    setDrawer(null);
  }, [stopVoice]);

  const [showNa, setShowNa] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  // Frontline capture (PLAN F1/F2): a decision on a gated action raises one
  // capture task for the acting role; the store audits it.
  const captureView = useCaptureView();
  const captureActions = useCaptureActions();
  const raiseGateTask = useCallback(
    (item: BoardItem, outcome: ActionDecisionRecord['outcome']) => {
      const kind = gateTaskKind(item.action.status, outcome);
      if (!kind) return;
      const task = buildGateTask({
        kind,
        incidentId,
        assetId: scenario.incident.asset_id,
        ruleId: item.rule.id,
        pillId: item.entry.bundle.id,
        role,
        step,
        at: new Date().toISOString(),
      });
      // One open task per (incident, rule, kind): repeating the action reuses it.
      if (findOpenCaptureTask(captureView.tasks, task)) return;
      try {
        captureActions.createCaptureTask(task);
        setAnnouncement(`Capture task for ${item.rule.id}: tell us why, 20 seconds.`);
      } catch (err) {
        setAnnouncement(`Capture task not created: ${(err as Error).message}`);
      }
    },
    [captureActions, captureView.tasks, incidentId, role, scenario.incident.asset_id, step],
  );
  const answerTask = useCallback(
    (task: CaptureTask, note: VoiceNote) => {
      try {
        ensureTaskAnswered(captureActions, task.id, note.id);
        setAnnouncement(`Task answered with note ${note.id}. The draft waits on the pill's canvas.`);
      } catch (err) {
        setAnnouncement(`Not recorded: ${(err as Error).message}`);
      }
    },
    [captureActions],
  );
  const dismissTask = useCallback(
    (task: CaptureTask, reason: string) => {
      try {
        captureActions.dismissCaptureTask(task.id, reason);
        setActiveTaskId((id) => (id === task.id ? null : id));
        setAnnouncement('Task dismissed. Reason recorded in the audit log.');
      } catch (err) {
        setAnnouncement(`Not recorded: ${(err as Error).message}`);
      }
    },
    [captureActions],
  );
  const proposable = useMemo(
    () => pills.map((p) => proposablePill(p, mounted ? storeVersions[p.id] : undefined)),
    [pills, mounted, storeVersions],
  );
  const closeoutTask = latestTask(captureView.tasks, {
    kinds: ['job_closeout'],
    incidentId,
    createdFor: role,
  });
  // The task being answered opens in one full-width capture panel at the top
  // of the decisions column (action cards are too narrow to record in).
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const capturePanelRef = useRef<HTMLDivElement>(null);
  const openTask = useCallback((taskId: string) => {
    setActiveTaskId(taskId);
    requestAnimationFrame(() => capturePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);
  const activeTask = activeTaskId ? captureView.tasks.find((t) => t.id === activeTaskId) : undefined;
  // One task card at the top of the decisions column (#capture-task): the one
  // being answered, else this role's open "Tell us why" here, else an open
  // close-out. A dismissed task leaves the panel.
  const openGateTask = openTasksFor(captureView.tasks, role).find(
    (t) => t.incidentId === incidentId && (t.kind === 'gate_blocked' || t.kind === 'gate_override'),
  );
  const panelTask =
    (activeTask && activeTask.status !== 'dismissed' ? activeTask : undefined) ??
    openGateTask ??
    (closeoutTask?.status === 'open' ? closeoutTask : undefined);
  const startCloseout = useCallback(() => {
    const task = buildCloseoutTask({ incidentId, assetId: scenario.incident.asset_id, role, at: new Date().toISOString() });
    const existing = findOpenCaptureTask(captureView.tasks, task);
    if (existing) return openTask(existing.id);
    try {
      openTask(captureActions.createCaptureTask(task).id);
      setAnnouncement('Close-out note opened: 10 seconds.');
    } catch (err) {
      setAnnouncement(`Close-out not started: ${(err as Error).message}`);
    }
  }, [captureActions, captureView.tasks, incidentId, openTask, role, scenario.incident.asset_id]);

  // Actions.
  const decide = useCallback(
    (item: BoardItem, outcome: DirectOutcome) => {
      // Idempotent against the store: the same outcome as the latest recorded
      // decision for this rule is a no-op (a repeat click must not log twice).
      if (decisions[item.rule.id]?.outcome === outcome) return;
      const people = scenario.asset.people;
      const target = item.trace.escalateTo;
      const note =
        outcome === 'escalated'
          ? `Escalated ${item.rule.id} to ${personLabel(target.role, people)}` +
            (target.fallback ? ` (fallback: ${personLabel(target.fallback, people)})` : '')
          : `${outcome === 'approved' ? 'Approved' : 'Rejected'} ${item.rule.id}: ${item.rule.title}`;
      const rec = decideAction({
        incidentId,
        ruleId: item.rule.id,
        outcome,
        note,
        pillId: item.entry.bundle.id,
        pillVersion: item.entry.version,
      });
      if (rec) {
        setAnnouncement(`${item.rule.id} ${outcome} by ${rec.actor.name}.`);
        raiseGateTask(item, outcome);
      }
    },
    [decideAction, decisions, incidentId, scenario.asset.people, raiseGateTask],
  );

  const requestEvidence = useCallback(
    (item: BoardItem, keys: string[]) => {
      const labels = missingOptions(item)
        .filter((m) => keys.includes(m.key))
        .map((m) => m.label);
      const rec = decideAction({
        incidentId,
        ruleId: item.rule.id,
        outcome: 'evidence_requested',
        requestedEvidence: keys,
        note: `Requested evidence for ${item.rule.id}: ${labels.join(', ')}`,
        pillId: item.entry.bundle.id,
        pillVersion: item.entry.version,
      });
      if (rec) {
        setAnnouncement(`${item.rule.id}: evidence requested by ${rec.actor.name}.`);
        raiseGateTask(item, 'evidence_requested');
      }
    },
    [decideAction, incidentId, raiseGateTask],
  );

  const confirmEvidence = useCallback(
    (input: Parameters<typeof storeConfirmEvidence>[0]) => {
      try {
        const rec = storeConfirmEvidence(input);
        setAnnouncement(`${rec.key} confirmed by ${rec.actor.name}.`);
      } catch (err) {
        setAnnouncement(`Not recorded: ${(err as Error).message}`);
      }
    },
    [storeConfirmEvidence],
  );

  const resetAll = (): void => {
    voice.stop();
    setPlaying(false);
    setDrawer(null);
    setSteps(initialSteps);
    setScenarioKey('primary');
    resetDemo();
    setAnnouncement('Demo reset.');
  };

  const switchScenario = (key: ScenarioKey) => {
    setPlaying(false);
    setDrawer(null);
    voice.stop();
    setScenarioKey(key);
  };

  // Display data (redacted for the current role).
  const currentEvent = events[step - 1];
  const clockAt = currentEvent?.at ?? scenario.incident.opened_at;
  const displayEvents: DisplayTimelineEvent[] = events
    .slice(0, step)
    .map((ev) => {
      const r = redact(ev, role);
      return {
        id: ev.id,
        at: ev.at,
        source: ev.source,
        type: ev.type,
        sensitivity: ev.sensitivity,
        text: r.text,
        evidence_updates: Object.fromEntries(
          Object.entries(ev.evidence_updates).map(([k, u]) => [
            k,
            { confirmed: u.confirmed, value: r.evidence_updates[k]?.value },
          ]),
        ),
      };
    })
    .reverse();

  // The model proposes only once its triggering event has been replayed.
  const proposals = scenario.aiProposals.filter((p) => step >= p.afterStep);
  // #blocked-gate: the AI proposal a gate is holding, else the first blocked action.
  const blockedProposalId = proposals.find(
    (p) => items.find((i) => i.rule.id === p.ruleId)?.action.status === 'blocked',
  )?.proposalId;
  const firstBlocked = items.find((i) => i.action.status === 'blocked');
  const asset = scenario.asset;
  const people = asset.people;
  const affectedParty = scenario.incident.affected_tenant
    ? `anchor tenant ${redactText(scenario.incident.affected_tenant.name, role, scenario.incident.affected_tenant.sensitivity)} (L${scenario.incident.affected_tenant.floors})`
    : scenario.incident.affected_client
      ? `client ${redactText(scenario.incident.affected_client.name, role, scenario.incident.affected_client.sensitivity)} (${scenario.incident.affected_client.halls})`
      : null;

  const te01 = items.find((i) => i.rule.id === 'TE-01');
  const te01Trace = notApplicable.find((n) => n.trace.ruleId === 'TE-01');
  const tenantGate = te01
    ? {
        ruleId: 'TE-01',
        status: te01.action.status,
        missing: te01.action.missingEvidence,
      }
    : te01Trace
      ? { ruleId: 'TE-01', status: 'not_applicable' as const, missing: [] }
      : null;

  const renderCard = (item: BoardItem) => {
    const record = decisions[item.rule.id];
    const target = item.trace.escalateTo;
    const showPanel = item.action.status !== 'allowed';
    const blocked = item.action.status === 'blocked';
    const override = item.rule.asset_overrides?.[asset.type];
    const task = latestTask(captureView.tasks, {
      kinds: ['gate_blocked', 'gate_override'],
      incidentId,
      ruleId: item.rule.id,
      createdFor: role,
    });
    return (
      <div
        key={`${item.entry.bundle.id}:${item.rule.id}`}
        id={!blockedProposalId && item === firstBlocked ? 'blocked-gate' : undefined}
        className={cn('rounded-xl', blocked && 'scroll-mt-24 shadow-card')}
      >
        {blocked ? (
          <p className="flex items-center gap-1.5 rounded-t-xl border border-b-0 border-blocked/45 bg-blocked-tint px-4 py-2 text-[13px] font-semibold text-blocked">
            <Ban className="size-3.5 shrink-0" aria-hidden="true" />
            Blocked · rule <RuleIdLink pillId={item.entry.bundle.id} ruleId={item.rule.id} /> v{item.entry.version} —{' '}
            {missingSummary(item.action.missingEvidence)}
          </p>
        ) : null}
        <ActionCard
          action={item.action}
          title={item.rule.title}
          escalateLabel={target ? personLabel(target.role, people) : undefined}
          details={
            <>
              <RuleSourceLine
                pillId={item.entry.bundle.id}
                pillName={pillDisplayName(item.entry.bundle.name)}
                version={item.entry.version}
                ruleId={item.rule.id}
              />
              {item.trace.exceptionApplied && item.trace.exceptionNote ? (
                <p className="text-ink">
                  <span className="font-medium">Exception:</span> {item.trace.exceptionNote}
                </p>
              ) : null}
            </>
          }
          onWhy={() => setDrawer({ pillId: item.entry.bundle.id, ruleId: item.rule.id })}
          className={cn(blocked && 'rounded-t-none border-blocked/45')}
        >
          <div className="flex w-full flex-col gap-2">
            {override?.escalate_to ? (
              <p className="rounded-lg border border-line bg-dew-drop px-2.5 py-1.5 text-[12px] font-medium text-ink">
                {assetTypeLabel(asset.type)} override: escalate to {personLabel(override.escalate_to.role, people)}{' '}
                (base: {personLabel(item.rule.escalate_to.role, people)})
              </p>
            ) : null}
            {record ? <DecisionStamp record={record} /> : null}
            {showPanel ? (
              <DecisionButtons
                permissions={withRecordedDecision(
                  actionPermissions(item.action, role, target?.role ?? null),
                  record,
                  formatSgtClock,
                )}
                escalateLabel={target ? `Escalate to ${personLabel(target.role, people)}` : 'Escalate'}
                missingEvidence={missingOptions(item)}
                onDecide={(o) => decide(item, o)}
                onRequestEvidence={(keys) => requestEvidence(item, keys)}
              />
            ) : null}
            {task && task.id !== panelTask?.id ? (
              <CaptureTaskCard
                task={task}
                role={role}
                onAnswer={(t, note) => answerTask(t, note)}
                onDismiss={dismissTask}
                pills={proposable}
                onAnswerElsewhere={(t) => openTask(t.id)}
                className="shadow-none"
              />
            ) : null}
          </div>
        </ActionCard>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-20">
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* ------------------------------------------------------------ Header */}
      <PageHeader
        eyebrow={
          <>
            <span className="font-mono text-[12px] text-ink">{incidentId}</span>
            <span className={cn(CHIP_BASE, TONE_CHIP[SEVERITY_TONE[scenario.incident.severity] ?? 'neutral'])}>
              {sentenceCase(scenario.incident.severity)} severity
            </span>
            <span className="text-ink-muted">{sentenceCase(scenario.incident.status)}</span>
          </>
        }
        title={humanizeKey(scenario.incident.subtype)}
        subtitle={
          <>
            <p className="text-ink">{scenario.incident.location}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <span className="inline-flex items-center gap-1.5">
                {asset.type === 'data_centre' ? (
                  <Server className="size-3.5" aria-hidden="true" />
                ) : (
                  <Building2 className="size-3.5" aria-hidden="true" />
                )}
                <span className="font-medium text-ink">{asset.name}</span>
                <span>· {assetTypeLabel(asset.type)}</span>
              </span>
              {affectedParty ? (
                <span>{affectedParty.charAt(0).toUpperCase() + affectedParty.slice(1)}</span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden="true" />
                <span className="font-medium tabular-nums text-ink">
                  {formatElapsed(scenario.incident.opened_at, clockAt)}
                </span>
                since detection
                <span className="font-mono text-[12px] tabular-nums">· {formatClock(clockAt)}</span>
              </span>
            </p>
          </>
        }
        meta={
          // Scope controls + pills in use sit under the subtitle (PageHeader's
          // `meta` slot), in the shrinkable column: on a phone they wrap
          // instead of widening the page.
          <div className="flex flex-col gap-3">
            {/* Role is switched in the app header (one switcher, bound to the store). */}
            {overlay ? (
              <div
                role="group"
                aria-label="Asset"
                className="inline-flex max-w-full flex-wrap self-start rounded-[18px] border border-line-strong/70 bg-dew-drop p-0.5"
              >
                {(['primary', 'overlay'] as const).map((k) => {
                  const sc = k === 'primary' ? primary : overlay;
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={scenarioKey === k}
                      onClick={() => switchScenario(k)}
                      className={cn(
                        'min-h-8 rounded-full px-3 text-left text-xs font-medium transition-[background-color,color,box-shadow] duration-150',
                        scenarioKey === k ? 'bg-surface text-ink shadow-button' : 'text-ink-muted hover:text-ink',
                      )}
                    >
                      {k === 'primary' ? sc.asset.name : `Apply to ${sc.asset.name}`}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <PillsInUse pills={inUse} unapproved={unapproved} />
          </div>
        }
        actions={
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={startCloseout}
              disabled={!mounted || role === UNRESOLVED_ACTOR.role}
              title={role === UNRESOLVED_ACTOR.role ? 'Sign in to close out the job.' : undefined}
              className={cn('btn-pill text-xs', WRAPPING_PILL)}
            >
              <Mic className="size-3.5 shrink-0" aria-hidden="true" />
              Close out job · add a 10-second note
            </button>
            <Link href={routes.incidentRecord(incidentId)} className={cn('btn-pill text-xs', WRAPPING_PILL)}>
              <FileText className="size-3.5 shrink-0" aria-hidden="true" />
              Decision record
            </Link>
            <ResetDemoControl onConfirm={resetAll} />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_400px]">
        {/* ------------------------------------------------------ Left */}
        <section aria-label="Evidence" className="space-y-3">
          <ReplayControls
            step={step}
            total={total}
            playing={playing}
            speed={speed}
            onNext={() => setStep((s) => s + 1)}
            onTogglePlay={() => setPlaying((p) => !p)}
            onEnd={() => {
              setPlaying(false);
              setStep(() => total);
            }}
            onRestart={() => {
              setPlaying(false);
              setStep(() => 0);
            }}
            onSpeed={setSpeed}
          />
          <EvidenceStatePanel evidence={evidence} role={role} />
          {displayEvents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-ink-muted">
              Detection at {formatClock(scenario.incident.opened_at)}. Press <strong>Next event</strong> to replay the
              evidence as it arrived.
            </p>
          ) : (
            <EvidenceTimeline
              events={displayEvents}
              highlightId={displayEvents[0]?.id}
              renderExtra={(ev) =>
                // Only for a role cleared to read the event's text (it is what Jev reads).
                // The role is the session's from the first render, so this is
                // server-rendered too (no post-hydration insert → no layout shift).
                canSee(role, events.find((e) => e.id === ev.id)?.sensitivity ?? 'commercial') ? (
                  <EvidenceSuggestions
                    key={`${incidentId}:${ev.id}`}
                    incidentId={incidentId}
                    eventId={ev.id}
                    pills={approved.map((a) => ({ pillId: a.bundle.id, pillVersion: a.version, pill: a.pill }))}
                    ctx={{
                      asset: toEngineAsset(scenario.asset),
                      incident: toEngineIncident(scenario.incident),
                      evidence: toEngineEvidence(evidence),
                    }}
                    role={role}
                    confirmations={confirmations}
                    onConfirm={(sug, model) =>
                      confirmEvidence({
                        incidentId,
                        pillId: sug.pillId,
                        pillVersion: sug.pillVersion,
                        key: sug.key,
                        eventId: ev.id,
                        suggestion: { model, probability: sug.probability },
                      })
                    }
                  />
                ) : null
              }
            />
          )}
          {step < total ? (
            <p className="text-center text-[11px] text-ink-muted">{total - step} more event(s) queued</p>
          ) : null}
        </section>

        {/* ---------------------------------------------------- Centre */}
        <section aria-label="Decisions" className="min-w-0 space-y-4">
          <div ref={capturePanelRef} id={panelTask ? 'capture-task' : undefined} className="scroll-mt-24">
            {panelTask ? (
              <CaptureTaskCard
                // Answering makes it the active task, so the card stays here
                // (for the read-back) after the note answers it.
                key={`${panelTask.id}:${panelTask.id === activeTaskId}`}
                task={panelTask}
                role={role}
                startAnswering={panelTask.id === activeTaskId}
                onAnswer={(t, note) => answerTask(t, note)}
                onDismiss={dismissTask}
                onAnswerElsewhere={panelTask.id === activeTaskId ? undefined : (t) => openTask(t.id)}
                pills={proposable}
              />
            ) : null}
          </div>
          {proposals.map((p) => (
            <ProposalBanner
              key={p.proposalId}
              proposal={p}
              item={items.find((i) => i.rule.id === p.ruleId)}
              naReason={notApplicable.find((n) => n.trace.ruleId === p.ruleId)?.trace.triggerReason}
              people={people}
              role={role}
              record={decisions[p.ruleId]}
              captureTask={latestTask(captureView.tasks, {
                kinds: ['gate_blocked', 'gate_override'],
                incidentId,
                ruleId: p.ruleId,
                createdFor: role,
              })}
              activeTaskId={panelTask?.id ?? null}
              anchorId={p.proposalId === blockedProposalId ? 'blocked-gate' : undefined}
              onAnswerTask={openTask}
              onWhy={(item) =>
                setDrawer({
                  pillId: item.entry.bundle.id,
                  ruleId: item.rule.id,
                })
              }
              onEscalate={(item) => decide(item, 'escalated')}
            />
          ))}

          <ConfidenceMeter
            required={confidence.required}
            confirmed={confidence.confirmed}
            label={`Across ${items.length} triggered rule(s) in ${approved.length} approved pill(s)`}
          />

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-ink-muted">
              No rule triggered yet at this step.
            </p>
          ) : null}

          {GROUPS.map((g) => {
            const groupItems = items.filter((i) => i.action.status === g.status);
            if (groupItems.length === 0) return null;
            return (
              <div key={g.status} className="space-y-2">
                <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[19px] font-semibold leading-tight">
                  <span className={GROUP_INK[g.status]}>{g.title}</span>
                  <span className="rounded-full border border-line bg-dew-drop px-2 py-px font-sans text-xs font-medium tabular-nums text-ink-muted">
                    {groupItems.length}
                  </span>
                  <span className="sr-only">{g.hint}</span>
                </h2>
                <div className="grid gap-3 xl:grid-cols-2">{groupItems.map(renderCard)}</div>
              </div>
            );
          })}

          <div>
            <button
              type="button"
              aria-expanded={showNa}
              onClick={() => setShowNa((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
            >
              <ChevronDown className={cn('size-3.5 transition-transform', showNa && 'rotate-180')} aria-hidden="true" />
              {showNa ? 'Hide' : 'Show'} {notApplicable.length} not applicable
            </button>
            {showNa ? (
              <ul className="mt-2 space-y-1">
                {notApplicable.map(({ entry, trace }) => (
                  <li
                    key={`${entry.bundle.id}:${trace.ruleId}`}
                    className="rounded-md border border-line px-2.5 py-1.5 text-xs"
                  >
                    <RuleIdLink pillId={entry.bundle.id} ruleId={trace.ruleId} className="text-ink" />{' '}
                    <span className="text-ink">{trace.ruleTitle}</span>
                    <span className="block text-[11px] text-ink-muted">{trace.triggerReason}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        {/* ----------------------------------------------------- Right */}
        <section aria-label="Communications and asset overlay" className="space-y-4 lg:col-span-2 2xl:col-span-1">
          <div>
            <h2 className="mb-2 text-[19px] font-semibold leading-tight">Tenant message</h2>
            <TenantMessagePanel
              key={incidentId}
              liveProvider={liveProvider}
              fixture={scenario.tenantMessage}
              role={role}
              replayAt={currentEvent?.at ?? null}
              gate={tenantGate}
              records={decisions}
              onDecide={(draft, outcome) => {
                const rec = decideAction({
                  incidentId,
                  ruleId: draft.draft_id,
                  outcome,
                  note: `${outcome === 'approved' ? 'Approved' : 'Rejected'} tenant message ${draft.draft_id} (${draft.channel})`,
                  pillId: pills.find((p) => p.domain === 'tenant-experience')?.id,
                  subject: { kind: 'tenant_message', approverRole: draft.approved_by_role },
                });
                if (rec) setAnnouncement(`Tenant message ${draft.draft_id} ${outcome} by ${rec.actor.name}.`);
              }}
              noDraftReason={
                asset.type === 'data_centre'
                  ? `No tenant-experience message for ${asset.name}: ${assetTypeLabel(asset.type)} clients are notified through the SLA channel.`
                  : 'No tenant-message draft recorded for this incident.'
              }
            />
          </div>

          {overlay ? (
            <AssetOverlayPanel
              pills={approved.map((a) => a.pill)}
              baseAsset={primary.asset}
              overlayAsset={overlay.asset}
              activeAssetId={asset.id}
              role={role}
              triggeredDiff={triggeredDiff}
            />
          ) : null}
        </section>
      </div>

      {/* ------------------------------------------------------- Footer */}
      {/* Compact audit status for this incident. The full log is the app-shell
          "Audit log" drawer; this opens that same drawer. */}
      <footer className="fixed inset-x-0 z-40 border-t border-line bg-canvas/95 backdrop-blur md:left-64" style={{ bottom: 'var(--guide-bar-h, 0px)' }}>
        <button
          type="button"
          onClick={() => setAuditOpen(true)}
          aria-haspopup="dialog"
          className="flex min-h-10 w-full items-center gap-2 px-4 text-left text-xs text-ink-muted transition-colors duration-150 hover:text-ink md:px-8"
        >
          <ScrollText className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="shrink-0 tabular-nums">
            {auditEvents.length} audit event
            {auditEvents.length === 1 ? '' : 's'} · {incidentId}
            {lastReset ? ` since reset at ${formatSgtClock(lastReset.at)}` : ''}
          </span>
          {auditEvents.length > 0 ? (
            <span className="truncate">· latest: {auditEvents[auditEvents.length - 1].detail}</span>
          ) : lastReset ? (
            <span className="truncate">
              · demo reset by {lastReset.actor}
              {earlierCount > 0 ? ` · ${earlierCount} earlier event${earlierCount === 1 ? '' : 's'} in the full log` : ''}
            </span>
          ) : null}
        </button>
      </footer>

      <AuditLogDrawer open={auditOpen} onClose={() => setAuditOpen(false)} />

      {drawerItem ? (
        <RuleWhyDrawer
          open
          onClose={closeDrawer}
          action={drawerItem.action}
          rule={drawerItem.rule}
          pillVersion={drawerItem.entry.version}
          pillName={pillDisplayName(drawerItem.entry.bundle.name)}
          evidence={evidence}
          evidenceKeys={evidenceKeysForRule(drawerItem.rule, {
            asset: toEngineAsset(scenario.asset),
            incident: toEngineIncident(scenario.incident),
            evidence: toEngineEvidence(evidence),
          })}
          expert={drawerExpert}
          expertName={personForRole(drawerItem.rule.owner, people).name ?? humanizeKey(drawerItem.rule.owner)}
          counterfactual={drawerCounterfactual}
          voice={voice}
          onHear={voice.speak}
          onStopHearing={voice.stop}
          footer={
            <div className="space-y-2">
              {decisions[drawerItem.rule.id] ? <DecisionStamp record={decisions[drawerItem.rule.id]} /> : null}
              {drawerItem.action.status !== 'allowed' ? (
                <DecisionButtons
                  permissions={withRecordedDecision(
                    actionPermissions(drawerItem.action, role, drawerItem.trace.escalateTo?.role ?? null),
                    decisions[drawerItem.rule.id],
                    formatSgtClock,
                  )}
                  escalateLabel={`Escalate to ${personLabel(drawerItem.trace.escalateTo.role, people)}`}
                  missingEvidence={missingOptions(drawerItem)}
                  onDecide={(o) => decide(drawerItem, o)}
                  onRequestEvidence={(keys) => requestEvidence(drawerItem, keys)}
                />
              ) : null}
              <WhyDrawerLinks
                pillId={drawerItem.entry.bundle.id}
                ruleId={drawerItem.rule.id}
                incidentId={incidentId}
                expert={drawerExpert}
              />
              <p className="text-[11px] text-ink-muted">
                Escalation goes to {personLabel(drawerItem.trace.escalateTo.role, people)}
                {drawerItem.trace.escalateTo.fallback
                  ? `, fallback ${personLabel(drawerItem.trace.escalateTo.fallback, people)}`
                  : ''}
                .
              </p>
            </div>
          }
        />
      ) : null}
    </div>
  );
}
