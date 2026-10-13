// Keystone eval corpus — derive an eval case from a CLOSED incident.
//
// Pure: every input is passed in (data/ is read by ./history, which is the
// only file here that touches the filesystem). No clock — `Date.parse` is used
// on timestamps the record itself carries, never `Date.now`.
//
// WHAT IS AUTHORITATIVE, AND WHAT IS NOT
//
// The expected decisions come from the incident's own `actions[]` records:
// rule id + the status that was recorded against it. Nothing else on the
// record is treated as an expectation. In particular the closed incidents'
// `eval_expected` / `eval_actual` fields are NOT used: they hold action
// classes and prose ("recommend", "TS-02 tenant-area isolation deadline
// 10 min"), name no rule, and reading a status out of them would mean
// pattern-matching free text to re-derive something the record does not say.
//
// The evidence comes from the incident's timeline: `evidence_updates` is
// already the engine's evidence vocabulary (enforced by
// lib/data/__tests__/consistency.test.ts), so the snapshot is a fold, not a
// translation.
//
// A closed incident is the only safe source. While an incident is open its
// `actions[]` are the CURRENT disposition, which pairs with an evidence state
// somewhere in the middle of its timeline that the record does not identify;
// closing the incident is what makes the record final, so the final evidence
// fold and the recorded actions describe the same moment.

import type {
  Asset,
  EvalCase,
  ExpectedDecision,
  Evidence,
  Incident,
  Pill,
} from "@/lib/engine";
import type {
  AssetRecord,
  IncidentActionRecord,
  IncidentRecord,
  Timeline,
  TimelineEvent,
} from "@/lib/data/schemas";
import {
  isDecisionStatus,
  type DerivationResult,
  type DerivedCaseOrigin,
  type DerivedEvalCase,
  type DroppedRule,
  type ExcludedIncident,
  type ExclusionReason,
} from "./types";

/** The operational history a derivation reads. All required: a derivation run
 *  against a partial history would quietly exclude incidents for missing
 *  timelines or assets that do exist. */
export interface IncidentHistory {
  readonly incidents: readonly IncidentRecord[];
  readonly timelines: readonly Timeline[];
  readonly assets: readonly AssetRecord[];
}

/** Marks a derived case id apart from an authored one at a glance. The type
 *  discriminator is what consumers switch on; this is for the reader. */
export const DERIVED_CASE_ID_PREFIX = "derived-";

export function derivedCaseId(incidentId: string, eventId: string): string {
  return `${DERIVED_CASE_ID_PREFIX}${incidentId}@${eventId}`;
}

// ---------------------------------------------------------------------------
// Engine inputs
// ---------------------------------------------------------------------------

/**
 * The incident fields that describe the incident itself.
 *
 * Everything else on the record — `actions`, `evidence_coverage`, `eval_*`,
 * `outcome`, `audit_trail`, `learning_note` — is the ANSWER. A rule condition
 * can path into `incident.<field>`, so letting the answer through as an input
 * would allow a derived case to mark its own homework. The allowlist is
 * checked against `IncidentRecord` at compile time, so a renamed field is a
 * build error rather than a silently dropped input.
 */
const INCIDENT_INPUT_FIELDS = [
  "id",
  "type",
  "subtype",
  "severity",
  "location",
  "opened_at",
  "opened_by",
  "asset_id",
  "asset_name",
  "affected_systems",
  "affected_tenant",
  "affected_client",
  "asset_overlay",
  "description",
] as const satisfies readonly (keyof IncidentRecord)[];

function incidentInput(record: IncidentRecord): Incident {
  const described: Record<string, unknown> = {};
  for (const field of INCIDENT_INPUT_FIELDS) {
    const value = record[field];
    if (value !== undefined) described[field] = value;
  }
  return { ...described, id: record.id, type: record.type };
}

/** The asset as recorded. Nothing is curated out: `asset.<x>` resolves through
 *  `attributes`, so dropping a field would silently change a decision. */
function assetInput(record: AssetRecord): Asset {
  const { id, name, type, ...attributes } = record;
  return { id, name, type, attributes };
}

/**
 * The evidence state after the timeline's events, in order.
 *
 * Last write wins: evidence is a state over time, and a later event may
 * confirm, correct or retract what an earlier one recorded. Built through a
 * Map so a key like `__proto__` becomes an own property instead of rewriting
 * the object's prototype.
 */
export function evidenceAfter(events: readonly TimelineEvent[]): Evidence {
  const state = new Map<string, Evidence[string]>();
  for (const event of events) {
    for (const [key, update] of Object.entries(event.evidence_updates)) {
      state.set(key, {
        value: update.value,
        source: event.source,
        at: event.at,
        confirmed: update.confirmed,
      });
    }
  }
  return Object.fromEntries(state);
}

// ---------------------------------------------------------------------------
// Expectations
// ---------------------------------------------------------------------------

interface Expectations {
  readonly expected: Record<string, ExpectedDecision>;
  readonly dropped: readonly DroppedRule[];
}

/**
 * The recorded actions, turned into assertions.
 *
 * Only `status` is asserted. Two deliberate omissions:
 *
 *  - `deadline_min` is the operational clock the duty team was shown, not
 *    necessarily the rule's effective `deadline_minutes` after asset
 *    overrides. Asserting it would invent an expectation out of an adjacent
 *    field; the data owner would have to record the effective deadline for it
 *    to become assertable.
 *  - Rules the incident does not mention get NO expectation. Filling them in
 *    as `not_applicable` would be the engine's own answer written down as if
 *    it were the organisation's.
 *
 * A status that is not one of the engine's decision statuses is DROPPED rather
 * than mapped. "completed", for instance, is an operational state: mapping it
 * by action class (recommend → allowed, must_escalate → escalate) would
 * reimplement the engine's own computeStatus, so the assertion could never
 * fail — exactly the trivially-passing expectation this module must not make.
 */
export function expectationsFrom(pill: Pill, actions: readonly IncidentActionRecord[]): Expectations {
  const ruleIds = new Set(pill.rules.map((rule) => rule.id));
  const expected: Record<string, ExpectedDecision> = {};
  const dropped: DroppedRule[] = [];
  // Once a rule's recorded statuses contradict each other it stays dropped — a
  // third record agreeing with the first must not resurrect the expectation.
  const conflicted = new Set<string>();

  for (const action of actions) {
    const ruleId = action.rule_id;
    if (conflicted.has(ruleId)) continue;

    if (!ruleIds.has(ruleId)) {
      dropped.push({
        ruleId,
        reason: "rule_not_in_pill",
        detail: `${ruleId} is not a rule of ${pill.manifest.name} — the incident applied more than one pill.`,
      });
      continue;
    }

    if (!isDecisionStatus(action.status)) {
      dropped.push({
        ruleId,
        reason: "status_not_a_decision_status",
        detail: `Recorded status "${action.status}" is an operational state, not a decision the engine returns, so it cannot be an expectation.`,
      });
      continue;
    }

    const already = Object.hasOwn(expected, ruleId) ? expected[ruleId] : undefined;
    if (already !== undefined && already.status !== action.status) {
      delete expected[ruleId];
      conflicted.add(ruleId);
      dropped.push({
        ruleId,
        reason: "conflicting_recorded_statuses",
        detail: `${ruleId} is recorded twice with different statuses ("${already.status}" and "${action.status}"), so neither can be the expectation.`,
      });
      continue;
    }

    expected[ruleId] = { status: action.status };
  }

  return { expected, dropped };
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/** A recorded timestamp in epoch milliseconds, or undefined when the record
 *  does not hold a parseable one. Never reads the clock. */
function recordedTime(at: string): number | undefined {
  const parsed = Date.parse(at);
  return Number.isNaN(parsed) ? undefined : parsed;
}

interface Blocked {
  readonly reasons: ExclusionReason[];
  readonly details: string[];
}

function block(blocked: Blocked, reason: ExclusionReason, detail: string): void {
  blocked.reasons.push(reason);
  blocked.details.push(detail);
}

/**
 * Derive the eval case for one incident, or say why there is none.
 *
 * Every independently checkable fact is checked, so an excluded incident
 * reports ALL the reasons it is excluded — an incident whose only reason is
 * `incident_not_closed` is one that will become a case the moment it closes.
 */
export function deriveEvalCase(
  pill: Pill,
  incident: IncidentRecord,
  timeline: Timeline | undefined,
  asset: AssetRecord | undefined,
): DerivedEvalCase | ExcludedIncident {
  const blocked: Blocked = { reasons: [], details: [] };

  if (incident.status !== "closed") {
    block(
      blocked,
      "incident_not_closed",
      `The incident is ${incident.status}, and only a closed incident's recorded decisions are final.`,
    );
  } else if (incident.closed_at === undefined) {
    block(blocked, "no_closed_at", "The incident is closed but records no close time.");
  }

  const events = timeline?.events ?? [];
  if (timeline === undefined) {
    block(blocked, "no_timeline", "The incident has no timeline, so there is no evidence to replay.");
  } else if (events.length === 0) {
    block(blocked, "timeline_has_no_events", "The incident's timeline records no events.");
  }

  const anchor = events.at(-1);
  const closeTime = incident.closed_at === undefined ? undefined : recordedTime(incident.closed_at);
  if (anchor !== undefined && incident.closed_at !== undefined) {
    const anchorTime = recordedTime(anchor.at);
    if (anchorTime === undefined || closeTime === undefined) {
      block(blocked, "timestamp_not_parseable", "The close time or the last event time is not a parseable timestamp.");
    } else if (anchorTime > closeTime) {
      block(
        blocked,
        "timeline_extends_past_close",
        "The timeline continues after the incident was closed, so the recorded decisions are not its final state.",
      );
    }
  }

  if (asset === undefined) {
    block(blocked, "asset_not_found", `No asset record for ${incident.asset_id}.`);
  }

  const actions = incident.actions ?? [];
  if (actions.length === 0) {
    block(blocked, "no_recorded_actions", "The incident records no per-rule decisions to expect.");
  }

  // Expectations are only meaningful once the inputs above are sound.
  if (blocked.reasons.length === 0 && anchor !== undefined && asset !== undefined && timeline !== undefined) {
    const { expected, dropped } = expectationsFrom(pill, actions);

    if (Object.keys(expected).length === 0) {
      block(
        blocked,
        "no_determinable_expectation",
        `None of the ${actions.length} recorded decisions could become an expectation: ${dropped
          .map((drop) => drop.detail)
          .join(" ")}`,
      );
      return excluded(incident.id, blocked);
    }

    const origin: DerivedCaseOrigin = {
      incidentId: incident.id,
      eventId: anchor.id,
      eventAt: anchor.at,
      timelineVersion: timeline.timeline_version,
      recordedPillVersion: incident.pill_version,
      droppedRules: dropped,
    };

    return {
      id: derivedCaseId(incident.id, anchor.id),
      description: `Derived from closed incident ${incident.id} at event ${anchor.id} (${anchor.at}). Expectations are the decisions the incident recorded, not an expert's.`,
      asset: assetInput(asset),
      incident: incidentInput(incident),
      evidence: evidenceAfter(events),
      expected,
      authorship: "derived",
      origin,
    };
  }

  return excluded(incident.id, blocked);
}

function excluded(incidentId: string, blocked: Blocked): ExcludedIncident {
  return { incidentId, reasons: blocked.reasons, detail: blocked.details.join(" ") };
}

/** Every incident in the history, derived or excluded with its reasons. */
export function deriveEvalCases(pill: Pill, history: IncidentHistory): DerivationResult {
  const timelines = new Map(history.timelines.map((timeline) => [timeline.incident_id, timeline]));
  const assets = new Map(history.assets.map((asset) => [asset.id, asset]));

  const derived: DerivedEvalCase[] = [];
  const skipped: ExcludedIncident[] = [];

  for (const incident of history.incidents) {
    const outcome = deriveEvalCase(
      pill,
      incident,
      timelines.get(incident.id),
      assets.get(incident.asset_id),
    );
    if ("authorship" in outcome) {
      derived.push(outcome);
    } else {
      skipped.push(outcome);
    }
  }

  return { derived, excluded: skipped, incidentsConsidered: history.incidents.length };
}
