# Keystone — demo video script

> ## ⚠ SUPERSEDED — do not record from this file
>
> The script that ships with the submission is **`video-script-v2.md`** (measures 6:13–6:58
> and covers the three things the handbook asks of the video, including the CodeBuddy build
> reflection this one lacks).
>
> This file is kept for its shot lists only. **A claims review found false statements in it**
> — stale test counts, narration describing speech synthesis as the expert's "own voice", and
> a model-swap demo step for a control the app does not have. See `docs/review/claims-audit.md`.
> Reuse a shot from here only after checking the claim attached to it.


**Runtime: 7:30.** The handbook allows **5–8 minutes**, so this sits with 30 seconds of
headroom at the top end.

> **Handbook requirement, quoted (§8, Submission Requirements — "Demo video"):**
> *"A 5–8 minute video covering: Project overview · Core Agent features and how it's used ·
> A short reflection on your build approach and any development tool tips with reference to
> CodeBuddy/WorkBuddy."*
>
> **Handbook requirement, quoted (§8, Project Basic Requirements):**
> *"The project must be original and built on at least one of the products CodeBuddy or
> WorkBuddy. Proof of product usage is mandatory: chat screenshots, API call logs, or a
> written development-process description. **Without proof, the project will not proceed to
> scoring.**"*

Because proof of CodeBuddy usage is a hard gate, **82 seconds of this cut — scenes 15, 21 and
22 — are CodeBuddy on screen**, not a closing credit. Scene 15 sits in the middle of the demo,
where it carries an argument rather than an acknowledgement.

**Deck of what the judges score** (handbook §11): Impact & Relevance · Human-Centered Design ·
AI Interaction · Technical Execution · Feasibility · Demo & Storytelling · Innovation &
Creativity · UX & Accessibility · Responsible AI & Ethics · Overall Quality. Ten dimensions,
ten points each. The scene map at the end says which scene pays for which dimension.

**Voice:** first person plural. Calm, unhurried, no selling. Read at about 150 words a minute.
Short sentences. Every narration line below is written to be read aloud exactly as printed.

---

## Before you record

- **Live URL:** `https://keystone-tencent.vercel.app` — verified HTTP 200 on 13 Oct 2026.
  (The old `mosaic-psi-rouge.vercel.app` is dead; it 404s. Do not use it anywhere.)
  `npm run dev` on `http://localhost:3000` is the smoother capture if the network is unreliable.
- **Demo passcode:** `keystone` — it is printed on the sign-in page, so showing it is fine.
- **Fresh browser profile**, or clear the site's localStorage, so the governance store starts
  at **v1.2.0 Approved** with nothing proposed and nothing approved.
- Browser at **1440 × 900**, zoom 110 %, cursor highlight on, notifications off, dock hidden.
- **Terminal one:** `npx next build && npx vitest run`, left on the summary line.
  Last verified 13 Oct 2026: **87 test files, 1,061 tests passed, tsc 0 errors.** Re-run before
  recording. Without a build first the terminal reads `1,060 passed | 1 skipped` — one test
  greps the build output for a leaked key — and the narration's "over a thousand tests" still holds.
- **Terminal two / second window:** CodeBuddy Code open in the repo with
  `.codebuddy/skills/chilled-water-leak/` present, for scenes 15 and 21. If a live run is not
  possible, `docs/proof/04a-codebuddy-skill-invoked.png` and
  `04b-codebuddy-skill-ts07-answer.png` are the verified fallback and show the same thing.
- **Audio:** scenes 11 and 6 play the app's synthetic voice. Capture system audio.
- **Do not propose the frontline draft in the recording profile.** Proposing it creates v1.3.0,
  which changes the version numbers you read aloud in scenes 18 and 19.
- **Do not present hold-to-talk as working.** Recognition of real Singapore-accented microphone
  speech is untested. Use the labelled **demo note**.
- **Music:** one sleek, upbeat bed, ducked to about −22 dB under narration. Let it come up full
  only at scene 1 (0:00–0:08, before the first line) and scene 23 (the end card). It should
  never fight the synthetic-voice moments in scenes 6 and 11 — cut the bed under those.

---

# Shot list

## Act I · The problem — no product on screen (0:00 – 0:48)

Nothing of the app appears until 0:48. A judge should feel the pain before they see a UI.

### Scene 1 — 0:00 (0:28) · The morning it goes wrong
**URL:** none — title card.

**On screen:** Black. Type-on, one line at a time, over a slow rise of the music bed:
`08:09` · `Level 23` · `Chilled water, ceiling void` · `Live distribution board, 1.5 m away` ·
`Below: a bank's trading floor`. Then one last card: `One man knows what to do next.`
Hold 2 s before the first word of narration.

**Narration:**
> Eight-oh-nine in the morning. Chilled water is leaking into a ceiling void on level
> twenty-three of a Grade A office tower. It is tracking toward a live distribution board.
> Below it is a bank's trading floor. One man knows what to do next. Tan Wei Ming, Chief
> Engineer, eighteen years at this asset. Next month, he retires.

### Scene 2 — 0:28 (0:20) · Why the obvious answers fail
**URL:** none — title card.

**On screen:** Four short lines from the Keppel brief, appearing and greying out one by one:
`Knowledge held by a few` · `New staff take months` · `Practice varies by asset` ·
`It leaves when they do`. Then two struck-through words: ~~Wiki~~ ~~Chatbot~~.

**Narration:**
> When he goes, the judgement goes with him. Keppel named the problem: knowledge held by a few
> experts, new staff slow to reach competence, best practice applied inconsistently. And the
> usual fixes do not hold. A wiki goes stale the week it is written. A chatbot will answer —
> but it cannot refuse.

---

## Act II · What Keystone is (0:48 – 1:32)

### Scene 3 — 0:48 (0:16) · The reveal
**URL:** `/`

**On screen:** Landing hero at rest. *"The expert retires. His judgement stays."* The floating
cards are visible: Rajesh's voice note with the read-back highlights, the `TS-07 · No
re-energisation without LEW sign-off` card showing `Blocked until · lew_signoff ·
insulation_resistance_ok · area_dry`, and the `00:14:32` quote card. Hold 3 s before speaking.

**Narration:**
> This is Keystone. It compiles an expert's judgement into an Intelligence Pill: rules,
> evidence, provenance and tests — with an owner, an approver and a version number.

### Scene 4 — 1:04 (0:16) · The loop, and the bound on the AI
**URL:** `/#how-it-works`

**On screen:** Scroll slowly and evenly through the scroll-scrubbed story — **I Capture,
II Compile, III Apply, IV Learn, V Reuse** — and stop on **Safe and bounded**, holding on the
three action classes.

**Narration:**
> Five stages: capture, compile, apply, learn, reuse. And every rule carries an action class —
> recommend, requires approval, or must escalate. The pill states in advance what the AI is
> allowed to do.

### Scene 5 — 1:20 (0:12) · Sign in as the expert
**URL:** `/sign-in`

**On screen:** The persona picker. Choose **Tan Wei Ming · Chief Engineer**, type `keystone`,
sign in. Land on `/capture`.

**Narration:**
> Everyone signs in with a role. What you can see, and what you may change, comes from that
> role — and it is enforced on the server. We start as Tan Wei Ming.

---

## Act III · Capture and compile (1:32 – 2:38)

### Scene 6 — 1:32 (0:26) · The sentence that becomes a rule — and a live Tencent model
**URL:** `/capture?at=00:14:32`

**On screen:** The expert onboarding call, seeked to 00:14:32. Let the synthetic voice run
about four seconds so the captions move and a rule chip lands. Then move the cursor to the
provider badge and hold on it: **`Live · hy4-preview via TokenHub · 3.9 s`**. Press
**Ask for the next probe** once if the badge is not already live, and let the probe land. Keep
the amber line visible: *"Draft suggestion — Keystone has not asked this, and it confirms nothing."*

**Narration:**
> This is his onboarding call — a scripted transcript in the demo, read by a synthetic voice.
> At fourteen thirty-two he says the sentence that matters, and rule TS-07 appears beside it,
> tied to that exact span. The interviewer's next probe is live: Hunyuan hy4-preview, through
> TokenHub, served from Singapore. Three point nine seconds. It drafts a question. It confirms
> nothing.

### Scene 7 — 1:58 (0:18) · The contradiction it refuses to drop
**URL:** `/capture`

**On screen:** Click the **00:23:10 "Contradiction caught"** marker on the call timeline. The
card shows 00:06:30 *"always isolate the whole riser"* against 00:22:15 *"for an AHU branch
leak, isolate the sub-valve and leave the riser open"*.

**Narration:**
> At six minutes he said: always isolate the whole riser. At twenty-two minutes: for a branch
> leak, isolate the sub-valve. The interviewer catches it and asks him about it. Neither
> sentence is thrown away.

### Scene 8 — 2:16 (0:22) · The expert signs, not the model
**URL:** `/canvas/technical-services-chilled-water-leak?rule=TS-07`

**On screen:** The Decision Canvas with TS-07 highlighted. Hover a tile (or click its quote
button) to show the recorded quote and timestamp. Scroll to the resolved contradiction at
00:23:30, which became TS-02. Click **Confirm** on one tile and **Edit** on another.

**Narration:**
> His answer becomes the distinguishing condition — isolate the sub-valve when it is accessible
> and actually stops the flow, the riser when it is not. That is rule TS-02. Every tile shows
> the expert's own words and the timestamp they came from. He confirms, edits or rejects each
> one. Nothing enters the pill until he signs off, and every review is audited.

---

## Act IV · Apply — the frame the whole project rests on (2:38 – 4:22)

### Scene 9 — 2:38 (0:08) · Hand over to the supervisor
**URL:** `/incident/INC-2026-1011`

**On screen:** **Switch user** in the sidebar → **Priya Nair · Asset Operations Manager**. Land
on the incident room for the L23 leak at Harbourfront One.

**Narration:**
> Now the incident itself. We switch to Priya Nair, the Asset Operations Manager, who
> supervises what the AI proposes.

### Scene 10 — 2:46 (0:24) · The gate holds
**URL:** `/incident/INC-2026-1011?step=10#blocked-gate`

**On screen:** Step the replay to **Event 10 / 17** (T+08:42). Two pill cards are visible:
`Chilled water leak v1.2.0 · 13 rules · 3 triggered · 1 blocked` and
`Incident comms v1.0.0 · 7 rules · 2 triggered`. The red banner fires:
`AI proposal · recorded "Re-energise AHU-23-01 / DB-23A"` →
**`Blocked · Rule TS-07 v1.2.0 — LEW sign-off missing (+2 more)`**, with the missing keys
`lew_signoff, insulation_resistance_ok, area_dry`. Zoom in on the red gate.

**Narration:**
> Evidence arrives step by step: the alarm, the isolation, water reaching the electrics. At
> step ten of seventeen, an AI proposal — recorded for this demo — says re-energise the air
> handler and the distribution board, because the tenant wants their floor back. TS-07 blocks
> it. No LEW sign-off. No insulation test. The area is not confirmed dry. The gate is a pure
> function in a rule engine. The model cannot argue past it, and neither can anyone else.

### Scene 11 — 3:10 (0:24) · Why — in the expert's own voice
**URL:** `/incident/INC-2026-1011?step=10`

**On screen:** Click **Why?**. The drawer shows evidence used versus missing, the rule and its
version, and the risk if the gate is ignored. Point at the evidence meter:
`4 of 7 required evidence confirmed · Count of confirmed sources, not a probability.`
Click **Hear the expert** and let about four seconds of the 00:14:32 quote play. Scroll to
**What would change the decision?**

**Narration:**
> Priya wants to know why. The drawer gives her the rule, its version, the evidence she has,
> the evidence she is missing, and what happens if she overrides it. Then it gives her the
> source.
>
> *(let the synthetic voice read: "never re-energise before the LEW signs off…" — about 4 s)*
>
> That is Tan Wei Ming's sentence from fourteen thirty-two, read back by the app. And the
> drawer tells her exactly what would change the decision.

### Scene 12 — 3:34 (0:12) · It escalates to a person with a name
**URL:** `/incident/INC-2026-1011?step=10`

**On screen:** Close the drawer. Click **Escalate to Rahul Menon · Duty Licensed Electrical
Worker**. Show the confirmation and the audit line.

**Narration:**
> This is outside what the AI may decide, so it escalates to a named person: Rahul Menon, the
> duty Licensed Electrical Worker. Nothing executes without a human.

### Scene 13 — 3:46 (0:18) · When two experts disagree
**URL:** `/incident/INC-2026-1011?step=10`

**On screen:** Scroll to the **Cross-pill conflict · 1 of 1** panel. `XP-01 · Deadline before
the gate clears`. On the clock: `Incident comms v1.0.0 · TE-04 · Within 30 min · Must escalate`.
Gate that answers it: `Chilled water leak v1.2.0 · TS-07 · Blocked`. Hold on the adjudication
line: *"Goh Boon Kheng · Head of Technical Services — the approver both pills name in their
SKILL.md."*

**Narration:**
> Two domains now disagree. Tenant Experience says call the bank's account manager within
> thirty minutes. Technical Services says the answer does not exist yet. Keystone names the
> conflict, and names the one person senior to both pills who may settle it.

### Scene 14 — 4:04 (0:18) · The same judgement at a different asset
**URL:** `/incident/INC-2026-1011?step=10`

**On screen:** Click **Apply to Harbourfront DC1**. The overlay panel shows the differences: the
tenant first-notice action disappears, a client-SLA notice through the Critical Facilities
Manager appears, and TS-07 now escalates to **Steven Wong · DC Critical Facilities Manager**.

**Narration:**
> The same pill at a colocation data centre. We do not fork it and we do not rewrite it. Asset
> overrides change who is told and who is called. The expert's judgement is identical; only
> the context around it moves. That is how one pill covers a portfolio.

---

## Act V · CodeBuddy, where it carries the argument (4:22 – 4:52)

### Scene 15 — 4:22 (0:30) · The pill runs outside our app, in CodeBuddy
**URL:** none — CodeBuddy Code window (live), or `docs/proof/04a-codebuddy-skill-invoked.png`
then `04b-codebuddy-skill-ts07-answer.png`.

**On screen:** Cut to CodeBuddy Code. Show `.codebuddy/skills/chilled-water-leak/` in the file
tree, then the invoked prompt: *"/chilled-water-leak … Per this skill's rules.yaml, what is
TS-07's status, who is escalated to, and what did the Chief Engineer say (provenance.json)?
Read-only — don't edit or run commands."* Scroll its answer and hold on two frames:
**`TS-07 status: BLOCKED — must escalate`**, and the bottom line:
*"Do not re-energise AHU-23-01 / DB-23A. Call the duty LEW now… No LLM, technician, Duty
Manager, or facilities request can override this gate."*

**Narration:**
> And the pill is not trapped inside our app. It is a standard SKILL dot M-D package. We copied
> the folder unchanged into CodeBuddy's skills directory and asked CodeBuddy, read-only, what
> TS-07 says about this incident. CodeBuddy reached the same decision our engine did — blocked,
> escalate to the duty LEW — and quoted the Chief Engineer's own words back. Different runtime.
> Same judgement. The organisation owns the file, not the vendor.

---

## Act VI · Learn, under governance (4:52 – 6:04)

### Scene 16 — 4:52 (0:20) · A block is also a question
**URL:** `/incident/INC-2026-1011?step=10#capture-task`

**On screen:** **Switch user** → **Rajesh Kumar · Technician**. The escalation has raised the
**"Tell us why — 20 seconds"** card. Tick the consent notice, choose the labelled **demo note**,
show the read-back chips — numbers, times, asset tags, roles — and mark each one **Right**.
Click **Draft rule**.

**Narration:**
> A block is also a question. When the gate stopped Rajesh, Keystone asked him why — in twenty
> seconds. Every number, time, asset tag and role in his note is read back for him to confirm.
> Those are found by code, from the asset and role registers. The model never decides what a
> number means.

### Scene 17 — 5:12 (0:12) · One voice is not enough
**URL:** `/approvals`

**On screen:** **Promote to Shadow** refused by the peer gate. Switch to **Muhammad Hafiz ·
Technical Services Lead**; he confirms. (Fallback stills: `docs/capture/screens/c7-approvals-peer-gate-blocks-shadow.png`,
`c8-hafiz-peer-confirmed.png`.)

**Narration:**
> His note cannot reach even a trial run until someone who neither spoke it nor proposed it
> confirms it. Hafiz does. Any eligible peer could have disputed it instead, and a dispute
> holds the version.

### Scene 18 — 5:24 (0:20) · A correction, tested against history
**URL:** `/learning/technical-services-chilled-water-leak`

**On screen:** Follow the step rail. **I Capture outcome** — isolated in 7 minutes.
**II Expert correction** (switch to Tan Wei Ming) — TS-02's deadline **15 → 10 minutes**, with a
reason. **III Diff** — v1.2.0 → v1.3.0. **IV Validate evals** — the live version passes 5 of 6
replayed incidents; the one it fails is the tenant-area isolation deadline, the thing he just
corrected. Show the proposed version passing it with no regressions.

**Narration:**
> The outcome is recorded: isolated in seven minutes. Tan Wei Ming corrects TS-02's deadline
> from fifteen minutes to ten, with a reason. That makes a draft version, and we can see
> exactly what changed. Before anyone approves it, we replay it against every past incident in
> the pill. The live version fails one case — the very deadline he just corrected. The new one
> passes it, and breaks nothing else.

### Scene 19 — 5:44 (0:20) · Three people, and nothing deleted
**URL:** `/learning/technical-services-chilled-water-leak`

**On screen:** **V Shadow** — as Priya, **Promote to Shadow**, then **Replay 6 closed incidents**
→ **6/6 agreements**. **VI Approve** — Priya is refused: *"Separation of duties: Priya Nair put
v1.3.0 into Shadow, so someone else must approve it."* Hold on that refusal. Use the one-click
hand-off to **Goh Boon Kheng · Head of Technical Services**; approve. **VII Roll back** — roll
back to v1.2.0 with a reason; the history shows **v1.4.0** carrying the restored rules and
v1.3.0 marked **Retired**. Open the audit log: `version_proposed` → `version_shadowed` →
`version_approved` → `version_rolled_back`.

**Narration:**
> Priya puts it into shadow: six closed incidents replayed through both versions, six
> agreements. Then she is refused — she shadowed it, so she cannot approve it. Goh Boon Kheng,
> the approver of record, signs. Author, steward and approver are three different people, and
> the code enforces that. And when a version turns out to be wrong, rolling back adds a
> version. It never deletes one.

---

## Act VII · Responsible AI, and how we built it (6:04 – 7:30)

### Scene 20 — 6:04 (0:18) · What we will not claim
**URL:** `/connectors` (right half) + terminal (left half)

**On screen:** Split screen. Left: the terminal on the vitest summary —
`Test Files 87 passed · Tests 1061 passed`. Right: `/connectors`, scrolled to show
`Jev evidence suggestions · Live` beside `Tencent Cloud ADP agent · Adapter not configured` and
`Tencent Cloud ASR · Adapter not configured`. Hold on the "not configured" badges.

**Narration:**
> The responsible-AI part, briefly. The gate is a pure function — no model input, no clock, no
> randomness — and a test enforces that boundary. Redaction happens on the server, so a
> technician's browser never receives the tenant's name. Over a thousand tests. And where
> something is designed but not wired, the app says so, on screen, by name.

### Scene 21 — 6:22 (0:28) · How we built it, in CodeBuddy
**URL:** none — `docs/proof/01a-codebuddy-plan-mode-hy4-subagents.png`, then `01b`, `01c`, then
`02c-codebuddy-scaffold-build-pass-7-routes.png`, then `03a-codebuddy-hy4-learning-screen-build.png`.

**On screen:** Slow Ken Burns pan, about 5 s each. On 01a, hold on the model selector reading
**Hy4 preview**, the mode reading **Plan**, and the `Agent ×2` sub-agent lines. On 01b/01c, show
a clarifying question answered by a sub-agent. On 02c, the passing scaffold build.

**Narration:**
> Five days, two tools, scope frozen on day one. We started in CodeBuddy Code's Plan mode on
> Hunyuan hy4-preview, with sub-agents reading the spec and the research in parallel — so we
> reviewed a written plan before a single file changed. CodeBuddy scaffolded the application,
> the first version of both pills, the rule engine and the screens. We used Claude Code
> alongside it for architecture, review and the governance layer. Two tools, each on what it
> does best.

### Scene 22 — 6:50 (0:24) · Three tips, and one thing we have not done
**URL:** none — three tip cards, then a CodeBuddy still.

**On screen:** Three clean text cards, one per tip, about 5 s each. Then a last card:
`WorkBuddy · ADP — designed for, not yet tested`.

**Narration:**
> Three tips. Start in Plan mode and freeze scope before you build. Give the model language and
> nothing else — then model-agnostic is true by construction, not by assertion. And write your
> safety rules as tests, not comments; a judge can run a test. One honest note: WorkBuddy and
> Tencent Cloud ADP use the same SKILL dot M-D convention, and we built the export and the
> tests against their published constraints. We have not imported a pill into either one, and
> we are not going to say we have.

### Scene 23 — 7:14 (0:16) · Close
**URL:** `/`

**On screen:** Back to the landing hero for 4 s, then cut to the cover card
(`docs/submission/cover.png`) with `keystone-tencent.vercel.app` beneath it. Music up.

**Narration:**
> Tan Wei Ming will retire. His judgement stays — versioned, tested, owned by the organisation,
> and portable to the next tool that comes along. This is Keystone, for Keppel's AI HARVEST
> challenge.

**Total: 7:30.**

---

## Scene map — which scene pays for which judging dimension

| Judging dimension (handbook §11) | Scenes |
|---|---|
| Impact & Relevance | 1, 2, 14 |
| Human-Centered Design | 5, 8, 11, 16 |
| AI Interaction | 6, 10, 15, 16 |
| Technical Execution | 10, 18, 19, 20 |
| Feasibility | 14, 15, 20, 22 |
| Demo & Storytelling | 1, 2, 3, 10, 11 |
| Innovation & Creativity | 8, 13, 15, 16 |
| UX & Accessibility | 4, 9, 11, 17 |
| Responsible AI & Ethics | 11, 12, 19, 20, 22 |
| Overall Quality | 20, 21, 22, 23 |

And against the Keppel challenge's own eleven "Solution Should Be" properties:
human-supervised (9, 12, 19) · transparent (8, 11) · accountable (12, 19) · reliable (18, 20) ·
reusable (14, 15) · scalable (14) · governed (18, 19) · portable (15) · version-controlled (19) ·
secure (5, 20) · clearly bounded (4, 10, 12).

---

## 60-second backup cut

If the full video cannot be recorded, or as a teaser. Reuses scenes 1, 3, 10, 11, 15, 19, 23.

| Time | On screen | Narration |
|------|-----------|-----------|
| 0:00–0:10 | Title cards, then the landing hero | "A chilled-water leak above a trading floor. The one man who knows what to do retires next month. Keystone keeps his judgement." |
| 0:10–0:25 | `/incident/INC-2026-1011?step=10#blocked-gate` | "On a live leak, an AI proposal says restore power. Rule TS-07 blocks it — no LEW sign-off. The gate is a pure function. The model cannot argue past it." |
| 0:25–0:35 | Why drawer, "Hear the expert" plays | "And here is why, in the retiring engineer's own recorded words, timestamped." |
| 0:35–0:45 | CodeBuddy skill answer (`docs/proof/04b`) | "The pill is a SKILL dot M-D file. Dropped into CodeBuddy unchanged, CodeBuddy reaches the same decision. The knowledge belongs to the organisation." |
| 0:45–0:55 | `/learning/…` shadow, refusal, approve, rollback | "Corrections are replayed against past incidents, shadowed, and approved by a third person. Rollback adds a version. It never deletes one." |
| 0:55–1:00 | Cover card + URL | "Keystone. Expert judgement, governed." |

---

## Claims check — every number spoken, and where it comes from

| Claim in the narration | Source |
|---|---|
| Handbook: 5–8 minute video, three required parts | Handbook §8, "Demo video" |
| Handbook: proof of CodeBuddy/WorkBuddy usage is mandatory | Handbook §8, "Project Basic Requirements" |
| The four pain points named in scene 2 | Handbook §3, AI HARVEST, "The business issue" |
| `Live · hy4-preview via TokenHub · 3.9 s` | The probe badge on `/capture`; `docs/submission/footage/04-live-probe.png`; `docs/DECISIONS.md` D9, D10 |
| Step 10 of 17; `13 rules · 3 triggered · 1 blocked`; `7 rules · 2 triggered` | `/incident/INC-2026-1011?step=10`; `docs/submission/footage/07-incident-blocked.png` |
| `4 of 7 required evidence confirmed`, a count not a probability | Incident room evidence meter; `lib/engine/evaluate.ts` |
| Missing evidence `lew_signoff`, `insulation_resistance_ok`, `area_dry` | `pills/technical-services/chilled-water-leak/rules.yaml` (TS-07) |
| Quote at 00:14:32; contradiction 00:06:30 vs 00:22:15, resolved 00:23:30, marker 00:23:10 | `pills/…/provenance.json`; `components/capture/CallPanel.tsx` |
| Escalation to Rahul Menon (duty LEW); DC1 to Steven Wong (CFM) | `data/roles.json`; `pills/…/rules.yaml` `asset_overrides` |
| Cross-pill conflict XP-01, TE-04 vs TS-07, adjudicated by Goh Boon Kheng | `data/coordination.yaml`; `docs/submission/footage/09-cross-pill-conflict.png` |
| The gate is pure — no model input, no clock, no randomness | `lib/engine/__tests__/boundary.test.ts` |
| Over a thousand tests (87 files, 1,061 tests, 13 Oct 2026) | `npx next build && npx vitest run` |
| TS-02 correction 15 → 10; v1.2.0 fails only the deadline eval | `pills/…/evals/eval-2025-09-tenant-area-isolation-deadline.yaml` |
| Shadow 6/6 over 6 closed incidents | `components/learning/learning-utils.ts`; `docs/review/demo-path-audit.md` |
| Author ≠ shadow promoter ≠ approver, enforced in code | `lib/governance/approval.ts`; `docs/DECISIONS.md` D2 |
| Rollback appends v1.4.0 and marks v1.3.0 Retired | `lib/governance/versions.ts` |
| Peer gate before Shadow | `lib/capture/contract.ts` (`peerConfirmAuthority`, `peerGate`); `lib/governance/store.ts` |
| Read-back chips found by code, not by the LLM | `lib/capture/contract.ts` (`READ_BACK_KINDS`) |
| Technician's browser never receives the tenant name | `docs/DECISIONS.md` D1 |
| CodeBuddy reached the same TS-07 decision | `docs/proof/04a`, `04b`, verified 11 Oct 2026 |
| Plan mode, hy4-preview, sub-agents | `docs/proof/01a`, `01b`, `01c` |
| WorkBuddy / ADP designed for but untested | `README.md` "How it installs"; `lib/export/__tests__/adp-package.test.ts` |
| ADP and Tencent ASR adapters show "not configured" on screen | `/connectors`; `docs/submission/footage/14-connectors-adp.png` |

---

## Deliberately not in this video

Each of these would need something that does not exist, so no scene depends on it.

- **A live model swap on camera.** There is no model-swap control in the app. The claim that a
  different model gives the same gate decision holds by construction — the engine takes no model
  input — and the narration says only that the model never decides.
- **Hold-to-talk on real speech.** Recognition of Singapore-accented microphone speech is
  untested. Scene 16 uses the labelled demo note and says nothing about live recognition.
- **Live CodeBuddy on the deployed site.** The Vercel deployment has no CodeBuddy key; its live
  calls go through TokenHub. Scene 15's CodeBuddy run is local, and the narration describes it
  as a local skill invocation, not a production path.
- **A WorkBuddy or ADP import.** Never run. Scene 22 says so out loud.
- **A live extract call on camera.** It takes about 15 seconds; the probe in scene 6 returns in
  about 4. Use the probe.
- **A measured override rate.** `/pulse` shows "No overrides recorded yet — it is not a measured
  zero." Do not read a number off it.
