# Frontline capture: plan

This plan covers five features. Each one turns a moment the worker already has (a gate override, a job close-out, a QR scan) into a governed rule draft. The feature list comes from build items 1–5 in `docs/research/elicitation-feasibility.md` ("Hackathon build list").

**Contract first.** All builders import their vocabulary from `lib/capture` (`contract.ts`, re-exported by `index.ts`). `lib/capture/__tests__/contract.test.ts` pins it. Do not add capture types, ids, statuses or audit names anywhere else. If the contract has to change, change `contract.ts` and its tests first, in a commit of their own, and tell the other builders.

## Contract summary (`lib/capture/contract.ts`)

| Thing | What it is | Invariants enforced by the schema or helper |
|---|---|---|
| `CaptureTask` | A question addressed to a role: `gate_override`, `gate_blocked`, `job_closeout` or `asset_qr` | Gate kinds need `incidentId` + `ruleId` + `pillId`. A close-out needs `incidentId`. A QR task has no incident. `open` has no answer. `answered` needs both `answeredBy` and `noteId`. `dismissed` needs `answeredBy` and has no note. `assetId` must be a site or equipment id in `data/assets.json` (`resolveAssetRef`). `createdFor` must be a roles.json role. Id format is `CT-…`. |
| `VoiceNote` | One hold-to-talk recording, stored as its transcript | `consent.recordingConsent` must be true. The notice is shown before recording. Audio is not retained by default (`expiresAt: null`). Retained audio needs an `expiresAt` no more than 30 days after `recordedAt`. `namedCredit` defaults to false. Length is 0–120 s. The transcript is at most 4,000 chars. `transcriptSource` records provider, model, **region** and `languageHint`. Id format is `VN-…`. |
| `ReadBackItem` | A chip for one number, asset tag, role or time in a transcript | Extracted by `extractReadBack()` using regex plus the register/roles.json glossary, **never by the LLM**. Spans are `[start, end)` offsets into the note transcript. `confirmed` is `null`, `true` or `false`. A `correctedText` implies `confirmed: true`. `canonical` holds the register id, role id, ISO duration (`PT15M`), `HH:MM` or a decimal. An asset tag without a `canonical` is not in the register, and the UI must flag it. |
| `DraftFromNote` | An existing `DRAFT-` candidate plus `noteId`, `quoteSpan` and `readBack` | Keeps its `DRAFT-` id and is identified by (noteId, rule.id). `draftProposalReadiness()` checks three things: the quote is a verbatim span of the note, the chips are exactly the deterministic extraction over the quote, and every chip is confirmed. |
| `PeerConfirmation` | One person's `confirm` or `dispute` on (pillId, pillVersion, ruleId[, noteId]) | A `DRAFT-` ruleId needs a `noteId`. A dispute needs a `note`. |
| `peerConfirmAuthority` / `peerGate` | The Draft→Shadow peer gate for capture-derived versions | The confirmer must be a different identity (`identityKey`) from the author and, once the rule is proposed as a version, from that version's proposer (`createdBy`, who already vouched for it); and `pillEditAuthority` must allow the confirmer's role on the pill (owner, steward, approver or `roles_allowed`; `denied`/`roles_read_only` lose). The gate needs at least one eligible confirm and **no outstanding eligible dispute**. Each person's latest verdict counts. |
| `CAPTURE_AUDIT_ACTIONS` | New audit names, already spread into `AUDIT_ACTIONS` (`lib/capture/audit-actions.ts`) | `capture_task_created/answered/dismissed/blocked`, `voice_note_recorded/blocked`, `readback_confirmed/corrected/blocked`, `draft_from_note_proposed/blocked`, `peer_confirmed/disputed/confirm_blocked` |
| `CaptureStoreActions` | Implemented in `lib/governance/store.ts`: `createCaptureTask`, `answerCaptureTask`, `dismissCaptureTask`, `recordVoiceNote`, `recordDraftsFromNote`, `amendNoteFromReadBack`, `confirmReadBack`, `proposeFromNote`, `peerConfirm` (see "Contract changes") | Same conventions as the existing store: the actor is the session's `currentActor`, every call is audited, and a refusal is audited as `…_blocked` before `GovernanceError` is thrown. |

## Contract changes (Builder A, store landing)

All additive. B and C: rebase on this commit; nothing you already coded against changes shape.

| Change | Why |
|---|---|
| `CaptureStoreActions.recordDraftsFromNote(noteId, drafts: Pick<DraftFromNote, "rule" \| "quoteSpan">[]) => DraftFromNote[]` | Drafts had no way into the store. Author-only; replaces the note's drafts. Every quote must be a verbatim span of the note. **The store computes the chips itself** (with `DEFAULT_READ_BACK_VOCAB`, all `confirmed: null`); chips passed by a client are ignored. Audit `drafts_from_note_recorded` / `draft_from_note_blocked`. |
| `CaptureStoreActions.amendNoteFromReadBack(noteId, draftRuleId) => VoiceNote` | F3's "re-extract from `applyReadBackCorrections`": the corrected text becomes the note's `transcript` (the first one is kept in the new optional `VoiceNote.amendedFrom`), and the note's drafts are cleared. Re-extract from `note.transcript`, then call `recordDraftsFromNote` again. Refused once a version was proposed from the note. Audit `voice_note_amended` / `voice_note_blocked`. |
| `draftProposalReadiness` also refuses a draft with any **corrected** chip | The LLM read the misheard value, so a corrected draft must go through amend + re-extract. Store and UI stay in agreement. |
| `readBackMatchesExtraction(items, note, quoteSpan, vocab?)` | Exact chip check (kind, span, text, canonical, order). Snapshot validation uses it. |
| `captureTaskDedupeKey` / `findOpenCaptureTask(tasks, t)` | F1 dedupe: one open task per (incident, rule, kind) for gate tasks, per (incident, role) for close-outs, per (asset, role) for QR. `createCaptureTask` **refuses** a duplicate (`capture_task_blocked`), so call `findOpenCaptureTask(state.captureTasks, t)` first and reuse the open task. |
| `CAPTURE_AUDIT_ACTIONS` += `drafts_from_note_recorded`, `voice_note_amended` | For the two new actions. |
| `AuditEvent` gains optional `captureTaskId` and `noteId` | Structured links from audit events to capture records (snapshot invariants match on these, never on detail text). |
| `PillVersion.capture?: { noteId, draftRuleId, ruleId, quoteSpan, author }` (`CaptureProvenance` in `versions.ts`) | The PLAN's `{ noteId, draftRuleId, ruleId }` plus the quote and who said it. |

**Store behaviour B and C rely on** (`lib/governance/store.ts`, `GOVERNANCE_STORE_VERSION = 4`):
- State: `captureTasks: Record<CT-id, CaptureTask>`, `voiceNotes: Record<VN-id, VoiceNote>`, `draftsFromNotes: Record<VN-id, DraftFromNote[]>`, `peerConfirmations: PeerConfirmation[]`.
- Every capture action appends exactly one audit event. Any failure, including a malformed input, is a `…_blocked` event followed by `GovernanceError`. Audit details never contain transcript or chip text.
- `recordVoiceNote`: the author is always the session actor. Only schema fields are kept, so an attached audio blob is dropped and the persisted snapshot rejects a note with extra keys. With `taskId`, the task must be open, addressed to the actor's role, and on the same site as the note's `assetId`.
- `answerCaptureTask`: the actor must hold `createdFor`, and the note must be the actor's own, recorded with that `taskId`. `dismissCaptureTask` needs a non-blank reason (≤ 280 chars).
- `confirmReadBack`, `recordDraftsFromNote` and `amendNoteFromReadBack` are speaker-only. `confirmed: false` is audited as `readback_corrected` ("flagged wrong"). A proposed draft's chips are final.
- `proposeFromNote` proposes from the pill's **live Approved** version, through the existing edit policy. That means a read-only technician cannot propose: on chilled-water-leak the Chief Engineer proposes Rajesh's draft. The version-proposal audit event is `draft_from_note_proposed` (not `version_proposed`). The same draft cannot be proposed again while a version from it is not Retired.
- `peerConfirm`: on a real rule id, the version must be a **Draft** with `capture.ruleId === ruleId`. The store fills in `noteId`, and the excluded author is the note's speaker. On a `DRAFT-` id it needs `noteId` and a stored draft. Such a verdict is recorded but **does not count for the gate**: only verdicts on the proposed version do.
- `promoteToShadow` on a `capture` version requires `peerGate(...).allowed` after the existing authority check. A refusal is `version_shadow_blocked` with detail `Peer gate: <reason>`, plus `ruleId` and `noteId`.

**Glossary data change.** `data/roles.json` gained an optional `aliases` field, added to `roleSchema`. The aliases are `LEW` (duty_lew), `FSM`, `CFM`, `CE` and `FCC operator`, all short forms used in the pills and transcripts. Read-back matches each role's label, its id spoken as words ("duty lew") and its aliases. All-caps aliases match case-sensitively.

**Evidence keys.** No chip kind maps to an evidence key. The extract route already constrains rule paths to declared keys, so `evidence.yaml` keys are not part of the read-back vocabulary. Pass **pill rule ids** to `buildReadBackVocab({ ruleIds })` wherever the pills are available. Otherwise a spoken "TS-07" is read back as an unregistered asset tag. That is harmless (one extra chip) but noisy.

**Known policy consequence.** On chilled-water-leak, technicians are `roles_read_only`. That means a **second technician cannot peer-confirm**. The demo peer is Muhammad Hafiz (technical_services_lead). The research build list says "a second technician confirms". Letting technicians confirm would mean adding a dedicated peer-confirm grant to the pill's access block, which is a product decision. The contract implements the rule as specified.

## Features and acceptance criteria

### F1: Gate override or block becomes a capture task
When a human overrides a gate, or a gate blocks an action on an incident, a `CaptureTask` (`gate_override` / `gate_blocked`) is created for the acting role and appears on `/pulse` with a prompt such as "You overrode TS-07 — why? 15 s voice".
- [ ] Overriding or blocking a gate in `/incident/[id]` creates exactly one open task per (incident, rule, kind). Repeating the action does not duplicate it.
- [ ] The task is valid against `captureTaskSchema`. `createdFor` is the acting role, and `assetId` is the incident's `asset_id`.
- [ ] `/pulse` lists the open tasks for the signed-in role. Answer opens voice capture with the task bound. Dismiss asks for a reason.
- [ ] Each step is audited (`capture_task_created/answered/dismissed`). An attempt by a role other than `createdFor` is audited as `capture_task_blocked` and refused.

### F2: Hold-to-talk close-out voice note becomes a draft tile
At incident or work-order close-out, or from a task or QR page, the worker holds a button to talk. The audio goes to ASR, the transcript goes to the existing `/api/llm/extract`, and the result appears as a Draft tile showing the quote, the read-back chips and the engine stamp.
- [ ] The microphone does not open until `canStartRecording()` allows it, which needs the purpose notice shown and consent ticked. The named-credit checkbox defaults to off.
- [ ] Recording is hold-to-talk only, with no ambient capture. It auto-stops at 120 s.
- [ ] The stored `VoiceNote` passes `voiceNoteSchema`, and `transcriptSource` records the real provider, model and region. Raw audio is dropped after transcription unless retention was chosen, and retention is capped at 30 days.
- [ ] Extraction calls `/api/llm/extract` with `{ interviewId: note.id, turns: [{ t: "00:00:00", speaker: role label, text: transcript }] }`. The extract route's guard is unchanged, and drafts keep their `DRAFT-` ids.
- [ ] Each draft tile shows the quote verbatim (verified by `quoteMatchesNote`), `creditFor(note)`, and provider/model/source (live or recorded).
- [ ] The audit detail never contains transcript text, because every role can see the audit log.

### F3: Read-back chips
Every number, asset tag, role and time inside a draft's quote is shown as a chip that must be tapped to confirm or correct before the draft can leave Draft.
- [ ] Chips come from `readBackForDraft()`. The LLM is never asked to produce them.
- [ ] Each chip offers Confirm, or Wrong → type a correction. An unregistered asset tag is visibly flagged.
- [ ] Propose stays disabled, and `proposeFromNote` refuses with `draft_from_note_blocked`, until `draftProposalReadiness().allowed` is true.
- [ ] If any chip is corrected, the draft is re-extracted from `applyReadBackCorrections(transcript, chips)` and its chips are recomputed, because the LLM read the misheard value.
- [ ] Only the note's author answers chips (`readback_blocked` otherwise).

### F4: Peer confirmation before Shadow
A version proposed from a note cannot enter Shadow until an eligible person other than the speaker and the proposer confirms it, and while any eligible peer disputes it.
- [x] `PillVersion` gains `capture?: { noteId: string; draftRuleId: string; ruleId: string }` (plus `quoteSpan`, `author`). The snapshot schema validates it, and `GOVERNANCE_STORE_VERSION` bumps to 4.
- [x] For a version with `capture`, `promoteToShadow` requires `peerGate(...).allowed` in addition to `shadowPromotionAuthority`. A refusal is audited as `version_shadow_blocked` and carries the gate's reason.
- [x] `peerConfirm` refuses the author, the version's proposer, read-only roles and denied roles (`peer_confirm_blocked`). A dispute requires a note.
- [ ] The Canvas or approvals view shows the badge "Peer-confirmed by …" or "Disputed by …".
- [x] Versions that did not come from capture behave exactly as before. The existing governance tests stay green unchanged.

### F5: QR tap-to-teach `/c/[assetId]`
A QR code on equipment opens a page that already knows the asset, its site, location and pill. The worker only records what is new.
- [ ] `/c/AHU-23-01` resolves through `resolveAssetRef` and shows the equipment, site, location and the pill(s) whose scope covers the site type. An unknown id returns 404.
- [ ] The page creates an `asset_qr` task for the signed-in role and opens F2 capture with the task and asset bound.
- [ ] The route stays behind the default-deny middleware, so sign-in is required. Do **not** add it to the public allowlist.
- [ ] The layout works at phone width with gloved, one-thumb use: a single primary hold-to-talk control.

## Ownership split (three parallel builders)

Each builder edits only the files listed for them. Anything else they need, they request from the owner.

**Builder A: governance store, peer confirm, capture tasks, tests**
- `lib/governance/store.ts`: implement `CaptureStoreActions` and add `captureTasks`, `voiceNotes`, `draftsFromNotes` and `peerConfirmations` state, plus the peer gate in `promoteToShadow`.
- `lib/governance/versions.ts`: add the `PillVersion.capture` field.
- `lib/governance/snapshot.ts`: schemas and invariants for the new state, and `GOVERNANCE_STORE_VERSION` → 4. Persisted notes must not keep audio.
- `lib/governance/audit.ts`: already spreads `CAPTURE_AUDIT_ACTIONS`. A owns any further change.
- `lib/governance/__tests__/capture-store.test.ts` (new): store-level tests for every action, refusal and audit event.
- `lib/capture/contract.ts` and its tests: A is the contract steward after this commit and merges change requests from B and C.

**Builder B: voice capture UI, ASR route, read-back, QR page**
- `app/api/capture/transcribe/route.ts` (new): the server ASR route. Same patterns as `/api/llm/extract`: `callerOf`, rate limit, `NO_STORE`, bounded body (audio needs its own size limit, at most about 2 MB for 120 s of opus), recorded fallback.
- `lib/capture/asr.ts` (new, server-only): the provider chain, returning `TranscriptSource`.
- `components/capture/VoiceCapture.tsx`, `components/capture/ConsentNotice.tsx`, `components/capture/ReadBackChips.tsx` (new).
- `app/c/[assetId]/page.tsx` (new).
- `data/fixtures/capture/` (new): recorded transcripts for the offline demo.

**Builder C: incident, pulse and canvas integration**
- `app/incident/[id]/**`: emit `createCaptureTask` on gate override or block.
- `app/pulse/**`: the open-tasks list, with Answer opening B's `VoiceCapture` and Dismiss.
- `app/canvas/[pillId]/**` and `app/approvals/**`: draft-from-note tiles (quote, credit, chips state, engine stamp) and the peer-confirm badge and buttons, which call A's actions.
- Incident close-out entry point into `VoiceCapture`.

**Interfaces between builders.**
- C consumes B's `<VoiceCapture taskId? assetId onNote(note: VoiceNote, drafts: DraftFromNote[]) />`. Until B lands, C stubs it with a typed fixture.
- B and C call only A's store actions. Until A lands, they use a local mock typed as `CaptureStoreActions`.

**Merge order.** A merges first, because the store shape is consumed by everyone. B and C rebase on A. Every builder runs the full gate before pushing: `npx tsc --noEmit && npx vitest run && npx next build`.

## ASR decision

**Recommendation.**
1. **Demo baseline: browser Web Speech API (`lang: "en-SG"`).** It needs no key and no server code, and it gives live interim text. It has two caveats:
   - It is not offline. In Chrome, recognition is server-based by default: audio goes to the browser vendor's service, and that vendor's region is undocumented ([MDN](https://developer.mozilla.org/docs/Web/API/SpeechRecognition)).
   - On-device recognition (`processLocally` / `SpeechRecognition.available()`) exists in recent Chrome ([MDN](https://developer.mozilla.org/docs/Web/API/SpeechRecognition/processLocally)), but **en-SG availability is unverified**. Edge's on-device list does not include it.

   Record `region: "browser-vendor"`, or `"on-device"` only when `processLocally` was granted. Always offer a typed fallback (`provider: "typed"`).
2. **Server ASR for production: Tencent Cloud ASR, `ap-singapore` endpoint (`asr.ap-singapore.tencentcloudapi.com`).** Tencent's API docs list a Singapore region endpoint ([Tencent Cloud ASR API](https://www.tencentcloud.com/document/api/1118/66917)), which makes this the only option here with documented Singapore-region processing.
   - **Unverified:** whether the English (`16k_en`) engine is served from the Singapore region, and how its Singapore-English WER compares. Run the 50-clip test from the research doc before claiming either.
   - It needs a Tencent Cloud intl account. The TokenHub KYC lesson in LESSONS.md applies, so plan for activation delay.
3. **Fallback: OpenAI transcription (`gpt-4o-transcribe` / `gpt-4o-mini-transcribe`).** Use it when the Tencent account is not active.
   - OpenAI offers Singapore **data-at-rest** residency for eligible API projects ([OpenAI](https://openai.com/index/introducing-data-residency-in-asia/)).
   - Its inference-residency regions do not list Singapore ([help article](https://help.openai.com/en/articles/9903489-data-residency-and-inference-residency)), so treat audio as **processed offshore (likely US)** and record `region: "us"`.
   - Its Singapore-English accuracy is unbenchmarked. The research doc cites Whisper at about 2× its US-English WER.
4. **Recorded fixtures (`provider: "fixture"`)** close the chain, so the demo never depends on a live key.

**Not chosen (for now): MERaLiON.** MERaLiON-AudioLLM reports about 5% WER on Singapore-focused tests (developer-run). Its **licence is unverified for commercial use**, and it needs self-hosted GPU inference. Revisit it for the pilot.

**What makes misrecognition safe, whichever provider wins:**
- the deterministic read-back gate (F3);
- `transcriptSource` stamped on every note;
- the PDPA posture: notice and consent, audio discarded by default, and the provider and region recorded per note.

Production needs a data-intermediary contract with the chosen vendor and a review by Keppel's DPO.
