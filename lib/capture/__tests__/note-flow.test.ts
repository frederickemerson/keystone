import { beforeEach, describe, expect, it } from "vitest";
import { draftProposalReadiness, quoteMatchesNote, type VoiceNote } from "../contract";
import { CAPTURE_FIXTURES } from "../fixtures";
import { typedSource } from "../asr-sources";
import {
  carriedAnswers,
  confirmChip,
  correctChip,
  correctedReadBack,
  correctedTranscript,
  draftInputs,
  extractRequestFor,
  extractionForNote,
  flagChip,
  hasCorrections,
  nextRuleId,
  noteDraftGate,
  startReadBack,
  type NoteDraft,
} from "../note-flow";
import { createGovernanceStore, memoryStorage, type GovernanceStore } from "@/lib/governance/store";
import { loadPill } from "@/lib/pills/load";

const FIXTURE = CAPTURE_FIXTURES.find((f) => f.id === "capture-qr-ahu-23-01")!;
const PILL_ID = "technical-services-chilled-water-leak";
const T0 = "2026-10-12T09:00:00+08:00";

function confirmAll(state: NoteDraft): NoteDraft {
  return state.chips.reduce((s, c, i) => (c.confirmed === true ? s : confirmChip(s, i)), state);
}

describe("read-back gate before drafting", () => {
  it("extracts the asset tags, number, time and role from the demo note", () => {
    const s = startReadBack(FIXTURE.transcript);
    expect(s.chips.map((c) => [c.kind, c.text, c.canonical])).toEqual([
      ["asset_tag", "AHU-23-01", "AHU-23-01"],
      ["number", "2", "2"],
      ["time", "15 minutes", "PT15M"],
      ["asset_tag", "DB-23A", "DB-23A"],
      ["role", "duty LEW", "duty_lew"],
    ]);
  });

  it("keeps Draft rule disabled until every chip is answered", () => {
    let s = startReadBack(FIXTURE.transcript);
    expect(noteDraftGate(s)).toMatchObject({ allowed: false, reason: "Check 5 highlighted values first." });
    for (let i = 0; i < s.chips.length - 1; i++) s = confirmChip(s, i);
    expect(noteDraftGate(s).pending.map((c) => c.text)).toEqual(["duty LEW"]);
    s = confirmChip(s, s.chips.length - 1);
    expect(noteDraftGate(s)).toEqual({ allowed: true, pending: [] });
  });

  it("a chip flagged wrong blocks drafting until it is corrected", () => {
    const s = flagChip(confirmAll(startReadBack(FIXTURE.transcript)), 1);
    expect(noteDraftGate(s).allowed).toBe(false);
    const fixed = correctChip(s, 1, "3");
    expect(noteDraftGate(fixed).allowed).toBe(true);
    expect(hasCorrections(fixed)).toBe(true);
  });

  it("an empty note cannot be drafted; a note with no values needs no taps", () => {
    expect(noteDraftGate(startReadBack("   ")).allowed).toBe(false);
    expect(noteDraftGate(startReadBack("Check the drain before restarting the fan.")).allowed).toBe(true);
    expect(() => correctChip(startReadBack(FIXTURE.transcript), 0, "  ")).toThrow();
  });

  it("a correction keeps the heard text and re-reads the corrected text", () => {
    let s = startReadBack(FIXTURE.transcript);
    s = confirmChip(s, 0); // AHU-23-01
    s = correctChip(s, 2, "50 minutes"); // "15 minutes" was misheard
    expect(s.transcript).toBe(FIXTURE.transcript);
    expect(correctedTranscript(s)).toContain("wait 50 minutes");
    const after = correctedReadBack(s);
    expect(after.find((c) => c.kind === "time")).toMatchObject({ text: "50 minutes", canonical: "PT50M", confirmed: true });
    expect(after[0]).toMatchObject({ text: "AHU-23-01", confirmed: true });
    const lew = after.find((c) => c.kind === "role")!;
    expect(lew.confirmed).toBeNull();
    expect(correctedTranscript(s).slice(lew.spanStart, lew.spanEnd)).toBe("duty LEW");
  });

  it("a correction that introduces a new value is read back unconfirmed only outside the typed span", () => {
    const s = correctChip(confirmAll(startReadBack(FIXTURE.transcript)), 3, "DB-23B");
    const tag = correctedReadBack(s).find((c) => c.text === "DB-23B")!;
    expect(tag).toMatchObject({ kind: "asset_tag", confirmed: true });
    expect(tag.canonical).toBeUndefined(); // not in the register: the UI flags it
  });
});

describe("draft from note, through the governance store", () => {
  let store: GovernanceStore;
  const s = () => store.getState();

  beforeEach(() => {
    store = createGovernanceStore(memoryStorage(), () => "2026-10-12T01:00:00.000Z");
    const bundle = loadPill(PILL_ID)!;
    s().seedPills([{ id: PILL_ID, pill: bundle.pill }]);
  });

  function record(transcript: string): VoiceNote {
    return s().recordVoiceNote({
      id: "VN-flow-1",
      assetId: "AHU-23-01",
      recordedAt: T0,
      durationSec: 20,
      transcript,
      transcriptSource: typedSource(),
      consent: { noticeShownAt: T0, recordingConsent: true },
    });
  }

  it("sends the note as one turn spoken by the author's role", () => {
    expect(extractRequestFor({ id: "VN-x", transcript: "x" }, "Technician")).toEqual({
      interviewId: "VN-x",
      turns: [{ t: "00:00:00", speaker: "Technician", text: "x" }],
    });
  });

  it("confirmed answers carry onto the stored drafts and a chief engineer can propose", () => {
    s().setRole("technician");
    const checked = confirmAll(startReadBack(FIXTURE.transcript));
    const note = record(checked.transcript);
    const drafts = s().recordDraftsFromNote(note.id, draftInputs(note, FIXTURE.extractionFor(note.id)!.candidates));
    expect(drafts).toHaveLength(2);
    for (const d of drafts) {
      expect(quoteMatchesNote(d, note)).toBe(true);
      expect(d.rule.provenance).toEqual([`${note.id}#00:00:00`]);
      for (const { index, answer } of carriedAnswers(d, checked.chips)) s().confirmReadBack(note.id, d.rule.id, index, answer);
    }
    const stored = s().draftsFromNotes[note.id];
    for (const d of stored) expect(draftProposalReadiness(d, note).allowed).toBe(true);

    s().setRole("chief_engineer");
    const v = s().proposeFromNote({ noteId: note.id, draftRuleId: stored[0].rule.id, pillId: PILL_ID, ruleId: nextRuleId(s().versions[PILL_ID][0].rules.map((r) => r.id)), reason: "test" });
    expect(v.capture?.noteId).toBe(note.id);
  });

  it("a correction amends the note and the re-extracted drafts take the corrected answers", () => {
    s().setRole("technician");
    const checked = correctChip(confirmAll(startReadBack(FIXTURE.transcript)), 2, "50 minutes");
    const note = record(checked.transcript);
    const first = s().recordDraftsFromNote(note.id, draftInputs(note, FIXTURE.extractionFor(note.id)!.candidates))[0];
    for (const { index, answer } of carriedAnswers(first, checked.chips)) s().confirmReadBack(note.id, first.rule.id, index, answer);
    expect(draftProposalReadiness(s().draftsFromNotes[note.id][0], note).allowed).toBe(false);

    const amended = s().amendNoteFromReadBack(note.id, first.rule.id);
    expect(amended.transcript).toBe(correctedTranscript(checked));
    expect(amended.amendedFrom).toBe(FIXTURE.transcript);

    const again = s().recordDraftsFromNote(note.id, draftInputs(amended, FIXTURE.extractionFor(note.id)!.candidates));
    const after = correctedReadBack(checked);
    for (const d of again) {
      for (const { index, answer } of carriedAnswers(d, after)) s().confirmReadBack(note.id, d.rule.id, index, answer);
    }
    for (const d of s().draftsFromNotes[note.id]) expect(draftProposalReadiness(d, amended).allowed).toBe(true);
  });

  it("a proposed draft takes the pill's next free rule id", () => {
    expect(nextRuleId(["TS-01", "TS-02", "TS-10", "TE-01"])).toBe("TS-11");
    expect(nextRuleId(["TE-01", "TE-02"])).toBe("TE-03");
    expect(nextRuleId([])).toBe("R-01");
  });

  it("never shows the server's interview fixture as a draft from a note", () => {
    const fake = { candidates: [], rejected: [] };
    const note = { transcript: "Something new about AHU-23-01." };
    expect(extractionForNote({ source: "live", data: fake }, note, null)).toEqual({ data: fake, from: "live" });
    expect(extractionForNote({ source: "recorded", data: fake, reason: "Rate-limited." }, note, null).data).toBeNull();
    const own = { transcript: FIXTURE.transcript, extraction: FIXTURE.extractionFor("VN-x")! };
    expect(extractionForNote({ source: "recorded", data: fake }, { transcript: FIXTURE.transcript }, own)).toMatchObject({ from: "recorded-note" });
    expect(extractionForNote({ source: "recorded", data: fake }, note, own).data).toBeNull();
  });
});
