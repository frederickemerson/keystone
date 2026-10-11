// MOSAIC governance — append-only audit log.
// Pure + client-safe. There is deliberately no update or delete API: the only
// operation is appendAudit(), which returns a new log with one frozen event added.

export type AuditAction =
  | "role_switched"
  | "pill_seeded"
  | "version_proposed"
  | "version_shadowed"
  | "shadow_run_recorded"
  | "version_approved"
  | "version_approval_blocked"
  | "version_approval_overridden"
  | "version_rolled_back"
  | "action_approved"
  | "action_rejected"
  | "action_escalated"
  | "action_evidence_requested"
  | "demo_reset";

export interface AuditEvent {
  readonly id: string;
  /** ISO timestamp. */
  readonly at: string;
  /** Named human (or system) that acted. */
  readonly actor: string;
  readonly role: string;
  readonly action: AuditAction;
  readonly pillId?: string;
  readonly pillVersion?: string;
  readonly incidentId?: string;
  readonly ruleId?: string;
  readonly detail: string;
}

export type AuditLog = readonly AuditEvent[];

export type AuditInput = Omit<AuditEvent, "id" | "at"> & { at?: string };

export const EMPTY_AUDIT_LOG: AuditLog = Object.freeze([]);

/** Append one event. Never mutates `log`; returns a new frozen log. */
export function appendAudit(log: AuditLog, input: AuditInput): AuditLog {
  const at = input.at ?? new Date().toISOString();
  const event: AuditEvent = Object.freeze({
    ...input,
    at,
    id: `AUD-${String(log.length + 1).padStart(5, "0")}`,
  });
  return Object.freeze([...log, event]);
}

/** Read-side helper: events for a pill / incident, oldest first. */
export function auditFor(
  log: AuditLog,
  filter: { pillId?: string; incidentId?: string; ruleId?: string },
): AuditEvent[] {
  return log.filter(
    (e) =>
      (filter.pillId === undefined || e.pillId === filter.pillId) &&
      (filter.incidentId === undefined || e.incidentId === filter.incidentId) &&
      (filter.ruleId === undefined || e.ruleId === filter.ruleId),
  );
}
