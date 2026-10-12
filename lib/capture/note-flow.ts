// Frontline capture — the note → read-back → draft flow, as pure functions.
//
// Client-safe. VoiceCapture (components/capture) drives the UI; every decision
// it shows ("Draft rule" enabled, what is sent to the extractor, which quote a
// draft rests on, which answers are recorded in the store) is made here, so it
// is tested without a browser.
//
// Flow (matches the governance store's capture actions):
//   1. A transcript arrives (browser recogniser, server ASR, typed, or a
//      recorded demo transcript). Its read-back chips are extracted
//      deterministically (contract extractReadBack — never by the LLM), with
//      DEFAULT_READ_BACK_VOCAB, the same vocabulary the store uses for drafts.
//   2. The speaker confirms each chip or corrects it. Corrections are kept as
//      `correctedText` on the chip (the transcript as heard is not rewritten);
//      the preview shows the corrected text, read back again. "Draft rule"
//      stays disabled until every chip is answered (noteDraftGate).
//   3. The note is recorded with the transcript AS HEARD and its true source.
//      It goes to /api/llm/extract as ONE turn; the route cites provenance per
//      turn, so each draft's quote is the whole note (a verbatim span).
//   4. Without corrections, the speaker's answers are recorded on the drafts
//      (carriedAnswers) and the drafts can be proposed. With corrections, the
//      store amends the note (applyReadBackCorrections, original kept in
//      amendedFrom), the drafts are re-extracted from the corrected text — the
//      LLM never keeps a misheard value — and the answers are carried again
//      (correctedReadBack).

import type { CandidateParse, DraftCandidate } from "@/lib/llm/candidates";
import {
  DEFAULT_READ_BACK_VOCAB,
  MAX_TRANSCRIPT_CHARS,
  answerReadBack,
  applyReadBackCorrections,
  extractReadBack,
  type DraftFromNote,
  type QuoteSpan,
  type ReadBackItem,
  type ReadBackVocab,
  type VoiceNote,
} from "./contract";

export interface NoteDraft {
  /** The transcript as heard (or typed). */
  transcript: string;
  /** Chips over `transcript`; a corrected chip carries `correctedText`. */
  chips: ReadBackItem[];
}

/** Start the read-back for a fresh transcript: trimmed text, every chip unanswered. */
export function startReadBack(transcript: string, vocab: ReadBackVocab = DEFAULT_READ_BACK_VOCAB): NoteDraft {
  const text = transcript.trim();
  return { transcript: text, chips: extractReadBack(text, vocab) };
}

/** The speaker says chip `index` is right. */
export function confirmChip(state: NoteDraft, index: number): NoteDraft {
  return { ...state, chips: answerReadBack(state.chips, index, { confirmed: true }) };
}

/** The speaker says chip `index` is wrong but has not typed the correction yet (blocks drafting). */
export function flagChip(state: NoteDraft, index: number): NoteDraft {
  return { ...state, chips: answerReadBack(state.chips, index, { confirmed: false }) };
}

/** The speaker corrects chip `index` to `correctedText` (a correction confirms the chip). */
export function correctChip(state: NoteDraft, index: number, correctedText: string): NoteDraft {
  const text = correctedText.trim();
  if (!text) throw new Error("A correction needs text");
  return { ...state, chips: answerReadBack(state.chips, index, { confirmed: true, correctedText: text }) };
}

export function hasCorrections(state: Pick<NoteDraft, "chips">): boolean {
  return state.chips.some((c) => c.correctedText !== undefined);
}

/** The transcript with every correction applied (what the drafts will finally rest on). */
export function correctedTranscript(state: NoteDraft): string {
  return applyReadBackCorrections(state.transcript, state.chips);
}

/**
 * Read-back over the corrected transcript, re-extracted from the new text:
 * a chip inside a corrected span is confirmed (the speaker typed it); a chip
 * outside keeps the speaker's answer when the same text sits at the shifted
 * offset; anything else is unanswered.
 */
export function correctedReadBack(state: NoteDraft, vocab: ReadBackVocab = DEFAULT_READ_BACK_VOCAB): ReadBackItem[] {
  const corrected = state.chips.filter((c) => c.correctedText !== undefined).sort((a, b) => a.spanStart - b.spanStart);
  const shiftOf = (pos: number) =>
    corrected.filter((c) => c.spanEnd <= pos).reduce((n, c) => n + (c.correctedText as string).length - (c.spanEnd - c.spanStart), 0);
  const edited = corrected.map((c) => {
    const start = c.spanStart + shiftOf(c.spanStart);
    return [start, start + (c.correctedText as string).length] as const;
  });
  const previous = new Map<string, ReadBackItem["confirmed"]>();
  for (const old of state.chips) {
    if (old.correctedText !== undefined) continue;
    previous.set(`${old.kind}:${old.spanStart + shiftOf(old.spanStart)}:${old.text}`, old.confirmed);
  }
  return extractReadBack(correctedTranscript(state), vocab).map(({ correctedText: _c, ...c }) => {
    if (edited.some(([s, e]) => c.spanStart < e && c.spanEnd > s)) return { ...c, confirmed: true };
    const carried = previous.get(`${c.kind}:${c.spanStart}:${c.text}`);
    return carried === undefined ? c : { ...c, confirmed: carried };
  });
}

export interface NoteDraftGate {
  allowed: boolean;
  reason?: string;
  /** Chips still unanswered or flagged wrong. */
  pending: ReadBackItem[];
}

/** May "Draft rule" run? Needs a transcript within limits and every chip answered (confirmed or corrected). */
export function noteDraftGate(state: NoteDraft): NoteDraftGate {
  const pending = state.chips.filter((c) => c.confirmed !== true);
  if (!state.transcript) return { allowed: false, reason: "Record or type a note first.", pending };
  if (state.transcript.length > MAX_TRANSCRIPT_CHARS || correctedTranscript(state).length > MAX_TRANSCRIPT_CHARS) {
    return { allowed: false, reason: `Keep the note under ${MAX_TRANSCRIPT_CHARS.toLocaleString("en-SG")} characters.`, pending };
  }
  if (pending.length > 0) {
    const n = pending.length;
    return { allowed: false, reason: `Check ${n} highlighted value${n === 1 ? "" : "s"} first.`, pending };
  }
  return { allowed: true, pending };
}

/** The /api/llm/extract body for a note: one turn, spoken by the author's role. */
export function extractRequestFor(note: Pick<VoiceNote, "id" | "transcript">, speakerLabel: string) {
  return { interviewId: note.id, turns: [{ t: "00:00:00", speaker: speakerLabel, text: note.transcript }] };
}

/** The quote a note's drafts rest on: the whole (single-turn) transcript. */
export function noteQuote(note: Pick<VoiceNote, "transcript">): QuoteSpan {
  return { start: 0, end: note.transcript.length, text: note.transcript };
}

/** What the store's recordDraftsFromNote takes: each candidate's rule and its quote (the store computes the chips). */
export function draftInputs(
  note: Pick<VoiceNote, "transcript">,
  candidates: readonly DraftCandidate[],
): Pick<DraftFromNote, "rule" | "quoteSpan">[] {
  const quoteSpan = noteQuote(note);
  return candidates.map((c) => ({ rule: c.rule, quoteSpan }));
}

/**
 * The speaker's read-back answers that apply to a stored draft's chips (same
 * kind, span and text over the same transcript), as confirmReadBack calls —
 * so each answer the speaker gave is recorded, and audited, by the store.
 */
export function carriedAnswers(
  draft: Pick<DraftFromNote, "readBack">,
  answered: readonly ReadBackItem[],
): { index: number; answer: { confirmed: boolean; correctedText?: string } }[] {
  const byKey = new Map(answered.map((c) => [`${c.kind}:${c.spanStart}-${c.spanEnd}:${c.text}`, c]));
  return draft.readBack.flatMap((c, index) => {
    const a = byKey.get(`${c.kind}:${c.spanStart}-${c.spanEnd}:${c.text}`);
    if (!a || a.confirmed === null || c.confirmed !== null) return [];
    return [{ index, answer: a.correctedText !== undefined ? { confirmed: true, correctedText: a.correctedText } : { confirmed: a.confirmed } }];
  });
}

/**
 * The id a proposed draft takes in its pill: the pill's own rule-id prefix
 * (the most common "XX-NN" prefix) with the next free number.
 */
export function nextRuleId(ruleIds: readonly string[]): string {
  const byPrefix = new Map<string, number[]>();
  for (const id of ruleIds) {
    const m = /^([A-Z]{1,6})-(\d{1,4})$/.exec(id);
    if (m) byPrefix.set(m[1], [...(byPrefix.get(m[1]) ?? []), Number(m[2])]);
  }
  const [prefix, numbers] = [...byPrefix.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0] ?? ["R", [0]];
  const taken = new Set(ruleIds);
  let n = Math.max(...numbers) + 1;
  while (taken.has(`${prefix}-${String(n).padStart(2, "0")}`)) n += 1;
  return `${prefix}-${String(n).padStart(2, "0")}`;
}

/**
 * Is this the unedited recorded demo note? Then its recorded draft is used
 * without calling the live extractor, so the demo is deterministic. Exact
 * transcript equality: an amended or retyped note is a real note.
 */
export function isRecordedDemoNote(
  note: Pick<VoiceNote, "transcript">,
  recorded: { transcript: string } | null,
): boolean {
  return recorded !== null && recorded.transcript === note.transcript;
}

/**
 * Which extraction a note's drafts may come from. A live result is for this
 * note. The server's recorded fixture is the onboarding-interview extraction,
 * NOT this note, so it is never shown as a draft from it; the recorded
 * extraction of a demo transcript is used only when the note is that exact
 * transcript.
 */
export function extractionForNote(
  result: { source: "live" | "recorded"; data: CandidateParse; reason?: string },
  note: Pick<VoiceNote, "transcript">,
  recorded: { transcript: string; extraction: CandidateParse } | null,
): { data: CandidateParse; from: "live" | "recorded-note" } | { data: null; reason: string } {
  if (result.source === "live") return { data: result.data, from: "live" };
  if (recorded && recorded.transcript === note.transcript) return { data: recorded.extraction, from: "recorded-note" };
  return {
    data: null,
    reason: `${result.reason ?? "Live drafting is unavailable."} There is no recorded draft for this note; it is saved, so try drafting again.`,
  };
}

/**
 * The incident a captured rule came from: its note's task (the "Tell us why"
 * or close-out task raised in an incident room). Undefined for a note no
 * incident asked for (a QR teach note) or one this device does not hold.
 */
export function incidentOfCapture(
  capture: { noteId: string },
  notes: readonly { id: string; taskId?: string }[],
  tasks: readonly { id: string; incidentId?: string }[],
): string | undefined {
  const taskId = notes.find((n) => n.id === capture.noteId)?.taskId;
  return taskId ? tasks.find((t) => t.id === taskId)?.incidentId : undefined;
}
