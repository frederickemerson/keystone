# Keystone demo video script

**Target length:** 7:25 (window 6:30 to 7:30; the handbook asks for 5 to 8 minutes).
**Covers the three required parts:** project overview (0:00 to 1:05), core agent features and how they are used (1:05 to 5:45), reflection on the build with CodeBuddy tips (5:45 to 7:10).
**Voice:** first person plural, calm and confident. Read at about 150 words a minute. Narration lines are written to be read as is.

**Before recording**

- Live URL: https://mosaic-psi-rouge.vercel.app (or `npm run dev` on http://localhost:3000 for a smoother capture).
- Demo passcode: `keystone` (it is shown on the sign-in page).
- Use a fresh browser profile, or clear the site's localStorage, so the governance store starts at v1.2.0 with nothing approved.
- Browser at 1440 x 900, zoom 110 %, cursor highlight on, notifications off.
- Have CodeBuddy Code open in a terminal in the repo, with `.codebuddy/skills/chilled-water-leak/` present, for the reflection section. The screenshots `docs/proof/04a-codebuddy-skill-invoked.png` and `04b-codebuddy-skill-ts07-answer.png` are the fallback if a live run is not possible.
- Have `npx vitest run` ready in a second terminal. Last verified run (12 Oct 2026): **46 test files, 712 tests, all passing.** Re-run before recording; the narration says "over 700 tests".
- Live AI on the Vercel deployment is Hunyuan hy4-preview via TokenHub, served from a dedicated Singapore endpoint, or recorded output, and the badge says which (OpenAI gpt-5.4-mini is a fallback).
- Frontline capture segment: use the labelled **demo note** (or type a note) on `/c/AHU-23-01`. Do not present hold-to-talk as working on Singapore-accented speech; real microphone speech is untested. Do **not** propose the captured draft in the recording profile: proposing it creates v1.3.0, which would change the version numbers in the Learning segment. The peer-gate shots use `docs/capture/screens/c7-approvals-peer-gate-blocks-shadow.png` and `c8-hafiz-peer-confirmed.png`. Sign in once more if you have an older session (tokens now carry a `jti`). This script does not show a live AI call. If you record one locally with CodeBuddy credentials, the badge will read Hunyuan hy4-preview via CodeBuddy; narrate whatever the badge shows.

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
> This is the onboarding call, simulated in the demo from a scripted transcript. The interviewer isn't working from a questionnaire. It uses Critical Decision Method and ACTA probes, the techniques cognitive scientists use to draw out tacit expertise: "walk me through the last time this happened", "what would a new engineer get wrong?"
> Rule candidates appear as he speaks, each tied to the moment he said it.
> Now the important part. At six minutes he says "always isolate the whole riser". At twenty-two minutes he says "for an AHU branch leak, isolate the sub-valve". In the interview, the interviewer catches the contradiction and asks him about it. It doesn't throw either statement away.

### 2:05 to 2:35 · Decision Canvas: the expert stays in charge

**On screen:** Open `/canvas/technical-services-chilled-water-leak`. Show the resolved contradiction with its distinguishing condition (00:23:30), which becomes TS-02. Hover over one tile, or click its quote button, to show the expert's recorded quote and timestamp. Click **Confirm** on one tile and **Edit** on another.

**Narration:**
> His answer becomes the distinguishing condition: isolate the sub-valve when it's accessible and actually stops the flow, and isolate the riser when it isn't. That's rule TS-02.
> On the Decision Canvas, every candidate rule shows the expert's own words and the timestamp they came from. Hover or click the quote button to read it. The expert confirms it, edits it or rejects it, and every review is audited. Nothing goes into the pill until he has signed off.

### 2:35 to 2:50 · Switch user to the Asset Operations Manager

**On screen:** Open **Switch user** in the sidebar and choose **Priya Nair · Asset Operations Manager**. Open `/incident/INC-2026-1011`.

**Narration:**
> Now the incident itself. We switch to Priya Nair, the Asset Operations Manager. She's the person who supervises the AI's recommendations during the incident.

### 2:50 to 3:55 · Incident room: TS-07 blocks the AI

**On screen:** Incident room for the L23 leak at Harbourfront One. Step the evidence timeline forward to **step 10 of 17** (or open `/incident/INC-2026-1011?step=10`). The proposal "Re-energise AHU-23-01 / DB-23A" appears, and the **TS-07 v1.2.0 Blocked** gate turns red: LEW sign-off missing, plus two more items (`lew_signoff`, `insulation_resistance_ok`, `area_dry`). Click **Why** to open the drawer. Point out evidence used versus missing, the rule and its version, and the risk if the gate is ignored. Click **Hear the expert** and let about four seconds of the 00:14:32 quote play (a synthetic browser voice reads it). Scroll to **What would change the decision?** Close the drawer and click **Escalate to Rahul Menon** (the duty LEW).

**Narration:**
> The evidence comes in step by step: the leak alarm, the isolation, water reaching the electrics. At step ten an AI proposal, recorded for this demo, suggests re-energising the AHU and the distribution board, because the tenant wants their floor back.
> TS-07 blocks it. The Licensed Electrical Worker hasn't signed off, insulation resistance hasn't been tested, and the area isn't confirmed dry. The block comes from a deterministic gate in the rule engine, so the language model can't argue its way past it, and neither can anyone else.
> Priya wants to know why, so she opens the Why drawer. It shows the rule and its version, which evidence is confirmed and which is missing, and the risk if she ignores it. And here is the source:
> *(synthetic voice reads: "never re-energise before the LEW signs off…")*
> That's Tan Wei Ming's sentence from fourteen minutes thirty-two, read back by the app in a synthetic voice. The drawer also tells her exactly what would change the decision: those three pieces of evidence, confirmed.
> This is outside what the AI is allowed to decide, so it escalates to a named person: Rahul Menon, the duty LEW. Nothing runs without a human.

### 3:55 to 4:20 · Reuse: apply to Harbourfront DC1

**On screen:** Click **Apply to Harbourfront DC1**. The asset overlay panel shows the differences: the tenant first notice is gone, a client-SLA notice through the Critical Facilities Manager appears, and TS-07 now escalates to **Steven Wong · DC Critical Facilities Manager**.

**Narration:**
> Now the same pill at a colocation data centre. We don't fork it or rewrite it. Asset overrides change who gets the escalation and how the client is told. A data hall escalates to the Critical Facilities Manager and uses a client-SLA notice instead of a tenant notice. The expert's judgement stays the same, and only the context around it changes. That's how one pill scales across a portfolio.

### 4:20 to 4:45 · Frontline capture: asking why at the moment it matters

**On screen:** **Switch user** to **Rajesh Kumar · Technician**. Open `/c/AHU-23-01` (phone-width window if possible). Tick the consent notice, choose the demo note (it is labelled as a demo note with no audio), then show the read-back chips and mark them **Right**. Click **Draft rule** and show the draft with his quote. Cut to the screenshot `c7-approvals-peer-gate-blocks-shadow.png` (Promote to Shadow blocked by the peer gate), then `c8-hafiz-peer-confirmed.png`.

**Narration:**
> A gate block is also a question. When TS-07 stops a technician, Keystone asks him why, in twenty seconds. Here Rajesh scans the QR code on AHU-23-01, agrees to the notice, and leaves a note. He checks every number, tag and role we heard. Before the rule can run in shadow, a colleague who neither said it nor proposed it must confirm it.

### 4:45 to 5:45 · Learning: a governed change, from correction to rollback

**On screen:** Open `/learning/technical-services-chilled-water-leak`. Follow the step rail:
1. **Capture outcome:** the leak was isolated in 7 minutes.
2. **Expert correction**, as Tan Wei Ming (switch user if needed): change the TS-02 deadline from **15 to 10 minutes**, with a reason.
3. **Diff:** v1.2.0 → v1.3.0.
4. **Validate evals:** v1.2.0 passes 5 of 6 replayed incidents. The one that fails is the tenant-area isolation deadline, the same thing the expert just corrected. Show that the proposed version fixes it and that there are no regressions.
5. **Shadow:** as the author, Tan Wei Ming can't promote it. Click the one-click hand-off **Switch user to Priya Nair · Asset Operations Manager** (exact label comes from the persona), click **Promote to Shadow**, then **Replay 6 closed incidents** and show **6/6 agreements**.
6. **Approve:** still as Priya, show that approval is refused with *"Separation of duties: Priya Nair put v1.3.0 into Shadow, so someone else must approve it"*. Click the hand-off **Switch user to Goh Boon Kheng · Head of Technical Services**, the pill's approver of record. Approve.
7. **Roll back:** as Goh Boon Kheng, click **Roll back to v1.2.0**, enter a reason, and show that the history keeps every version: v1.4.0 restores the v1.2.0 rules and v1.3.0 is marked Retired. Open the audit log: `version_proposed` (Tan) → `version_shadowed` (Priya) → `version_approved` (Goh) → `version_rolled_back` (Goh).

**Narration:**
> A pill also has to learn, under governance. The outcome is captured: the leak was isolated in seven minutes. Tan Wei Ming corrects TS-02's deadline from fifteen minutes to ten. That creates a new draft version, and we can see exactly what changed.
> Before anyone approves it, we replay it against every past incident in the pill's evals. The current version fails one case, and it's the very deadline he just corrected. The new version passes it, with no regressions.
> He wrote the change, so he can't promote it. Priya puts it into shadow mode, which replays the six closed incidents through both versions: six of six agree.
> She can't approve what she shadowed either. The approver of record, Goh Boon Kheng, Head of Technical Services, signs it off. Author, steward and approver are three different people, and the code enforces that separation of duties.
> If it turns out to be wrong, Goh rolls it back with a reason. The rollback adds a new version, v1.4.0, with the old rules, and deletes nothing, so the audit trail stays complete.

### 5:45 to 6:10 · Responsible AI, briefly

**On screen:** Split screen. On the left, the terminal runs `npx vitest run` and ends on the "Test Files … passed · Tests … passed" summary (last run: 46 files, 712 tests). On the right, use **Switch user** to choose **Rajesh Kumar · Technician** and show that the incident's tenant name is masked.

**Narration:**
> Here's the responsible-AI part in one breath. Gates are deterministic and evidence counts only when it's confirmed true. Redaction happens on the server, so a technician's browser never receives the tenant's name. Every decision is audited. And it's all tested: over 700 tests, including adversarial and property-based tests on the gates and the governance rules. The language model handles language. It never decides on a safety action.

### 6:10 to 7:10 · Reflection: how we built it with CodeBuddy

**On screen:** Show `docs/proof/01a-codebuddy-plan-mode-hy4-subagents.png`, then `01b`/`01c` (plan-mode clarifying questions answered by a sub-agent), `02c-codebuddy-scaffold-build-pass-7-routes.png` and `03a-codebuddy-hy4-learning-screen-build.png`. Then show CodeBuddy Code live, or `04a`/`04b`: the pill folder in `.codebuddy/skills/`, the skill invoked, and the answer that TS-07 blocks and escalates to the duty LEW with the Chief Engineer's quote.

**Narration:**
> We built Keystone in five days. We started in CodeBuddy Code's Plan mode, which produces a plan we could review before any files changed, with sub-agents working in parallel. CodeBuddy scaffolded the app and built the first versions of the pills, the rule engine and the screens, mostly on Hunyuan hy4-preview, with hy3 and a DeepSeek flash model for faster passes.
> Our favourite moment was this one. Because a pill is a standard SKILL.md package, we copied it unchanged into CodeBuddy's skills folder. We invoked it as a skill, and CodeBuddy reached the same TS-07 decision as our engine: blocked, escalate to the duty LEW, quoting the Chief Engineer. The knowledge belongs to the organisation and isn't tied to our app.
> We also used Claude Code for planning, code review, the governance, auth and data layers, the AI provider chain, engine hardening and the landing page. Two tools, each doing what it does best.
> Three tips. Start in Plan mode and freeze scope early. Put the language model in charge of language and nothing else. And write your safety rules as tests, not comments.

### 7:10 to 7:25 · Close

**On screen:** Back to the landing hero, then cut to the cover image (`docs/submission/cover.png`) with the live URL beneath it.

**Narration:**
> Tan Wei Ming will retire. With Keystone, his judgement stays, and it stays governed, tested and owned by the organisation. This is Keystone, for Keppel's AI HARVEST challenge.

**Total: about 7:25.**

---

## Shot list

| # | Time | Shot | Source | Notes |
|---|------|------|--------|-------|
| 1 | 0:00 | Landing hero at rest | `/` | Hold 3 s before speaking. |
| 2 | 0:20 | Scroll through the problem and the "How it works" story | `/` | Scroll slowly and evenly. The story is scroll-scrubbed. |
| 3 | 0:58 | "Safe and bounded" section | `/` | The three action classes. |
| 4 | 1:05 | Sign-in persona picker, then Tan Wei Ming | `/sign-in` | Passcode `keystone`. |
| 5 | 1:25 | Expert call playing, captions and rule chips | `/capture` | About 5 s of synthetic-voice audio. |
| 6 | 1:45 | Jump to the 00:23:10 contradiction | `/capture` | Zoom in on the contradiction card. |
| 7 | 2:05 | Decision Canvas: resolved TS-02, confirm and edit | `/canvas/technical-services-chilled-water-leak` | Hover to show the quote and timestamp. |
| 8 | 2:35 | Switch user to Priya Nair | sidebar | |
| 9 | 2:50 | Timeline stepped to 10 of 17, TS-07 Blocked | `/incident/INC-2026-1011?step=10` | Zoom in on the red gate. |
| 10 | 3:15 | Why drawer, Hear the expert (00:14:32), What would change the decision | Incident room | Make sure audio is captured. |
| 11 | 3:45 | Escalate to Rahul Menon | Incident room | Show the confirmation or audit line. |
| 12 | 3:55 | Apply to Harbourfront DC1 overlay | Incident room | Steven Wong (CFM) as the escalation target. |
| 13 | 4:20 | Rajesh on `/c/AHU-23-01`: consent, demo note, read-back chips, Draft rule | `/c/AHU-23-01` | Use the labelled demo note; do not propose it in this profile. |
| 14 | 4:38 | Peer gate blocks Shadow, then Hafiz confirms | `docs/capture/screens/c7…`, `c8…` | Screenshots, about 3 s each. |
| 15 | 4:45 | Learning steps 1 to 3: outcome, correction 15 → 10, diff | `/learning/technical-services-chilled-water-leak` | |
| 16 | 5:05 | Learning step 4: eval replay | same | v1.2.0 passes 5/6; the correction fixes the failing case. |
| 17 | 5:20 | Learning steps 5 and 6: hand-off to Priya, shadow 6/6, Priya refused approval, switch to Goh Boon Kheng, approve | same | Three different people: author, steward, approver. Hold on the "Separation of duties" refusal. |
| 18 | 5:35 | Learning step 7: Goh rolls back with a reason (v1.4.0), history and audit kept | same | |
| 19 | 5:45 | Split: vitest (700+ passing), and the Technician view with masking | terminal + app | |
| 20 | 6:10 | CodeBuddy proof screenshots 01a, 01b, 01c, 02c, 03a | `docs/proof/` | Ken Burns pan, about 4 s each. |
| 21 | 6:35 | CodeBuddy skill run: same TS-07 decision | live CodeBuddy, or `docs/proof/04a`, `04b` | |
| 22 | 7:10 | Landing hero, then the cover card with the URL | `/`, `docs/submission/cover.png` | End card for 3 s. |

---

## 60-second backup cut

Use this if the full video can't be recorded, or as a teaser. It reuses shots 1, 6, 9, 10, 12, 16 to 18 and 21.

| Time | On screen | Narration |
|------|-----------|-----------|
| 0:00 to 0:08 | Landing hero | "Our Chief Engineer is retiring. Eighteen years of judgement on leaks, power and tenants. Keystone keeps it." |
| 0:08 to 0:18 | `/capture`, contradiction at 00:23:10 | "A simulated onboarding call shows how the interview draws out what was never written down and catches contradictions, and the expert confirms every rule." |
| 0:18 to 0:33 | Incident room, step 10, TS-07 Blocked, then Why drawer with the quote read aloud | "On a live leak, an AI proposal says restore power. Rule TS-07 blocks it: no LEW sign-off. It's a deterministic gate the model can't talk past, and here are the expert's own words, read back by the app." |
| 0:33 to 0:40 | Escalate to Rahul Menon, then Apply to Harbourfront DC1 | "It escalates to a named person. The same pill runs at a data centre with different escalation, without a rewrite." |
| 0:40 to 0:52 | Learning: correction 15 → 10, eval replay, shadow, approve, rollback | "Corrections are replayed against past incidents and shadowed. Author, steward and approver are three different people, enforced in code, and a rollback deletes nothing." |
| 0:52 to 1:00 | CodeBuddy skill answer, then the cover card | "Built with CodeBuddy, and the pill runs as a native CodeBuddy skill. Keystone: expert judgement, governed." |

---

## Claims check (every number in the script, and where it comes from)

| Claim | Source in the repo |
|---|---|
| Over 700 tests (last run: 46 files, 712 tests, all passing) | `npx vitest run`, run 12 Oct 2026 |
| A gate block asks the technician "why, in twenty seconds" | `components/incident/captureTasks.ts`, `components/incident/IncidentRoom.tsx` ("Tell us why — 20 seconds") |
| QR page for AHU-23-01; consent notice before recording; demo note labelled | `app/c/[assetId]/page.tsx`, `components/capture/ConsentNotice.tsx`, `data/fixtures/capture/qr-ahu-23-01.json` |
| Every number, tag and role is checked (read-back) | `lib/capture/contract.ts` (`READ_BACK_KINDS`, `draftProposalReadiness`) |
| A colleague who neither said it nor proposed it must confirm before Shadow | `lib/capture/contract.ts` (`peerConfirmAuthority`, `peerGate`); `lib/governance/store.ts` `promoteToShadow`; `docs/capture/screens/c7`, `c8` |
| Adversarial and property-based tests | `lib/governance/__tests__/adversarial.property.test.ts`, `lib/engine/__tests__/properties.test.ts` (fast-check) |
| TS-07 quote at 00:14:32 | `pills/technical-services/chilled-water-leak/provenance.json` |
| Contradiction at 00:06:30 vs 00:22:15, resolved at 00:23:30, marker at 00:23:10 | `README.md` demo path; `components/capture/CallPanel.tsx` |
| Step 10 of 17, TS-07 Blocked | `README.md`; `docs/DECISIONS.md` D5 |
| Missing evidence `lew_signoff`, `insulation_resistance_ok`, `area_dry` | `README.md` demo path step 4 |
| Escalation to Rahul Menon (duty LEW); DC1 escalation to Steven Wong (CFM) | `data/roles.json`; `README.md` step 7 |
| TS-02 correction 15 → 10; v1.2.0 fails only the deadline eval | `evals/eval-2025-09-tenant-area-isolation-deadline.yaml` |
| Author can't promote; hand-off to Priya | `docs/DECISIONS.md` D2 |
| Shadow 6/6 agreements over 6 closed incidents | `components/learning/learning-utils.ts` (one shadow run per eval case); `docs/review/demo-path-audit.md` |
| Three people: author can't shadow; author and Shadow promoter can't approve; rollback same rules | `lib/governance/approval.ts` (`shadowPromotionAuthority`, `canApprove`, `rollbackAuthority`); `docs/DECISIONS.md` D2 amendment |
| Rollback appends v1.4.0 restoring v1.2.0 rules | `lib/governance/versions.ts` |
| "Hear the expert" is a synthetic voice reading the quote | `components/incident/useExpertVoice.ts` (browser speech synthesis) |
| The step-10 AI proposal is recorded | `data/fixtures/llm/ai-proposals-INC-2026-1011.json` |
| Approver of record is Head of Technical Services (Goh Boon Kheng) | `SKILL.md` `approver: head_technical_services`; `data/roles.json` |
| Rollback appends a version and marks the old one Retired | `README.md` Tests; `lib/governance` |
| Technician never receives the tenant name | `docs/DECISIONS.md` D1 |
| CodeBuddy skill reached the same TS-07 decision | `README.md` "How it installs"; `docs/proof/04a`, `04b` |
| Models: hy4-preview (in `docs/proof/`), hy3, DeepSeek flash (`deepseek-v4.1-flash`, no screenshot) | `README.md` Built with |
| Claude Code's role: planning, review, governance, auth, data, LLM provider chain, landing | `README.md` Built with; `git log` |

Don't show a live model swap. The app doesn't include a model-swap control. The claim that "a model swap gives the same decision" holds by construction, because the engine is deterministic, and the narration says only that the model never decides.
