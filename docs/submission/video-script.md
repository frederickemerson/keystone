# Keystone demo video script

**Target length:** 7:00 (window 6:30 to 7:30; the handbook asks for 5 to 8 minutes).
**Covers the three required parts:** project overview (0:00 to 1:05), core agent features and how they are used (1:05 to 5:20), reflection on the build with CodeBuddy tips (5:20 to 6:45).
**Voice:** first person plural, calm and confident. Read at about 150 words a minute. Narration lines are written to be read as is.

**Before recording**

- Live URL: https://mosaic-psi-rouge.vercel.app (or `npm run dev` on http://localhost:3000 for a smoother capture).
- Demo passcode: `keystone` (it is shown on the sign-in page).
- Use a fresh browser profile, or clear the site's localStorage, so the governance store starts at v1.2.0 with nothing approved.
- Browser at 1440 x 900, zoom 110 %, cursor highlight on, notifications off.
- Have CodeBuddy Code open in a terminal in the repo, with `.codebuddy/skills/chilled-water-leak/` present, for the reflection section. The screenshots `docs/proof/04a-codebuddy-skill-invoked.png` and `04b-codebuddy-skill-ts07-answer.png` are the fallback if a live run is not possible.
- Have `npx vitest run` ready in a second terminal. Last verified run: **32 test files, 500 tests, all passing.**

---

## Timed script

### 0:00 to 0:20 · Hook: the expert retires

**On screen:** Landing page `/`, hero at rest: "The expert retires. His judgement stays." The notebook card shows the handwritten quote and the TS-07 card with "Blocked until".

**Narration:**
> At 8:09 one morning, chilled water is leaking above a bank's trading floor on level 23. Tan Wei Ming, our Chief Engineer, has made this call for eighteen years. Isolate the branch or the riser? Can anyone put the power back on? Next month he retires. This is Keystone, and it's how his judgement stays.

### 0:20 to 1:05 · The problem and the idea

**On screen:** Scroll slowly through "The problem" (today versus with Keystone), then the scroll-driven "How it works" story: I Capture, II Compile, III Apply, IV Learn, V Reuse. Stop on "Safe and bounded" with the three action classes.

**Narration:**
> Keppel's challenge is a familiar one. Critical know-how sits with a few experts, new staff take months to get up to speed, practice varies from asset to asset, and the knowledge leaves when the expert does.
> A chatbot doesn't fix that. It can answer a question, but it can't stop an unsafe action, show where an answer came from, or be tested and rolled back.
> So Keystone compiles judgement into an Intelligence Pill. It's a plain-text package of rules, evidence, provenance and tests, with an owner, an approver and a version number. We capture it, compile it, apply it to live incidents, learn from the outcomes and reuse it across the portfolio. Every action falls into one of three classes: recommend, requires approval, or must escalate.

### 1:05 to 1:25 · Sign in as the expert

**On screen:** Click "Hear the onboarding call". You land on `/sign-in`. Choose **Tan Wei Ming · Chief Engineer**, type `keystone`, then sign in. You land on `/capture`.

**Narration:**
> Each person signs in with a role, and what they can see and do comes from that role, enforced on the server. We'll start as the expert himself, Tan Wei Ming.

### 1:25 to 2:05 · Expert call: capturing what was never written down

**On screen:** `/capture`. Play the call for a few seconds so the live captions and the "rule extracted" chips are visible. Then click the **00:23:10 "Contradiction caught"** marker on the call timeline. The contradiction card shows 00:06:30 "always isolate the whole riser" against 00:22:15 "for an AHU branch leak, isolate the sub-valve and leave the riser open".

**Narration:**
> This is the onboarding call. The interviewer isn't working from a questionnaire. It uses Critical Decision Method and ACTA probes, the techniques cognitive scientists use to draw out tacit expertise: "walk me through the last time this happened", "what would a new engineer get wrong?"
> Rule candidates appear as he speaks, each tied to the moment he said it.
> Now the important part. At six minutes he says "always isolate the whole riser". At twenty-two minutes he says "for an AHU branch leak, isolate the sub-valve". The interviewer catches the contradiction and asks him about it. It doesn't throw either statement away.

### 2:05 to 2:35 · Decision Canvas: the expert stays in charge

**On screen:** Open `/canvas/technical-services-chilled-water-leak`. Show the resolved contradiction with its distinguishing condition (00:23:30), which becomes TS-02. Hover over one tile to show its transcript quote and timestamp. Click **Confirm** on one tile and **Edit** on another.

**Narration:**
> His answer becomes the distinguishing condition: isolate the sub-valve when it's accessible and actually stops the flow, and isolate the riser when it isn't. That's rule TS-02.
> On the Decision Canvas, every candidate rule comes with the quote and timestamp it came from. The expert confirms it, edits it or rejects it. Nothing goes into the pill until he has signed off.

### 2:35 to 2:50 · Switch user to the Asset Operations Manager

**On screen:** Open **Switch user** in the sidebar and choose **Priya Nair · Asset Operations Manager**. Open `/incident/INC-2026-1011`.

**Narration:**
> Now the incident itself. We switch to Priya Nair, the Asset Operations Manager. She's the person who supervises the AI's recommendations during the incident.

### 2:50 to 3:55 · Incident room: TS-07 blocks the AI

**On screen:** Incident room for the L23 leak at Harbourfront One. Step the evidence timeline forward to **step 10 of 17** (or open `/incident/INC-2026-1011?step=10`). The proposal "Re-energise AHU-23-01 / DB-23A" appears, and the **TS-07 v1.2.0 Blocked** gate turns red: LEW sign-off missing, plus two more items (`lew_signoff`, `insulation_resistance_ok`, `area_dry`). Click **Why** to open the drawer. Point out evidence used versus missing, the rule and its version, and the risk if the gate is ignored. Click **Hear the expert** and let about four seconds of the 00:14:32 clip play. Scroll to **What would change the decision?** Close the drawer and click **Escalate to Rahul Menon** (the duty LEW).

**Narration:**
> The evidence comes in step by step: the leak alarm, the isolation, a moisture reading. At step ten the AI proposes re-energising the AHU and the distribution board, because the tenant wants their floor back.
> TS-07 blocks it. The Licensed Electrical Worker hasn't signed off, insulation resistance hasn't been tested, and the area isn't confirmed dry. The block comes from a deterministic gate in the rule engine, so the language model can't argue its way past it, and neither can anyone else.
> Priya wants to know why, so she opens the Why drawer. It shows the rule and its version, which evidence is confirmed and which is missing, and the risk if she ignores it. And here is the source:
> *(clip plays: "never re-energise before the LEW signs off…")*
> That's Tan Wei Ming's own voice, at fourteen minutes thirty-two. The drawer also tells her exactly what would change the decision: those three pieces of evidence, confirmed.
> This is outside what the AI is allowed to decide, so it escalates to a named person: Rahul Menon, the duty LEW. Nothing runs without a human.

### 3:55 to 4:20 · Reuse: apply to Harbourfront DC1

**On screen:** Click **Apply to Harbourfront DC1**. The asset overlay panel shows the differences: the tenant first notice is gone, a client-SLA notice through the Critical Facilities Manager appears, and TS-07 now escalates to **Steven Wong · DC Critical Facilities Manager**.

**Narration:**
> Now the same pill at a colocation data centre. We don't fork it or rewrite it. Asset overrides change who gets the escalation and how the client is told. A data hall escalates to the Critical Facilities Manager and uses a client-SLA notice instead of a tenant notice. The expert's judgement stays the same, and only the context around it changes. That's how one pill scales across a portfolio.

### 4:20 to 5:20 · Learning: a governed change, from correction to rollback

**On screen:** Open `/learning/technical-services-chilled-water-leak`. Follow the step rail:
1. **Capture outcome:** the leak was isolated in 7 minutes.
2. **Expert correction**, as Tan Wei Ming (switch user if needed): change the TS-02 deadline from **15 to 10 minutes**, with a reason.
3. **Diff:** v1.2.0 → v1.3.0.
4. **Validate evals:** v1.2.0 passes 5 of 6 replayed incidents. The one that fails is the tenant-area isolation deadline, the same thing the expert just corrected. Show that the proposed version fixes it and that there are no regressions.
5. **Shadow:** as the author, Tan Wei Ming can't promote it. Click the one-click hand-off **Switch user to Priya Nair · Asset Operations Manager** (exact label comes from the persona), start Shadow and show the agreements.
6. **Approve:** use **Switch user** to choose **Goh Boon Kheng · Head of Technical Services**, the pill's approver of record. Approve.
7. **Roll back:** click **Roll back to v1.2.0**, enter a reason, and show that the history keeps every version, with v1.3.0 marked Retired.

**Narration:**
> A pill also has to learn, under governance. The outcome is captured: the leak was isolated in seven minutes. Tan Wei Ming corrects TS-02's deadline from fifteen minutes to ten. That creates a new draft version, and we can see exactly what changed.
> Before anyone approves it, we replay it against every past incident in the pill's evals. The current version fails one case, and it's the very deadline he just corrected. The new version passes it, with no regressions.
> He wrote the change, so he can't promote it. Priya puts it into shadow mode, where it runs silently beside the approved version.
> Then the approver of record, Goh Boon Kheng, Head of Technical Services, signs it off. Author, steward and approver are three different people, and the code enforces that separation of duties.
> If it turns out to be wrong, rollback is one click. The rollback adds a new version and deletes nothing, so the audit trail stays complete.

### 5:20 to 5:45 · Responsible AI, briefly

**On screen:** Split screen. On the left, the terminal runs `npx vitest run` and ends on "Test Files 32 passed (32) · Tests 500 passed (500)". On the right, use **Switch user** to choose **Rajesh Kumar · Technician** and show that the incident's tenant name is masked.

**Narration:**
> Here's the responsible-AI part in one breath. Gates are deterministic and evidence counts only when it's confirmed true. Redaction happens on the server, so a technician's browser never receives the tenant's name. Every decision is audited. And it's all tested: 500 tests, including adversarial and property-based tests on the gates and the governance rules. The language model handles language. It never decides on a safety action.

### 5:45 to 6:45 · Reflection: how we built it with CodeBuddy

**On screen:** Show `docs/proof/01a-codebuddy-plan-mode-hy4-subagents.png`, then `01b`/`01c` (plan-mode clarifying questions answered by a sub-agent), `02c-codebuddy-scaffold-build-pass-7-routes.png` and `03a-codebuddy-hy4-learning-screen-build.png`. Then show CodeBuddy Code live, or `04a`/`04b`: the pill folder in `.codebuddy/skills/`, the skill invoked, and the answer that TS-07 blocks and escalates to the duty LEW with the Chief Engineer's quote.

**Narration:**
> We built Keystone in five days. CodeBuddy Code was our main builder. We started in Plan mode, which produces a plan we could review before any files changed. Sub-agents answered the plan's clarifying questions in parallel. CodeBuddy scaffolded the app and built the pills, the rule engine and the screens, mostly on Hunyuan hy4-preview, with hy3 and a DeepSeek flash model for faster passes.
> Our favourite moment was this one. Because a pill is a standard SKILL.md package, we copied it unchanged into CodeBuddy's skills folder. CodeBuddy found it, loaded it, and reached the same TS-07 decision as our engine: blocked, escalate to the duty LEW, quoting the Chief Engineer. The knowledge belongs to the organisation and isn't tied to our app.
> We also used Claude Code for planning, code review and integration, mainly the governance layer, the data schemas and the cross-file tests. Two tools, each doing what it does best.
> Three tips. Start in Plan mode and freeze scope early. Put the language model in charge of language and nothing else. And write your safety rules as tests, not comments.

### 6:45 to 7:00 · Close

**On screen:** Back to the landing hero, then cut to the cover image (`docs/submission/cover.png`) with the live URL beneath it.

**Narration:**
> Tan Wei Ming will retire. With Keystone, his judgement stays, and it stays governed, tested and owned by the organisation. This is Keystone, for Keppel's AI HARVEST challenge.

**Total: about 7:00.**

---

## Shot list

| # | Time | Shot | Source | Notes |
|---|------|------|--------|-------|
| 1 | 0:00 | Landing hero at rest | `/` | Hold 3 s before speaking. |
| 2 | 0:20 | Scroll through the problem and the "How it works" story | `/` | Scroll slowly and evenly. The story is scroll-scrubbed. |
| 3 | 0:58 | "Safe and bounded" section | `/` | The three action classes. |
| 4 | 1:05 | Sign-in persona picker, then Tan Wei Ming | `/sign-in` | Passcode `keystone`. |
| 5 | 1:25 | Expert call playing, captions and rule chips | `/capture` | About 5 s of audio. |
| 6 | 1:45 | Jump to the 00:23:10 contradiction | `/capture` | Zoom in on the contradiction card. |
| 7 | 2:05 | Decision Canvas: resolved TS-02, confirm and edit | `/canvas/technical-services-chilled-water-leak` | Hover to show the quote and timestamp. |
| 8 | 2:35 | Switch user to Priya Nair | sidebar | |
| 9 | 2:50 | Timeline stepped to 10 of 17, TS-07 Blocked | `/incident/INC-2026-1011?step=10` | Zoom in on the red gate. |
| 10 | 3:15 | Why drawer, Hear the expert (00:14:32), What would change the decision | Incident room | Make sure audio is captured. |
| 11 | 3:45 | Escalate to Rahul Menon | Incident room | Show the confirmation or audit line. |
| 12 | 3:55 | Apply to Harbourfront DC1 overlay | Incident room | Steven Wong (CFM) as the escalation target. |
| 13 | 4:20 | Learning steps 1 to 3: outcome, correction 15 → 10, diff | `/learning/technical-services-chilled-water-leak` | |
| 14 | 4:40 | Learning step 4: eval replay | same | v1.2.0 passes 5/6; the correction fixes the failing case. |
| 15 | 4:55 | Learning steps 5 and 6: hand-off to Priya, shadow, switch to Goh Boon Kheng, approve | same | Point out separation of duties. |
| 16 | 5:10 | Learning step 7: roll back, history kept | same | |
| 17 | 5:20 | Split: vitest 500 passing, and the Technician view with masking | terminal + app | |
| 18 | 5:45 | CodeBuddy proof screenshots 01a, 01b, 01c, 02c, 03a | `docs/proof/` | Ken Burns pan, about 4 s each. |
| 19 | 6:10 | CodeBuddy skill run: same TS-07 decision | live CodeBuddy, or `docs/proof/04a`, `04b` | |
| 20 | 6:45 | Landing hero, then the cover card with the URL | `/`, `docs/submission/cover.png` | End card for 3 s. |

---

## 60-second backup cut

Use this if the full video can't be recorded, or as a teaser. It reuses shots 1, 6, 9, 10, 12, 14 to 16 and 19.

| Time | On screen | Narration |
|------|-----------|-----------|
| 0:00 to 0:08 | Landing hero | "Our Chief Engineer is retiring. Eighteen years of judgement on leaks, power and tenants. Keystone keeps it." |
| 0:08 to 0:18 | `/capture`, contradiction at 00:23:10 | "An AI onboarding call draws out what was never written down. It catches contradictions, and the expert confirms every rule." |
| 0:18 to 0:33 | Incident room, step 10, TS-07 Blocked, then Why drawer with the clip | "On a live leak, the AI proposes restoring power. Rule TS-07 blocks it: no LEW sign-off. It's a deterministic gate the model can't talk past, and here's the expert saying why, in his own voice." |
| 0:33 to 0:40 | Escalate to Rahul Menon, then Apply to Harbourfront DC1 | "It escalates to a named person. The same pill runs at a data centre with different escalation, without a rewrite." |
| 0:40 to 0:52 | Learning: correction 15 → 10, eval replay, shadow, approve, rollback | "Corrections are replayed against past incidents, shadowed, approved by a different person, and can be rolled back in one click." |
| 0:52 to 1:00 | CodeBuddy skill answer, then the cover card | "Built with CodeBuddy, and the pill runs as a native CodeBuddy skill. Keystone: expert judgement, governed." |

---

## Claims check (every number in the script, and where it comes from)

| Claim | Source in the repo |
|---|---|
| 500 tests, 32 files, all passing | `npx vitest run`, run 12 Oct 2026 |
| Adversarial and property-based tests | `lib/governance/__tests__/adversarial.property.test.ts`, `lib/engine/__tests__/properties.test.ts` (fast-check) |
| TS-07 quote at 00:14:32 | `pills/technical-services/chilled-water-leak/provenance.json` |
| Contradiction at 00:06:30 vs 00:22:15, resolved at 00:23:30, marker at 00:23:10 | `README.md` demo path; `components/capture/CallPanel.tsx` |
| Step 10 of 17, TS-07 Blocked | `README.md`; `docs/DECISIONS.md` D5 |
| Missing evidence `lew_signoff`, `insulation_resistance_ok`, `area_dry` | `README.md` demo path step 4 |
| Escalation to Rahul Menon (duty LEW); DC1 escalation to Steven Wong (CFM) | `data/roles.json`; `README.md` step 7 |
| TS-02 correction 15 → 10; v1.2.0 fails only the deadline eval | `evals/eval-2025-09-tenant-area-isolation-deadline.yaml` |
| Author can't promote; hand-off to Priya | `docs/DECISIONS.md` D2 |
| Approver of record is Head of Technical Services (Goh Boon Kheng) | `SKILL.md` `approver: head_technical_services`; `data/roles.json` |
| Rollback appends a version and marks the old one Retired | `README.md` Tests; `lib/governance` |
| Technician never receives the tenant name | `docs/DECISIONS.md` D1 |
| CodeBuddy skill reached the same TS-07 decision | `README.md` "How it installs"; `docs/proof/04a`, `04b` |
| Models: hy4-preview, hy3, DeepSeek flash (`deepseek-v4.1-flash`) | `README.md` Built with |
| Claude Code's role: planning, review, governance, data and integration | `README.md` Built with |

Don't show a live model swap. The app doesn't include a model-swap control. The claim that "a model swap gives the same decision" holds by construction, because the engine is deterministic, and the narration says only that the model never decides.
