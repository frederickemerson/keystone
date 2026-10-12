// Keystone governance — validation of the persisted (localStorage) snapshot.
//
// The store persists to the browser, which the user fully controls: the JSON
// can be corrupted, from an older build, or hand-edited (an injected Approved
// version, a forged approver, deleted audit entries). On rehydrate the
// snapshot is parsed with zod AND checked against the governance invariants
// the store itself maintains; anything that fails is discarded, never
// half-trusted. This is a client-side demo store — it makes tampering
// visible and fail-closed, it does not make it impossible (production would
// enforce governance server-side).
//
// The acting identity is never read from the snapshot: it comes from the
// signed session (lib/auth). A `currentActor` left by an older build is ignored.

import { z } from "@/lib/zod";
import { ruleSchema } from "@/lib/engine";
import { isKnownRole, sameIdentity } from "./access";
import { AUDIT_ACTIONS, auditId, type AuditEvent } from "./audit";
import { compareSemver, type PillVersion } from "./versions";
import type { PersistedGovernanceData } from "./store";

const actorSchema = z.object({ name: z.string(), role: z.string() });

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

const pillVersionSchema = z.object({
  pillId: z.string().min(1),
  version: semverSchema,
  status: z.enum(["Draft", "Shadow", "Approved", "Retired"]),
  rules: z.array(ruleSchema),
  createdBy: actorSchema,
  createdAt: z.string(),
  shadowedBy: actorSchema.optional(),
  shadowedAt: z.string().optional(),
  approvedBy: actorSchema.optional(),
  approvedAt: z.string().optional(),
  reason: z.string(),
  parentVersion: semverSchema.nullable(),
  approverRole: z.string().min(1),
  rollbackOf: semverSchema.optional(),
});

const auditEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  actor: z.string(),
  role: z.string(),
  action: z.enum(AUDIT_ACTIONS),
  pillId: z.string().optional(),
  pillVersion: z.string().optional(),
  incidentId: z.string().optional(),
  ruleId: z.string().optional(),
  evidenceKey: z.string().optional(),
  detail: z.string(),
});

const decisionSchema = z.object({
  incidentId: z.string(),
  ruleId: z.string(),
  outcome: z.enum(["approved", "rejected", "escalated", "evidence_requested"]),
  actor: actorSchema,
  at: z.string(),
  note: z.string().optional(),
  requestedEvidence: z.array(z.string()).optional(),
  pillId: z.string().optional(),
  pillVersion: z.string().optional(),
});

const evidenceConfirmationSchema = z.object({
  incidentId: z.string(),
  key: z.string(),
  value: z.literal(true),
  eventId: z.string(),
  pillId: z.string(),
  pillVersion: z.string().optional(),
  actor: actorSchema,
  at: z.string(),
  suggestion: z.object({ model: z.string(), probability: z.number().min(0).max(1) }).optional(),
});

const shadowRunSchema = z.object({
  incidentId: z.string(),
  approvedDecision: z.record(z.string(), z.string()),
  shadowDecision: z.record(z.string(), z.string()),
  agree: z.boolean(),
  at: z.string(),
});

const outcomeSchema = z.object({
  incidentId: z.string(),
  pillId: z.string(),
  timeToIsolateMinutes: z.number().finite().min(0),
  tenantImpact: z.string(),
  costSgd: z.number().finite().min(0),
  causeConfirmed: z.string(),
  notes: z.string(),
  actor: actorSchema,
  at: z.string(),
});

const ruleReviewSchema = z.object({
  pillId: z.string(),
  pillVersion: semverSchema,
  ruleId: z.string(),
  outcome: z.enum(["confirmed", "edited", "rejected"]),
  decision: z.string().min(1).optional(),
  actor: actorSchema,
  at: z.string(),
});

const snapshotSchema = z.object({
  versions: z.record(z.string(), z.array(pillVersionSchema).min(1)),
  seedVersions: z.record(z.string(), z.array(pillVersionSchema).length(1)),
  audit: z.array(auditEventSchema),
  decisions: z.record(z.string(), z.record(z.string(), decisionSchema)),
  shadowRuns: z.record(z.string(), z.array(shadowRunSchema)),
  // Absent in snapshots written before evidence confirmation existed.
  evidenceConfirmations: z.record(z.string(), z.record(z.string(), evidenceConfirmationSchema)).default({}),
  outcomes: z.record(z.string(), outcomeSchema).default({}),
  ruleReviews: z.record(z.string(), z.record(z.string(), ruleReviewSchema)).default({}),
});

export type SnapshotResult = { ok: true; data: PersistedGovernanceData } | { ok: false; reason: string };

const DECISION_AUDIT: Record<string, string> = {
  approved: "action_approved",
  rejected: "action_rejected",
  escalated: "action_escalated",
  evidence_requested: "action_evidence_requested",
};

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Governance invariants over a structurally valid snapshot; returns the first violation. */
function violation(data: PersistedGovernanceData): string | null {
  // Audit: contiguous ids from AUD-00001 — a removed or reordered entry leaves a gap.
  const audit = data.audit;
  for (let i = 0; i < audit.length; i++) {
    if (audit[i].id !== auditId(i)) return `audit entry ${i + 1} has id ${audit[i].id}, expected ${auditId(i)}`;
  }
  // Only events since the last demo reset describe the current versions/decisions.
  const lastReset = audit.map((e) => e.action).lastIndexOf("demo_reset");
  const epoch: readonly AuditEvent[] = audit.slice(lastReset + 1);
  const hasEvent = (actions: readonly string[], match: Partial<AuditEvent>) =>
    epoch.some(
      (e) =>
        actions.includes(e.action) &&
        Object.entries(match).every(([k, v]) => e[k as keyof AuditEvent] === v),
    );

  const pillIds = Object.keys(data.versions);
  if (!sameJson([...pillIds].sort(), Object.keys(data.seedVersions).sort())) {
    return "versions and seedVersions cover different pills";
  }

  for (const pillId of pillIds) {
    const history: PillVersion[] = data.versions[pillId];
    const seed = data.seedVersions[pillId][0];
    // The baseline may since have been Retired; everything else is the seed's.
    if (!sameJson({ ...history[0], status: seed.status }, seed) || history[0].status === "Draft" || history[0].status === "Shadow") {
      return `${pillId}: baseline differs from its seed`;
    }
    if (history.filter((v) => v.status === "Approved").length > 1) return `${pillId}: more than one Approved version`;

    for (let i = 0; i < history.length; i++) {
      const v = history[i];
      if (v.pillId !== pillId) return `${pillId}: v${v.version} belongs to ${v.pillId}`;
      if (i > 0 && compareSemver(history[i - 1].version, v.version) >= 0) {
        return `${pillId}: version numbers not strictly increasing at v${v.version}`;
      }
      const wasApproved = v.status === "Approved" || v.status === "Retired";
      if (wasApproved && (!v.approvedBy || !v.approvedAt)) return `${pillId}: v${v.version} is ${v.status} with no approver`;
      if (!wasApproved && (v.approvedBy || v.approvedAt)) return `${pillId}: v${v.version} is ${v.status} but carries an approver`;
      if (i === 0) continue; // the seed baseline comes from the pill files

      if (v.rollbackOf !== undefined) {
        const source = history.slice(0, i).find((h) => h.version === v.rollbackOf);
        if (!source || !sameJson(source.rules, v.rules)) return `${pillId}: v${v.version} is not a faithful rollback`;
        if (v.shadowedBy) return `${pillId}: rollback v${v.version} claims a Shadow promoter`;
        // Separation of duties on rollback (approval.ts rollbackAuthority).
        const retired = history.slice(0, i).find((h) => h.version === v.parentVersion);
        for (const involved of [source, retired]) {
          if (!involved || involved.rollbackOf !== undefined) continue;
          const people = [involved.createdBy, involved.shadowedBy].filter((p) => p !== undefined);
          if (people.some((p) => sameIdentity(p.name, v.createdBy.name))) {
            return `${pillId}: rollback v${v.version} made by the author or Shadow promoter of v${involved.version}`;
          }
        }
        if (!hasEvent(["version_rolled_back"], { pillId, pillVersion: v.version })) {
          return `${pillId}: v${v.version} has no rollback audit event`;
        }
        continue;
      }

      // Three different people: author → Shadow promoter → approver.
      if (v.status === "Draft" && (v.shadowedBy || v.shadowedAt)) return `${pillId}: Draft v${v.version} carries a Shadow promoter`;
      if (v.status !== "Draft" && (!v.shadowedBy || !v.shadowedAt)) {
        return `${pillId}: v${v.version} is ${v.status} but never ran in Shadow`;
      }
      if (v.shadowedBy) {
        if (sameIdentity(v.shadowedBy.name, v.createdBy.name)) return `${pillId}: v${v.version} put into Shadow by its own author`;
        if (!hasEvent(["version_shadowed"], { pillId, pillVersion: v.version, actor: v.shadowedBy.name })) {
          return `${pillId}: v${v.version} has no Shadow audit event`;
        }
        if (v.approvedBy && sameIdentity(v.approvedBy.name, v.shadowedBy.name)) {
          return `${pillId}: v${v.version} approved by the person who put it into Shadow`;
        }
      }
      if (!history.slice(0, i).some((h) => h.version === v.parentVersion)) {
        return `${pillId}: v${v.version} has unknown parent v${v.parentVersion}`;
      }
      if (!hasEvent(["version_proposed"], { pillId, pillVersion: v.version })) {
        return `${pillId}: v${v.version} has no proposal audit event`;
      }
      if (v.approvedBy) {
        if (sameIdentity(v.approvedBy.name, v.createdBy.name)) {
          return `${pillId}: v${v.version} approved by its own author`;
        }
        if (!hasEvent(["version_approved", "version_approval_overridden"], { pillId, pillVersion: v.version })) {
          return `${pillId}: v${v.version} has no approval audit event`;
        }
      }
    }
  }

  for (const [incidentId, byRule] of Object.entries(data.decisions)) {
    for (const [ruleId, record] of Object.entries(byRule)) {
      if (record.incidentId !== incidentId || record.ruleId !== ruleId) return `decision ${incidentId}/${ruleId} is misfiled`;
      if (!isKnownRole(record.actor.role)) return `decision ${incidentId}/${ruleId} by undefined role`;
      if (!hasEvent([DECISION_AUDIT[record.outcome]], { incidentId, ruleId })) {
        return `decision ${incidentId}/${ruleId} has no audit event`;
      }
    }
  }

  for (const [incidentId, byKey] of Object.entries(data.evidenceConfirmations)) {
    for (const [key, record] of Object.entries(byKey)) {
      if (record.incidentId !== incidentId || record.key !== key) return `evidence confirmation ${incidentId}/${key} is misfiled`;
      if (!isKnownRole(record.actor.role)) return `evidence confirmation ${incidentId}/${key} by undefined role`;
      if (!hasEvent(["evidence_confirmed"], { incidentId, evidenceKey: key, role: record.actor.role })) {
        return `evidence confirmation ${incidentId}/${key} has no audit event`;
      }
    }
  }

  for (const [incidentId, record] of Object.entries(data.outcomes)) {
    if (record.incidentId !== incidentId) return `outcome ${incidentId} is misfiled`;
    if (!isKnownRole(record.actor.role)) return `outcome ${incidentId} by undefined role`;
    if (!data.versions[record.pillId]) return `outcome ${incidentId} for unknown pill ${record.pillId}`;
    if (!hasEvent(["outcome_recorded"], { incidentId, pillId: record.pillId, actor: record.actor.name })) {
      return `outcome ${incidentId} has no audit event`;
    }
  }

  for (const [key, byRule] of Object.entries(data.ruleReviews)) {
    const at = key.lastIndexOf("@");
    const pillId = key.slice(0, at);
    const version = data.versions[pillId]?.find((v) => v.version === key.slice(at + 1));
    if (!version) return `rule reviews for unknown version ${key}`;
    for (const [ruleId, record] of Object.entries(byRule)) {
      if (record.ruleId !== ruleId || record.pillId !== pillId || record.pillVersion !== version.version) {
        return `rule review ${key}/${ruleId} is misfiled`;
      }
      if (!version.rules.some((r) => r.id === ruleId)) return `rule review ${key}/${ruleId} for unknown rule`;
      if ((record.outcome === "edited") !== (record.decision !== undefined)) return `rule review ${key}/${ruleId} is malformed`;
      if (!isKnownRole(record.actor.role)) return `rule review ${key}/${ruleId} by undefined role`;
      if (!hasEvent(["rule_reviewed"], { pillId, pillVersion: version.version, ruleId, actor: record.actor.name })) {
        return `rule review ${key}/${ruleId} has no audit event`;
      }
    }
  }

  for (const key of Object.keys(data.shadowRuns)) {
    const at = key.lastIndexOf("@");
    const pillId = key.slice(0, at);
    const version = key.slice(at + 1);
    if (!data.versions[pillId]?.some((v) => v.version === version)) return `shadow runs for unknown version ${key}`;
  }

  return null;
}

const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** True when any own key at any depth could pollute a prototype on copy. */
function hasPrototypeKey(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  for (const key of Object.keys(value)) {
    if (PROTOTYPE_KEYS.has(key)) return true;
    if (hasPrototypeKey((value as Record<string, unknown>)[key])) return true;
  }
  return false;
}

/**
 * Parse an untrusted persisted snapshot. Returns frozen-audit governance data
 * only when it is structurally valid and satisfies every invariant.
 */
export function parseGovernanceSnapshot(raw: unknown): SnapshotResult {
  if (hasPrototypeKey(raw)) return { ok: false, reason: "prototype-polluting key in snapshot" };
  const parsed = snapshotSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, reason: `invalid shape at ${first?.path.join(".") || "(root)"}: ${first?.message ?? "?"}` };
  }
  const data = parsed.data as PersistedGovernanceData;
  const problem = violation(data);
  if (problem) return { ok: false, reason: problem };
  return {
    ok: true,
    data: { ...data, audit: Object.freeze(data.audit.map((e) => Object.freeze({ ...e }))) },
  };
}
