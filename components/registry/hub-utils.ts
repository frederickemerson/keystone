// Pure helpers for the pill hub (/registry/[pillId]) and the incidents list.
// No React, no store: the hub's client component feeds them the governed
// version from the store, and tests call them directly.

import { evaluate } from '@/lib/engine/evaluate';
import type { ActionClass, ActionStatus, Pill, Rule } from '@/lib/engine/types';
import type { AssetRecord, IncidentRecord, Timeline } from '@/lib/data/schemas';
import type { CaptureProvenance } from '@/lib/governance/versions';
import { ruleAnchorId } from '@/lib/journey/routes';
import {
  accumulateEvidence,
  toEngineAsset,
  toEngineEvidence,
  toEngineIncident,
} from '@/components/incident/engineInputs';
import { humanizeKey } from '@/components/incident/labels';
import { expertQuoteFor } from '@/components/incident/provenance';

/**
 * Pill id of an incident's recorded `pill_applied` ref. Incidents record the
 * pill folder ("technical-services/chilled-water-leak"); pill ids are
 * "<domain>-<name>" (lib/pills/load pillId), so the folder separator becomes "-".
 */
export function pillIdFromRef(ref: string): string {
  const [domain, ...rest] = ref.split('/');
  return rest.length > 0 ? `${domain}-${rest.join('/')}` : ref;
}

/** Where a rule's words came from: the expert call, or a frontline note (capture-derived version). */
export interface RuleSource {
  kind: 'expert' | 'frontline';
  quote: string;
  /** "HH:MM:SS" in the expert call; absent for frontline notes. */
  timestamp?: string;
  /** Transcript id or voice-note id. */
  source: string;
  confirmedBy?: string;
}

export interface RuleRow {
  id: string;
  anchorId: string;
  title: string;
  decision: string;
  actionClass: ActionClass;
  requiredEvidence: { key: string; label: string }[];
  escalateRole: string;
  escalateFallback?: string;
  deadlineMinutes: number | null;
  source: RuleSource | null;
}

function sourceFor(pill: Pill, rule: Rule, captures: readonly CaptureProvenance[]): RuleSource | null {
  const capture = captures.find((c) => c.ruleId === rule.id);
  if (capture) return { kind: 'frontline', quote: capture.quoteSpan.text, source: capture.noteId };
  const expert = expertQuoteFor(pill, rule);
  if (!expert) return null;
  return {
    kind: 'expert',
    quote: expert.quote,
    timestamp: expert.start || undefined,
    source: expert.source,
    confirmedBy: expert.confirmedBy,
  };
}

/**
 * One row per rule of a governed version (`rules` is the version's rules, not
 * the file's), with evidence labels from the pill's catalogue and the words
 * the rule rests on. `captures` are the capture provenances of the pill's
 * versions, so a rule proposed from a frontline note quotes that note.
 */
export function rulesView(pill: Pill, rules: readonly Rule[], captures: readonly CaptureProvenance[] = []): RuleRow[] {
  return rules.map((rule) => ({
    id: rule.id,
    anchorId: ruleAnchorId(rule.id),
    title: rule.title,
    decision: rule.decision,
    actionClass: rule.action_class,
    requiredEvidence: rule.required_evidence.map((key) => ({
      key,
      label: pill.evidenceCatalog[key]?.label ?? humanizeKey(key),
    })),
    escalateRole: rule.escalate_to.role,
    escalateFallback: rule.escalate_to.fallback,
    deadlineMinutes: rule.deadline_minutes,
    source: sourceFor(pill, rule, captures),
  }));
}

/** An incident with a recorded evidence timeline, scoped for the viewer. */
export interface ReplayScenario {
  incident: IncidentRecord;
  asset: AssetRecord;
  timeline: Timeline;
}

/** A rule triggered in an incident's replay. */
export interface RuleApplication {
  incidentId: string;
  /** First replay step (1-based event count) at which the rule triggered. */
  firstStep: number;
  /** The gate held (status "blocked") at some step. */
  blocked: boolean;
  /** Status at the end of the replay, or null if it no longer triggers then. */
  finalStatus: ActionStatus | null;
}

/**
 * Where each rule was applied: the engine replays every recorded timeline,
 * step by step, exactly as the incident room does, and records the rules that
 * trigger. This is the engine's own answer, not a re-derivation from labels.
 */
export function ruleApplications(pill: Pill, scenarios: readonly ReplayScenario[]): Record<string, RuleApplication[]> {
  const out: Record<string, RuleApplication[]> = {};
  for (const { incident, asset, timeline } of scenarios) {
    const engineAsset = toEngineAsset(asset);
    const engineIncident = toEngineIncident(incident);
    const seen = new Map<string, RuleApplication>();
    const events = timeline.events;
    for (let step = 1; step <= events.length; step++) {
      const evidence = toEngineEvidence(accumulateEvidence(events, step));
      const result = evaluate(pill, engineAsset, engineIncident, evidence);
      const triggered = new Map(result.trace.filter((t) => t.triggered).map((t) => [t.ruleId, t.status]));
      for (const [ruleId, status] of triggered) {
        const prev = seen.get(ruleId);
        seen.set(ruleId, {
          incidentId: incident.id,
          firstStep: prev?.firstStep ?? step,
          blocked: (prev?.blocked ?? false) || status === 'blocked',
          finalStatus: status,
        });
      }
      if (step === events.length) {
        for (const [ruleId, app] of seen) if (!triggered.has(ruleId)) seen.set(ruleId, { ...app, finalStatus: null });
      }
    }
    for (const [ruleId, app] of seen) out[ruleId] = [...(out[ruleId] ?? []), app];
  }
  return out;
}

export interface PillIncidentUse {
  incident: IncidentRecord;
  /** Version recorded when the incident opened, when this pill was the one recorded. */
  recordedVersion?: string;
  /** Rules of the governed version that triggered in the incident's replay. */
  triggeredRules: string[];
}

/**
 * Incidents that used a pill: those that recorded it at open (`pill_applied`)
 * plus those whose replay triggers any of its rules (the room evaluates every
 * approved pill, not just the recorded one). Newest first.
 */
export function incidentsUsingPill(
  pillId: string,
  incidents: readonly IncidentRecord[],
  applications: Readonly<Record<string, readonly RuleApplication[]>>,
): PillIncidentUse[] {
  const triggeredBy = new Map<string, string[]>();
  for (const [ruleId, apps] of Object.entries(applications)) {
    for (const app of apps) triggeredBy.set(app.incidentId, [...(triggeredBy.get(app.incidentId) ?? []), ruleId]);
  }
  return incidents
    .filter((i) => pillIdFromRef(i.pill_applied) === pillId || triggeredBy.has(i.id))
    .map((incident) => ({
      incident,
      recordedVersion: pillIdFromRef(incident.pill_applied) === pillId ? incident.pill_version : undefined,
      triggeredRules: [...(triggeredBy.get(incident.id) ?? [])].sort(),
    }))
    .sort((a, b) => b.incident.opened_at.localeCompare(a.incident.opened_at));
}

/** A pill an incident applied, for the incidents list. */
export interface AppliedPill {
  pillId: string;
  /** Version recorded at open; absent for pills known only from recorded actions. */
  version?: string;
}

/**
 * Pills an incident applied, from its own record: the pill recorded at open
 * plus the pill that owns each recorded action's rule (looked up in the pills'
 * rules, so "TE-01" maps to whichever pill defines it).
 */
export function pillsAppliedTo(
  incident: IncidentRecord,
  pills: readonly { id: string; ruleIds: readonly string[] }[],
): AppliedPill[] {
  const recorded = pillIdFromRef(incident.pill_applied);
  const out: AppliedPill[] = [{ pillId: recorded, version: incident.pill_version }];
  for (const action of incident.actions ?? []) {
    const owner = pills.find((p) => p.ruleIds.includes(action.rule_id));
    if (owner && !out.some((p) => p.pillId === owner.id)) out.push({ pillId: owner.id });
  }
  return out;
}
