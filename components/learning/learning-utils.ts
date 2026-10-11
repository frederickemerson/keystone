// Pure helpers for the Outcome & Learning screen (SPEC §1 step 3, §6).
// No React, no store — everything here is a function of its inputs so the
// screen's numbers can be reasoned about (and probed) without rendering.

import { evaluate, type EvalCase, type EvalSummary, type Pill } from "@/lib/engine";
import type { ComparisonResult } from "@/lib/engine";
import { makeShadowRun, type ShadowRun } from "@/lib/governance/approval";
import { roleLabel } from "@/lib/governance/access";
import type { IncidentRecord } from "@/lib/data/schemas";
import type { DiffItem } from "@/components/mosaic/types";

// ---------------------------------------------------------------------------
// Step 1 — outcome capture
// ---------------------------------------------------------------------------

export interface OutcomeDraft {
  /** Measured, not estimated: alarm → isolation sub-valve closed. */
  timeToIsolateMinutes: number;
  tenantImpact: string;
  costSgd: number;
  causeConfirmed: string;
  notes: string;
}

/** Causes the Chief Engineer can confirm; the first is the chilled-water default. */
export const CAUSE_OPTIONS = [
  "Chilled-water branch joint failure",
  "Condensate drain blockage",
  "Tenant fit-out plumbing failure",
  "Fire-protection system discharge",
  "External ingress (rain / façade)",
] as const;

/** Demo fallback when data/ carries no cost figure — always editable on screen. */
const FALLBACK_COST_SGD = 24_800;

function minutesBetween(from: string, to: string): number | null {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 60_000));
}

/**
 * Prefill the outcome form from the incident record: the isolation action's
 * `completed_at` gives the real time-to-isolate, the affected tenant gives the
 * impact line. Every field stays editable — the human confirms the outcome.
 */
export function defaultOutcome(incident: IncidentRecord | null): OutcomeDraft {
  const openedAt = incident?.opened_at ?? "";
  const isolation = incident?.actions?.find((a) => a.rule_id === "TS-02");
  const measured = isolation?.completed_at ? minutesBetween(openedAt, isolation.completed_at) : null;

  const tenant = incident?.affected_tenant;
  const tenantImpact = tenant
    ? `${tenant.name} — floors ${tenant.floors}, no trading-floor interruption`
    : "None reported";

  const cause =
    incident?.subtype === "condensate_leak"
      ? CAUSE_OPTIONS[1]
      : incident?.subtype === "chilled_water_leak"
        ? CAUSE_OPTIONS[0]
        : CAUSE_OPTIONS[0];

  return {
    timeToIsolateMinutes: measured ?? 12,
    tenantImpact,
    costSgd: FALLBACK_COST_SGD,
    causeConfirmed: cause,
    notes: incident?.description ?? "",
  };
}

// ---------------------------------------------------------------------------
// Step 2 — expert correction
// ---------------------------------------------------------------------------

export type Verdict =
  | "correct"
  | "incomplete"
  | "wrong_for_asset"
  | "unsafe"
  | "missing_evidence"
  | "new_exception";

export const VERDICTS: { value: Verdict; label: string; hint: string }[] = [
  { value: "correct", label: "Correct", hint: "Behaviour matched the incident — no change needed." },
  { value: "incomplete", label: "Incomplete", hint: "Right idea, missing a case or an asset type." },
  {
    value: "wrong_for_asset",
    label: "Wrong for this asset",
    hint: "Correct on a Grade A office, wrong on this asset class.",
  },
  { value: "unsafe", label: "Unsafe", hint: "The rule allowed something that must never happen." },
  {
    value: "missing_evidence",
    label: "Missing evidence",
    hint: "The rule fires without evidence the expert requires.",
  },
  { value: "new_exception", label: "New exception", hint: "A case the pill has never seen before." },
];

export function verdictLabel(verdict: Verdict): string {
  return VERDICTS.find((v) => v.value === verdict)?.label ?? verdict;
}

/** The single rule field the expert corrects in this demo flow. */
export const CORRECTION_FIELD = "deadline_minutes";

export interface CorrectionDraft {
  ruleId: string;
  verdict: Verdict;
  /** Corrected value; compared against the live rule's current value. */
  after: number | null;
  reason: string;
}

/** Version `reason` string — the verdict is part of the permanent record. */
export function correctionReason(c: CorrectionDraft): string {
  const detail = c.reason.trim();
  return detail ? `${verdictLabel(c.verdict)} — ${detail}` : verdictLabel(c.verdict);
}

// ---------------------------------------------------------------------------
// Step 3 — diff lines
// ---------------------------------------------------------------------------

/**
 * Turn `describeRulesDelta` lines ("TS-02 deadline_minutes 15 → 10") into
 * DiffView items: label = rule + field, before/after = the two values.
 */
export function toDiffItems(changes: readonly string[]): DiffItem[] {
  return changes.map((change) => {
    const arrow = change.indexOf(" → ");
    if (arrow !== -1) {
      const left = change.slice(0, arrow);
      const after = change.slice(arrow + 3);
      const cut = left.lastIndexOf(" ");
      // "TS-02 deadline_minutes 15" → label "TS-02 deadline_minutes", before "15"
      const label = cut === -1 ? left : left.slice(0, cut);
      const before = cut === -1 ? "" : left.slice(cut + 1);
      return { label, before, after, kind: "change" as const };
    }
    if (/\badded\.?$/.test(change)) {
      return { label: change.replace(/\s*added\.?$/, ""), before: "", after: "added", kind: "add" as const };
    }
    if (/\bremoved$/.test(change)) {
      return { label: change.replace(/\s*removed$/, ""), before: "removed", after: "", kind: "remove" as const };
    }
    return { label: change, before: "", after: "", kind: "change" as const };
  });
}

// ---------------------------------------------------------------------------
// Step 4 — eval matrix
// ---------------------------------------------------------------------------

export interface EvalMatrixRow {
  caseId: string;
  total: number;
  oldFailed: number;
  newFailed: number;
  oldPass: boolean;
  newPass: boolean;
  /** Pass/fail changed between versions (either direction). */
  flipped: boolean;
}

function caseTotals(summary: EvalSummary): Map<string, { total: number; failed: number }> {
  const out = new Map<string, { total: number; failed: number }>();
  for (const r of summary.results) {
    const row = out.get(r.caseId) ?? { total: 0, failed: 0 };
    row.total += 1;
    if (!r.pass) row.failed += 1;
    out.set(r.caseId, row);
  }
  return out;
}

/** One row per eval case: pass/fail under each version. */
export function buildEvalMatrix(
  cases: readonly EvalCase[],
  comparison: ComparisonResult,
): EvalMatrixRow[] {
  const oldTotals = caseTotals(comparison.oldSummary);
  const newTotals = caseTotals(comparison.newSummary);
  return cases.map((c) => {
    const before = oldTotals.get(c.id) ?? { total: 0, failed: 0 };
    const after = newTotals.get(c.id) ?? { total: 0, failed: 0 };
    const oldPass = before.failed === 0;
    const newPass = after.failed === 0;
    return {
      caseId: c.id,
      total: Math.max(before.total, after.total),
      oldFailed: before.failed,
      newFailed: after.failed,
      oldPass,
      newPass,
      flipped: oldPass !== newPass,
    };
  });
}

/**
 * The eval case the Chief Engineer's correction is about: the tenant-area
 * isolation replay (pills/.../evals/eval-2025-09-tenant-area-isolation-deadline.yaml),
 * which records `expected_decisions.TS-02.deadline_minutes: 10` — the intended
 * v1.2.0 failure. Matched by name so a rename of the file still resolves.
 */
export function findCorrectionCaseId(cases: readonly EvalCase[]): string | undefined {
  return cases.find((c) => /tenant-area-isolation/.test(c.id))?.id;
}

export interface DeadlineAssertion {
  ruleId: string;
  field: string;
  expected: number;
  before: number | null;
  after: number | null;
  oldPass: boolean;
  newPass: boolean;
}

/**
 * Field-level check for the correction itself (TS-02 deadline_minutes 15 → 10).
 *
 * Where the eval specifies an expected deadline, `runEvals` compares it and the
 * matrix row flips on its own; this assertion keeps the corrected field visible
 * either way, so the screen is correct whether or not the engine compares it yet.
 */
export function deadlineAssertion(
  baseRules: readonly { id: string; deadline_minutes: number | null }[],
  nextRules: readonly { id: string; deadline_minutes: number | null }[],
  ruleId: string,
  expected: number,
): DeadlineAssertion {
  const before = baseRules.find((r) => r.id === ruleId)?.deadline_minutes ?? null;
  const after = nextRules.find((r) => r.id === ruleId)?.deadline_minutes ?? null;
  return {
    ruleId,
    field: CORRECTION_FIELD,
    expected,
    before,
    after,
    oldPass: before === expected,
    newPass: after === expected,
  };
}

// ---------------------------------------------------------------------------
// Step 5 — shadow mode
// ---------------------------------------------------------------------------

/**
 * Replay every closed incident (the pill's eval cases are past incidents) through
 * the approved and the shadow version, side by side.
 */
export function simulateShadowRuns(
  approved: Pill,
  shadow: Pill,
  cases: readonly EvalCase[],
  at: string = new Date().toISOString(),
): ShadowRun[] {
  return cases.map((c) => {
    const onApproved = evaluate(approved, c.asset, c.incident, c.evidence).actions;
    const onShadow = evaluate(shadow, c.asset, c.incident, c.evidence).actions;
    return makeShadowRun(c.id, onApproved, onShadow, at);
  });
}

// ---------------------------------------------------------------------------
// Roles + plain-English governance
// ---------------------------------------------------------------------------

/** Roles that appear on this screen: author, steward, approver, plus bystanders. */
export const GOVERNANCE_ROLES = [
  "chief_engineer",
  "asset_operations_manager",
  "head_technical_services",
  "technician",
  "executive",
] as const;

const EXTRA_ROLE_LABELS: Record<string, string> = {
  chief_engineer: "Chief Engineer",
  head_technical_services: "Head of Technical Services",
  duty_lew: "Duty LEW",
  dc_critical_facilities_manager: "DC Critical Facilities Manager",
  technical_services_lead: "Technical Services Lead",
};

/** Display name for a role id — roles.json labels plus the pill RACI roles. */
export function roleDisplayName(role: string): string {
  return EXTRA_ROLE_LABELS[role] ?? roleLabel(role);
}

/**
 * Make an approval blocker readable: swap raw role ids for role names and add
 * the next step the human can take.
 */
export function explainBlocker(blocker: string, approverRole: string): string {
  const readable = blocker.replace(/\b[a-z_]{4,}\b/g, (word) =>
    GOVERNANCE_ROLES.includes(word as (typeof GOVERNANCE_ROLES)[number])
      ? roleDisplayName(word)
      : word,
  );
  if (/Separation of duties/i.test(blocker)) {
    return `${readable}. Switch role to ${roleDisplayName(approverRole)} to approve.`;
  }
  if (/is not authorised/i.test(blocker)) {
    return `${readable}. Switch role to ${roleDisplayName(approverRole)}.`;
  }
  if (/eval regression/i.test(blocker)) {
    return `${readable}. Record the reason below and use “Override & approve”.`;
  }
  if (/No eval report/i.test(blocker)) {
    return `${readable} — replay the evals in step 4 first.`;
  }
  return readable;
}
