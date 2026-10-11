// Keystone governance — role / sensitivity policy, sourced from data/roles.json.
// Pure + client-safe (static JSON import, validated with the data schema).

import rolesJson from "@/data/roles.json";
import {
  rolesSchema,
  type ApprovalGrant,
  type RoleDefinition,
  type SensitivityLevel,
} from "@/lib/data/schemas";

export const ROLES: readonly RoleDefinition[] = rolesSchema.parse(rolesJson);

export const SENSITIVITY_LEVELS: readonly SensitivityLevel[] = ["public", "internal", "tenant_pii", "commercial"];

/** Action classes a human can approve (must_escalate is never approved in place — it routes to a named human). */
export type ApprovableActionClass = "requires_approval";

/** Governance capability a role holds, derived from its roles.json `can_approve` grants. */
export type GovernanceCapability =
  | "approve_requires_approval_actions"
  | "approve_tenant_message"
  | "promote_pill_version"
  | "rollback_pill";

const GRANT_CAPABILITY: Record<ApprovalGrant, GovernanceCapability> = {
  "requires_approval actions": "approve_requires_approval_actions",
  "tenant message draft before send": "approve_tenant_message",
  "pill shadow-to-approved promotion (steward sign-off)": "promote_pill_version",
  "pill version promotion (final approver for commercial-sensitivity pills)": "promote_pill_version",
  rollback: "rollback_pill",
};

export function getRole(role: string): RoleDefinition | undefined {
  return ROLES.find((r) => r.role === role);
}

/**
 * Demo personas — the named human behind each role, straight from
 * data/roles.json `person` (one source of truth; no names live in code).
 */
export const DEMO_PERSONAS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(ROLES.map((r) => [r.role, r.person])),
);

/** The named persona acting in a role. Every role the app references is in roles.json. */
export function personaFor(role: string): { name: string; role: string } {
  const person = DEMO_PERSONAS[role];
  if (person === undefined) throw new Error(`Role "${role}" is not defined in data/roles.json`);
  return { name: person, role };
}

export function isKnownRole(role: string): boolean {
  return getRole(role) !== undefined;
}

/**
 * Role used for policy decisions before the signed session's role is known
 * (SSR + first client render, or no session). It is in no roles.json entry, so
 * every policy check fails closed: public data only, no grants.
 */
export const UNRESOLVED_ROLE = "unresolved";

/**
 * Canonical identity key for a person's name: Unicode-normalised (NFKC, so
 * full-width / compatibility forms fold), zero-width characters removed,
 * whitespace collapsed, case-folded. Separation of duties compares these keys,
 * never raw display strings, so " priya  NAIR" is the same human as "Priya Nair".
 */
export function identityKey(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en");
}

export function sameIdentity(a: string, b: string): boolean {
  return identityKey(a) === identityKey(b);
}

/**
 * The actor before the signed session's identity is bound (SSR, first client
 * render, or no session). No persona, no grants, public data only.
 */
export const UNRESOLVED_ACTOR: Readonly<{ name: string; role: string }> = Object.freeze({
  name: "",
  role: UNRESOLVED_ROLE,
});

// ---------------------------------------------------------------------------
// Human decisions on incident actions / tenant messages
// ---------------------------------------------------------------------------

export type DecisionOutcome = "approved" | "rejected" | "escalated" | "evidence_requested";

/** What a decision is about: an engine action, or an outbound tenant-message draft. */
export type DecisionSubject = { kind: "action" } | { kind: "tenant_message"; approverRole: string };

export interface DecisionAuthority {
  allowed: boolean;
  /** Why not, when not allowed. */
  reason?: string;
}

/**
 * May `role` record `outcome` on `subject`? The single policy both the UI
 * buttons and the governance store enforce (roles.json grants):
 * - approve / reject an engine action → the requires_approval grant;
 * - escalate → can_escalate;
 * - request evidence → any defined role working the incident;
 * - approve / reject a tenant message → the draft's named approver role,
 *   holding the tenant-message grant. Tenant messages are never escalated
 *   or evidence-requested through this path.
 */
export function decisionAuthority(
  role: string,
  outcome: DecisionOutcome,
  subject: DecisionSubject = { kind: "action" },
): DecisionAuthority {
  const who = roleLabel(role);
  if (!isKnownRole(role)) return { allowed: false, reason: `Role "${role}" is not defined in roles.json` };

  if (subject.kind === "tenant_message") {
    if (outcome !== "approved" && outcome !== "rejected") {
      return { allowed: false, reason: `Tenant messages can only be approved or rejected, not ${outcome}` };
    }
    if (role !== subject.approverRole) {
      return { allowed: false, reason: `Requires ${roleLabel(subject.approverRole)} approval — you are ${who}.` };
    }
    if (!hasCapability(role, "approve_tenant_message")) {
      return { allowed: false, reason: `${who} has no tenant-message approval grant.` };
    }
    return { allowed: true };
  }

  switch (outcome) {
    case "approved":
    case "rejected":
      return hasCapability(role, "approve_requires_approval_actions")
        ? { allowed: true }
        : { allowed: false, reason: `${who} has no approval grant for requires-approval actions.` };
    case "escalated":
      return canEscalate(role) ? { allowed: true } : { allowed: false, reason: `${who} cannot escalate.` };
    case "evidence_requested":
      return { allowed: true };
  }
}

export function roleLabel(role: string): string {
  return getRole(role)?.label ?? role;
}

/**
 * Display form of a role id: "Person · Role label" (e.g. "Muhammad Hafiz ·
 * Technical Services Lead"). Never throws — a role without a persona renders
 * as its label alone.
 */
export function personaLabel(role: string): string {
  const person = DEMO_PERSONAS[role];
  const label = roleLabel(role);
  return person === undefined ? label : `${person} · ${label}`;
}

/**
 * Sensitivity levels a role may see unmasked. Roles not defined in
 * roles.json fail closed to `public` only.
 */
export function visibleSensitivities(role: string): SensitivityLevel[] {
  return getRole(role)?.sensitivity_levels_visible ?? ["public"];
}

export function canSee(role: string, level: SensitivityLevel): boolean {
  return visibleSensitivities(role).includes(level);
}

export function capabilities(role: string): GovernanceCapability[] {
  const grants = getRole(role)?.can_approve ?? [];
  return [...new Set(grants.map((g) => GRANT_CAPABILITY[g]))];
}

export function hasCapability(role: string, capability: GovernanceCapability): boolean {
  return capabilities(role).includes(capability);
}

/** Action classes this role may approve in the incident room. */
export function approvableActionClasses(role: string): ApprovableActionClass[] {
  return hasCapability(role, "approve_requires_approval_actions") ? ["requires_approval"] : [];
}

export function canEscalate(role: string): boolean {
  return getRole(role)?.can_escalate ?? false;
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

export function maskPlaceholder(level: SensitivityLevel): string {
  return level === "tenant_pii" ? "[masked: tenant PII]" : `[masked: ${level}]`;
}

/** Keys kept on a masked record so the UI can still render the row (when/what/where-from). */
const RECORD_METADATA_KEYS = new Set(["id", "at", "source", "type", "sensitivity", "rule_id"]);

/** JSON-ish value after redaction: any leaf may have been replaced by a mask string. */
export type Redacted<T> = T extends null | undefined
  ? T
  : T extends string
    ? string
    : T extends number | boolean
      ? T | string
      : T extends readonly (infer U)[]
        ? Redacted<U>[]
        : T extends object
          ? { [K in keyof T]: Redacted<T[K]> }
          : T;

function isSensitivity(value: unknown): value is SensitivityLevel {
  return typeof value === "string" && (SENSITIVITY_LEVELS as readonly string[]).includes(value);
}

function maskAll(value: unknown, placeholder: string): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => maskAll(v, placeholder));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = maskAll(v, placeholder);
    return out;
  }
  return placeholder;
}

function redactValue(value: unknown, role: string, inherited: SensitivityLevel): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redactValue(v, role, inherited));
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    // A record's own `sensitivity` label (timeline events, affected_tenant,
    // affected_client, rules, drafts…) governs everything inside it.
    const level = isSensitivity(record.sensitivity) ? record.sensitivity : inherited;
    if (!canSee(role, level)) {
      const placeholder = maskPlaceholder(level);
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(record)) {
        out[k] = RECORD_METADATA_KEYS.has(k) ? v : maskAll(v, placeholder);
      }
      return out;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) out[k] = redactValue(v, role, level);
    return out;
  }
  return canSee(role, inherited) ? value : maskPlaceholder(inherited);
}

/**
 * Redact evidence / incident records / text for a role.
 *
 * Objects are classified by their own `sensitivity` label (the authoritative
 * signal in data/ and rules.yaml); nested values inherit the nearest label.
 * A record above the role's clearance keeps only its metadata keys
 * (id/at/source/type/sensitivity/rule_id) and has every other leaf masked.
 * Plain text has no label of its own, so pass the label of where it came from.
 */
export function redact<T>(value: T, role: string, sensitivity: SensitivityLevel = "internal"): Redacted<T> {
  return redactValue(value, role, sensitivity) as Redacted<T>;
}

export function redactText(text: string, role: string, sensitivity: SensitivityLevel): string {
  return canSee(role, sensitivity) ? text : maskPlaceholder(sensitivity);
}
