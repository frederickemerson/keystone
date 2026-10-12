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
import { isDraftRuleId, ruleSchema } from "@/lib/engine";
import {
  captureTaskSchema,
  draftFromNoteSchema,
  peerConfirmationSchema,
  quoteMatchesNote,
  readBackMatchesExtraction,
  voiceNoteSchema,
} from "@/lib/capture";
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
  capture: z
    .object({
      noteId: z.string(),
      draftRuleId: z.string(),
      ruleId: z.string(),
      quoteSpan: z.object({ start: z.number().int().min(0), end: z.number().int().min(1), text: z.string().min(1) }),
      author: actorSchema,
    })
    .optional(),
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
  captureTaskId: z.string().optional(),
  noteId: z.string().optional(),
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
  // Frontline capture (store v4). Notes are strict: a persisted note holds the
  // transcript and retention metadata only — never an audio payload.
  captureTasks: z.record(z.string(), captureTaskSchema).default({}),
  voiceNotes: z.record(z.string(), voiceNoteSchema.strict()).default({}),
  draftsFromNotes: z.record(z.string(), z.array(draftFromNoteSchema)).default({}),
  peerConfirmations: z.array(peerConfirmationSchema).default([]),
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
      if (!hasEvent([v.capture ? "draft_from_note_proposed" : "version_proposed"], { pillId, pillVersion: v.version })) {
        return `${pillId}: v${v.version} has no proposal audit event`;
      }
      if (v.capture) {
        const problem = captureVersionViolation(data, v, hasEvent);
        if (problem) return `${pillId}: v${v.version} ${problem}`;
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

  const captureProblem = captureViolation(data, hasEvent);
  if (captureProblem) return captureProblem;

  for (const key of Object.keys(data.shadowRuns)) {
    const at = key.lastIndexOf("@");
    const pillId = key.slice(0, at);
    const version = key.slice(at + 1);
    if (!data.versions[pillId]?.some((v) => v.version === version)) return `shadow runs for unknown version ${key}`;
  }

  return null;
}

type HasEvent = (actions: readonly string[], match: Partial<AuditEvent>) => boolean;

/** Invariants of a version proposed from a voice note (PillVersion.capture). */
function captureVersionViolation(data: PersistedGovernanceData, v: PillVersion, hasEvent: HasEvent): string | null {
  const c = v.capture!;
  if (v.rollbackOf !== undefined) return "is a rollback that claims a voice-note source";
  const note = Object.hasOwn(data.voiceNotes, c.noteId) ? data.voiceNotes[c.noteId] : undefined;
  if (!note) return `came from unknown voice note ${c.noteId}`;
  if (!isDraftRuleId(c.draftRuleId) || isDraftRuleId(c.ruleId)) return "has a malformed capture rule id";
  if (!v.rules.some((r) => r.id === c.ruleId)) return `does not contain its captured rule ${c.ruleId}`;
  if (c.author.name !== note.author.name || c.author.role !== note.author.role) return `credits the wrong author for ${c.noteId}`;
  if (!quoteMatchesNote({ noteId: c.noteId, quoteSpan: c.quoteSpan }, note)) return `quote is not a verbatim span of ${c.noteId}`;
  if (!hasEvent(["draft_from_note_proposed"], { pillId: v.pillId, pillVersion: v.version, noteId: c.noteId, ruleId: c.ruleId })) {
    return "has no draft-from-note audit event";
  }
  // Past Draft, the peer gate was passed: at least one confirm by someone other
  // than the speaker is on record. (Role eligibility needs the pill's access
  // block, which is never persisted; the store checks it at promotion time.)
  if (v.shadowedBy) {
    const confirmed = data.peerConfirmations.some(
      (p) =>
        p.pillId === v.pillId &&
        p.pillVersion === v.version &&
        p.ruleId === c.ruleId &&
        p.noteId === c.noteId &&
        p.verdict === "confirm" &&
        !sameIdentity(p.confirmer.name, note.author.name),
    );
    if (!confirmed) return "entered Shadow without a peer confirmation";
  }
  return null;
}

/** Invariants of the frontline-capture state; returns the first violation. */
function captureViolation(data: PersistedGovernanceData, hasEvent: HasEvent): string | null {
  for (const [id, task] of Object.entries(data.captureTasks)) {
    if (task.id !== id) return `capture task ${id} is misfiled`;
    if (!hasEvent(["capture_task_created"], { captureTaskId: id })) return `capture task ${id} has no audit event`;
    if (task.status === "answered") {
      const note = Object.hasOwn(data.voiceNotes, task.noteId!) ? data.voiceNotes[task.noteId!] : undefined;
      if (!note || note.taskId !== id) return `capture task ${id} is answered by a note that is not its own`;
      if (!sameIdentity(note.author.name, task.answeredBy!.name)) return `capture task ${id} answered by someone other than the speaker`;
      if (task.answeredBy!.role !== task.createdFor) return `capture task ${id} answered by the wrong role`;
      if (!hasEvent(["capture_task_answered"], { captureTaskId: id, noteId: note.id, actor: task.answeredBy!.name })) {
        return `capture task ${id} has no answer audit event`;
      }
    }
    if (task.status === "dismissed") {
      if (task.answeredBy!.role !== task.createdFor) return `capture task ${id} dismissed by the wrong role`;
      if (!hasEvent(["capture_task_dismissed"], { captureTaskId: id, actor: task.answeredBy!.name })) {
        return `capture task ${id} has no dismissal audit event`;
      }
    }
  }

  for (const [id, note] of Object.entries(data.voiceNotes)) {
    if (note.id !== id) return `voice note ${id} is misfiled`;
    if (!hasEvent(["voice_note_recorded"], { noteId: id, actor: note.author.name, role: note.author.role })) {
      return `voice note ${id} has no audit event`;
    }
    if (note.taskId !== undefined && !Object.hasOwn(data.captureTasks, note.taskId)) return `voice note ${id} names unknown task ${note.taskId}`;
    if (note.amendedFrom !== undefined && !hasEvent(["voice_note_amended"], { noteId: id, actor: note.author.name })) {
      return `voice note ${id} was amended without an audit event`;
    }
  }

  for (const [noteId, drafts] of Object.entries(data.draftsFromNotes)) {
    const note = Object.hasOwn(data.voiceNotes, noteId) ? data.voiceNotes[noteId] : undefined;
    if (!note) return `drafts for unknown voice note ${noteId}`;
    if (!hasEvent(["drafts_from_note_recorded"], { noteId, actor: note.author.name })) return `drafts of ${noteId} have no audit event`;
    const ids = new Set<string>();
    for (const d of drafts) {
      const where = `draft ${noteId}/${d.rule.id}`;
      if (d.noteId !== noteId) return `${where} is misfiled`;
      if (ids.has(d.rule.id)) return `${where} appears twice`;
      ids.add(d.rule.id);
      if (!quoteMatchesNote(d, note)) return `${where} quote is not a verbatim span of its note`;
      if (!readBackMatchesExtraction(d.readBack, note, d.quoteSpan)) return `${where} read-back chips do not match the transcript`;
      // Each answered chip took one read-back event by the speaker.
      const answered = d.readBack.filter((c) => c.confirmed !== null).length;
      const events = data.audit.filter(
        (e) =>
          (e.action === "readback_confirmed" || e.action === "readback_corrected") &&
          e.noteId === noteId &&
          e.ruleId === d.rule.id &&
          e.actor === note.author.name,
      ).length;
      if (answered > events) return `${where} has read-back answers with no audit event`;
    }
  }

  for (const [i, p] of data.peerConfirmations.entries()) {
    const where = `peer confirmation ${i + 1}`;
    if (!isKnownRole(p.confirmer.role)) return `${where} by undefined role`;
    if (!data.versions[p.pillId]?.some((v) => v.version === p.pillVersion)) return `${where} for unknown version ${p.pillId}@${p.pillVersion}`;
    if (p.noteId === undefined || !Object.hasOwn(data.voiceNotes, p.noteId)) return `${where} for unknown voice note`;
    if (sameIdentity(p.confirmer.name, data.voiceNotes[p.noteId].author.name)) return `${where} by the speaker`;
    const action = p.verdict === "confirm" ? "peer_confirmed" : "peer_disputed";
    if (!hasEvent([action], { pillId: p.pillId, pillVersion: p.pillVersion, ruleId: p.ruleId, actor: p.confirmer.name })) {
      return `${where} has no audit event`;
    }
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
