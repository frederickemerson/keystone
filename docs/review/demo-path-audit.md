# Demo-path click audit: `docs/submission/video-script.md`

**Date:** 12 Oct 2026 · **Build:** `main` @ `b9ffca6`, `npx next build` (exit 0) + `next start -p 3500` with `.env.local`
**Method:** I followed `/click-path-audit`. I walked every script step in a fresh, isolated Playwright browser context (1440×900, cookies and localStorage cleared). After each action I read `localStorage["mosaic-governance"]` (versions, decisions, shadow runs, audit). I traced the handlers and store actions in code. I did not edit any code. Screenshots are in `docs/review/demo-path-audit/`. The console showed no errors or warnings for the whole run.

## Verdict

The core story works: TS-07 blocks, the Why drawer opens, the escalation is audited, the DC1 overlay renders, the governance chain runs from correction through rollback, and the Technician view is masked. Three problems would show on camera or under questioning:

1. **CRITICAL.** The script's first click path hangs on "Signing in…" (see CP-01).
2. **HIGH.** On Learning, a reload or any navigation mid-flow strands the governed change. Rollback can then only be reached through Reset demo.
3. **HIGH.** Two narration claims are false as built: that the voice is "his own voice", and that "three different people … the code enforces" the separation of duties.

## Per-step results

| # | Script step | Result | Evidence |
|---|---|---|---|
| 0:00 | Landing hero, notebook card, TS-07 "Blocked until" | PASS | Hero says "The expert retires. His judgement stays."; the TS-07 card shows "Blocked until lew_signoff, insulation_resistance_ok, area_dry". |
| 0:20 | Problem story, I–V scroll story, "Safe and bounded" | PASS | All five stages are present. The three action classes show 8 / 6 / 6 rules (these count up only once scrolled into view). |
| 1:05 | Click **Hear the onboarding call**, then Tan Wei Ming + `keystone`, land on `/capture` | **FAIL (CRITICAL)** | Reproduced 4 of 4 times. The button stays on "Signing in…" and the URL stays `/sign-in?next=%2Fcapture` (I waited 45 s). The cookie *is* set, and a hard load of `/capture` works. The same flow via the header **Sign in** link or **Open the incident room** link works. The passcode hint "Demo passcode: keystone" is shown. See CP-01. |
| 1:25 | `/capture`: play the call, captions and rule chips, click **00:23:10 "Contradiction caught"** | PASS | You must click **Accept call** first (the script says "Play the call"). The marker jumps to 00:23:10. The card shows Statement A 00:06:30 "always isolate the whole riser…" against Statement B 00:22:15, then "Resolved" at 00:23:30 with a TS-02 chip. Captured so far: 3 of 13. |
| 2:05 | Canvas: resolved TS-02 at 00:23:30; hover a tile for quote and timestamp; **Confirm** one, **Edit** another | **PARTIAL** | The resolved contradiction card is correct. **Hovering shows nothing.** The quote only appears after clicking the round quote button, and it is not a quote: the text is the boilerplate `"Expert confirmed — captured in onboarding interview (ce-interview-2026-10-02#00:23:30)"` (CP-04). Confirm and Edit work (footer reads "1 confirmed · 1 edited"), but neither is audited and both are lost on navigation (CP-06). The header also shows the pill as **Approved v1.2.0**, which contradicts "nothing goes into the pill until he has signed off". |
| 2:35 | **Switch user** to Priya Nair, open the incident | PASS (wording) | The control is in the **top header**, not the sidebar as the script says. Switching is audited as `role_switched`. Canvas local state survives the switch. |
| 2:50 | Step to **10 of 17**, TS-07 v1.2.0 **Blocked**, missing evidence ×3, **Why**, **Hear the expert**, "What would change the decision?", **Escalate to Rahul Menon** | PASS, with issues | TS-07 first blocks at exactly event 10. The banner reads "Rule TS-07 v1.2.0 — LEW sign-off missing (+2 more)". The drawer has the full 00:14:32–00:16:10 quote, evidence used versus missing, the counterfactual "would move from blocked to escalate", and the forbidden actions. Escalate writes `action_escalated` (actor Priya Nair) to the store and the footer reads "1 audit event · latest: Escalated TS-07…". **But** the red proposal banner does not change after escalating: the button stays enabled with no "Escalated" state, and a second click logs a duplicate (CP-05). **Hear the expert is browser `speechSynthesis` (a TTS voice), not a recording** (CP-03). |
| 3:55 | **Apply to Harbourfront DC1** | PASS | The overlay reads "Same pills, Data centre overrides". The tenant first notice becomes a "Client SLA notification (Tier III) within 15 min". TS-07 escalates to Steven Wong · DC Critical Facilities Manager, and the tenant message panel says "No tenant-experience message for Harbourfront DC1". Note that the DC1 replay opens at 9/9 (the end), not stepped. |
| 4:20 ① | Capture outcome: 7 min | PASS (not audited) | The field defaults to 7 and **Confirm outcome** completes step 1. The outcome is stored only in component state; no audit event is written. |
| ② | Tan Wei Ming corrects TS-02 from 15 to 10 with a reason | PASS | Prefilled. **Propose v1.3.0** writes `version_proposed` by Tan Wei Ming. |
| ③ | Diff v1.2.0 → v1.3.0 | PASS | "TS-02 deadline_minutes Before 15, After 10". |
| ④ | Evals: v1.2.0 passes 5 of 6 and the correction fixes the failing case, with no regressions | PASS | Per-case table: 5 pass, 1 fail (`eval-2025-09-tenant-area-isolation-deadline`, 13/14 → 14/14). Headline KPIs are in *assertions* (78/79 → 79/79) and the narration says "5 of 6", so pick one unit. |
| ⑤ | Hand-off **"Switch user to Priya Nair · Asset Operations Manager"**, Shadow, agreements | PASS | Exact label. Local flow state survives `router.refresh()`. **Promote to Shadow** then **Replay 6 closed incidents** gives "6/6 agreements". Audit shows `version_shadowed` plus 6 × `shadow_run_recorded`. **But** as Priya, step 6 already says "Clear to approve" with **Approve v1.3.0** enabled (CP-07). |
| ⑥ | Switch user to Goh Boon Kheng, Approve | PASS | Writes `version_approved` by Goh Boon Kheng. Registry, canvas and incident room all show v1.3.0 live. |
| ⑦ | **Roll back to v1.2.0** with a reason; history keeps every version; v1.3.0 Retired | PASS, with issues | Rollback adds v1.4.0 (Approved, "Rollback of v1.3.0 · restores v1.2.0 rules"). v1.3.0 is Retired, and `version_rolled_back` is audited. **After rollback, step 6 turns red:** "v1.3.0 is Retired; only Draft or Shadow versions can be approved". The rail drops step VI from "done", so it reads "6 complete" (CP-08). This is the final frame of the section. |
| 5:20 | Switch to Rajesh Kumar · Technician; tenant masked | PASS | "Anchor tenant [masked: tenant PII] (L[masked: tenant PII])". "Straits Meridian" does not appear in the DOM, the SSR document or localStorage. Cosmetic: the floor range renders as `L[masked: tenant PII]`. |

## Cross-screen consistency

| Check | Result |
|---|---|
| Audit log records actions | Yes for role switches, escalations, proposals, shadow runs, approvals, rollbacks and resets. **No** for canvas Confirm/Edit/Reject/Publish and Learning "Confirm outcome". |
| Switching user keeps state | The store does. Local state on Learning and the canvas survives `router.refresh()`. Canvas decisions made as Tan survive a switch to Priya with no record of who made them. |
| Navigation keeps state | **No.** The canvas resets to "0 of 13 decided". Learning forgets the in-flight version (CP-02). The incident room resets to event 0 (decisions persist). |
| Reset demo | It resets versions, decisions, shadow runs and evidence. The audit log is kept by design, so straight after a reset the incident footer still reads "1 audit event · latest: Escalated TS-07…" and the Learning rail shows the *previous* run's v1.3.0 events next to the new run's. There is no confirmation prompt, and the button only exists in the incident room. |
| Rollback across screens | Registry: v1.4.0 with "Rolled back to v1.2.0" ✔. Canvas: v1.4.0 and "Publish as v1.5.0" ✔. Incident room: v1.4.0 ✔. **Pulse: still "Chilled water leak v1.2.0" and "Replay agreement 99 of 100"** after both the approval and the rollback (static file data). |
| Counts | Registry KPI "Shadow runs 6" against the pill card's "Shadow agreements 0" and "No shadow runs yet" after rollback (the KPI sums all versions, the card counts the live one). Pulse "Decisions awaiting approval 1" against Approvals listing 3 incident items (1 needs approval, 2 escalations). Pulse evidence reads "0 of 3" / "0 of 4" while the incident room shows "4 of 7" (step 10) and "7 of 7" (DC1 end), because Pulse reads the static `evidence_coverage` field. |

## Findings and exact fixes

**CP-01 · CRITICAL · Sign-in hangs on the script's path (stale client router state)**
- **Path:** Landing → **Hear the onboarding call** (a client `<Link href="/capture">`; middleware redirects the soft navigation to `/sign-in?next=/capture`) → Sign in.
- **What happens:** `SignInForm` calls `router.replace('/capture'); router.refresh()` (`app/sign-in/SignInForm.tsx:47-48`). The network shows `POST /api/auth/sign-in` 200, then `GET /capture?_rsc` 200, but the router never commits.
- **Isolation:** I reproduced it with `window.next.router.replace` alone (no refresh), so the stale piece is the client router's view of `/capture`, which was built while signed out. A hard-loaded `/sign-in` and the incident link (with `?step=10`) both work.
- **Fix:** the auth cookie changes what every server component renders, so the whole client router cache is invalid. Replace both lines with a hard navigation: `window.location.assign(body.next ?? '/pulse');`. Leave `busy` true until unload.
- **Optional:** add `prefetch={false}` on landing links to protected routes (`components/landing/Hero.tsx:35,40`, `LandingHeader.tsx:24`).
- **Test:** add a Playwright e2e test for landing → onboarding link → sign-in → `/capture`.

**CP-02 · HIGH · The Learning flow lives in component state, not the store**
- **Code:** `components/learning/LearningFlow.tsx:156-170` (`outcomeSaved`, `proposalVersion`, `rolledBack` are `useState`; `target` comes from `proposalVersion`).
- **Reproduced:** propose v1.3.0, open Registry, come back. The page shows "Step 1 of 7 · 0 complete". Step 2 shows "Draft v1.3.0 is already awaiting promotion…" with **Propose v1.4.0 disabled**, while steps 3–6 say "Propose the correction in step 2 first". That is a dead end.
- **After approval:** navigating away leaves **"Roll back to v1.3.0" disabled**, with the label pointing at the live version itself.
- **Fix:**
  1. Derive `target` from the store: the pending Draft or Shadow version if there is one, else the newest version, then `findVersion(history, …)`.
  2. Derive `rolledBack` from the history (the newest version has `rollbackOf`, or the audit has `version_rolled_back` for this pill).
  3. Move the outcome into the store as an audited `recordOutcome(pillId, incidentId, draft)` action and gate step 2 on it.
  4. Delete the three `useState`s.

**CP-03 · HIGH (claim) · "That's Tan Wei Ming's own voice"**
- **Code:** `components/incident/useExpertVoice.ts:3` uses `window.speechSynthesis`, and the capture call (`useCallPlayback.ts:7`) does the same. Judges will hear a synthetic browser voice.
- **Fix the narration in `video-script.md` 2:50:** "…and here is the source, read from the transcript at fourteen minutes thirty-two."
- **Alternatively:** ship a real recorded clip.

**CP-04 · HIGH · Canvas provenance "quote" is boilerplate, not the expert's words**
- **Code:** `components/canvas/DecisionCanvas.tsx:58-67`. `buildProvenance` reads `pill.pill.provenance[rule.id]`, but provenance is `{ rules: {…} }`, so `entry` is always undefined. It then builds `"Expert confirmed — captured in … (seg)"`.
- **Fix:** delete `buildProvenance` and use the existing structural reader `expertQuoteFor(pill.pill, rule)` from `components/incident/provenance.ts:36`. Pass `{ quote: q.quote, timestamp: q.start }`.
- **Script:** change "Hover over one tile" to "Click the quote button on a tile".

**CP-05 · MEDIUM · Escalate button gives no feedback and is not idempotent**
- **Code:** `ProposalBanner` (`components/incident/IncidentRoom.tsx:896`, button at about line 970) ignores `decisions[ruleId]`.
- **Fix:** pass the decision record. When it is `escalated`, render a "Escalated to Rahul Menon by Priya Nair · hh:mm" chip and disable the button. In `store.decideAction`, also refuse a decision identical to the latest one for the same incident and rule (no-op, no audit).

**CP-06 · MEDIUM · Canvas decisions are unaudited, unattributed and ephemeral, and "Publish" is a no-op**
- **Code:** `DecisionCanvas.tsx:88-92` and 195-200. "Publish as v1.3.0 draft" only calls `setPublished(true)` and shows "Draft v1.3.0 queued for Learning & Approval", but nothing reaches the store. If the presenter clicks it, Learning still proposes "v1.3.0", which contradicts the message.
- **Fix:**
  1. Add a store action `recordRuleReview(pillId, ruleId, outcome, note)`, which is audited and keyed by actor, and read canvas state from it.
  2. Make Publish call `proposeVersion` with the edits, or remove the button.
  3. Reset these in `resetDemo`.

**CP-07 · HIGH (claim) · "Author, steward and approver are three different people, and the code enforces that"**
- **Code:** `lib/governance/approval.ts:72` lets any `promote_pill_version` holder approve, and Priya (AOM) holds it. On screen at step 5 she sees "Clear to approve" with Approve enabled.
- **Fix:** record `shadowedBy` on the version in `promoteToShadow` (`lib/governance/versions.ts`). In `canApprove`, block when `actor.name === version.shadowedBy` ("Separation of duties: X put vN into Shadow"). Add a property test.
- **Alternatively:** soften the narration to "the author can't approve their own change".

**CP-08 · MEDIUM · Step 6 turns into an error after rollback**
- **Code:** `LearningFlow.tsx:256` marks the step done only while `target.status === 'Approved'`, and `ApprovalPanel` re-runs `canApprove` on a now-Retired version.
- **Fix:** mark step 6 done if the audit contains `version_approved` for `target.version`. When the version is not Draft or Shadow, render the approval record ("Approved by Goh Boon Kheng · 08:40") instead of the gate.

**CP-09 · MEDIUM · Pulse ignores governance state**
- **Code:** `app/pulse/page.tsx` and `components/pulse/ActiveIncidentsTable.tsx:133-135` read only static files. Pulse shows v1.2.0 and 99/100 after an approval or rollback, and evidence "0 of 3" versus "4 of 7" in the room.
- **Fix:**
  1. Make the Pill column a client cell that reads `useLivePill`, or label it "applied at open: v1.2.0".
  2. Compute Replay agreement from live approved versions on the client.
  3. Relabel evidence as "at last sync".

**CP-10 · LOW · Reset demo leaves the previous run in view**
- **Code:** `store.resetDemo` (`lib/governance/store.ts:579`) keeps the audit by design.
- **Fix:** scope the incident footer and the Learning rail to events after the latest `demo_reset` (and show "Earlier runs hidden · n events"). Add a confirm step to the Reset button (`IncidentRoom.tsx:613`).

**CP-11 · LOW · Script wording**
- "Switch user in the sidebar" should say "in the header".
- "Play the call" should say "Accept call".
- "Hover" should say "click the quote button".
- 4:40 "5 of 6" sits next to the on-screen "78/79", so mention both or pick one.

## Recommended order before recording

CP-01, then CP-02, then CP-04, then CP-03 and CP-07 (narration or code), then CP-05 and CP-08. Each is small and local.
