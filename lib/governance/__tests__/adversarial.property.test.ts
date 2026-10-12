// Adversarial property tests for governance: random action sequences against
// the real store, name-variant attacks on separation of duties, and the
// invariants every published state must satisfy.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Regression } from "@/lib/engine";
import {
  decisionAuthority,
  identityKey,
  ROLES,
  sameIdentity,
  UNRESOLVED_ROLE,
  type DecisionOutcome,
  type DecisionSubject,
} from "../access";
import { canApprove } from "../approval";
import { peerGate, type CaptureTask } from "@/lib/capture";
import { parseGovernanceSnapshot } from "../snapshot";
import {
  createGovernanceStore,
  GovernanceError,
  memoryStorage,
  type GovernanceData,
  type GovernanceStore,
} from "../store";
import { compareSemver, proposeVersion, seedVersion, type PillVersion } from "../versions";
import { CE, HTS, PILL_ID, pill, rule } from "./fixtures";

const ROLE_IDS = ROLES.map((r) => r.role);
const clock = () => "2026-10-11T08:00:00.000Z";
const REGRESSION: Regression = {
  caseId: "c1",
  ruleId: "TS-03",
  field: "status",
  expected: "allowed",
  oldActual: "allowed",
  newActual: "blocked",
};

// A second pill with the chilled-water-leak access block (technicians,
// FCC operators and the Duty LEW read-only) for the frontline-capture commands.
const CAP_PILL_ID = "capture-chilled-water-leak";
const CAP_POLICY = {
  owner: "chief_engineer",
  steward: "asset_operations_manager",
  approver: "head_technical_services",
  access: {
    roles_allowed: ["chief_engineer", "asset_operations_manager", "head_technical_services", "duty_facilities_manager", "technical_services_lead", "fire_safety_manager", "dc_critical_facilities_manager"],
    roles_read_only: ["technician", "security_fcc_operator", "duty_lew"],
  },
};
function capPill() {
  const p = pill();
  return { ...p, manifest: { ...p.manifest, access: { sensitivity_default: "internal" as const, ...CAP_POLICY.access } } };
}

function freshStore(): GovernanceStore {
  const store = createGovernanceStore(memoryStorage(), clock);
  store.getState().seedPills([{ id: PILL_ID, pill: pill() }]);
  store.getState().seedPills([{ id: CAP_PILL_ID, pill: capPill() }]);
  return store;
}

function dataOf(store: GovernanceStore): GovernanceData {
  const s = store.getState();
  return {
    currentActor: s.currentActor,
    versions: s.versions,
    seedVersions: s.seedVersions,
    audit: s.audit,
    decisions: s.decisions,
    shadowRuns: s.shadowRuns,
    evidenceConfirmations: s.evidenceConfirmations,
    outcomes: s.outcomes,
    ruleReviews: s.ruleReviews,
    captureTasks: s.captureTasks,
    voiceNotes: s.voiceNotes,
    draftsFromNotes: s.draftsFromNotes,
    peerConfirmations: s.peerConfirmations,
  };
}

// Frontline-capture fixtures.
const CAP_TRANSCRIPT = "AHU-23-01 drain pan overflow again. Wait 15 minutes then call Duty LEW, cannot anyhow reset the breaker lah.";
const CAP_TASKS: Omit<CaptureTask, "status" | "answeredBy" | "noteId">[] = [
  { id: "CT-A", kind: "gate_override", incidentId: "INC-2026-1011", assetId: "asset-hf1", ruleId: "TS-07", pillId: CAP_PILL_ID, createdAt: "2026-10-12T08:55:00+08:00", createdFor: "technician", prompt: "You overrode TS-07 — why?" },
  { id: "CT-B", kind: "job_closeout", incidentId: "INC-2026-1011", assetId: "asset-hf1", createdAt: "2026-10-12T08:56:00+08:00", createdFor: "technician", prompt: "Anything the next shift should know?" },
  { id: "CT-C", kind: "asset_qr", assetId: "AHU-23-01", createdAt: "2026-10-12T08:57:00+08:00", createdFor: "chief_engineer", prompt: "What is new on AHU-23-01?" },
  // Invalid: a gate task without its rule.
  { id: "CT-D", kind: "gate_blocked", incidentId: "INC-2026-1011", assetId: "asset-hf1", pillId: CAP_PILL_ID, createdAt: "2026-10-12T08:58:00+08:00", createdFor: "technician", prompt: "Blocked — why?" },
];
const CAP_DRAFT_RULE = rule("DRAFT-01", { decision: "Do not reset; call Duty LEW after 15 minutes" });

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const versionArb = fc.oneof(
  { weight: 4, arbitrary: fc.constantFrom("1.2.0", "1.3.0", "1.4.0", "1.5.0") },
  { weight: 1, arbitrary: fc.constantFrom("1.6.0", "9.9.9", "../1.2.0", "") },
);
const reasonArb = fc.constantFrom("", "   ", "​", "production regression", "ok");
const outcomeArb = fc.constantFrom<DecisionOutcome>("approved", "rejected", "escalated", "evidence_requested");
const subjectArb = fc.option(
  fc.record({
    kind: fc.constant("tenant_message" as const),
    approverRole: fc.constantFrom(...ROLE_IDS, "nobody"),
  }),
  { nil: undefined },
);

const noteIdArb = fc.constantFrom("VN-A", "VN-B", "VN-404");
const taskIdArb = fc.constantFrom("CT-A", "CT-B", "CT-C", "CT-404");
const capRuleIdArb = fc.constantFrom("TS-14", "TS-14", "DRAFT-01", "TS-01");

type Command =
  | { op: "setRole"; role: string }
  | { op: "propose"; base: string; deadline: number; reason: string }
  | { op: "promote"; version: string }
  | { op: "approve"; version: string; regressed: boolean; override: string | null }
  | { op: "rollback"; version: string; reason: string }
  | { op: "decide"; outcome: DecisionOutcome; subject: DecisionSubject | undefined }
  | { op: "reset" }
  // Frontline capture
  | { op: "createTask"; task: number }
  | { op: "recordNote"; id: string; task: string | undefined; consent: boolean; retainDays: number }
  | { op: "answerTask"; task: string; note: string }
  | { op: "dismissTask"; task: string; reason: string }
  | { op: "recordDrafts"; note: string; valid: boolean }
  | { op: "confirmChip"; note: string; index: number; answer: "yes" | "no" | "fix" }
  | { op: "amend"; note: string }
  | { op: "proposeFromNote"; note: string; ruleId: string }
  | { op: "peer"; version: string; ruleId: string; note: string | undefined; verdict: "confirm" | "dispute"; why: string | undefined }
  | { op: "promoteCap"; version: string };

// Weighted towards the roles that hold grants so approvals/rollbacks actually
// succeed often enough to be checked; every role (and non-roles) still appear.
const roleArb = fc.oneof(
  { weight: 3, arbitrary: fc.constantFrom("head_technical_services", "executive", "asset_operations_manager", "chief_engineer", "technician", "technical_services_lead") },
  { weight: 1, arbitrary: fc.constantFrom(...ROLE_IDS, "intruder", UNRESOLVED_ROLE) },
);

const commandArb: fc.Arbitrary<Command> = fc.oneof(
  { weight: 4, arbitrary: fc.record({ op: fc.constant("setRole" as const), role: roleArb }) },
  {
    weight: 3,
    arbitrary: fc.record({
      op: fc.constant("propose" as const),
      base: versionArb,
      deadline: fc.integer({ min: 1, max: 60 }),
      reason: reasonArb,
    }),
  },
  { weight: 2, arbitrary: fc.record({ op: fc.constant("promote" as const), version: versionArb }) },
  {
    weight: 4,
    arbitrary: fc.record({
      op: fc.constant("approve" as const),
      version: versionArb,
      regressed: fc.boolean(),
      override: fc.option(reasonArb, { nil: null }),
    }),
  },
  { weight: 2, arbitrary: fc.record({ op: fc.constant("rollback" as const), version: versionArb, reason: reasonArb }) },
  { weight: 2, arbitrary: fc.record({ op: fc.constant("decide" as const), outcome: outcomeArb, subject: subjectArb }) },
  { weight: 1, arbitrary: fc.constant({ op: "reset" as const }) },
  // Frontline capture
  { weight: 2, arbitrary: fc.record({ op: fc.constant("createTask" as const), task: fc.integer({ min: 0, max: CAP_TASKS.length - 1 }) }) },
  {
    weight: 3,
    arbitrary: fc.record({
      op: fc.constant("recordNote" as const),
      id: noteIdArb,
      task: fc.option(taskIdArb, { nil: undefined }),
      consent: fc.boolean(),
      retainDays: fc.constantFrom(0, 0, 10, 45),
    }),
  },
  { weight: 2, arbitrary: fc.record({ op: fc.constant("answerTask" as const), task: taskIdArb, note: noteIdArb }) },
  { weight: 1, arbitrary: fc.record({ op: fc.constant("dismissTask" as const), task: taskIdArb, reason: reasonArb }) },
  { weight: 3, arbitrary: fc.record({ op: fc.constant("recordDrafts" as const), note: noteIdArb, valid: fc.boolean() }) },
  {
    weight: 4,
    arbitrary: fc.record({
      op: fc.constant("confirmChip" as const),
      note: noteIdArb,
      index: fc.integer({ min: -1, max: 2 }),
      answer: fc.constantFrom<"yes" | "no" | "fix">("yes", "yes", "no", "fix"),
    }),
  },
  { weight: 1, arbitrary: fc.record({ op: fc.constant("amend" as const), note: noteIdArb }) },
  { weight: 3, arbitrary: fc.record({ op: fc.constant("proposeFromNote" as const), note: noteIdArb, ruleId: capRuleIdArb }) },
  {
    weight: 3,
    arbitrary: fc.record({
      op: fc.constant("peer" as const),
      version: versionArb,
      ruleId: capRuleIdArb,
      note: fc.option(noteIdArb, { nil: undefined }),
      verdict: fc.constantFrom<"confirm" | "dispute">("confirm", "confirm", "dispute"),
      why: fc.option(fc.constantFrom("too long", " "), { nil: undefined }),
    }),
  },
  { weight: 2, arbitrary: fc.record({ op: fc.constant("promoteCap" as const), version: versionArb }) },
);

/** A realistic start (proposal approved by a second human) so later commands meet a non-trivial history. */
const APPROVED_PREFIX: Command[] = [
  { op: "setRole", role: "chief_engineer" },
  { op: "propose", base: "1.2.0", deadline: 10, reason: "fix" },
  { op: "setRole", role: "asset_operations_manager" },
  { op: "promote", version: "1.3.0" },
  { op: "setRole", role: "head_technical_services" },
  { op: "approve", version: "1.3.0", regressed: false, override: null },
];
const sequenceArb = fc
  .tuple(fc.boolean(), fc.array(commandArb, { minLength: 1, maxLength: 40 }))
  .map(([prefixed, rest]) => (prefixed ? [...APPROVED_PREFIX, ...rest] : rest));

/**
 * A sequence that drives every privileged action to both outcomes. Run as an
 * explicit example before the random sequences, so the "really exercises both
 * outcomes" check below holds on every run instead of depending on the random
 * generator hitting rare preconditions (e.g. an empty proposal needs exactly the
 * base deadline, 15 of 1..60, with a non-blank reason).
 */
const BOTH_OUTCOMES: Command[] = [
  { op: "setRole", role: "chief_engineer" },
  { op: "propose", base: "1.2.0", deadline: 15, reason: "ok" }, // refused: rules unchanged
  { op: "propose", base: "1.2.0", deadline: 10, reason: "fix" }, // ok → 1.3.0 Draft
  { op: "setRole", role: "technician" },
  { op: "promote", version: "1.3.0" }, // refused: no promotion grant
  { op: "approve", version: "1.3.0", regressed: false, override: null }, // refused
  { op: "rollback", version: "1.2.0", reason: "x" }, // refused: no rollback grant
  { op: "decide", outcome: "approved", subject: undefined }, // refused: no approval grant
  { op: "setRole", role: "head_technical_services" },
  { op: "promote", version: "1.3.0" }, // ok → Shadow
  { op: "setRole", role: "executive" },
  { op: "approve", version: "1.3.0", regressed: false, override: null }, // ok
  { op: "rollback", version: "1.2.0", reason: "production regression" }, // ok
  { op: "setRole", role: "asset_operations_manager" },
  { op: "decide", outcome: "escalated", subject: undefined }, // ok
  { op: "reset" }, // ok
];

const CAPTURE_OPS: readonly string[] = ["createTask", "recordNote", "answerTask", "dismissTask", "recordDrafts", "confirmChip", "amend", "proposeFromNote", "peer", "promoteCap"];

/** Drives every frontline-capture action to both outcomes (see BOTH_OUTCOMES). */
const CAPTURE_BOTH_OUTCOMES: Command[] = [
  { op: "setRole", role: "technician" },
  { op: "createTask", task: 0 }, // ok
  { op: "createTask", task: 0 }, // refused: id exists
  { op: "recordNote", id: "VN-A", task: "CT-A", consent: false, retainDays: 0 }, // refused: no consent
  { op: "recordNote", id: "VN-A", task: "CT-A", consent: true, retainDays: 0 }, // ok
  { op: "recordDrafts", note: "VN-A", valid: false }, // refused: quote not verbatim
  { op: "recordDrafts", note: "VN-A", valid: true }, // ok
  { op: "confirmChip", note: "VN-A", index: 2, answer: "yes" }, // refused: no such chip
  { op: "confirmChip", note: "VN-A", index: 0, answer: "yes" }, // ok
  { op: "confirmChip", note: "VN-A", index: 1, answer: "yes" }, // ok
  { op: "answerTask", task: "CT-A", note: "VN-B" }, // refused: unknown note
  { op: "answerTask", task: "CT-A", note: "VN-A" }, // ok
  { op: "createTask", task: 1 }, // ok
  { op: "dismissTask", task: "CT-B", reason: " " }, // refused: no reason
  { op: "dismissTask", task: "CT-B", reason: "ok" }, // ok
  { op: "recordNote", id: "VN-B", task: undefined, consent: true, retainDays: 10 }, // ok
  { op: "recordDrafts", note: "VN-B", valid: true }, // ok
  { op: "amend", note: "VN-B" }, // refused: nothing corrected
  { op: "confirmChip", note: "VN-B", index: 0, answer: "fix" }, // ok (corrected)
  { op: "amend", note: "VN-B" }, // ok
  { op: "proposeFromNote", note: "VN-A", ruleId: "TS-14" }, // refused: technician is read-only
  { op: "setRole", role: "chief_engineer" },
  { op: "proposeFromNote", note: "VN-A", ruleId: "TS-14" }, // ok → capture pill v1.3.0
  { op: "setRole", role: "asset_operations_manager" },
  { op: "promoteCap", version: "1.3.0" }, // refused: peer gate
  { op: "setRole", role: "technician" },
  { op: "peer", version: "1.3.0", ruleId: "TS-14", note: undefined, verdict: "confirm", why: undefined }, // refused: speaker
  { op: "setRole", role: "technical_services_lead" },
  { op: "peer", version: "1.3.0", ruleId: "TS-14", note: undefined, verdict: "confirm", why: undefined }, // ok
  { op: "setRole", role: "asset_operations_manager" },
  { op: "promoteCap", version: "1.3.0" }, // ok
];

/** Run one command; returns whether it threw a policy refusal, a malformed-input error, or succeeded. */
function run(store: GovernanceStore, c: Command): "ok" | "refused" | "invalid" {
  const s = store.getState();
  try {
    switch (c.op) {
      case "setRole":
        s.setRole(c.role);
        break;
      case "propose":
        s.proposeVersion(PILL_ID, c.base, [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: c.deadline } }], c.reason);
        break;
      case "promote":
        s.promoteToShadow(PILL_ID, c.version);
        break;
      case "approve": {
        const check = s.approveVersion(
          PILL_ID,
          c.version,
          { regressions: c.regressed ? [REGRESSION] : [] },
          c.override === null ? undefined : { reason: c.override },
        );
        return check.allowed ? "ok" : "refused";
      }
      case "rollback":
        s.rollback(PILL_ID, c.version, c.reason);
        break;
      case "decide":
        s.decideAction({ incidentId: "INC-2026-1011", ruleId: "TS-07", outcome: c.outcome, subject: c.subject });
        break;
      case "reset":
        s.resetDemo();
        break;
      case "createTask":
        s.createCaptureTask(CAP_TASKS[c.task]);
        break;
      case "recordNote": {
        const recordedAt = "2026-10-12T09:00:00+08:00";
        s.recordVoiceNote({
          id: c.id,
          taskId: c.task,
          assetId: "AHU-23-01",
          recordedAt,
          durationSec: 18,
          transcript: CAP_TRANSCRIPT,
          transcriptSource: { provider: "fixture", model: "recorded", region: "on-device", languageHint: "en-SG" },
          consent: { noticeShownAt: "2026-10-12T08:59:40+08:00", recordingConsent: c.consent },
          audio:
            c.retainDays > 0
              ? { retained: true, expiresAt: new Date(Date.parse(recordedAt) + c.retainDays * 86_400_000).toISOString() }
              : { retained: false, expiresAt: null },
        });
        break;
      }
      case "answerTask":
        s.answerCaptureTask(c.task, c.note);
        break;
      case "dismissTask":
        s.dismissCaptureTask(c.task, c.reason);
        break;
      case "recordDrafts": {
        const t = s.voiceNotes[c.note]?.transcript ?? CAP_TRANSCRIPT;
        const start = t.indexOf("Wait");
        const end = t.indexOf("LEW") + 3;
        const text = c.valid ? t.slice(start, end) : "Wait 99 minutes";
        s.recordDraftsFromNote(c.note, [{ rule: CAP_DRAFT_RULE, quoteSpan: { start, end: start + text.length, text } }]);
        break;
      }
      case "confirmChip":
        s.confirmReadBack(
          c.note,
          "DRAFT-01",
          c.index,
          c.answer === "yes" ? { confirmed: true } : c.answer === "no" ? { confirmed: false } : { confirmed: true, correctedText: "50 minutes" },
        );
        break;
      case "amend":
        s.amendNoteFromReadBack(c.note, "DRAFT-01");
        break;
      case "proposeFromNote":
        s.proposeFromNote({ noteId: c.note, draftRuleId: "DRAFT-01", pillId: CAP_PILL_ID, ruleId: c.ruleId, reason: "Frontline close-out" });
        break;
      case "peer":
        s.peerConfirm({ pillId: CAP_PILL_ID, pillVersion: c.version, ruleId: c.ruleId, noteId: c.note, verdict: c.verdict, note: c.why });
        break;
      case "promoteCap":
        s.promoteToShadow(CAP_PILL_ID, c.version);
        break;
    }
    return "ok";
  } catch (err) {
    return err instanceof GovernanceError ? "refused" : "invalid";
  }
}

function assertInvariants(store: GovernanceStore): void {
  const data = dataOf(store);
  const history = data.versions[PILL_ID];
  // One Approved version at most; numbers strictly increasing in append order.
  expect(history.filter((v) => v.status === "Approved").length).toBeLessThanOrEqual(1);
  for (let i = 1; i < history.length; i++) {
    expect(compareSemver(history[i - 1].version, history[i].version)).toBeLessThan(0);
  }
  // Nobody approved their own (non-rollback) version; every approved version has an approver.
  for (const v of history.slice(1)) {
    if (v.status === "Approved" || v.status === "Retired") expect(v.approvedBy).toBeDefined();
    if (v.approvedBy && v.rollbackOf === undefined) {
      // Three different people: author, Shadow promoter, approver.
      expect(v.shadowedBy).toBeDefined();
      expect(new Set([v.createdBy.name, v.shadowedBy!.name, v.approvedBy.name].map(identityKey)).size).toBe(3);
    }
  }
  // A capture-derived version past Draft passed its peer gate (verdicts stop once it leaves Draft).
  for (const v of data.versions[CAP_PILL_ID]) {
    if (!v.capture) continue;
    expect(v.capture.author).toEqual(data.voiceNotes[v.capture.noteId]?.author);
    if (v.shadowedBy) {
      const gate = peerGate(data.peerConfirmations, { pillId: CAP_PILL_ID, pillVersion: v.version, ruleId: v.capture.ruleId, noteId: v.capture.noteId }, v.capture.author, CAP_POLICY);
      expect(gate.allowed).toBe(true);
    }
  }
  // Every stored note was recorded with consent; audio, if retained at all, for ≤ 30 days.
  for (const n of Object.values(data.voiceNotes)) {
    expect(n.consent.recordingConsent).toBe(true);
    if (n.audio.retained) expect(Date.parse(n.audio.expiresAt!) - Date.parse(n.recordedAt)).toBeLessThanOrEqual(30 * 86_400_000);
  }
  // Every proposed draft had every chip confirmed and none corrected (draftProposalReadiness).
  for (const v of data.versions[CAP_PILL_ID]) {
    const d = v.capture && data.draftsFromNotes[v.capture.noteId]?.find((x) => x.rule.id === v.capture!.draftRuleId);
    if (d) expect(d.readBack.every((c) => c.confirmed === true && c.correctedText === undefined)).toBe(true);
  }
  // Whatever the store publishes, its own snapshot validator accepts.
  const parsed = parseGovernanceSnapshot(JSON.parse(JSON.stringify(data)));
  expect(parsed.ok ? "ok" : parsed.reason).toBe("ok");
}

describe("governance store under random action sequences", () => {
  it("every action appends exactly one audit event (or throws on malformed input, changing nothing); audit is append-only; invariants hold", () => {
    const seen = { ok: new Set<string>(), refused: new Set<string>() };
    fc.assert(
      fc.property(sequenceArb, (commands) => {
        const store = freshStore();
        for (const c of commands) {
          const before = store.getState();
          const result = run(store, c);
          // A capture action always audits: it never fails without an event.
          // (promoteCap is the existing promoteToShadow: an unknown version stays malformed input.)
          if (CAPTURE_OPS.includes(c.op) && c.op !== "promoteCap") expect(result).not.toBe("invalid");
          if (result !== "invalid") seen[result].add(c.op);
          const after = store.getState();
          if (result === "invalid") {
            // Malformed input (unknown role / base version / empty reason): no state change at all.
            expect(after).toBe(before);
          } else if (c.op === "setRole" && before.currentActor.role === UNRESOLVED_ROLE) {
            // Binding the first (session) identity is session start, not a switch: not audited.
            expect(after.audit.length).toBe(before.audit.length);
          } else {
            expect(after.audit.length).toBe(before.audit.length + 1);
          }
          // Append-only: every earlier event is the very same frozen object.
          before.audit.forEach((e, i) => expect(after.audit[i]).toBe(e));
          assertInvariants(store);
        }
      }),
      { numRuns: 500, examples: [[BOTH_OUTCOMES], [CAPTURE_BOTH_OUTCOMES]] },
    );
    // Every privileged action really reaches both outcomes (guaranteed by BOTH_OUTCOMES).
    for (const op of ["propose", "promote", "approve", "rollback", "decide", "reset", "setRole"]) {
      expect(seen.ok.has(op), `${op} never succeeded`).toBe(true);
    }
    for (const op of ["propose", "promote", "approve", "rollback", "decide"]) {
      expect(seen.refused.has(op), `${op} never refused`).toBe(true);
    }
    // Frontline capture: guaranteed by CAPTURE_BOTH_OUTCOMES.
    for (const op of CAPTURE_OPS) {
      expect(seen.ok.has(op), `${op} never succeeded`).toBe(true);
      expect(seen.refused.has(op), `${op} never refused`).toBe(true);
    }
    // 500 random sequences take ~6 s when the whole suite runs in parallel; the 5 s default flakes.
  }, 30_000);

  it("an approval succeeds only for an authorised human who neither wrote nor shadowed a Shadow version from the live base — and a regression override only for the pill's approver with a non-blank reason", () => {
    fc.assert(
      fc.property(sequenceArb, (commands) => {
        const store = freshStore();
        for (const c of commands) {
          const before = store.getState();
          const target = before.versions[PILL_ID].find((v) => v.version === (c as { version?: string }).version);
          const live = before.versions[PILL_ID].find((v) => v.status === "Approved");
          const result = run(store, c);
          if (c.op !== "approve" || result !== "ok") continue;
          const actor = before.currentActor;
          expect(target).toBeDefined();
          expect(target!.status).toBe("Shadow");
          expect(sameIdentity(actor.name, target!.createdBy.name)).toBe(false);
          expect(sameIdentity(actor.name, target!.shadowedBy!.name)).toBe(false);
          expect(target!.parentVersion).toBe(live?.version);
          if (c.regressed) {
            expect(actor.role).toBe(target!.approverRole);
            expect((c.override ?? "").trim().length).toBeGreaterThan(0);
          }
        }
      }),
      { numRuns: 300 },
    );
  });

  it("a decision is recorded only when the acting role holds the grant", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ROLE_IDS),
        outcomeArb,
        subjectArb,
        (role, outcome, subject) => {
          const store = freshStore();
          store.getState().setRole(role);
          const allowed = decisionAuthority(role, outcome, subject).allowed;
          const result = run(store, { op: "decide", outcome, subject });
          expect(result).toBe(allowed ? "ok" : "refused");
          const recorded = store.getState().decisions["INC-2026-1011"]?.["TS-07"];
          expect(recorded !== undefined).toBe(allowed);
          expect(store.getState().audit.at(-1)?.action).toBe(allowed ? `action_${outcome}` : "action_decision_blocked");
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Separation of duties vs. name variants
// ---------------------------------------------------------------------------

const ZERO_WIDTH = ["​", "‌", "‍", "⁠", "﻿"];

/** Same human, different bytes: case, whitespace, zero-width, full-width forms. */
function variantArb(name: string): fc.Arbitrary<string> {
  return fc
    .array(fc.constantFrom("upper", "lower", "fullwidth", "zw", "space", "pad", "nfd"), { minLength: 1, maxLength: 6 })
    .chain((ops) =>
      fc.integer({ min: 0, max: Math.max(0, name.length - 1) }).map((at) => {
        let out = name;
        for (const op of ops) {
          switch (op) {
            case "upper":
              out = out.toUpperCase();
              break;
            case "lower":
              out = out.toLowerCase();
              break;
            case "fullwidth":
              out = [...out]
                .map((ch) => {
                  const code = ch.charCodeAt(0);
                  return code >= 0x21 && code <= 0x7e ? String.fromCharCode(code + 0xfee0) : ch;
                })
                .join("");
              break;
            case "zw":
              out = out.slice(0, at) + ZERO_WIDTH[at % ZERO_WIDTH.length] + out.slice(at);
              break;
            case "space":
              out = out.replace(" ", "   \t ");
              break;
            case "pad":
              out = `  ${out}\n`;
              break;
            case "nfd":
              out = out.normalize("NFD");
              break;
          }
        }
        return out;
      }),
    );
}

describe("separation of duties", () => {
  const AT = "2026-10-11T08:00:00.000Z";
  const base = seedVersion(PILL_ID, pill(), { createdBy: CE, approvedBy: HTS }, AT);

  it("an author can never approve their own version under any spelling of their name", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ROLES.map((r) => r.person)),
        fc.constantFrom(...ROLE_IDS),
        fc.boolean(),
        (author, approverRole, shadow) =>
          fc.assert(
            fc.property(variantArb(author), (alias) => {
              const draft: PillVersion = {
                ...proposeVersion(base, [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], { name: author, role: "chief_engineer" }, "x", [base], AT),
                status: shadow ? "Shadow" : "Draft",
              };
              const check = canApprove(draft, { regressions: [] }, { name: alias, role: approverRole }, { reason: "ok" }, { trialRuns: 1 });
              expect(check.allowed).toBe(false);
              expect(check.blockers.some((b) => b.startsWith("Separation of duties"))).toBe(true);
            }),
            { numRuns: 20 },
          ),
      ),
      { numRuns: 40 },
    );
  });

  it("identityKey keeps distinct people distinct", () => {
    const keys = new Set(ROLES.map((r) => identityKey(r.person)));
    expect(keys.size).toBe(new Set(ROLES.map((r) => r.person)).size);
  });

  it("switching roles always acts as that role's persona — a name cannot be chosen", () => {
    const store = freshStore();
    for (const role of ROLE_IDS) {
      store.getState().setRole(role);
      expect(store.getState().currentActor).toEqual({ name: ROLES.find((r) => r.role === role)!.person, role });
    }
    expect(() => store.getState().setRole("intruder")).toThrow(/not defined/);
    expect(() => store.getState().setRole(UNRESOLVED_ROLE)).toThrow(/not defined/);
  });

  it("the author cannot approve by switching to another role they do not hold", () => {
    const store = freshStore();
    const s = () => store.getState();
    s().setRole("head_technical_services");
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 9 } }], "self-serve");
    s().setRole("asset_operations_manager");
    s().promoteToShadow(PILL_ID, "1.3.0");
    s().setRole("head_technical_services");
    // Same role → same human → blocked.
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(false);
    // Another authorised role is another human (the demo's role switch models a hand-off).
    s().setRole("executive");
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);
    expect(s().versions[PILL_ID].find((v) => v.version === "1.3.0")?.approvedBy?.name).not.toBe(
      s().versions[PILL_ID].find((v) => v.version === "1.3.0")?.createdBy.name,
    );
  });
});

// ---------------------------------------------------------------------------
// Targeted state-machine attacks
// ---------------------------------------------------------------------------

describe("version state machine", () => {
  /** 1.3.0 proposed by the Chief Engineer; with `shadow`, the steward puts it into Shadow. */
  function withDraft(shadow = false) {
    const store = freshStore();
    const s = () => store.getState();
    s().setRole("chief_engineer");
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], "fix");
    if (shadow) {
      s().setRole("asset_operations_manager");
      s().promoteToShadow(PILL_ID, "1.3.0");
      s().setRole("chief_engineer");
    }
    return { store, s };
  }

  it("approving an Approved, Retired or non-existent version is rejected and audited", () => {
    const { s } = withDraft(true);
    s().setRole("head_technical_services");
    for (const v of ["1.2.0", "7.7.7", "", "../../etc/passwd"]) {
      const n = s().audit.length;
      const check = s().approveVersion(PILL_ID, v, { regressions: [] });
      expect(check.allowed).toBe(false);
      expect(s().audit).toHaveLength(n + 1);
      expect(s().audit.at(-1)?.action).toBe("version_approval_blocked");
    }
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);
    // 1.2.0 is now Retired; 1.3.0 Approved — neither can be approved again.
    expect(s().approveVersion(PILL_ID, "1.2.0", { regressions: [] }).allowed).toBe(false);
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(false);
    expect(s().approveVersion("no-such-pill", "1.3.0", { regressions: [] }).allowed).toBe(false);
  });

  it("rollback to a Draft/Shadow or non-existent version is refused — never-approved rules cannot go live", () => {
    const { s } = withDraft();
    s().setRole("head_technical_services");
    expect(() => s().rollback(PILL_ID, "1.3.0", "sneak the draft live")).toThrow(/Draft/);
    s().setRole("chief_engineer");
    // (chief_engineer has no rollback grant either)
    expect(() => s().rollback(PILL_ID, "1.3.0", "x")).toThrow(GovernanceError);
    s().setRole("executive");
    s().promoteToShadow(PILL_ID, "1.3.0");
    expect(() => s().rollback(PILL_ID, "1.3.0", "sneak the shadow live")).toThrow(/Shadow/);
    expect(() => s().rollback(PILL_ID, "9.9.9", "x")).toThrow(/Unknown version/);
    expect(s().versions[PILL_ID].filter((v) => v.status === "Approved").map((v) => v.version)).toEqual(["1.2.0"]);
    expect(s().audit.at(-1)?.action).toBe("version_rollback_blocked");
  });

  it("a double rollback does not mint a duplicate version", () => {
    const { s } = withDraft(true);
    s().setRole("head_technical_services");
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);
    const restored = s().rollback(PILL_ID, "1.2.0", "regression in prod");
    expect(restored).toMatchObject({ version: "1.4.0", rollbackOf: "1.2.0", status: "Approved" });
    expect(() => s().rollback(PILL_ID, "1.2.0", "again")).toThrow(/nothing to roll back/);
    expect(() => s().rollback(PILL_ID, "1.4.0", "to itself")).toThrow(/already the approved/);
    expect(s().versions[PILL_ID].map((v) => `${v.version}:${v.status}`)).toEqual([
      "1.2.0:Retired",
      "1.3.0:Retired",
      "1.4.0:Approved",
    ]);
  });

  it("a regression override needs a non-blank reason AND the pill's approver role", () => {
    const { s } = withDraft(true);
    const regressed = { regressions: [REGRESSION] };
    // Asset Operations Manager may promote, but is not this pill's approver → cannot override.
    s().setRole("asset_operations_manager");
    expect(s().approveVersion(PILL_ID, "1.3.0", regressed, { reason: "trust me" }).allowed).toBe(false);
    s().setRole("head_technical_services");
    for (const reason of ["", "   ", "\n\t"]) {
      expect(s().approveVersion(PILL_ID, "1.3.0", regressed, { reason }).allowed).toBe(false);
    }
    const check = s().approveVersion(PILL_ID, "1.3.0", regressed, { reason: "accepted: case is obsolete" });
    expect(check).toMatchObject({ allowed: true, overridden: true });
    expect(s().audit.at(-1)).toMatchObject({ action: "version_approval_overridden", pillVersion: "1.3.0" });
  });

  it("a stale draft (proposed from a since-retired base) cannot be approved over the live version", () => {
    const { s } = withDraft(); // 1.3.0 from 1.2.0
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-02", patch: { deadline_minutes: 5 } }], "other fix"); // 1.4.0 from 1.2.0
    s().setRole("asset_operations_manager");
    s().promoteToShadow(PILL_ID, "1.3.0");
    s().promoteToShadow(PILL_ID, "1.4.0");
    s().setRole("head_technical_services");
    expect(s().approveVersion(PILL_ID, "1.4.0", { regressions: [] }).allowed).toBe(true);
    const stale = s().approveVersion(PILL_ID, "1.3.0", { regressions: [] });
    expect(stale.allowed).toBe(false);
    expect(stale.blockers.join(" ")).toMatch(/re-propose from v1\.4\.0/);
  });
});

describe("audit and state immutability", () => {
  it("returned arrays and objects cannot be mutated", () => {
    const store = freshStore();
    store.getState().setRole("asset_operations_manager");
    const { audit, versions, decisions } = store.getState();
    expect(() => (audit as unknown as unknown[]).push({})).toThrow(TypeError);
    expect(() => ((audit as unknown as unknown[]).length = 0)).toThrow(TypeError);
    expect(() => {
      (audit[0] as { detail: string }).detail = "rewritten";
    }).toThrow(TypeError);
    expect(() => versions[PILL_ID].push({ ...versions[PILL_ID][0], version: "9.0.0" })).toThrow(TypeError);
    expect(() => {
      (versions[PILL_ID][0] as { status: string }).status = "Retired";
    }).toThrow(TypeError);
    expect(() => {
      versions[PILL_ID][0].rules[0].action_class = "recommend";
    }).toThrow(TypeError);
    expect(() => {
      (decisions as Record<string, unknown>)["INC-X"] = {};
    }).toThrow(TypeError);
  });
});
