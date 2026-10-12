# Final browser QA: Keystone (live)

- **Target:** https://mosaic-psi-rouge.vercel.app (build up to `4457d03`)
- **Date:** 2026-10-12, about 09:17–09:35 SGT
- **Mode:** read-only. No code was edited. The only state that changed was the demo's own governance state, through the scripted demo path (propose, shadow, approve, roll back), plus one canvas confirm and one canvas edit. Live AI was called once ("Re-extract live"). Jev was used twice, which made 4 requests, one per pill per click.
- **Tooling:** Playwright (Chromium). Cookies and localStorage were cleared first. CDP `Log`, `Runtime` and `Audits` listeners captured console output, exceptions and CSP Issues. Width was checked with `scrollWidth === clientWidth`. CLS was measured with a PerformanceObserver.
- **Screenshots:** `docs/review/final-qa/` (`F*` = defect, `ok-*` = evidence of a pass)

## Verdict: SHIP

Every earlier High and Critical defect is fixed on the live site, and the whole video-script demo path works end to end. Four new or remaining findings are Medium or Low, and none of them blocks the demo or the submission.

## Per-check results

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | No CSP violation messages in the console on every route (landing scrolled to the bottom; capture, canvas, incident, pulse, registry, approvals, learning) | **PASS, with a note** | The console had 0 CSP messages, 0 errors and 0 warnings across 27 route × viewport loads. However, one CSP `securitypolicyviolation` event (`script-src` `eval`, `kEvalViolation`) fires on **every** page load. Chrome lists it in the DevTools Issues panel, not the console. See F01. The landing page has no `<video>` or iframe yet, so there was no poster or embed to check (F03). There is no React Flow in the codebase, so `/canvas` was tested as the tile canvas. |
| 2a | No sideways scroll at 390 / 1024 / 1440 | **PASS** | `scrollWidth === clientWidth` on all 9 routes (`/`, `/pulse`, `/capture`, `/canvas/…`, `/registry`, `/incident/INC-2026-1011`, `?step=10`, `/approvals`, `/learning/…`) at all 3 widths. D01–D05 are fixed. |
| 2b | Escalate visible at 1024 | **PASS** | The button spans x 670–971 in a 1024px viewport and is not clipped (`ok-escalate-visible-1024.png`). The label now wraps. |
| 2c | CLS on `?step=10` < 0.1 | **PASS** | 0.0005 / 0.0005 / 0.0005 at 1440; 0 at 1024; 0 at 390. Previously 0.23–0.32. |
| 2d | Drawer focus trap | **PASS** | Audit log: Tab ×6 and Shift+Tab ×3 all stay inside the drawer, and Escape returns focus to "Audit log". The Why drawer: focus moves into it on open, and Tab ×15 stays inside. |
| 2e | Switch user by keyboard | **PASS** | Pressing Enter on "Switch user" moves focus to the current `menuitemradio`. ArrowDown and ArrowUp move between items, Enter selects (used to switch to Priya), and Escape closes the menu and returns focus to the trigger. |
| 3 | Video-script demo path | **PASS** | Step by step below. |
| 3a | Three-person flow | **PASS** | Tan proposes v1.3.0, and as author cannot promote it ("Promote to Shadow" is disabled). The hand-off button switches to Priya, who promotes to Shadow and replays: **6/6 agreements**. Priya's approval is refused: *"Separation of duties: Priya Nair put v1.3.0 into Shadow, so someone else must approve it."* (`ok-priya-approval-refused.png`). The hand-off switches to Goh, who approves: "Proposed by Tan Wei Ming, put into Shadow by Priya Nair, approved by Goh Boon Kheng: three different people." Goh then rolls back with a reason: **v1.4.0** Approved and Live ("Rollback of v1.3.0 · restores v1.2.0 rules"), v1.3.0 Retired, v1.2.0 kept. The audit log shows `version_proposed` (Tan) → `version_shadowed` (Priya) → `version_approved` (Goh) → `version_rolled_back` (Goh). Step 6 no longer turns red after rollback (CP-08 fixed). |
| 3b | Reload mid-Learning resumes | **PASS** | A reload at step 5 resumes at "Step 5 of 7 · 4 complete" with the v1.3.0 draft, the diff and the eval results intact (CP-02 fixed). |
| 3c | Pulse shows the live version | **PASS** | v1.2.0 at the start → **v1.3.0** after approval → **v1.4.0** after rollback (CP-09 fixed). |
| 4 | Sign out from the shell menu | **PASS** | "Sign out" is a `<button type=submit>` in a `<form method=post action=/api/auth/sign-out>`. The POST returns 303 and the browser lands on `/sign-in`, with no cookies left. Opening `/pulse` afterwards redirects to `/sign-in?next=%2Fpulse`. |
| 5a | One live AI action within 25 s, with a truthful badge | **PASS** | One `POST /api/llm/extract` returned 200. The result appeared about 10.1 s after the click, and the badge reads "Live · gpt-5.4-mini-2026-03-17 via OpenAI · 8.1 s". It shows 4 drafts labelled "Draft — requires Tan Wei Ming's review… Not applied to a pill". See F04 for a wording risk. |
| 5b | Jev suggestion | **PASS** | "Suggest evidence · Jev" returned in 0.2 s (jev-1.13.0) with scored suggestions and Confirm/Dismiss, labelled "suggestions only, never gate". It sends one request per triggered pill, which is intended. |
| 6 | No console errors or hydration warnings | **PASS** | No CDP `Runtime.exceptionThrown` events, no console error or warning, and no hydration messages during the whole session. The only other output was Chrome's VERBOSE hint "Password forms should have username fields" on `/sign-in`. |

### Demo path, step by step

| Script time | Step | Result |
|---|---|---|
| 0:00–1:05 | Landing hero, problem section, five-stage story, "Safe and bounded" | PASS (scrolled the whole 14.5k px page; no console output) |
| 1:05 | Landing "Hear the onboarding call" → `/sign-in?next=/capture` → Tan + `keystone` → `/capture` | **PASS in 2.9 s** (the CP-01 hang is fixed) |
| 1:25 | Accept call; captions and chips; the 00:23:10 "Contradiction caught" marker | PASS: the card shows Statement A 00:06:30 against Statement B 00:22:15 |
| 2:05 | Canvas: resolved TS-02 (00:23:30); hover the quote; Confirm one tile, Edit another | PASS. Hovering shows the real quote "— Tan Wei Ming · 00:23:30–00:24:20" (CP-04 fixed). Confirm and Edit work, and both are audited. See F02 for the edit dialog's keyboard behaviour. |
| 2:35 | Switch user to Priya | PASS (keyboard) |
| 2:50 | `?step=10`: TS-07 v1.2.0 Blocked, 3 missing evidence keys, Why drawer, Hear the expert, Escalate | PASS. The drawer quote is from 00:14:32. Speech synthesis is speaking and the button changes to "Stop". Escalation shows a confirmation ("Escalated to Rahul Menon … at 09:24 by Priya Nair. The gate stays blocked…"), the button disables, and the event is audited (CP-05 fixed). |
| 3:55 | Apply to Harbourfront DC1 | PASS: "Data centre override: escalate to Steven Wong · DC Critical Facilities Manager", with the client-SLA notice |
| 4:20–5:20 | Learning steps 1–7 | PASS (see 3a and 3b). Outcome 7 min; TS-02 15 → 10; v1.2.0 passes 78/79 assertions and v1.3.0 passes 79/79; 0 regressions; the deadline eval is fixed. |
| 5:20 | Technician view is masked | PASS: Rajesh sees `[masked: tenant PII]`, and "Straits Meridian" is absent from the page |

## Defects and findings

| # | Sev | Where | Repro | Screenshot | Suspected file / fix |
|---|---|---|---|---|---|
| F01 | Low | every route | Load any page with DevTools open and check the **Issues** panel, or listen for `securitypolicyviolation`. One `script-src` / `eval` violation is reported per load, from `_next/static/chunks/532-*.js` at column 62668. Cause: Zod v4's JIT feature probe, `try { Function(""); return true } catch { return false }`. The probe fails closed, so behaviour is unaffected, and the **console has no message**. A judge reading the Issues panel would still see a CSP issue. | (no visual) | Call `z.config({ jitless: true })` once in a module that every client bundle imports before any schema is built, for example the module that holds the shared client schemas. This is better than adding `'unsafe-eval'` to the CSP in `next.config.ts:36`. |
| F02 | Medium (a11y) | `/canvas/technical-services-chilled-water-leak`, "Edit" dialog | Click Edit on any tile. The dialog sets `role="dialog" aria-modal="true"`, but (a) focus stays on the Edit trigger behind it, (b) **Escape does not close it** (tested with focus on the textarea and on the trigger), and (c) Tab moves through the page behind (the focus ring lands on a "Details" button underneath). This is the same pattern as the old D07, which is now fixed in the Audit drawer but not here. | `final-qa/F02-canvas-edit-dialog-no-esc-no-trap.png` | `components/canvas/DecisionCanvas.tsx` (edit modal near line 362, "Cancel edit"). Reuse the focus-trap and Escape handling from `components/shell/AuditLogDrawer.tsx`, and focus the textarea on open. |
| F03 | Low (carried over from D12) | `/`, "See it in action" | The production landing page still shows "Walkthrough video — coming soon". There is no `<video>` or iframe, so the poster and embed CSP could not be checked. | `final-qa/F03-landing-video-coming-soon.png` | `components/landing/DemoVideo.tsx`: set `NEXT_PUBLIC_DEMO_VIDEO_URL` after recording (the CSP `frame-src` already allows youtube-nocookie and Vimeo), or hide the section. Re-check for CSP issues once it is set. |
| F04 | Low (wording) | `/capture`, "Re-extract live" | The live drafts are numbered `TS-01`…`TS-04`, which clash with the pill's real rule IDs but have different content. For example, "Draft · TS-01 · No re-energisation before LEW sign-off" is TS-07 in the pill, and the pill's TS-01 is "Water near switchgear…". On camera, or under questioning, this reads as the model mislabelling rules. | `final-qa/F04-live-extract-draft-ids-collide.png` | The live-extract result view or prompt under `components/capture/` and `app/api/llm/extract`: show drafts as `D-1`…`D-4`, or name the matched pill rule only when one is verified. |

### Observations (not defects)

- In Learning step 5, "Replay 6 closed incidents" stays enabled after a run, so it can be pressed again. This is harmless but adds more `shadow_run` audit rows.
- The sign-in persona radios are `sr-only` inputs inside labels, and clicking the label works. Automation must click the label, not the input. Real users are unaffected.
- No visual baseline is committed, so visual regression is **inconclusive**. Layout was judged from overflow measurements and a review of the screenshots.
