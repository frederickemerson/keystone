// Store-level tests for the frontline-capture actions (lib/capture
// CaptureStoreActions): every action, every refusal, and the one-audit-event
// rule; the peer gate on promoteToShadow; snapshot validation of capture state.

import { beforeEach, describe, expect, it } from "vitest";
import { readBackForDraft, type CaptureTask, type VoiceNoteInput } from "@/lib/capture";
import type { AuditAction } from "../audit";
import { parseGovernanceSnapshot } from "../snapshot";
import {
  createGovernanceStore,
  GOVERNANCE_STORE_VERSION,
  GovernanceError,
  memoryStorage,
  type GovernanceStore,
  type PersistedGovernanceData,
} from "../store";
import { PILL_ID, pill, rule } from "./fixtures";

const clock = () => "2026-10-12T01:00:00.000Z";

/** The chilled-water-leak access block: technicians, FCC operators and the Duty LEW are read-only; technicians may peer-confirm. */
function cwlPill() {
  const p = pill();
  return {
    ...p,
    manifest: {
      ...p.manifest,
      access: {
        sensitivity_default: "internal" as const,
        roles_allowed: [
          "chief_engineer",
          "asset_operations_manager",
          "head_technical_services",
          "duty_facilities_manager",
          "technical_services_lead",
          "fire_safety_manager",
          "dc_critical_facilities_manager",
        ],
        roles_read_only: ["technician", "senior_technician", "security_fcc_operator", "duty_lew"],
        roles_peer_confirm: ["technician", "senior_technician"],
      },
    },
  };
}

const TRANSCRIPT =
  "AHU-23-01 drain pan overflow again. Wait 15 minutes then call Duty LEW, cannot anyhow reset the breaker lah.";
const QUOTE = "Wait 15 minutes then call Duty LEW";
const Q_START = TRANSCRIPT.indexOf(QUOTE);
const QUOTE_SPAN = { start: Q_START, end: Q_START + QUOTE.length, text: QUOTE };

const TASK: Omit<CaptureTask, "status" | "answeredBy" | "noteId"> = {
  id: "CT-INC-2026-1011-TS-07",
  kind: "gate_override",
  incidentId: "INC-2026-1011",
  assetId: "asset-hf1",
  ruleId: "TS-07",
  pillId: PILL_ID,
  createdAt: "2026-10-12T08:55:00+08:00",
  createdFor: "technician",
  prompt: "You overrode TS-07 — why? 15 s voice",
};

function noteInput(over: Partial<VoiceNoteInput> = {}): Omit<VoiceNoteInput, "author"> {
  return {
    id: "VN-0001",
    taskId: TASK.id,
    assetId: "AHU-23-01",
    recordedAt: "2026-10-12T09:00:00+08:00",
    durationSec: 18,
    transcript: TRANSCRIPT,
    transcriptSource: { provider: "web_speech", model: "chrome-webspeech", region: "browser-vendor", languageHint: "en-SG" },
    consent: { noticeShownAt: "2026-10-12T08:59:40+08:00", recordingConsent: true },
    ...over,
  };
}

const DRAFT_RULE = rule("DRAFT-01", { decision: "Do not reset; call Duty LEW after 15 minutes" });

function setup(): GovernanceStore {
  const store = createGovernanceStore(memoryStorage(), clock);
  store.getState().seedPills([{ id: PILL_ID, pill: cwlPill() }]);
  return store;
}

let store: GovernanceStore;
const s = () => store.getState();

/** Run `fn`, assert it appended exactly one audit event with `action`; returns fn's result (or the error). */
function oneEvent<T>(action: AuditAction, fn: () => T): T | GovernanceError {
  const before = s().audit.length;
  let out: T | GovernanceError;
  try {
    out = fn();
  } catch (err) {
    expect(err).toBeInstanceOf(GovernanceError);
    out = err as GovernanceError;
  }
  expect(s().audit.length).toBe(before + 1);
  expect(s().audit.at(-1)?.action).toBe(action);
  return out;
}

/** Expect a refusal: one `…_blocked` event, a GovernanceError whose message matches. */
function refused(action: AuditAction, fn: () => unknown, message?: RegExp): void {
  const out = oneEvent(action, fn);
  expect(out).toBeInstanceOf(GovernanceError);
  if (message) expect((out as Error).message).toMatch(message);
}

/** Technician records a note for the open task, then drafts from it. */
function withNoteAndDraft() {
  s().setRole("technician");
  s().createCaptureTask(TASK);
  s().recordVoiceNote(noteInput());
  s().recordDraftsFromNote("VN-0001", [{ rule: DRAFT_RULE, quoteSpan: QUOTE_SPAN }]);
}

function confirmAllChips() {
  const n = s().draftsFromNotes["VN-0001"][0].readBack.length;
  for (let i = 0; i < n; i++) s().confirmReadBack("VN-0001", "DRAFT-01", i, { confirmed: true });
}

/** Up to a Draft version 1.3.0 (CE proposes Rajesh's draft as TS-14). */
function proposed() {
  withNoteAndDraft();
  confirmAllChips();
  s().setRole("chief_engineer");
  return s().proposeFromNote({ noteId: "VN-0001", draftRuleId: "DRAFT-01", pillId: PILL_ID, ruleId: "TS-14", reason: "Frontline close-out" });
}

function persisted(): PersistedGovernanceData {
  const st = s();
  return JSON.parse(
    JSON.stringify({
      versions: st.versions,
      seedVersions: st.seedVersions,
      audit: st.audit,
      decisions: st.decisions,
      shadowRuns: st.shadowRuns,
      evidenceConfirmations: st.evidenceConfirmations,
      outcomes: st.outcomes,
      ruleReviews: st.ruleReviews,
      captureTasks: st.captureTasks,
      voiceNotes: st.voiceNotes,
      draftsFromNotes: st.draftsFromNotes,
      peerConfirmations: st.peerConfirmations,
    }),
  );
}

beforeEach(() => {
  store = setup();
});

// ---------------------------------------------------------------------------

describe("createCaptureTask", () => {
  it("opens a task as the signed-in actor, audited once", () => {
    s().setRole("technician");
    const t = oneEvent("capture_task_created", () => s().createCaptureTask(TASK));
    expect(t).toMatchObject({ id: TASK.id, status: "open" });
    expect(s().captureTasks[TASK.id].status).toBe("open");
    expect(s().audit.at(-1)).toMatchObject({ captureTaskId: TASK.id, incidentId: "INC-2026-1011", ruleId: "TS-07", actor: "Rajesh Kumar" });
  });

  it("does not duplicate an open question and does not reuse an id", () => {
    s().setRole("technician");
    s().createCaptureTask(TASK);
    refused("capture_task_blocked", () => s().createCaptureTask({ ...TASK, id: "CT-AGAIN" }), /still open/);
    refused("capture_task_blocked", () => s().createCaptureTask({ ...TASK, kind: "gate_blocked" }), /already exists/);
    expect(Object.keys(s().captureTasks)).toEqual([TASK.id]);
    // A different kind on the same rule is a different question.
    s().createCaptureTask({ ...TASK, id: "CT-BLOCK", kind: "gate_blocked" });
  });

  it("refuses an invalid task or no signed-in identity, audited", () => {
    refused("capture_task_blocked", () => s().createCaptureTask(TASK), /sign in/);
    s().setRole("technician");
    refused("capture_task_blocked", () => s().createCaptureTask({ ...TASK, ruleId: undefined }), /ruleId/);
    refused("capture_task_blocked", () => s().createCaptureTask({ ...TASK, assetId: "NOT-A-TAG" }), /assetId/);
    refused("capture_task_blocked", () => s().createCaptureTask({ ...TASK, createdFor: "intruder" }), /createdFor/);
    // Status/answer fields from the caller are ignored: a task is always created open.
    const t = s().createCaptureTask({ ...TASK, status: "answered", noteId: "VN-9" } as never);
    expect(t.status).toBe("open");
    expect(t.noteId).toBeUndefined();
  });
});

describe("recordVoiceNote", () => {
  beforeEach(() => {
    s().setRole("technician");
    s().createCaptureTask(TASK);
  });

  it("stores the transcript authored by the signed-in actor; audio is never kept; detail has no transcript", () => {
    const n = oneEvent("voice_note_recorded", () =>
      s().recordVoiceNote({ ...noteInput(), author: { name: "Someone Else", role: "executive" }, audioBlob: "UklGRg==" } as never),
    );
    expect(n).toMatchObject({ id: "VN-0001", author: { name: "Rajesh Kumar", role: "technician" } });
    expect(s().voiceNotes["VN-0001"]).not.toHaveProperty("audioBlob");
    expect(s().voiceNotes["VN-0001"].audio).toEqual({ retained: false, expiresAt: null });
    expect(s().voiceNotes["VN-0001"].consent.namedCredit).toBe(false);
    const ev = s().audit.at(-1)!;
    expect(ev).toMatchObject({ noteId: "VN-0001", captureTaskId: TASK.id });
    expect(ev.detail).toMatch(/web_speech\/chrome-webspeech @ browser-vendor/);
    expect(ev.detail).not.toMatch(/drain|breaker|minutes/);
  });

  it("enforces consent and PDPA retention, audited as voice_note_blocked", () => {
    refused("voice_note_blocked", () => s().recordVoiceNote(noteInput({ consent: { noticeShownAt: "2026-10-12T08:59:40+08:00", recordingConsent: false } })), /consent/);
    refused("voice_note_blocked", () => s().recordVoiceNote(noteInput({ consent: { noticeShownAt: "2026-10-12T09:01:00+08:00", recordingConsent: true } })), /notice/);
    refused("voice_note_blocked", () => s().recordVoiceNote(noteInput({ audio: { retained: true, expiresAt: "2026-12-01T00:00:00+08:00" } })), /30 days/);
    refused("voice_note_blocked", () => s().recordVoiceNote(noteInput({ audio: { retained: true, expiresAt: null } })), /expiry/);
    refused("voice_note_blocked", () => s().recordVoiceNote(noteInput({ durationSec: 121 })));
    refused("voice_note_blocked", () => s().recordVoiceNote(noteInput({ amendedFrom: "x" })), /amend/);
    for (const e of s().audit.filter((x) => x.action === "voice_note_blocked")) expect(e.detail).not.toMatch(/drain|breaker/);
    expect(s().voiceNotes).toEqual({});
    // Retention within 30 days is fine.
    s().recordVoiceNote(noteInput({ audio: { retained: true, expiresAt: "2026-10-20T09:00:00+08:00" } }));
  });

  it("binds a note to its task only for the task's role, on the task's site", () => {
    refused("voice_note_blocked", () => s().recordVoiceNote(noteInput({ taskId: "CT-NOPE" })), /Unknown task/);
    refused("voice_note_blocked", () => s().recordVoiceNote(noteInput({ assetId: "AHU-L2-01" })), /site/);
    s().setRole("chief_engineer");
    refused("voice_note_blocked", () => s().recordVoiceNote(noteInput()), /addressed to/);
    s().setRole("technician");
    s().recordVoiceNote(noteInput());
    refused("voice_note_blocked", () => s().recordVoiceNote(noteInput()), /already exists/);
    // A note without a task (e.g. close-out) is fine.
    s().recordVoiceNote(noteInput({ id: "VN-0002", taskId: undefined }));
  });

  it("refuses without a signed-in identity", () => {
    store = setup();
    refused("voice_note_blocked", () => s().recordVoiceNote(noteInput({ taskId: undefined })), /sign in/);
  });
});

describe("answerCaptureTask / dismissCaptureTask", () => {
  beforeEach(() => {
    s().setRole("technician");
    s().createCaptureTask(TASK);
    s().recordVoiceNote(noteInput());
    s().recordVoiceNote(noteInput({ id: "VN-0002", taskId: undefined }));
  });

  it("answers with the speaker's own note for this task", () => {
    s().setRole("chief_engineer");
    refused("capture_task_blocked", () => s().answerCaptureTask(TASK.id, "VN-0001"), /addressed to/);
    s().setRole("technician");
    refused("capture_task_blocked", () => s().answerCaptureTask(TASK.id, "VN-0002"), /not recorded for task/);
    refused("capture_task_blocked", () => s().answerCaptureTask(TASK.id, "VN-9999"), /Unknown voice note/);
    refused("capture_task_blocked", () => s().answerCaptureTask("CT-NOPE", "VN-0001"), /Unknown task/);
    const t = oneEvent("capture_task_answered", () => s().answerCaptureTask(TASK.id, "VN-0001"));
    expect(t).toMatchObject({ status: "answered", noteId: "VN-0001", answeredBy: { name: "Rajesh Kumar" } });
    refused("capture_task_blocked", () => s().answerCaptureTask(TASK.id, "VN-0001"), /already answered/);
    refused("capture_task_blocked", () => s().dismissCaptureTask(TASK.id, "n/a"), /already answered/);
  });

  it("dismisses with a reason, by the task's role only", () => {
    refused("capture_task_blocked", () => s().dismissCaptureTask(TASK.id, "   "), /reason/);
    s().setRole("asset_operations_manager");
    refused("capture_task_blocked", () => s().dismissCaptureTask(TASK.id, "not mine"), /addressed to/);
    s().setRole("technician");
    const t = oneEvent("capture_task_dismissed", () => s().dismissCaptureTask(TASK.id, "Override was a drill"));
    expect(t).toMatchObject({ status: "dismissed", answeredBy: { name: "Rajesh Kumar" } });
    expect(t).not.toHaveProperty("noteId");
    expect(s().audit.at(-1)?.detail).toBe(`Dismissed ${TASK.id}: Override was a drill`);
    // Once dismissed, the same question may be asked again.
    s().createCaptureTask({ ...TASK, id: "CT-AGAIN" });
  });
});

describe("recordDraftsFromNote", () => {
  beforeEach(() => {
    s().setRole("technician");
    s().createCaptureTask(TASK);
    s().recordVoiceNote(noteInput());
  });

  it("stores drafts with the store's own deterministic chips (client chips ignored)", () => {
    const drafts = oneEvent("drafts_from_note_recorded", () =>
      s().recordDraftsFromNote("VN-0001", [
        { rule: DRAFT_RULE, quoteSpan: QUOTE_SPAN, readBack: [{ kind: "number", text: "W", spanStart: Q_START, spanEnd: Q_START + 1, confirmed: true }] } as never,
      ]),
    );
    expect(Array.isArray(drafts)).toBe(true);
    const [d] = s().draftsFromNotes["VN-0001"];
    expect(d.readBack.map((c) => [c.kind, c.text, c.confirmed])).toEqual([
      ["time", "15 minutes", null],
      ["role", "Duty LEW", null],
    ]);
    expect(d.readBack).toEqual(readBackForDraft(s().voiceNotes["VN-0001"], QUOTE_SPAN));
  });

  it("refuses a non-verbatim quote, a non-DRAFT id, duplicates and other people", () => {
    refused("draft_from_note_blocked", () => s().recordDraftsFromNote("VN-0001", [{ rule: DRAFT_RULE, quoteSpan: { ...QUOTE_SPAN, text: QUOTE.toUpperCase() } }]), /verbatim/);
    refused("draft_from_note_blocked", () => s().recordDraftsFromNote("VN-0001", [{ rule: rule("TS-14"), quoteSpan: QUOTE_SPAN }]), /DRAFT-/);
    refused("draft_from_note_blocked", () =>
      s().recordDraftsFromNote("VN-0001", [
        { rule: DRAFT_RULE, quoteSpan: QUOTE_SPAN },
        { rule: DRAFT_RULE, quoteSpan: QUOTE_SPAN },
      ]),
    /twice/);
    refused("draft_from_note_blocked", () => s().recordDraftsFromNote("VN-9", []), /Unknown voice note/);
    s().setRole("chief_engineer");
    refused("draft_from_note_blocked", () => s().recordDraftsFromNote("VN-0001", []), /Only Rajesh Kumar/);
    expect(s().draftsFromNotes).toEqual({});
  });
});

describe("confirmReadBack", () => {
  beforeEach(withNoteAndDraft);

  it("only the speaker answers chips; each answer is one event without transcript text", () => {
    s().setRole("technical_services_lead");
    refused("readback_blocked", () => s().confirmReadBack("VN-0001", "DRAFT-01", 0, { confirmed: true }), /speaker/);
    s().setRole("technician");
    refused("readback_blocked", () => s().confirmReadBack("VN-0001", "DRAFT-01", 5, { confirmed: true }), /No read-back item/);
    refused("readback_blocked", () => s().confirmReadBack("VN-0001", "DRAFT-09", 0, { confirmed: true }), /No draft/);
    refused("readback_blocked", () => s().confirmReadBack("VN-0001", "DRAFT-01", 0, { confirmed: false, correctedText: "x" }), /confirms/);
    const d = oneEvent("readback_confirmed", () => s().confirmReadBack("VN-0001", "DRAFT-01", 0, { confirmed: true }));
    expect((d as { readBack: { confirmed: boolean | null }[] }).readBack.map((c) => c.confirmed)).toEqual([true, null]);
    expect(s().audit.at(-1)?.detail).toBe("Chip 1/2 (time) of DRAFT-01 on VN-0001 confirmed");
    oneEvent("readback_corrected", () => s().confirmReadBack("VN-0001", "DRAFT-01", 1, { confirmed: false }));
    oneEvent("readback_corrected", () => s().confirmReadBack("VN-0001", "DRAFT-01", 1, { confirmed: true, correctedText: "Duty FM" }));
    expect(s().audit.at(-1)?.detail).not.toMatch(/Duty/);
  });
});

describe("amendNoteFromReadBack", () => {
  beforeEach(withNoteAndDraft);

  it("applies the corrections, keeps the first transcript, and clears the drafts for re-extraction", () => {
    refused("voice_note_blocked", () => s().amendNoteFromReadBack("VN-0001", "DRAFT-01"), /no corrected chip/);
    s().confirmReadBack("VN-0001", "DRAFT-01", 0, { confirmed: true, correctedText: "50 minutes" });
    s().setRole("chief_engineer");
    refused("voice_note_blocked", () => s().amendNoteFromReadBack("VN-0001", "DRAFT-01"), /Only Rajesh Kumar/);
    s().setRole("technician");
    const n = oneEvent("voice_note_amended", () => s().amendNoteFromReadBack("VN-0001", "DRAFT-01"));
    expect(n).toMatchObject({ transcript: TRANSCRIPT.replace("15 minutes", "50 minutes"), amendedFrom: TRANSCRIPT });
    expect(s().draftsFromNotes["VN-0001"]).toBeUndefined();
    expect(s().audit.at(-1)?.detail).not.toMatch(/50 minutes|drain/);
    // Re-extracted drafts quote the corrected transcript; chips are fresh.
    const quote = QUOTE.replace("15", "50");
    s().recordDraftsFromNote("VN-0001", [{ rule: DRAFT_RULE, quoteSpan: { start: Q_START, end: Q_START + quote.length, text: quote } }]);
    expect(s().draftsFromNotes["VN-0001"][0].readBack.every((c) => c.confirmed === null)).toBe(true);
    expect(parseGovernanceSnapshot(persisted())).toMatchObject({ ok: true });
  });
});

describe("proposeFromNote", () => {
  beforeEach(withNoteAndDraft);
  const input = { noteId: "VN-0001", draftRuleId: "DRAFT-01", pillId: PILL_ID, ruleId: "TS-14", reason: "Frontline close-out" };

  it("refuses until every chip is confirmed", () => {
    s().setRole("chief_engineer");
    refused("draft_from_note_blocked", () => s().proposeFromNote(input), /Confirm every read-back chip/);
    expect(s().versions[PILL_ID]).toHaveLength(1);
  });

  it("refuses a corrected (un-amended) draft", () => {
    s().confirmReadBack("VN-0001", "DRAFT-01", 0, { confirmed: true, correctedText: "50 minutes" });
    s().confirmReadBack("VN-0001", "DRAFT-01", 1, { confirmed: true });
    s().setRole("chief_engineer");
    refused("draft_from_note_blocked", () => s().proposeFromNote(input), /amend the note/);
  });

  it("proposes a Draft version with a real rule id and capture provenance, as ONE audit event", () => {
    confirmAllChips();
    s().setRole("chief_engineer");
    refused("draft_from_note_blocked", () => s().proposeFromNote({ ...input, ruleId: "DRAFT-01" }), /real rule id/);
    refused("draft_from_note_blocked", () => s().proposeFromNote({ ...input, ruleId: "TS-01" }), /already exists/);
    refused("draft_from_note_blocked", () => s().proposeFromNote({ ...input, reason: " " }), /reason/);
    refused("draft_from_note_blocked", () => s().proposeFromNote({ ...input, pillId: "nope" }), /Unknown pill/);
    const v = oneEvent("draft_from_note_proposed", () => s().proposeFromNote(input));
    expect(v).toMatchObject({
      version: "1.3.0",
      status: "Draft",
      createdBy: { name: "Tan Wei Ming" },
      capture: { noteId: "VN-0001", draftRuleId: "DRAFT-01", ruleId: "TS-14", quoteSpan: QUOTE_SPAN, author: { name: "Rajesh Kumar", role: "technician" } },
    });
    const rules = s().versions[PILL_ID][1].rules;
    expect(rules.map((r) => r.id)).toEqual(["TS-01", "TS-02", "TS-03", "TS-14"]);
    expect(rules.at(-1)?.decision).toBe(DRAFT_RULE.decision);
    expect(s().audit.at(-1)).toMatchObject({ pillId: PILL_ID, pillVersion: "1.3.0", noteId: "VN-0001", ruleId: "TS-14" });
    // The draft keeps its DRAFT- id; it cannot be proposed twice, nor its chips changed.
    expect(s().draftsFromNotes["VN-0001"][0].rule.id).toBe("DRAFT-01");
    refused("draft_from_note_blocked", () => s().proposeFromNote({ ...input, ruleId: "TS-15" }), /already proposed/);
    s().setRole("technician");
    refused("readback_blocked", () => s().confirmReadBack("VN-0001", "DRAFT-01", 0, { confirmed: false }), /already proposed/);
    refused("voice_note_blocked", () => s().amendNoteFromReadBack("VN-0001", "DRAFT-01"));
  });

  it("a second draft from the same note proposes alongside the first (stale-base checks guard approval)", () => {
    store = setup();
    s().setRole("technician");
    s().createCaptureTask(TASK);
    s().recordVoiceNote(noteInput());
    s().recordDraftsFromNote("VN-0001", [
      { rule: DRAFT_RULE, quoteSpan: QUOTE_SPAN },
      { rule: { ...DRAFT_RULE, id: "DRAFT-02", title: "Second rule from the same note" }, quoteSpan: QUOTE_SPAN },
    ]);
    for (const d of s().draftsFromNotes["VN-0001"]) {
      d.readBack.forEach((_, i) => s().confirmReadBack("VN-0001", d.rule.id, i, { confirmed: true }));
    }
    s().setRole("chief_engineer");
    s().proposeFromNote(input);
    const second = oneEvent("draft_from_note_proposed", () =>
      s().proposeFromNote({ ...input, draftRuleId: "DRAFT-02", ruleId: "TS-15" }),
    );
    expect(second).toMatchObject({ version: "1.4.0", parentVersion: "1.2.0", capture: { draftRuleId: "DRAFT-02" } });
  });

  it("goes through the pill's edit policy: a read-only technician cannot propose", () => {
    confirmAllChips();
    refused("draft_from_note_blocked", () => s().proposeFromNote(input), /read-only/);
  });
});

describe("peerConfirm and the Shadow peer gate", () => {
  beforeEach(() => {
    proposed();
  });
  const target = { pillId: PILL_ID, pillVersion: "1.3.0", ruleId: "TS-14" };

  it("refuses the speaker, read-only roles, roles outside the pill, and a dispute without a note", () => {
    s().setRole("technician");
    refused("peer_confirm_blocked", () => s().peerConfirm({ ...target, verdict: "confirm" }), /someone else/);
    s().setRole("duty_lew");
    refused("peer_confirm_blocked", () => s().peerConfirm({ ...target, verdict: "confirm" }), /read-only/);
    s().setRole("executive");
    refused("peer_confirm_blocked", () => s().peerConfirm({ ...target, verdict: "confirm" }), /roles_allowed/);
    s().setRole("technical_services_lead");
    refused("peer_confirm_blocked", () => s().peerConfirm({ ...target, verdict: "dispute" }), /what is wrong/);
    refused("peer_confirm_blocked", () => s().peerConfirm({ ...target, ruleId: "TS-01", verdict: "confirm" }), /not proposed from a voice note/);
    refused("peer_confirm_blocked", () => s().peerConfirm({ ...target, pillVersion: "1.2.0", verdict: "confirm" }), /not proposed from a voice note/);
    refused("peer_confirm_blocked", () => s().peerConfirm({ ...target, noteId: "VN-0002", verdict: "confirm" }), /came from VN-0001/);
    refused("peer_confirm_blocked", () => s().peerConfirm({ ...target, pillVersion: "9.9.9", verdict: "confirm" }), /Unknown version/);
    expect(s().peerConfirmations).toEqual([]);
  });

  it("a fellow technician peer-confirms without edit rights, and that satisfies the gate", () => {
    s().setRole("senior_technician");
    refused("version_proposal_blocked", () => s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], "x"), /read-only/);
    const c = oneEvent("peer_confirmed", () => s().peerConfirm({ ...target, verdict: "confirm" }));
    expect(c).toMatchObject({ confirmer: { name: "Siti Rahmah", role: "senior_technician" } });
    s().setRole("asset_operations_manager");
    oneEvent("version_shadowed", () => s().promoteToShadow(PILL_ID, "1.3.0"));
  });

  it("Shadow needs one eligible confirm and no outstanding dispute (refusals audited with the gate's reason)", () => {
    s().setRole("asset_operations_manager");
    refused("version_shadow_blocked", () => s().promoteToShadow(PILL_ID, "1.3.0"), /Peer gate: Needs one peer confirmation/);
    expect(s().audit.at(-1)).toMatchObject({ ruleId: "TS-14", noteId: "VN-0001" });

    s().setRole("technical_services_lead");
    const c = oneEvent("peer_confirmed", () => s().peerConfirm({ ...target, verdict: "confirm" }));
    expect(c).toMatchObject({ confirmer: { name: "Muhammad Hafiz" }, noteId: "VN-0001", at: clock() });
    // The proposer already vouched for the rule: their verdict is not an independent peer's.
    s().setRole("chief_engineer");
    refused("peer_confirm_blocked", () => s().peerConfirm({ ...target, verdict: "confirm" }), /proposed this version/);
    s().setRole("asset_operations_manager");
    oneEvent("peer_disputed", () => s().peerConfirm({ ...target, verdict: "dispute", note: "15 min is too long for a tripped DB" }));

    refused("version_shadow_blocked", () => s().promoteToShadow(PILL_ID, "1.3.0"), /Disputed by Priya Nair/);
    s().peerConfirm({ ...target, verdict: "confirm" }); // latest verdict counts
    oneEvent("version_shadowed", () => s().promoteToShadow(PILL_ID, "1.3.0"));
    expect(s().versions[PILL_ID][1]).toMatchObject({ status: "Shadow", shadowedBy: { name: "Priya Nair" } });

    // Peer review is over once it left Draft.
    s().setRole("technical_services_lead");
    refused("peer_confirm_blocked", () => s().peerConfirm({ ...target, verdict: "confirm" }), /while it is a Draft/);

    // The rest of the pipeline is unchanged: a third person approves.
    s().setRole("head_technical_services");
    expect(s().approveVersion(PILL_ID, "1.3.0", { regressions: [] }).allowed).toBe(true);
    expect(parseGovernanceSnapshot(persisted())).toMatchObject({ ok: true });
  });

  it("a peer verdict on a DRAFT- tile is recorded against the note but does not satisfy the gate", () => {
    s().setRole("technical_services_lead");
    refused("peer_confirm_blocked", () => s().peerConfirm({ ...target, pillVersion: "1.2.0", ruleId: "DRAFT-01", verdict: "confirm" }), /needs the voice note/);
    oneEvent("peer_confirmed", () => s().peerConfirm({ ...target, pillVersion: "1.2.0", ruleId: "DRAFT-01", noteId: "VN-0001", verdict: "confirm" }));
    s().setRole("asset_operations_manager");
    refused("version_shadow_blocked", () => s().promoteToShadow(PILL_ID, "1.3.0"), /Peer gate/);
  });

  it("versions not from a voice note are promoted exactly as before", () => {
    s().setRole("chief_engineer");
    s().proposeVersion(PILL_ID, "1.2.0", [{ op: "update", ruleId: "TS-03", patch: { deadline_minutes: 10 } }], "fix");
    s().setRole("asset_operations_manager");
    oneEvent("version_shadowed", () => s().promoteToShadow(PILL_ID, "1.4.0"));
  });

  it("resetDemo clears capture state", () => {
    s().resetDemo();
    expect(s()).toMatchObject({ captureTasks: {}, voiceNotes: {}, draftsFromNotes: {}, peerConfirmations: [] });
    expect(parseGovernanceSnapshot(persisted())).toMatchObject({ ok: true });
  });
});

// ---------------------------------------------------------------------------

describe("persisted capture state", () => {
  /** A fresh store driven to: task answered, v1.3.0 from the note peer-confirmed and in Shadow. */
  function full() {
    store = setup();
    proposed();
    s().setRole("technician");
    s().answerCaptureTask(TASK.id, "VN-0001");
    s().setRole("technical_services_lead");
    s().peerConfirm({ pillId: PILL_ID, pillVersion: "1.3.0", ruleId: "TS-14", verdict: "confirm" });
    s().setRole("asset_operations_manager");
    s().promoteToShadow(PILL_ID, "1.3.0");
    return persisted();
  }
  const reject = (data: PersistedGovernanceData, reason: RegExp) => {
    const r = parseGovernanceSnapshot(data);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(reason);
  };

  it("is store version 4 and round-trips through rehydration", () => {
    expect(GOVERNANCE_STORE_VERSION).toBe(4);
    const storage = memoryStorage();
    store = createGovernanceStore(storage, clock);
    s().seedPills([{ id: PILL_ID, pill: cwlPill() }]);
    proposed();
    s().setRole("technician");
    s().answerCaptureTask(TASK.id, "VN-0001");
    s().setRole("technical_services_lead");
    s().peerConfirm({ pillId: PILL_ID, pillVersion: "1.3.0", ruleId: "TS-14", verdict: "confirm" });
    const b = createGovernanceStore(storage, clock);
    expect(b.getState().voiceNotes["VN-0001"].transcript).toBe(TRANSCRIPT);
    expect(b.getState().versions[PILL_ID][1].capture?.ruleId).toBe("TS-14");
    expect(b.getState().peerConfirmations).toHaveLength(1);
    expect(b.getState().captureTasks[TASK.id].status).toBe("answered");
  });

  it("rejects a note carrying audio", () => {
    const d = full();
    (d.voiceNotes["VN-0001"] as Record<string, unknown>).audioBase64 = "UklGRg==";
    reject(d, /voiceNotes/);
  });

  it("rejects a note without consent or with over-long retention", () => {
    const d = full();
    d.voiceNotes["VN-0001"].consent.recordingConsent = false;
    reject(d, /consent/);
    const e = full();
    e.voiceNotes["VN-0001"].audio = { retained: true, expiresAt: "2027-01-01T00:00:00Z" };
    reject(e, /30 days/);
  });

  it("rejects an edited transcript (quotes no longer verbatim)", () => {
    const d = full();
    d.voiceNotes["VN-0001"].transcript = TRANSCRIPT.replace("15", "50");
    reject(d, /quote is not a verbatim span/);
  });

  it("rejects tampered read-back chips", () => {
    const d = full();
    d.draftsFromNotes["VN-0001"][0].readBack[0].canonical = "PT50M";
    reject(d, /read-back chips do not match/);
    const e = full();
    e.draftsFromNotes["VN-0001"][0].readBack.pop();
    reject(e, /read-back chips do not match/);
  });

  it("rejects chip answers that were never audited", () => {
    s().setRole("technician");
    s().createCaptureTask(TASK);
    s().recordVoiceNote(noteInput());
    s().recordDraftsFromNote("VN-0001", [{ rule: DRAFT_RULE, quoteSpan: QUOTE_SPAN }]);
    const d = persisted();
    d.draftsFromNotes["VN-0001"][0].readBack[0].confirmed = true;
    reject(d, /no audit event/);
  });

  it("rejects a forged peer confirmation, a speaker self-confirming, and a Shadow version without one", () => {
    const d = full();
    d.peerConfirmations.push({ ...d.peerConfirmations[0], confirmer: { name: "Priya Nair", role: "asset_operations_manager" } });
    reject(d, /peer confirmation 2 has no audit event/);
    // Shadowed: the version check sees no valid peer confirm.
    const e = full();
    e.peerConfirmations[0].confirmer = { name: "Rajesh Kumar", role: "technician" };
    reject(e, /entered Shadow without a peer confirmation/);
    // Still Draft: the confirmation itself is rejected.
    store = setup();
    proposed();
    s().setRole("technical_services_lead");
    s().peerConfirm({ pillId: PILL_ID, pillVersion: "1.3.0", ruleId: "TS-14", verdict: "confirm" });
    const draft = persisted();
    draft.peerConfirmations[0].confirmer = { name: " rajesh  KUMAR ", role: "technician" };
    reject(draft, /by the speaker/);
    const f = full();
    f.peerConfirmations = [];
    reject(f, /entered Shadow without a peer confirmation/);
  });

  it("rejects forged capture provenance and task answers", () => {
    const d = full();
    d.versions[PILL_ID][1].capture!.author = { name: "Muhammad Hafiz", role: "technical_services_lead" };
    reject(d, /wrong author/);
    const e = full();
    e.versions[PILL_ID][1].capture!.noteId = "VN-0404";
    reject(e, /unknown voice note/);
    const f = full();
    f.captureTasks[TASK.id].answeredBy = { name: "Tan Wei Ming", role: "chief_engineer" };
    reject(f, /answered by someone other than the speaker/);
    const g = full();
    delete (g.versions[PILL_ID][1] as { capture?: unknown }).capture;
    reject(g, /no proposal audit event/);
  });
});
