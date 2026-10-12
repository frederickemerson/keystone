import { describe, expect, it } from "vitest";
import rolesJson from "@/data/roles.json";
import { AUDIT_ACTIONS } from "@/lib/governance/audit";
import { DEMO_PERSONAS, ROLES, type PillEditPolicy } from "@/lib/governance/access";
import { DRAFT_RULE_ID_PREFIX, type Rule } from "@/lib/engine";
import {
  ASSET_REGISTER,
  CAPTURE_AUDIT_ACTIONS,
  MAX_AUDIO_RETENTION_DAYS,
  answerReadBack,
  applyReadBackCorrections,
  audioExpired,
  buildReadBackVocab,
  canStartRecording,
  captureTaskSchema,
  creditFor,
  draftFromNoteSchema,
  draftProposalReadiness,
  extractReadBack,
  findOpenCaptureTask,
  readBackMatchesExtraction,
  peerConfirmAuthority,
  peerConfirmationSchema,
  peerGate,
  readBackComplete,
  readBackForDraft,
  readBackItemSchema,
  resolveAssetRef,
  retainAudioFor,
  voiceNoteSchema,
  type DraftFromNote,
  type PeerConfirmation,
  type ReadBackItem,
  type VoiceNote,
} from "@/lib/capture";

const T0 = "2026-10-12T09:00:00+08:00";
const rajesh = { name: DEMO_PERSONAS.technician, role: "technician" };
const hafiz = { name: DEMO_PERSONAS.technical_services_lead, role: "technical_services_lead" };
const priya = { name: DEMO_PERSONAS.asset_operations_manager, role: "asset_operations_manager" };

/** The chilled-water-leak pill's access block (SKILL.md). */
const CWL_POLICY: PillEditPolicy = {
  owner: "chief_engineer",
  steward: "asset_operations_manager",
  approver: "head_technical_services",
  access: {
    roles_allowed: [
      "chief_engineer",
      "asset_operations_manager",
      "head_technical_services",
      "duty_facilities_manager",
      "technical_services_lead",
      "fire_safety_manager",
      "dc_critical_facilities_manager",
    ],
    roles_read_only: ["technician", "security_fcc_operator", "duty_lew"],
  },
};

function note(overrides: Partial<VoiceNote> = {}): VoiceNote {
  return voiceNoteSchema.parse({
    id: "VN-0001",
    taskId: "CT-INC-2026-1011-TS-07",
    assetId: "AHU-23-01",
    author: rajesh,
    recordedAt: T0,
    durationSec: 18,
    transcript: "AHU-23-01 drain pan overflow again. Wait 15 minutes then call Duty LEW, cannot anyhow reset the breaker lah.",
    transcriptSource: { provider: "web_speech", model: "chrome-webspeech", region: "browser-vendor", languageHint: "en-SG" },
    consent: { noticeShownAt: "2026-10-12T08:59:40+08:00", recordingConsent: true },
    ...overrides,
  });
}

const kinds = (items: ReadBackItem[]) => items.map((i) => [i.kind, i.text, i.canonical]);

// ---------------------------------------------------------------------------

describe("CaptureTask", () => {
  const base = {
    id: "CT-INC-2026-1011-TS-07",
    kind: "gate_override",
    incidentId: "INC-2026-1011",
    assetId: "asset-hf1",
    ruleId: "TS-07",
    pillId: "technical-services/chilled-water-leak",
    createdAt: T0,
    createdFor: "technician",
    prompt: "You overrode TS-07 — why? 15 s voice",
    status: "open",
  };

  it("accepts an open gate-override task", () => {
    expect(captureTaskSchema.safeParse(base).success).toBe(true);
  });

  it("requires incident, rule and pill for gate tasks", () => {
    expect(captureTaskSchema.safeParse({ ...base, ruleId: undefined }).success).toBe(false);
    expect(captureTaskSchema.safeParse({ ...base, kind: "gate_blocked", incidentId: undefined }).success).toBe(false);
  });

  it("accepts an asset_qr task on an equipment tag, with no incident", () => {
    const qr = { ...base, kind: "asset_qr", incidentId: undefined, ruleId: undefined, pillId: undefined, assetId: "AHU-23-01" };
    expect(captureTaskSchema.safeParse(qr).success).toBe(true);
    expect(captureTaskSchema.safeParse({ ...qr, incidentId: "INC-2026-1011" }).success).toBe(false);
  });

  it("rejects unknown assets and roles", () => {
    expect(captureTaskSchema.safeParse({ ...base, assetId: "AHU-99-99" }).success).toBe(false);
    expect(captureTaskSchema.safeParse({ ...base, createdFor: "janitor" }).success).toBe(false);
  });

  it("ties status to answeredBy / noteId", () => {
    expect(captureTaskSchema.safeParse({ ...base, status: "answered", answeredBy: rajesh }).success).toBe(false);
    expect(captureTaskSchema.safeParse({ ...base, status: "answered", answeredBy: rajesh, noteId: "VN-0001" }).success).toBe(true);
    expect(captureTaskSchema.safeParse({ ...base, status: "dismissed", answeredBy: rajesh }).success).toBe(true);
    expect(captureTaskSchema.safeParse({ ...base, status: "dismissed", answeredBy: rajesh, noteId: "VN-0001" }).success).toBe(false);
    expect(captureTaskSchema.safeParse({ ...base, answeredBy: rajesh }).success).toBe(false);
  });
});

describe("asset register", () => {
  it("resolves sites and equipment, and nothing else", () => {
    expect(resolveAssetRef("asset-hf1")).toEqual({ siteId: "asset-hf1", equipmentId: null });
    expect(resolveAssetRef("AHU-23-01")).toEqual({ siteId: "asset-hf1", equipmentId: "AHU-23-01" });
    expect(resolveAssetRef("AHU-23-99")).toBeNull();
  });

  it("equipment ids are unique across sites (QR tags resolve to one site)", () => {
    const ids = ASSET_REGISTER.flatMap((a) => a.equipment.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("VoiceNote consent and retention (PDPA)", () => {
  it("defaults to transcript kept, audio discarded, no named credit", () => {
    const n = note();
    expect(n.audio).toEqual({ retained: false, expiresAt: null });
    expect(n.consent.namedCredit).toBe(false);
    expect(creditFor(n)).toBe("Technician");
    expect(creditFor({ ...n, consent: { ...n.consent, namedCredit: true } })).toBe("Rajesh Kumar · Technician");
  });

  it("rejects a note recorded without consent", () => {
    expect(() => note({ consent: { noticeShownAt: T0, recordingConsent: false, namedCredit: false } })).toThrow(/consent/);
  });

  it("rejects a notice shown after recording started", () => {
    expect(() => note({ consent: { noticeShownAt: "2026-10-12T09:00:05+08:00", recordingConsent: true, namedCredit: false } })).toThrow(
      /notice/,
    );
  });

  it("allows retained audio up to 30 days, never longer, never without expiry", () => {
    expect(note({ audio: retainAudioFor(T0, 30) }).audio.retained).toBe(true);
    expect(retainAudioFor(T0, 365).expiresAt).toBe(retainAudioFor(T0, MAX_AUDIO_RETENTION_DAYS).expiresAt);
    expect(() => note({ audio: { retained: true, expiresAt: "2026-11-12T09:00:01+08:00" } })).toThrow(/30 days/);
    expect(() => note({ audio: { retained: true, expiresAt: null } })).toThrow(/expiry/);
    expect(() => note({ audio: { retained: false, expiresAt: "2026-10-13T09:00:00+08:00" } })).toThrow(/no expiry/);
  });

  it("reports audio expiry", () => {
    const kept = note({ audio: retainAudioFor(T0, 7) });
    expect(audioExpired(kept, "2026-10-13T00:00:00Z")).toBe(false);
    expect(audioExpired(kept, "2026-10-20T00:00:00Z")).toBe(true);
    expect(audioExpired(note(), T0)).toBe(true);
  });

  it("bounds duration and transcript, and requires a known author role", () => {
    expect(() => note({ durationSec: 0 })).toThrow();
    expect(() => note({ durationSec: 121 })).toThrow();
    expect(() => note({ transcript: "   " })).toThrow();
    expect(() => note({ author: { name: "X", role: "janitor" } })).toThrow();
  });

  it("gates the microphone on notice + consent", () => {
    expect(canStartRecording({ noticeShownAt: null, recordingConsent: true }).allowed).toBe(false);
    expect(canStartRecording({ noticeShownAt: T0, recordingConsent: false }).allowed).toBe(false);
    expect(canStartRecording({ noticeShownAt: T0, recordingConsent: true }).allowed).toBe(true);
  });
});

describe("read-back extraction (deterministic)", () => {
  it("reads asset tag, duration and role from a close-out note", () => {
    const text = "AHU-23-01 drain pan overflow. Wait 15 minutes then call Duty LEW.";
    expect(kinds(extractReadBack(text))).toEqual([
      ["asset_tag", "AHU-23-01", "AHU-23-01"],
      ["time", "15 minutes", "PT15M"],
      ["role", "Duty LEW", "duty_lew"],
    ]);
  });

  it("spans index the original text", () => {
    const text = "ok so AHU-23-01 leaking";
    const [chip] = extractReadBack(text);
    expect(text.slice(chip.spanStart, chip.spanEnd)).toBe("AHU-23-01");
    expect(readBackItemSchema.safeParse(chip).success).toBe(true);
  });

  it("normalises ASR-spaced tags to the register id", () => {
    expect(kinds(extractReadBack("the ahu 23 01 coil"))).toEqual([["asset_tag", "ahu 23 01", "AHU-23-01"]]);
  });

  it("flags tag-shaped ids missing from the register (no canonical)", () => {
    expect(kinds(extractReadBack("check AHU-23-02 also"))).toEqual([["asset_tag", "AHU-23-02", undefined]]);
  });

  it("does not misread known rule ids as tags when the pill rules are in the vocab", () => {
    const vocab = buildReadBackVocab({ assets: ASSET_REGISTER, roles: ROLES, ruleIds: ["TS-07"] });
    expect(extractReadBack("I overrode TS-07 because ISV-L23-CHW was shut", vocab).map((i) => i.text)).toEqual(["ISV-L23-CHW"]);
  });

  it("handles Singlish phrasing: particles, number words, role aliases", () => {
    const text = "Must wait for LEW sign off one lah, cannot anyhow on the DB-23A. Two times already like that, after fifteen mins still dripping then call CE.";
    expect(kinds(extractReadBack(text))).toEqual([
      ["role", "LEW", "duty_lew"],
      ["asset_tag", "DB-23A", "DB-23A"],
      ["number", "Two", "2"],
      ["time", "fifteen mins", "PT15M"],
      ["role", "CE", "chief_engineer"],
    ]);
  });

  it("does not treat lowercase words as acronym aliases", () => {
    expect(extractReadBack("the ce ling is wet").filter((i) => i.kind === "role")).toEqual([]);
  });

  it("reads numbers with units, clock times and half an hour", () => {
    expect(kinds(extractReadBack("Water 1.5 m from the DB at 08:09, CHW 6.5°C, IR above 2 MΩ, back by 2.30pm or half an hour"))).toEqual([
      ["number", "1.5 m", "1.5"],
      ["time", "08:09", "08:09"],
      ["number", "6.5°C", "6.5"],
      ["number", "2", "2"],
      ["time", "2.30pm", "14:30"],
      ["time", "half an hour", "PT30M"],
    ]);
  });

  it("matches role labels and spoken role ids", () => {
    expect(kinds(extractReadBack("tell the chief engineer and the Duty Facilities Manager"))).toEqual([
      ["role", "chief engineer", "chief_engineer"],
      ["role", "Duty Facilities Manager", "duty_facilities_manager"],
    ]);
  });

  it("every roles.json alias resolves to its own role", () => {
    for (const r of rolesJson as { role: string; aliases?: string[] }[]) {
      for (const alias of r.aliases ?? []) {
        expect(extractReadBack(`call ${alias} now`).find((i) => i.kind === "role")?.canonical).toBe(r.role);
      }
    }
  });

  it("restricts to a range, keeping absolute offsets", () => {
    const text = "AHU-23-01 first. Then 10 minutes.";
    const items = extractReadBack(text, undefined, { start: 17, end: text.length });
    expect(kinds(items)).toEqual([["time", "10 minutes", "PT10M"]]);
    expect(items[0].spanStart).toBe(text.indexOf("10 minutes"));
  });
});

describe("read-back answers", () => {
  const items = extractReadBack("Wait 15 minutes then call Duty LEW");

  it("is complete only when every chip is confirmed", () => {
    expect(readBackComplete(items)).toBe(false);
    let done = answerReadBack(items, 0, { confirmed: true });
    expect(readBackComplete(done)).toBe(false);
    done = answerReadBack(done, 1, { confirmed: false });
    expect(readBackComplete(done)).toBe(false);
    done = answerReadBack(done, 1, { confirmed: true });
    expect(readBackComplete(done)).toBe(true);
  });

  it("applies corrections to the transcript", () => {
    const text = "Wait 15 minutes then call Duty LEW";
    const corrected = answerReadBack(items, 0, { confirmed: true, correctedText: "50 minutes" });
    expect(applyReadBackCorrections(text, corrected)).toBe("Wait 50 minutes then call Duty LEW");
    expect(() => answerReadBack(items, 0, { confirmed: false, correctedText: "x" })).toThrow();
    expect(readBackItemSchema.safeParse({ ...items[0], confirmed: null, correctedText: "x" }).success).toBe(false);
  });
});

describe("DraftFromNote", () => {
  const n = note();
  const quoteText = "Wait 15 minutes then call Duty LEW, cannot anyhow reset the breaker lah.";
  const start = n.transcript.indexOf(quoteText);
  const rule: Rule = {
    id: `${DRAFT_RULE_ID_PREFIX}01`,
    title: "Call Duty LEW before resetting a tripped breaker",
    trigger: { incident_type: "water_ingress", all: [{ path: "evidence.breaker_tripped", op: "eq", value: true }], any: [] },
    required_evidence: ["lew_inspected_tripped_breaker"],
    decision: "Do not reset; call Duty LEW after 15 minutes",
    allowed_actions: ["Call Duty LEW"],
    forbidden_actions: ["Reset breaker"],
    exceptions: [],
    action_class: "must_escalate",
    forbidden_if_missing_evidence: true,
    escalate_to: { role: "duty_lew" },
    owner: "chief_engineer",
    deadline_minutes: 15,
    asset_overrides: {},
    asset_refs: [],
    sensitivity: "internal",
    provenance: [],
  };
  const draft = (readBack: ReadBackItem[]): DraftFromNote =>
    draftFromNoteSchema.parse({
      status: "draft",
      requiresExpertConfirmation: true,
      rule,
      noteId: n.id,
      quoteSpan: { start, end: start + quoteText.length, text: quoteText },
      readBack,
    });
  const chips = readBackForDraft(n, { start, end: start + quoteText.length });

  it("keeps the DRAFT- id and a consistent quote", () => {
    expect(draftFromNoteSchema.safeParse({ ...draft(chips), rule: { ...rule, id: "TS-14" } }).success).toBe(false);
    expect(draftFromNoteSchema.safeParse({ ...draft(chips), quoteSpan: { start, end: start + 3, text: quoteText } }).success).toBe(false);
  });

  it("blocks proposal until every chip is confirmed", () => {
    expect(kinds(chips)).toEqual([
      ["time", "15 minutes", "PT15M"],
      ["role", "Duty LEW", "duty_lew"],
    ]);
    const r = draftProposalReadiness(draft(chips), n);
    expect(r.allowed).toBe(false);
    expect(r.pending).toHaveLength(2);
    const confirmed = chips.map((c) => ({ ...c, confirmed: true }));
    expect(draftProposalReadiness(draft(confirmed), n).allowed).toBe(true);
  });

  it("blocks a draft with a corrected chip until the note is amended and the draft re-extracted", () => {
    const answered = answerReadBack(chips.map((c) => ({ ...c, confirmed: true })), 0, { confirmed: true, correctedText: "50 minutes" });
    expect(draftProposalReadiness(draft(answered), n)).toMatchObject({ allowed: false, reason: expect.stringMatching(/amend the note/) });
  });

  it("readBackMatchesExtraction: answers allowed, any edit to a chip is not", () => {
    const span = { start, end: start + quoteText.length };
    expect(readBackMatchesExtraction(chips, n, span)).toBe(true);
    expect(readBackMatchesExtraction(answerReadBack(chips, 1, { confirmed: true, correctedText: "Duty FM" }), n, span)).toBe(true);
    expect(readBackMatchesExtraction([{ ...chips[0], canonical: "PT50M" }, chips[1]], n, span)).toBe(false);
    expect(readBackMatchesExtraction([chips[1], chips[0]], n, span)).toBe(false);
    expect(readBackMatchesExtraction(chips.slice(1), n, span)).toBe(false);
  });

  it("blocks a draft whose chips were dropped or whose quote is not in the note", () => {
    const confirmed = chips.map((c) => ({ ...c, confirmed: true }));
    expect(draftProposalReadiness(draft(confirmed.slice(1)), n).reason).toMatch(/do not match/);
    expect(draftProposalReadiness(draft(confirmed), { ...n, transcript: n.transcript.toUpperCase() }).reason).toMatch(/verbatim/);
    expect(draftProposalReadiness(draft(confirmed), { ...n, id: "VN-0002" }).allowed).toBe(false);
  });
});

describe("peer confirmation", () => {
  const pc = (over: Partial<PeerConfirmation>): PeerConfirmation =>
    peerConfirmationSchema.parse({
      pillId: "technical-services/chilled-water-leak",
      pillVersion: "1.3.0",
      ruleId: "TS-14",
      confirmer: hafiz,
      at: "2026-10-12T10:00:00+08:00",
      verdict: "confirm",
      ...over,
    });
  const target = { pillId: "technical-services/chilled-water-leak", pillVersion: "1.3.0", ruleId: "TS-14" };

  it("schema: DRAFT- ids need a note, disputes need a reason", () => {
    expect(() => pc({ ruleId: "DRAFT-01" })).toThrow(/noteId/);
    expect(pc({ ruleId: "DRAFT-01", noteId: "VN-0001" }).ruleId).toBe("DRAFT-01");
    expect(() => pc({ verdict: "dispute" })).toThrow(/what is wrong/);
  });

  it("authority: different person, role the pill lets edit", () => {
    expect(peerConfirmAuthority(hafiz, rajesh, CWL_POLICY).allowed).toBe(true);
    expect(peerConfirmAuthority(rajesh, rajesh, CWL_POLICY).allowed).toBe(false);
    expect(peerConfirmAuthority({ name: " rajesh  KUMAR ", role: "technical_services_lead" }, rajesh, CWL_POLICY).allowed).toBe(false);
    // Technicians are read-only on this pill: a second technician cannot peer-confirm.
    expect(peerConfirmAuthority({ name: "Another Tech", role: "technician" }, rajesh, CWL_POLICY).allowed).toBe(false);
    expect(peerConfirmAuthority({ name: "Rahul Menon", role: "duty_lew" }, rajesh, CWL_POLICY).allowed).toBe(false);
  });

  it("gate: needs one eligible confirm, ignores ineligible ones", () => {
    expect(peerGate([], target, rajesh, CWL_POLICY).allowed).toBe(false);
    expect(peerGate([pc({ confirmer: rajesh })], target, rajesh, CWL_POLICY).allowed).toBe(false);
    const g = peerGate([pc({})], target, rajesh, CWL_POLICY);
    expect(g).toMatchObject({ allowed: true, confirmers: [hafiz.name] });
    expect(peerGate([pc({ pillVersion: "1.4.0" })], target, rajesh, CWL_POLICY).allowed).toBe(false);
  });

  it("gate: an outstanding dispute blocks; a person's latest verdict counts", () => {
    const dispute = pc({ confirmer: priya, verdict: "dispute", note: "15 min is too long for a tripped DB", at: "2026-10-12T10:05:00+08:00" });
    expect(peerGate([pc({}), dispute], target, rajesh, CWL_POLICY)).toMatchObject({ allowed: false, disputers: [priya.name] });
    const retract = pc({ confirmer: priya, at: "2026-10-12T10:10:00+08:00" });
    expect(peerGate([pc({}), dispute, retract], target, rajesh, CWL_POLICY).allowed).toBe(true);
  });
});

describe("open-task dedupe (F1)", () => {
  const t = (over: Partial<CaptureTaskLike>): CaptureTaskLike => ({
    id: "CT-1",
    kind: "gate_override",
    incidentId: "INC-2026-1011",
    ruleId: "TS-07",
    assetId: "asset-hf1",
    createdFor: "technician",
    status: "open",
    ...over,
  });
  type CaptureTaskLike = Parameters<typeof findOpenCaptureTask>[1] & { id: string; status: "open" | "answered" | "dismissed" };
  const tasks = (list: CaptureTaskLike[]) => list as unknown as Parameters<typeof findOpenCaptureTask>[0];

  it("one open task per incident + rule + kind; close-out per incident + role; QR per asset + role", () => {
    expect(findOpenCaptureTask(tasks([t({})]), t({ createdFor: "chief_engineer" }))?.id).toBe("CT-1");
    expect(findOpenCaptureTask(tasks([t({})]), t({ kind: "gate_blocked" }))).toBeUndefined();
    expect(findOpenCaptureTask(tasks([t({ status: "answered" })]), t({}))).toBeUndefined();
    const closeout = t({ kind: "job_closeout", ruleId: undefined });
    expect(findOpenCaptureTask(tasks([closeout]), { ...closeout, createdFor: "chief_engineer" })).toBeUndefined();
    const qr = t({ kind: "asset_qr", incidentId: undefined, ruleId: undefined, assetId: "AHU-23-01" });
    expect(findOpenCaptureTask(tasks([qr]), qr)?.id).toBe("CT-1");
    expect(findOpenCaptureTask(tasks([qr]), { ...qr, assetId: "CHW-R2" })).toBeUndefined();
  });
});

describe("voice note amendment", () => {
  it("amendedFrom is optional and bounded", () => {
    expect(note({ amendedFrom: "earlier transcript" }).amendedFrom).toBe("earlier transcript");
    expect(() => note({ amendedFrom: "x".repeat(4_001) })).toThrow();
  });
});

describe("audit vocabulary", () => {
  it("every capture audit action is a governance audit action", () => {
    for (const a of CAPTURE_AUDIT_ACTIONS) expect(AUDIT_ACTIONS).toContain(a);
    expect(new Set(AUDIT_ACTIONS).size).toBe(AUDIT_ACTIONS.length);
  });
});
