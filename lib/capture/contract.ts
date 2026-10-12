// Keystone frontline capture — the shared contract.
//
// Pure + client-safe. Every builder of the capture features (governance store,
// voice UI + ASR route, incident/pulse/canvas integration) imports its
// vocabulary from here and invents none of its own. docs/capture/PLAN.md says
// who owns what; this file says what the things ARE and which invariants hold:
//
//   1. A CaptureTask is a question the system asks a named role at a moment
//      they already have (a gate override/block, a job close-out, a QR scan).
//   2. A VoiceNote cannot exist without recording consent. Raw audio is NOT
//      retained by default (the transcript is); retained audio expires within
//      MAX_AUDIO_RETENTION_DAYS. Named credit is opt-in. (PDPA s.20 notice +
//      consent, s.25 retention limitation — docs/research/elicitation-feasibility.md.)
//   3. Read-back chips (numbers, asset tags, roles, times) are extracted
//      DETERMINISTICALLY from the transcript against the asset register
//      (data/assets.json) and roles.json — never by the LLM — and a draft built
//      from a note cannot be proposed until every chip is confirmed.
//   4. A DraftFromNote is the existing DRAFT- candidate (lib/llm/candidates)
//      plus the note it came from, a verified quote span and its read-back.
//   5. A capture-derived version enters Shadow only after ≥1 peer confirmation
//      by a different person whose role the pill's access block lets edit it,
//      and with no outstanding peer dispute.
//
// Model output never confirms anything here: chips, peer verdicts and task
// answers are all recorded by an identified human through the governance store.

import assetsJson from "@/data/assets.json";
import { z } from "@/lib/zod";
import { assetsSchema, type AssetRecord, type RoleDefinition } from "@/lib/data/schemas";
import { isDraftRuleId, ruleSchema } from "@/lib/engine";
import {
  identityKey,
  isKnownRole,
  pillEditAuthority,
  roleLabel,
  ROLES,
  type DecisionAuthority,
  type PillEditPolicy,
} from "@/lib/governance/access";
import type { PillVersion } from "@/lib/governance/versions";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** The asset register (data/assets.json), validated. */
export const ASSET_REGISTER: readonly AssetRecord[] = assetsSchema.parse(assetsJson);

const isoDateTime = z.iso.datetime({ offset: true });

/** A named human acting in a defined roles.json role (same shape as governance Actor). */
export const captureActorSchema = z.object({
  name: z.string().trim().min(1).max(100),
  role: z.string().refine(isKnownRole, { message: "role is not defined in data/roles.json" }),
});
export type CaptureActor = z.infer<typeof captureActorSchema>;

export const CAPTURE_TASK_ID = /^CT-[A-Za-z0-9-]{1,60}$/;
export const VOICE_NOTE_ID = /^VN-[A-Za-z0-9-]{1,60}$/;

/**
 * Where an asset reference points: a site (`asset-hf1`) or a piece of
 * equipment on a site (`AHU-23-01`). Equipment tags are what QR codes carry.
 * Returns null for anything not in the register.
 */
export function resolveAssetRef(
  id: string,
  register: readonly AssetRecord[] = ASSET_REGISTER,
): { siteId: string; equipmentId: string | null } | null {
  for (const site of register) {
    if (site.id === id) return { siteId: site.id, equipmentId: null };
    const eq = site.equipment.find((e) => e.id === id);
    if (eq) return { siteId: site.id, equipmentId: eq.id };
  }
  return null;
}

const assetRefSchema = z.string().refine((id) => resolveAssetRef(id) !== null, {
  message: "assetId is not a site or equipment id in data/assets.json",
});

// ---------------------------------------------------------------------------
// 1. CaptureTask
// ---------------------------------------------------------------------------

export const CAPTURE_TASK_KINDS = ["gate_override", "gate_blocked", "job_closeout", "asset_qr"] as const;
export type CaptureTaskKind = (typeof CAPTURE_TASK_KINDS)[number];

export const CAPTURE_TASK_STATUSES = ["open", "answered", "dismissed"] as const;
export type CaptureTaskStatus = (typeof CAPTURE_TASK_STATUSES)[number];

/**
 * - gate_override / gate_blocked: raised by a deterministic gate on an
 *   incident, so incidentId, ruleId and pillId are required.
 * - job_closeout: an incident/work-order close-out; incidentId required.
 * - asset_qr: someone scanned /c/[assetId]; no incident.
 * - answered ⇔ answeredBy + noteId; dismissed ⇒ answeredBy (who dismissed), no note;
 *   open ⇒ neither.
 */
export const captureTaskSchema = z
  .object({
    id: z.string().regex(CAPTURE_TASK_ID),
    kind: z.enum(CAPTURE_TASK_KINDS),
    incidentId: z.string().regex(/^INC-\d{4}-\d{4}$/).optional(),
    assetId: assetRefSchema,
    ruleId: z.string().min(1).optional(),
    pillId: z.string().min(1).optional(),
    createdAt: isoDateTime,
    /** Role id (roles.json) the question is addressed to. */
    createdFor: z.string().refine(isKnownRole, { message: "createdFor is not a roles.json role" }),
    /** The question, e.g. "You overrode TS-07 — why? 15 s voice". */
    prompt: z.string().trim().min(1).max(280),
    status: z.enum(CAPTURE_TASK_STATUSES),
    /** Who answered — or, for a dismissed task, who dismissed it. */
    answeredBy: captureActorSchema.optional(),
    noteId: z.string().regex(VOICE_NOTE_ID).optional(),
  })
  .superRefine((t, ctx) => {
    const need = (cond: boolean, path: string, message: string) => {
      if (!cond) ctx.addIssue({ code: "custom", path: [path], message });
    };
    if (t.kind === "gate_override" || t.kind === "gate_blocked") {
      need(t.incidentId !== undefined, "incidentId", `${t.kind} tasks need the incident`);
      need(t.ruleId !== undefined, "ruleId", `${t.kind} tasks need the gate's rule id`);
      need(t.pillId !== undefined, "pillId", `${t.kind} tasks need the pill`);
    }
    if (t.kind === "job_closeout") need(t.incidentId !== undefined, "incidentId", "close-out tasks need the incident");
    if (t.kind === "asset_qr") need(t.incidentId === undefined, "incidentId", "asset_qr tasks are not tied to an incident");
    if (t.status === "open") {
      need(t.answeredBy === undefined && t.noteId === undefined, "status", "an open task has no answer");
    } else if (t.status === "answered") {
      need(t.answeredBy !== undefined, "answeredBy", "an answered task names who answered");
      need(t.noteId !== undefined, "noteId", "an answered task links its voice note");
    } else {
      need(t.answeredBy !== undefined, "answeredBy", "a dismissed task names who dismissed it");
      need(t.noteId === undefined, "noteId", "a dismissed task has no note");
    }
  });
export type CaptureTask = z.infer<typeof captureTaskSchema>;

/**
 * What makes two tasks "the same question" (F1: one open task per incident +
 * rule + kind; a close-out per incident + role; a QR task per asset + role).
 */
export function captureTaskDedupeKey(t: Pick<CaptureTask, "kind" | "incidentId" | "ruleId" | "assetId" | "createdFor">): string {
  switch (t.kind) {
    case "gate_override":
    case "gate_blocked":
      return `${t.kind}|${t.incidentId ?? ""}|${t.ruleId ?? ""}`;
    case "job_closeout":
      return `${t.kind}|${t.incidentId ?? ""}|${t.createdFor}`;
    case "asset_qr":
      return `${t.kind}|${t.assetId}|${t.createdFor}`;
  }
}

/** The open task asking the same question as `t`, if any — check before createCaptureTask (which refuses a duplicate). */
export function findOpenCaptureTask(
  tasks: Readonly<Record<string, CaptureTask>> | readonly CaptureTask[],
  t: Pick<CaptureTask, "kind" | "incidentId" | "ruleId" | "assetId" | "createdFor">,
): CaptureTask | undefined {
  const key = captureTaskDedupeKey(t);
  const list: readonly CaptureTask[] = Array.isArray(tasks) ? tasks : Object.values(tasks);
  return list.find((x) => x.status === "open" && captureTaskDedupeKey(x) === key);
}

// ---------------------------------------------------------------------------
// 2. VoiceNote + consent / PDPA
// ---------------------------------------------------------------------------

/** Longest raw-audio retention allowed, counted from recordedAt. */
export const MAX_AUDIO_RETENTION_DAYS = 30;
/** Hold-to-talk cap. Target is 15–60 s; anything longer is not a micro-capture. */
export const MAX_NOTE_DURATION_SEC = 120;
/** Matches /api/llm/extract's per-turn text limit. */
export const MAX_TRANSCRIPT_CHARS = 4_000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Where the transcript came from. `region` is where audio was processed — the
 * data-residency fact the PDPA review needs ("ap-singapore", "us", "browser-vendor",
 * "on-device"); never guess it, record what the provider documents.
 */
export const TRANSCRIPT_PROVIDERS = ["web_speech", "tencent_asr", "openai_transcribe", "typed", "fixture"] as const;
export type TranscriptProvider = (typeof TRANSCRIPT_PROVIDERS)[number];

export const transcriptSourceSchema = z.object({
  provider: z.enum(TRANSCRIPT_PROVIDERS),
  model: z.string().min(1).max(100),
  region: z.string().min(1).max(60),
  /** BCP-47 hint passed to the recogniser, e.g. "en-SG". */
  languageHint: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/),
});
export type TranscriptSource = z.infer<typeof transcriptSourceSchema>;

export const consentSchema = z.object({
  /** When the s.20 purpose notice was shown to the speaker (before the mic opened). */
  noticeShownAt: isoDateTime,
  /** Must be true: there is no VoiceNote without recording consent. */
  recordingConsent: z.boolean(),
  /** Opt-in: credit the speaker by name ("rule by Rajesh Kumar"); otherwise by role only. */
  namedCredit: z.boolean().default(false),
});
export type Consent = z.infer<typeof consentSchema>;

export const audioRetentionSchema = z.object({
  retained: z.boolean().default(false),
  /** null when not retained (audio discarded after transcription); required when retained. */
  expiresAt: isoDateTime.nullable().default(null),
});
export type AudioRetention = z.infer<typeof audioRetentionSchema>;

/** The PDPA default: keep the transcript, discard the audio. */
export const DEFAULT_AUDIO_RETENTION: AudioRetention = Object.freeze({ retained: false, expiresAt: null });

export const voiceNoteSchema = z
  .object({
    id: z.string().regex(VOICE_NOTE_ID),
    taskId: z.string().regex(CAPTURE_TASK_ID).optional(),
    assetId: assetRefSchema,
    author: captureActorSchema,
    recordedAt: isoDateTime,
    durationSec: z.number().positive().max(MAX_NOTE_DURATION_SEC),
    transcript: z.string().trim().min(1).max(MAX_TRANSCRIPT_CHARS),
    transcriptSource: transcriptSourceSchema,
    audio: audioRetentionSchema.default(DEFAULT_AUDIO_RETENTION),
    consent: consentSchema,
    /**
     * The transcript as first recorded, kept when the author corrected read-back
     * chips and the note was amended (store: amendNoteFromReadBack). `transcript`
     * is then the corrected text every draft quote and chip refers to.
     */
    amendedFrom: z.string().trim().min(1).max(MAX_TRANSCRIPT_CHARS).optional(),
  })
  .superRefine((n, ctx) => {
    if (!n.consent.recordingConsent) {
      ctx.addIssue({ code: "custom", path: ["consent", "recordingConsent"], message: "no recording without consent" });
    }
    const recorded = Date.parse(n.recordedAt);
    if (Date.parse(n.consent.noticeShownAt) > recorded) {
      ctx.addIssue({ code: "custom", path: ["consent", "noticeShownAt"], message: "the notice must be shown before recording" });
    }
    if (n.audio.retained) {
      if (n.audio.expiresAt === null) {
        ctx.addIssue({ code: "custom", path: ["audio", "expiresAt"], message: "retained audio needs an expiry" });
      } else {
        const expires = Date.parse(n.audio.expiresAt);
        if (expires <= recorded || expires - recorded > MAX_AUDIO_RETENTION_DAYS * DAY_MS) {
          ctx.addIssue({
            code: "custom",
            path: ["audio", "expiresAt"],
            message: `audio may be retained for at most ${MAX_AUDIO_RETENTION_DAYS} days after recording`,
          });
        }
      }
    } else if (n.audio.expiresAt !== null) {
      ctx.addIssue({ code: "custom", path: ["audio", "expiresAt"], message: "audio that is not retained has no expiry" });
    }
  });
export type VoiceNote = z.infer<typeof voiceNoteSchema>;
export type VoiceNoteInput = z.input<typeof voiceNoteSchema>;

/**
 * May the microphone open? The UI calls this before starting capture: the
 * purpose notice must have been shown and recording consent given.
 */
export function canStartRecording(consent: { noticeShownAt?: string | null; recordingConsent: boolean }): DecisionAuthority {
  if (!consent.noticeShownAt) return { allowed: false, reason: "Show the recording notice first." };
  if (!consent.recordingConsent) return { allowed: false, reason: "Recording needs the speaker's consent." };
  return { allowed: true };
}

/** Audio retention for a note recorded at `recordedAt`, kept `days` (clamped to the maximum). */
export function retainAudioFor(recordedAt: string, days: number): AudioRetention {
  if (!(days > 0)) return DEFAULT_AUDIO_RETENTION;
  const keep = Math.min(days, MAX_AUDIO_RETENTION_DAYS);
  return { retained: true, expiresAt: new Date(Date.parse(recordedAt) + keep * DAY_MS).toISOString() };
}

/** Whether a note's raw audio must already be gone at `now`. */
export function audioExpired(note: Pick<VoiceNote, "audio">, now: string): boolean {
  return !note.audio.retained || (note.audio.expiresAt !== null && Date.parse(now) >= Date.parse(note.audio.expiresAt));
}

/** How a note's author is credited on tiles: by name only with opt-in, else by role. */
export function creditFor(note: Pick<VoiceNote, "author" | "consent">): string {
  return note.consent.namedCredit ? `${note.author.name} · ${roleLabel(note.author.role)}` : roleLabel(note.author.role);
}

// ---------------------------------------------------------------------------
// 3. Read-back chips (deterministic extraction)
// ---------------------------------------------------------------------------

export const READ_BACK_KINDS = ["number", "asset_tag", "role", "time"] as const;
export type ReadBackKind = (typeof READ_BACK_KINDS)[number];

/**
 * One value in a transcript that must be read back to the speaker.
 * - spanStart/spanEnd: [start, end) offsets into the NOTE transcript.
 * - confirmed: null = not yet answered; true = right (or corrected); false =
 *   flagged wrong and not yet corrected (blocks the draft).
 * - correctedText: the speaker's correction; only with confirmed === true.
 * - canonical: normalised value — register id for an asset tag (absent when the
 *   tag is NOT in the register, which the UI must flag), role id for a role,
 *   ISO-8601 duration ("PT15M") or "HH:MM" for a time, decimal for a number.
 */
export const readBackItemSchema = z
  .object({
    kind: z.enum(READ_BACK_KINDS),
    text: z.string().min(1),
    spanStart: z.number().int().min(0),
    spanEnd: z.number().int().min(1),
    confirmed: z.boolean().nullable(),
    correctedText: z.string().trim().min(1).optional(),
    canonical: z.string().min(1).optional(),
  })
  .superRefine((r, ctx) => {
    if (r.spanEnd <= r.spanStart) ctx.addIssue({ code: "custom", path: ["spanEnd"], message: "empty span" });
    if (r.spanEnd - r.spanStart !== r.text.length) {
      ctx.addIssue({ code: "custom", path: ["text"], message: "text length does not match its span" });
    }
    if (r.correctedText !== undefined && r.confirmed !== true) {
      ctx.addIssue({ code: "custom", path: ["correctedText"], message: "a correction is a confirmation (confirmed: true)" });
    }
  });
export type ReadBackItem = z.infer<typeof readBackItemSchema>;

interface VocabTerm {
  pattern: RegExp;
  canonical: string;
}

/** The glossary read-back matches against. Build once; reuse. */
export interface ReadBackVocab {
  readonly assetTags: readonly VocabTerm[];
  readonly roles: readonly VocabTerm[];
  /** Known non-chip identifiers (pill rule ids such as "TS-07") — claimed so they are not misread as unregistered tags. */
  readonly ignore: readonly VocabTerm[];
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BEFORE = "(?<![A-Za-z0-9])";
const AFTER = "(?![A-Za-z0-9])";

/** AHU-23-01 also matches "AHU 23 01", "AHU2301", "ahu-23-01" (ASR renders separators inconsistently). */
function tagPattern(tag: string): RegExp {
  const body = tag.split(/-/).map(escapeRe).join("[-\\s]?");
  return new RegExp(`${BEFORE}${body}${AFTER}`, "gi");
}

/** Multi-word terms tolerate any whitespace / hyphen / underscore between words. */
function phrasePattern(term: string, caseSensitive: boolean): RegExp {
  const body = term.trim().split(/[\s_-]+/).map(escapeRe).join("[\\s_-]+");
  return new RegExp(`${BEFORE}${body}${AFTER}`, caseSensitive ? "g" : "gi");
}

/**
 * Build the read-back glossary from the register and roles.json:
 * - asset tags: every equipment id in data/assets.json;
 * - roles: each role's label, its id spoken as words ("duty lew"), and its
 *   roles.json `aliases` (all-caps aliases such as "LEW" match case-sensitively).
 * - ignore: pill rule ids, when the caller has the pills (rule ids are not a
 *   chip kind, but share the tag shape).
 * Longer terms are tried first, so "Duty LEW" wins over "LEW".
 */
export function buildReadBackVocab(input: {
  assets: readonly Pick<AssetRecord, "equipment">[];
  roles: readonly Pick<RoleDefinition, "role" | "label" | "aliases">[];
  ruleIds?: readonly string[];
}): ReadBackVocab {
  const tags = [...new Set(input.assets.flatMap((a) => a.equipment.map((e) => e.id)))]
    .sort((a, b) => b.length - a.length)
    .map((id) => ({ pattern: tagPattern(id), canonical: id }));
  const roleTerms: { term: string; canonical: string; caseSensitive: boolean }[] = [];
  for (const r of input.roles) {
    roleTerms.push({ term: r.label, canonical: r.role, caseSensitive: false });
    roleTerms.push({ term: r.role.replace(/_/g, " "), canonical: r.role, caseSensitive: false });
    for (const alias of r.aliases ?? []) {
      roleTerms.push({ term: alias, canonical: r.role, caseSensitive: alias === alias.toUpperCase() });
    }
  }
  const roles = roleTerms
    .sort((a, b) => b.term.length - a.term.length)
    .map((t) => ({ pattern: phrasePattern(t.term, t.caseSensitive), canonical: t.canonical }));
  const ignore = [...new Set(input.ruleIds ?? [])].map((id) => ({ pattern: tagPattern(id), canonical: id }));
  return { assetTags: tags, roles, ignore };
}

export const DEFAULT_READ_BACK_VOCAB: ReadBackVocab = buildReadBackVocab({ assets: ASSET_REGISTER, roles: ROLES });

// The governance store computes every stored draft's chips with
// DEFAULT_READ_BACK_VOCAB (independent of which pills a page happened to seed,
// so stored chips stay valid); UI previews of stored drafts must use it too.

// Number words ASR may emit instead of digits.
const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const NUMBER_WORD = `(?:(?:${Object.keys(TENS).join("|")})(?:[\\s-](?:${Object.keys(UNITS).filter((w) => UNITS[w] > 0 && UNITS[w] < 10).join("|")}))?|${Object.keys(UNITS).join("|")})`;
/** Singlish sentence-final particles. "sign off one lah" — that "one" is a particle, not a quantity. */
const PARTICLES = "lah|leh|lor|meh|mah|hor|sia|ah|liao";

function wordsToNumber(words: string): number | null {
  let total = 0;
  for (const w of words.toLowerCase().split(/[\s-]+/)) {
    if (w in TENS) total += TENS[w];
    else if (w in UNITS) total += UNITS[w];
    else return null;
  }
  return total;
}

const QUANTITY = `(\\d+(?:\\.\\d+)?|${NUMBER_WORD}|an?|half(?:\\s+an?)?)`;
const DURATION_UNIT = "(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)";
const DURATION_RE = new RegExp(`${BEFORE}${QUANTITY}[\\s-]*${DURATION_UNIT}${AFTER}`, "gi");
const HALF_HOUR_RE = new RegExp(`${BEFORE}half\\s+(?:an\\s+)?hour${AFTER}`, "gi");
const CLOCK_RE = new RegExp(`${BEFORE}([01]?\\d|2[0-3]):([0-5]\\d)(?:\\s*([ap])\\.?m\\.?)?${AFTER}|${BEFORE}(1[0-2]|0?[1-9])(?:[.:]([0-5]\\d))?\\s*([ap])\\.?m\\.?${AFTER}`, "gi");
/** Uppercase tag shape not in the register (e.g. a new "AHU-23-02") — still read back, flagged unregistered. */
const UNREGISTERED_TAG_RE = /(?<![A-Za-z0-9-])(?=[A-Z0-9-]*\d)[A-Z]{2,6}(?:-[A-Z0-9]{1,6}){1,3}(?![A-Za-z0-9-])/g;
const DIGITS_RE = new RegExp(`${BEFORE}\\d+(?:\\.\\d+)?(?:\\s?(?:%|°C|degC|deg|degrees|bar|kPa|mm|m|metres|meters|RT|kW|kV|A|amps|L/s))?(?![A-Za-z0-9])`, "g");
const NUMBER_WORD_RE = new RegExp(`${BEFORE}${NUMBER_WORD}${AFTER}(?=\\s+(?!(?:${PARTICLES})${AFTER})[A-Za-z])`, "gi");

function durationCanonical(quantity: string, unit: string): string | undefined {
  const q = quantity.toLowerCase();
  const n = /^\d/.test(q) ? Number(q) : q === "a" || q === "an" ? 1 : q.startsWith("half") ? 0.5 : wordsToNumber(q);
  if (n === null || !Number.isFinite(n)) return undefined;
  const u = unit.toLowerCase();
  if (u.startsWith("s")) return `PT${n}S`;
  if (u.startsWith("m")) return `PT${n}M`;
  if (u.startsWith("h")) return n === 0.5 ? "PT30M" : `PT${n}H`;
  return `P${n}D`;
}

function clockCanonical(h: number, m: number, meridiem: string | undefined): string {
  let hour = h;
  if (meridiem?.toLowerCase() === "p" && hour < 12) hour += 12;
  if (meridiem?.toLowerCase() === "a" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Extract every number, asset tag, role and time in `text[range)` as an
 * unconfirmed read-back chip. Deterministic: same text + vocab → same chips.
 * Precedence on overlap: ignored rule id > registered tag > unregistered tag > role > time >
 * number (so "AHU-23-01" is one tag, not the numbers 23 and 01, and
 * "15 minutes" is one time, not the number 15). Offsets are into `text`.
 */
export function extractReadBack(
  text: string,
  vocab: ReadBackVocab = DEFAULT_READ_BACK_VOCAB,
  range: { start: number; end: number } = { start: 0, end: text.length },
): ReadBackItem[] {
  const start = Math.max(0, range.start);
  const end = Math.min(text.length, range.end);
  const slice = text.slice(start, end);
  const taken: [number, number][] = [];
  const items: ReadBackItem[] = [];
  const free = (s: number, e: number) => taken.every(([a, b]) => e <= a || s >= b);

  const claim = (re: RegExp, kind: ReadBackKind, canonical: (m: RegExpExecArray) => string | undefined) => {
    re.lastIndex = 0;
    for (let m = re.exec(slice); m !== null; m = re.exec(slice)) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      const s = m.index;
      const e = s + m[0].length;
      if (!free(s, e)) continue;
      taken.push([s, e]);
      const c = canonical(m);
      items.push({
        kind,
        text: m[0],
        spanStart: start + s,
        spanEnd: start + e,
        confirmed: null,
        ...(c === undefined ? {} : { canonical: c }),
      });
    }
  };

  for (const t of vocab.ignore) {
    t.pattern.lastIndex = 0;
    for (let m = t.pattern.exec(slice); m !== null; m = t.pattern.exec(slice)) {
      if (free(m.index, m.index + m[0].length)) taken.push([m.index, m.index + m[0].length]);
    }
  }
  for (const t of vocab.assetTags) claim(t.pattern, "asset_tag", () => t.canonical);
  claim(UNREGISTERED_TAG_RE, "asset_tag", () => undefined);
  for (const r of vocab.roles) claim(r.pattern, "role", () => r.canonical);
  claim(HALF_HOUR_RE, "time", () => "PT30M");
  claim(DURATION_RE, "time", (m) => durationCanonical(m[1], m[2]));
  claim(CLOCK_RE, "time", (m) =>
    m[1] !== undefined
      ? clockCanonical(Number(m[1]), Number(m[2]), m[3])
      : clockCanonical(Number(m[4]), Number(m[5] ?? 0), m[6]),
  );
  claim(DIGITS_RE, "number", (m) => /^\d+(?:\.\d+)?/.exec(m[0])?.[0]);
  claim(NUMBER_WORD_RE, "number", (m) => {
    const n = wordsToNumber(m[0]);
    return n === null ? undefined : String(n);
  });

  return items.sort((a, b) => a.spanStart - b.spanStart);
}

/** Every chip answered and none left flagged wrong. */
export function readBackComplete(items: readonly ReadBackItem[]): boolean {
  return items.every((i) => i.confirmed === true);
}

/** Record the speaker's answer for chip `index` (pure; returns a new array). */
export function answerReadBack(
  items: readonly ReadBackItem[],
  index: number,
  answer: { confirmed: boolean; correctedText?: string },
): ReadBackItem[] {
  if (index < 0 || index >= items.length) throw new Error(`No read-back item ${index}`);
  if (answer.correctedText !== undefined && !answer.confirmed) throw new Error("A correction confirms the chip");
  return items.map((it, i) => {
    if (i !== index) return it;
    const { correctedText: _drop, ...rest } = it;
    return {
      ...rest,
      confirmed: answer.confirmed,
      ...(answer.correctedText?.trim() ? { correctedText: answer.correctedText.trim() } : {}),
    };
  });
}

/**
 * The transcript with every corrected chip's span replaced by its correction.
 * When any chip was corrected, the draft must be re-extracted from this text
 * (the LLM read the misheard value), and its read-back re-run.
 */
export function applyReadBackCorrections(transcript: string, items: readonly ReadBackItem[]): string {
  return [...items]
    .filter((i) => i.correctedText !== undefined)
    .sort((a, b) => b.spanStart - a.spanStart)
    .reduce((t, i) => t.slice(0, i.spanStart) + (i.correctedText as string) + t.slice(i.spanEnd), transcript);
}

// ---------------------------------------------------------------------------
// 4. DraftFromNote
// ---------------------------------------------------------------------------

export const quoteSpanSchema = z
  .object({ start: z.number().int().min(0), end: z.number().int().min(1), text: z.string().min(1) })
  .refine((q) => q.end > q.start && q.end - q.start === q.text.length, { message: "quote text does not match its span" });
export type QuoteSpan = z.infer<typeof quoteSpanSchema>;

/**
 * An existing DRAFT- candidate (lib/llm/candidates DraftCandidate) extracted
 * from one voice note, plus the verbatim quote it rests on and the read-back
 * chips over that quote. DRAFT- ids repeat across extractions, so a draft is
 * identified by (noteId, rule.id).
 */
export const draftFromNoteSchema = z.object({
  status: z.literal("draft"),
  requiresExpertConfirmation: z.literal(true),
  rule: ruleSchema.refine((r) => isDraftRuleId(r.id), { message: "a draft from a note keeps its DRAFT- id" }),
  noteId: z.string().regex(VOICE_NOTE_ID),
  quoteSpan: quoteSpanSchema,
  readBack: z.array(readBackItemSchema),
});
export type DraftFromNote = z.infer<typeof draftFromNoteSchema>;

/** The draft's quote is a verbatim span of its own note's transcript. */
export function quoteMatchesNote(draft: Pick<DraftFromNote, "noteId" | "quoteSpan">, note: Pick<VoiceNote, "id" | "transcript">): boolean {
  return (
    draft.noteId === note.id &&
    note.transcript.slice(draft.quoteSpan.start, draft.quoteSpan.end) === draft.quoteSpan.text
  );
}

/** Read-back for a draft: deterministic chips over its quote span (offsets into the note transcript). */
export function readBackForDraft(
  note: Pick<VoiceNote, "transcript">,
  quoteSpan: Pick<QuoteSpan, "start" | "end">,
  vocab: ReadBackVocab = DEFAULT_READ_BACK_VOCAB,
): ReadBackItem[] {
  return extractReadBack(note.transcript, vocab, { start: quoteSpan.start, end: quoteSpan.end });
}

const chipKey = (i: Pick<ReadBackItem, "kind" | "spanStart" | "spanEnd">) => `${i.kind}:${i.spanStart}-${i.spanEnd}`;

/**
 * Are `items` exactly the deterministic extraction over the draft's quote —
 * same chips (kind, span, text, canonical) in the same order — with only the
 * speaker's answers (confirmed / correctedText) added? Stricter than the
 * chip-key match in draftProposalReadiness: the store's snapshot validation
 * uses it to reject a hand-edited chip.
 */
export function readBackMatchesExtraction(
  items: readonly ReadBackItem[],
  note: Pick<VoiceNote, "transcript">,
  quoteSpan: Pick<QuoteSpan, "start" | "end">,
  vocab: ReadBackVocab = DEFAULT_READ_BACK_VOCAB,
): boolean {
  const expected = readBackForDraft(note, quoteSpan, vocab);
  if (expected.length !== items.length) return false;
  return expected.every((e, i) => {
    const it = items[i];
    return (
      it.kind === e.kind &&
      it.text === e.text &&
      it.spanStart === e.spanStart &&
      it.spanEnd === e.spanEnd &&
      it.canonical === e.canonical
    );
  });
}

export interface DraftProposalReadiness extends DecisionAuthority {
  /** Chips still unanswered or flagged wrong. */
  pending: ReadBackItem[];
}

/**
 * May this draft be proposed as a pill version? Only when its quote is a
 * verbatim span of its note, its chips are exactly the deterministic
 * extraction over that quote (none dropped or invented by a client), every
 * chip is confirmed, and none was corrected (a correction means amend the note
 * and re-extract). Store (proposeFromNote) and UI both call this.
 */
export function draftProposalReadiness(
  draft: DraftFromNote,
  note: Pick<VoiceNote, "id" | "transcript">,
  vocab: ReadBackVocab = DEFAULT_READ_BACK_VOCAB,
): DraftProposalReadiness {
  const pending = draft.readBack.filter((i) => i.confirmed !== true);
  if (!quoteMatchesNote(draft, note)) {
    return { allowed: false, reason: "The quote is not a verbatim span of the voice note.", pending };
  }
  const expected = readBackForDraft(note, draft.quoteSpan, vocab).map(chipKey).sort();
  const actual = draft.readBack.map(chipKey).sort();
  if (expected.length !== actual.length || expected.some((k, i) => k !== actual[i])) {
    return { allowed: false, reason: "Read-back chips do not match the transcript; re-run read-back.", pending };
  }
  if (pending.length > 0) {
    return {
      allowed: false,
      reason: `Confirm every read-back chip first (${pending.length} left: ${pending.map((p) => p.text).join(", ")}).`,
      pending,
    };
  }
  // A corrected chip means the LLM read the misheard value: the note must be
  // amended with the corrections and the draft re-extracted from it.
  const corrected = draft.readBack.filter((i) => i.correctedText !== undefined);
  if (corrected.length > 0) {
    return {
      allowed: false,
      reason: `Corrected ${corrected.map((c) => `"${c.text}"`).join(", ")}: amend the note and re-extract the draft from the corrected transcript.`,
      pending,
    };
  }
  return { allowed: true, pending };
}

// ---------------------------------------------------------------------------
// 5. Peer confirmation (Draft → Shadow for capture-derived versions)
// ---------------------------------------------------------------------------

export const PEER_VERDICTS = ["confirm", "dispute"] as const;
export type PeerVerdict = (typeof PEER_VERDICTS)[number];

/**
 * One person's verdict on a rule of a pill version. `ruleId` is the rule's id
 * in that version, or a DRAFT- id for a draft tile not yet proposed — then
 * `noteId` is required, because DRAFT- ids repeat across notes.
 */
export const peerConfirmationSchema = z
  .object({
    pillId: z.string().min(1),
    pillVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    ruleId: z.string().min(1),
    noteId: z.string().regex(VOICE_NOTE_ID).optional(),
    confirmer: captureActorSchema,
    at: isoDateTime,
    verdict: z.enum(PEER_VERDICTS),
    note: z.string().trim().min(1).max(500).optional(),
  })
  .superRefine((p, ctx) => {
    if (isDraftRuleId(p.ruleId) && p.noteId === undefined) {
      ctx.addIssue({ code: "custom", path: ["noteId"], message: "a DRAFT- rule id needs its noteId" });
    }
    if (p.verdict === "dispute" && p.note === undefined) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "a dispute says what is wrong" });
    }
  });
export type PeerConfirmation = z.infer<typeof peerConfirmationSchema>;

/**
 * May `confirmer` peer-confirm a rule written by `author` on a pill with this
 * access policy? A different person (identity key, not display string) whose
 * role the pill lets edit it: owner, steward, approver or access.roles_allowed
 * — denied / roles_read_only always lose (same policy as pillEditAuthority).
 * Once the rule is proposed as a version, its `proposer` is excluded too: the
 * proposer already vouched for it, so their confirmation is not independent.
 */
export function peerConfirmAuthority(
  confirmer: { name: string; role: string },
  author: { name: string },
  policy: PillEditPolicy,
  proposer?: { name: string },
): DecisionAuthority {
  if (identityKey(confirmer.name) === identityKey(author.name)) {
    return { allowed: false, reason: `${confirmer.name} recorded this note, so someone else must confirm it.` };
  }
  if (proposer && identityKey(confirmer.name) === identityKey(proposer.name)) {
    return { allowed: false, reason: `${confirmer.name} proposed this version, so an independent peer must confirm it.` };
  }
  const edit = pillEditAuthority(confirmer.role, policy);
  if (!edit.allowed) {
    return { allowed: false, reason: `${roleLabel(confirmer.role)} cannot peer-confirm on this pill: ${edit.reason ?? ""}`.trim() };
  }
  return { allowed: true };
}

export interface PeerGate extends DecisionAuthority {
  /** Eligible people whose latest verdict is confirm. */
  confirmers: string[];
  /** Eligible people whose latest verdict is dispute. */
  disputers: string[];
}

/**
 * Peer gate for one rule of one pill version: satisfied with ≥1 eligible
 * confirm and no outstanding eligible dispute (each person's LATEST verdict
 * counts; ineligible verdicts — the author, the proposer, read-only roles — are ignored).
 * Shadow promotion of a capture-derived version requires `allowed`.
 */
export function peerGate(
  confirmations: readonly PeerConfirmation[],
  target: { pillId: string; pillVersion: string; ruleId: string; noteId?: string },
  author: { name: string },
  policy: PillEditPolicy,
  proposer?: { name: string },
): PeerGate {
  const latest = new Map<string, PeerConfirmation>();
  const relevant = confirmations
    .filter(
      (c) =>
        c.pillId === target.pillId &&
        c.pillVersion === target.pillVersion &&
        c.ruleId === target.ruleId &&
        (target.noteId === undefined || c.noteId === target.noteId),
    )
    .filter((c) => peerConfirmAuthority(c.confirmer, author, policy, proposer).allowed)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  for (const c of relevant) latest.set(identityKey(c.confirmer.name), c);
  const confirmers = [...latest.values()].filter((c) => c.verdict === "confirm").map((c) => c.confirmer.name);
  const disputers = [...latest.values()].filter((c) => c.verdict === "dispute").map((c) => c.confirmer.name);
  if (disputers.length > 0) {
    return { allowed: false, reason: `Disputed by ${disputers.join(", ")} — resolve before Shadow.`, confirmers, disputers };
  }
  if (confirmers.length === 0) {
    return { allowed: false, reason: "Needs one peer confirmation from someone other than the author and the proposer.", confirmers, disputers };
  }
  return { allowed: true, confirmers, disputers };
}

// ---------------------------------------------------------------------------
// Governance-store additions (signatures only — Builder A implements them in
// lib/governance/store.ts). Conventions match the existing store: the acting
// identity is the signed session's currentActor (never a parameter); every
// call appends one audit event; a refusal is audited (…_blocked) and then
// throws GovernanceError.
// ---------------------------------------------------------------------------

export { CAPTURE_AUDIT_ACTIONS, type CaptureAuditAction } from "./audit-actions";

export interface CaptureStoreActions {
  /**
   * System or a gate raises a task (status open) as the signed-in actor.
   * Refused (capture_task_blocked) when the id exists or an open task already
   * asks the same question (findOpenCaptureTask). Audit: capture_task_created.
   */
  createCaptureTask: (input: Omit<CaptureTask, "status" | "answeredBy" | "noteId">) => CaptureTask;
  /** Link a recorded note; actor must hold task.createdFor. Audit: capture_task_answered / capture_task_blocked. */
  answerCaptureTask: (taskId: string, noteId: string) => CaptureTask;
  /** Close without a note (e.g. "not applicable"). Audit: capture_task_dismissed / capture_task_blocked. */
  dismissCaptureTask: (taskId: string, reason: string) => CaptureTask;
  /**
   * Persist a note; author is the acting actor. voiceNoteSchema enforces consent
   * and retention. Audit: voice_note_recorded / voice_note_blocked (detail never
   * contains the transcript — audit is visible to every role).
   */
  recordVoiceNote: (input: Omit<VoiceNoteInput, "author">) => VoiceNote;
  /**
   * Author-only: store the drafts extracted from a note (replacing the note's
   * previous drafts). Only `rule` and `quoteSpan` are taken from the caller:
   * every quote must be a verbatim span of the note, and the store computes the
   * read-back chips itself (DEFAULT_READ_BACK_VOCAB), all unconfirmed.
   * Audit: drafts_from_note_recorded / draft_from_note_blocked.
   */
  recordDraftsFromNote: (noteId: string, drafts: readonly Pick<DraftFromNote, "rule" | "quoteSpan">[]) => DraftFromNote[];
  /**
   * Author-only: apply draft `draftRuleId`'s corrected chips to the note
   * (applyReadBackCorrections), keep the first transcript in `amendedFrom`, and
   * clear the note's drafts — they must be re-extracted from the corrected
   * transcript and recorded again. Refused once a version was proposed from
   * the note. Audit: voice_note_amended / voice_note_blocked.
   */
  amendNoteFromReadBack: (noteId: string, draftRuleId: string) => VoiceNote;
  /** Author-only: answer chip `index` of a draft. Audit: readback_confirmed / readback_corrected / readback_blocked. */
  confirmReadBack: (
    noteId: string,
    draftRuleId: string,
    index: number,
    answer: { confirmed: boolean; correctedText?: string },
  ) => DraftFromNote;
  /**
   * Propose a confirmed draft as a new Draft PillVersion (via proposeVersion,
   * op "add"), giving it a real rule id. Refused unless draftProposalReadiness
   * allows. The version records its source note (PillVersion.capture) so
   * promoteToShadow applies peerGate to it.
   * Audit: draft_from_note_proposed / draft_from_note_blocked.
   */
  proposeFromNote: (input: { noteId: string; draftRuleId: string; pillId: string; ruleId: string; reason: string }) => PillVersion;
  /**
   * Record a peer verdict; peerConfirmAuthority must allow it (author = the
   * note's author). Target: a rule of a Draft version proposed from a note
   * (the store fills in noteId), or a DRAFT- tile of a stored note (noteId
   * required). Only verdicts on the proposed version count for the Shadow gate.
   * Audit: peer_confirmed / peer_disputed / peer_confirm_blocked.
   */
  peerConfirm: (input: Omit<PeerConfirmation, "confirmer" | "at">) => PeerConfirmation;
}
