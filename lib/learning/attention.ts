// What should be looked at first, and why — in that order.
//
// WHY THIS EXISTS
//
// Keppel's challenge owner described the artifact his own team already builds:
// the energy report "is generated into an HTML, and in the HTML it will then
// prompt saying these are the top five issues that management should be
// looking into because of ABCD". The "because of ABCD" is the part that makes
// it usable — a list of issues with no stated reason is just a longer list.
//
// Keystone had every ingredient for this and no such list: the portfolio page
// showed open incidents, awaiting-approval counts and capture tasks in
// separate sections, each sorted its own way, leaving a reader to work out
// what actually mattered. This puts them in one order with one sentence each.
//
// HOW THE ORDER IS DECIDED, AND WHAT IT IS NOT
//
// It is NOT a score. There are no weights, no learned priority, nothing to
// tune. The order is a stated policy over the action's recorded `status`:
//
//   1. a gate is blocking the work      (status "blocked")
//   2. a named person must decide       (status "needs_approval")
//   3. it has been handed to someone    (status "escalate")
//
// and within one kind, whichever incident has been waiting longest. That is a
// total order derived entirely from recorded state, so two readers looking at
// the same record get the same list and either can say why a row sits where it
// does. A weighted score could not be checked by either of them.
//
// Nothing here reads prose. The reason sentence is assembled from the rule id,
// the recorded decision, the named missing evidence keys and the escalation
// role — all structured fields.
//
// Pure: every input is passed in.

import type { IncidentActionRecord, IncidentRecord } from "@/lib/data/schemas";

/** Why a row is on the list. Ordered: earlier is more urgent. */
export const ATTENTION_KINDS = ["gate_blocked", "awaiting_decision", "escalated"] as const;
export type AttentionKind = (typeof ATTENTION_KINDS)[number];

/** The recorded action status that puts a row in each kind. */
const KIND_FOR_STATUS: Readonly<Record<string, AttentionKind>> = {
  blocked: "gate_blocked",
  needs_approval: "awaiting_decision",
  escalate: "escalated",
};

/** Short label for a chip, in the reader's terms rather than the schema's. */
export const ATTENTION_LABEL: Record<AttentionKind, string> = {
  gate_blocked: "Gate blocking work",
  awaiting_decision: "Awaiting a decision",
  escalated: "Escalated, still open",
};

export interface AttentionItem {
  readonly incidentId: string;
  readonly assetId: string;
  readonly ruleId: string;
  readonly kind: AttentionKind;
  /** The recorded decision this is about. */
  readonly decision: string;
  /** One sentence naming the structural reason, with no adjectives. */
  readonly why: string;
  /** Who can move it, when the record names them. */
  readonly who: string | null;
  /** Minutes allowed, when the rule sets one. */
  readonly deadlineMinutes: number | null;
  /** When the incident opened, for the tiebreak and for the reader. */
  readonly openedAt: string;
}

export interface AttentionReport {
  readonly items: readonly AttentionItem[];
  /**
   * Rows that qualified but did not fit the limit. Reported rather than
   * dropped: a truncated list that does not say it was truncated reads as
   * "this is everything".
   */
  readonly hidden: number;
}

/** "lew_signoff and area_dry" — the reader's labels, in the record's order. */
function evidencePhrase(keys: readonly string[], labels: Readonly<Record<string, string>>): string {
  const named = keys.map((key) => labels[key] ?? key);
  if (named.length === 1) return named[0];
  return `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}`;
}

function whoFor(action: IncidentActionRecord): string | null {
  const to = action.escalate_to;
  if (!to) return null;
  return to.name ? `${to.name} (${to.role})` : to.role;
}

function why(action: IncidentActionRecord, kind: AttentionKind, labels: Readonly<Record<string, string>>): string {
  const missing = action.missing_evidence ?? [];
  if (kind === "gate_blocked") {
    return missing.length > 0
      ? `${action.rule_id} is holding this until ${evidencePhrase(missing, labels)} ${missing.length === 1 ? "is" : "are"} confirmed by someone the pill allows.`
      : `${action.rule_id} is holding this until its required evidence is confirmed by someone the pill allows.`;
  }
  if (kind === "awaiting_decision") {
    return `${action.rule_id} needs a named person to approve it before it can happen.`;
  }
  return `${action.rule_id} has been escalated and the record does not yet show it closed.`;
}

/**
 * The attention list, worst first.
 *
 * All four arguments are REQUIRED and none has a default. A limit with a
 * default would quietly decide how much of the record a reader sees, and
 * labels built elsewhere would let this module fall back to raw evidence keys
 * that mean nothing to the person reading them.
 *
 * `incidents` should already be scoped to the viewer's role: this reports
 * whatever it is given, and names evidence keys, so handing it unscoped
 * records would leak items a reader is not cleared for.
 */
export function attentionList(
  incidents: readonly IncidentRecord[],
  labels: Readonly<Record<string, string>>,
  limit: number,
): AttentionReport {
  const rows: AttentionItem[] = [];
  for (const incident of incidents) {
    // A closed incident is not waiting for anyone, whatever its actions say.
    if (incident.status === "closed") continue;
    for (const action of incident.actions ?? []) {
      const kind = KIND_FOR_STATUS[action.status];
      if (!kind) continue;
      // Completed work is not outstanding, even where the status says escalate.
      if (action.completed_at) continue;
      rows.push({
        incidentId: incident.id,
        assetId: incident.asset_id,
        ruleId: action.rule_id,
        kind,
        decision: action.decision,
        why: why(action, kind, labels),
        who: whoFor(action),
        deadlineMinutes: action.deadline_min ?? null,
        openedAt: incident.opened_at,
      });
    }
  }

  const rank = (kind: AttentionKind) => ATTENTION_KINDS.indexOf(kind);
  const ordered = [...rows].sort((a, b) => {
    const byKind = rank(a.kind) - rank(b.kind);
    if (byKind !== 0) return byKind;
    // Longest-waiting first. Ties fall back to the ids so the order is total
    // and the same record always renders the same way.
    const byAge = a.openedAt.localeCompare(b.openedAt);
    if (byAge !== 0) return byAge;
    return `${a.incidentId}${a.ruleId}`.localeCompare(`${b.incidentId}${b.ruleId}`);
  });

  return { items: ordered.slice(0, limit), hidden: Math.max(0, ordered.length - limit) };
}
