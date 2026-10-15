# QA re-run: guided demo after fixes

- Date: 2026-10-12
- Build: fresh production build, `next start -p 3007` (started 16:34)
- Browser: Playwright Chrome 151, 1440x900, then a second full run at 390x844
- Start state: cookies, localStorage and sessionStorage cleared before each run
- Method: followed only the guide's on-screen copy and did every action
- Screenshots: `.playwright-mcp/qa2/NN-name.png`
- Code: not modified
- Previous report: `docs/review/qa-guided-demo.md`

## Verdict: FIX FIRST (narrowly)

The original blocker is fixed, and so are five of the seven majors. Both full runs (desktop and mobile) completed every step with the right person on the right screen, and the app logged 0 console errors.

Three major issues remain:

- **N1 (new, step 1):** "Play from 00:14:32" jumps straight to "Call complete". No transcript or expert words appear.
- **N2 (new, step 2):** reading TS-07's quote and then pressing `Confirm` silently does nothing.
- **R1 (remaining):** the new rule's effect in the incident room is several screens below the place "See it in INC-2026-1011" lands. On mobile, the step 3 "Why?" button sits under the sticky audit strip.

If N1 only happens in this automation browser (see the note under N1), the verdict drops to fixing N2 and R1.

## Previous issues

| Id | Status | Evidence |
|---|---|---|
| B1: Tell-us-why task unreachable | **Fixed** | Step 3 copy now says to open "Why? · Hear the expert", then press "Escalate to … Duty Licensed Electrical Worker". Escalating creates the "Tell us why — 20 seconds" task. Step 4 lands on `#capture-task`, top 218 px (12, 13). |
| M1: guide covers its target (desktop) | **Fixed** | The guide is docked in a right rail (x=1120, width 320). Content ends at x=1088. The TS-07 card, Publish bar, `#blocked-gate` (top 218), Why/Escalate, `#capture-task`, `Answer`, `#note-drafts` and the approval controls are never under it (06, 10, 12, 13, 18). |
| M1: mobile | **Mostly fixed** | Bottom bar, about 300–340 px. On every step the target is clear of the guide (checked with `elementFromPoint`). Exception: step 3, see R1b. |
| M2: trial result not shown | **Fixed** | The approvals card reads "Trial run: 6 past incidents replayed · new version agrees with the live one on 6", then "Past incidents passed 5 of 6 (78 of 79 checks) · 0 worse and 0 better than v1.2.0", with a sentence explaining the difference (22). |
| M3: rollback | **Fixed** | Learning shows `Roll back to v1.2.0`. It is disabled until you give a reason ("Enter a reason to roll back"). With a reason it works: "Rolled back by Goh Boon Kheng — v1.2.0 rules are live again as v1.4.0", 13 rules, recorded in history and audit (27, 28). It is "one click" plus a required reason, which is fine. |
| M4: reuse payoff | **Partly fixed** | The CTA is now "See it in INC-2026-1011, where it came from" → `/incident/INC-2026-1011?step=17`. The pill chip reads `v1.3.0 · 14 rules · 5 triggered · Opened under v1.2.0; now evaluated with v1.3.0`, and TS-14 fires (Allowed). But TS-14 sits about 3,780 px down on desktop and 8,900 px down on mobile, with no anchor or highlight (24, 54). See R1a. |
| M5: record restamps version | **Fixed** | The record JSON keeps TS-07 `decision.pillVersion: "1.2.0"` (Rajesh's escalation) beside `evaluatedUnder: "1.3.0"`. The pills section separates `openedUnder 1.2.0` from `current 1.3.0`. The page reads "opened under v1.2.0 · now v1.3.0 … A version approved after the incident opened is shown separately" (25). |
| M6: "the note was typed" | **Fixed** | It now reads "Recorded demo transcript · no audio" and "No audio was recorded: this is a recorded demo transcript, written for the demo." The QR transcript id is gone (17, 19). |
| M7: mobile buried / auto-scroll | **Fixed** | Step 1 no longer auto-scrolls; `Play from 00:14:32` is in view (42). Anchors land in view: `#blocked-gate` at the top on step 3 (45), `#capture-task` at 142 px (48), `#note-drafts` at 108 px. No horizontal overflow (scrollWidth 390). The header shows "Tan Wei Ming". |
| One draft from the demo note | **Fixed** | The recommended note ("Recorded demo note for INC-2026-1011 · use this one…") gives 4 read-back values and "1 draft from your note" (DRAFT-01, "On an L23 leak alarm, check the LD-23-04 leak-detection cable first") on both runs (17, 49). |

### Previous minor issues
- **Fixed:**
  - The passcode error is visible (420x19 px).
  - Page titles are per page: "Expert call · Keystone", "Decision canvas · Chilled water leak · Keystone", "Incident INC-2026-1011 · Keystone", "Approvals · Keystone", and so on.
  - Escalation and peer times read "just now".
  - The "v1.3.0 is live" banner is in view after `Approve` (top 218 px).
  - `Finish the demo` shows a wrap-up ("You finished the guided demo · What you saw", with Replay / Decision record / Connectors), and `/pulse` now says "You finished the guided demo" (29).
  - The demo notes are labelled, with a recommended one.
  - The rule diff now reads "What changes · New rule TS-14 …".
- **Still present:**
  - The capture-task header shows wall-clock time ("For Technician · 16:39") against the 08:11 incident clock.
  - Consent is asked on every capture.
  - The "Show N not applicable" list still shows raw engine strings.
  - Some controls sit below the fold with no anchor. At 1440x900: `Propose` at y=947, `Confirm as peer` at 1281, `Promote to Shadow` at 1524, `Approve` at 1569.

## Remaining and new issues

### MAJOR

**N1. Step 1: "Play from 00:14:32" jumps straight to "Call complete" (03, 04, 43).**
- What happens: within 300 ms of the click, the page shows "Call complete · 13 rule candidates", Duration 00:35:00. No transcript is ever shown, the 00:14:32 moment is skipped, and the page has no "never re-energise" text at all.
- Effect: the guide's Notice ("TS-07 appears beside the transcript, linked to his exact words") is not true on screen. The words are only reachable through the TS-07 card's quote button.
- Reproduced twice from clean storage, at both desktop and mobile size.
- Likely cause: in this Chrome, `speechSynthesis` ends an utterance in 0.5 ms without starting (180 voices reported). The new player appears to advance on the speech "end" event.
- The same browser played the transcript and showed 3 candidates at 5 s on the previous build. Even if real browsers speak, the player should not skip the whole call when speech fails or is muted.
- Needs a manual check in a normal browser.

**N2. Step 2: reading the quote, then pressing `Confirm`, silently does nothing (07, 08, 09).**
- What happens: with TS-07's expert quote open, `mousedown` on `Confirm` collapses the quote. The button jumps 156 px up (y 811 → 655 measured on TS-13), so `mouseup` lands elsewhere and no click registers.
- The card stays "Not reviewed" with no message. A second click works.
- The step's Notice ("Each rule shows the quote it came from") invites exactly this order: read the quote, then confirm.
- I first saw this in the previous run and blamed tooling. It is reproducible with real mouse events.

**R1. The payoff and one step-3 target are still hard to find.**
- **R1a.** After approval, "See it in INC-2026-1011" opens the room at the top. TS-14 "On an L23 leak alarm, check the LD-23-04 leak-detection cable first" (Allowed, `chilled-water-leak@1.3.0`) is about 3,780 px down on desktop and 8,900 px down on mobile. The new rule is not anchored or highlighted (24, 54).
- **R1b.** On mobile, step 3 lands `#blocked-gate` correctly, but the `Why? · Hear the expert` button sits under the sticky "0 audit events · INC-2026-1011" strip. `elementFromPoint` at its centre returns the strip (45). The guide tells you to press that button first.

### MINOR (new)
- Step 4 says "Escalating opened the 'Tell us why' task. Choose 'Demo note'…". In fact the task is collapsed (`Answer` / `Dismiss`), and you must press `Answer`, tick consent and press `Continue` before "Demo note" exists. The copy skips two actions (13, 14).
- On mobile, after `Escalate`, the new task is inserted above the viewport (top −304 px), so nothing visible changes until `Next` (47).
- The "Call complete" Duration tile clips "00:35:0…" (03).
- `Roll back to v1.2.0` creates "v1.4.0" (correct, append-only). The guide says "roll it back to the previous version" without explaining the new number.
- The incident deadline reads "1439:57 left (SLA 1440 minutes)". It should be shown in hours.

## Other checks (all pass)
- Every step switched to the right person: Tan, Tan, Rajesh, Rajesh, Tan, Hafiz, Priya, Goh. Each landed on the right screen with the right anchor: `?rule=TS-07`, `#blocked-gate`, `#capture-task`, `#note-drafts`, `/approvals`.
- The registry lists TS-14 with "v1.3.0 is live, approved by Goh Boon Kheng · 14 rules" (26). After rollback it shows v1.4.0 with 13 rules.
- Exports all download:
  - pill hub `chilled-water-leak-v1.4.0.zip`
  - audit drawer `Download CSV` and `Download JSON`
  - decision record `Download JSON`
- `/connectors`, `/c`, `/incidents`, `/pulse`, `/registry`, `/approvals` and `/capture` all return 200 with specific titles.
- Console: 0 errors from localhost:3007. The only entries are a verbose DOM note on the password field and log lines from other ports in the shared browser.
