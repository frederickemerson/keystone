# QA: guided demo, end to end (first-time judge)

- Date: 2026-10-12
- Build: local production server `next start -p 3007`
- Browser: Playwright Chromium, 1440x900 desktop, then 390x844 mobile
- Start state: cookies, localStorage and sessionStorage cleared for localhost:3007
- Screenshots: `.playwright-mcp/qa/NN-name.png`
- Code: not modified. I read `lib/journey/demo-path.ts` for the script. I made one grep into `components/incident/` only to explain BLOCKER B1.

## Verdict: FIX FIRST

The governance core works well. Every action succeeded: play, confirm, escalate, demo note, read-back, draft, propose, peer confirm, Shadow and approve. The right person was signed in on the right screen at every step. There were no console errors. All exports downloaded, the registry lists the new rule, and the incident room shows `v1.3.0 · 14 rules`.

A newcomer still cannot finish step 4 by following the guide. The "Tell us why" task does not exist until you escalate TS-07. The guide never asks you to escalate: step 3 says "Try to re-energise", and the page has no control that does that. Several guide claims at the end of the demo are also not true on screen: the trial-run comparison, "one click rolls it back", and the reuse payoff.

## Step by step

| # | Persona / URL after Next | Guide clarity | Control the guide refers to | Action result |
|---|---|---|---|---|
| 1 | Tan Wei Ming, `/capture?at=00:14:32` (OK) | Clear | Looked for "Play …from 00:14:32" and found `Play from 00:14:32`. A second CTA, `Accept call`, has the focus. | Plays. TS-07 card appears with the quote, `Confirm` / `Edit` / `Reject` (05, 06). The guide panel covers the TS-07 card (M1). |
| 2 | Tan, `/canvas/…?rule=TS-07` (OK, scrolled to and outlined) | Clear | `Confirm` on TS-07 | Confirmed. Shows "Confirmed by Tan Wei Ming" and `1 confirmed` (09). The quote button works (08). The guide covers the `Publish as v1.3.0 draft` bar. |
| 3 | Rajesh Kumar, `/incident/INC-2026-1011?step=10` (OK) | Misleading: "Try to re-energise the air-handling unit." | No button or link contains "energi" (checked in the DOM). The recorded AI proposal is already Blocked. | The `Why? · Hear the expert` drawer works and shows "confirmed by Tan Wei Ming" (11, 12). At 1440x900 the button sits under the guide panel (M1). |
| 4 | Rajesh, same URL (OK) | Names a "Tell us why" task that is not on the page | Looked for "Tell us why" and found nothing (DOM search). Tried the visible `Close out job · add a 10-second note`, which opened the wrong task, "Job close-out" (14, 16). Stepping the replay to event 17 did not help, and neither did `Ask for evidence`. | **BLOCKER B1.** It only works after `Escalate to Rahul Menon` → `Answer now` → consent → `Demo note` → `Use this demo note` → five `Right` → `Draft rule`. That produced 2 drafts (DRAFT-01 Recommend, DRAFT-02 Must escalate) (18–23). |
| 5 | Tan, `/canvas/…` (OK) | Clear, but it says "Rajesh's draft" and there are two | `Drafts from frontline notes` → `Propose` | DRAFT-01 became "Proposed as TS-14 in v1.3.0 (Draft) by Tan Wei Ming" (25). |
| 6 | Muhammad Hafiz, `/approvals` (OK) | Clear | `Confirm as peer`, below the fold | "Peer-confirmed by Muhammad Hafiz" (28) |
| 7 | Priya Nair, `/approvals` (OK) | Asks you to "review how it compares on past incidents" | `Promote to Shadow` works. No comparison view exists (M2). | v1.3.0 in Shadow, with the hand-off to Goh (31) |
| 8 | Goh Boon Kheng, `/approvals` (OK) | Clear | `Approve` | Approved. The success banner sits at the top, off-screen from where you clicked (33, 34). Its primary CTA opens INC-2026-1012 (M4). `Finish the demo` closes the guide with no wrap-up. |

### Results after approval
- Incident room INC-2026-1011 shows `Chilled water leak v1.3.0 · 14 rules`, "Opened under v1.2.0; now evaluated with v1.3.0". At step 10 it reads `Rule TS-07 v1.3.0 — LEW sign-off missing` (37, 39).
- `/registry/technical-services-chilled-water-leak` says "v1.3.0 is live, approved by Goh Boon Kheng · 14 rules" and lists TS-14 (40).
- The pill hub export works. `chilled-water-leak-v1.3.0.zip` holds SKILL.md, rules.yaml (contains TS-14), provenance.json, CHANGELOG.md (1.3.0 entry credits the voice note, Tan, Priya and Goh), evidence.yaml and 6 evals. `Download as JSON` also works.

### Other pages and links
- `/connectors` (47-connectors), `/c` (47-c), `/incidents` (43), `/pulse` and `/registry` all load with HTTP 200.
- Decision record `/incident/INC-2026-1011/record`: `Download JSON` and `Print or save as PDF` are there, and the JSON downloads (44).
- Audit drawer: `Download CSV` and `Download JSON` both download. The CSV has 28 rows (45).
- These links all work: the rule-id link `TS-07` goes to `/registry/…#rule-TS-07` with the anchor in view (42); the pill chip `Incident comms v1.0.0` goes to its pill; the breadcrumbs `Incidents` and `Pills › Chilled water leak`; the journey bar I–V; the sidebar items; the glossary `?` dialog (46); the `Why? · Hear the expert` drawer; "Hear the expert" on the capture page.
- Console: 0 errors and 0 warnings from this app during the run. The only message is a Chromium verbose DOM note on the sign-in password field.

## BLOCKER

**B1. The step 4 "Tell us why" task never appears for someone following the guide.**
- Where: `/incident/INC-2026-1011?step=10`, as Rajesh.
- What I did: followed step 3 ("Try to re-energise the air-handling unit") and step 4 ("Answer the 'Tell us why' task").
- What happened: no "Tell us why" text or control is anywhere on the page. No re-energise control exists either.
- The only visible note entry point is `Close out job · add a 10-second note`, which opens a different task ("Job close-out", 14/16). Advancing the replay to 17/17 and `Ask for evidence` did not raise the task.
- The task appears only after clicking `Escalate to Rahul Menon · Duty Licensed Electrical Worker` on the blocked AI proposal (18). This is confirmed by `components/incident/IncidentRoom.tsx`, where `raiseGateTask` runs from the decision and evidence-request handlers.
- Neither step 3 nor step 4 mentions escalating.
- Screenshots: 10, 13, 14, 16, 18.

## MAJOR

- **M1. The guide panel covers the thing it tells you to use or notice (1440x900).**
  - Step 1: covers the TS-07 card that "Notice" points at (05).
  - Step 2: covers the `Publish as v1.3.0 draft` bar (07, 09).
  - Step 3: covers `Why? · Hear the expert`. `elementFromPoint` at the button's centre returns the guide panel (10).
  - Step 4: covers `Answer now` on the Tell-us-why row (18).
- **M2. The step 7 promise has nothing to look at.** The guide says "review how it compares on past incidents" and "it only shows where the new version would differ". `/approvals` shows only `Eval pass 78/79 · Regressions 0 · Improvements 0`, with no per-incident comparison. The comparison exists only as audit-log text ("trial run over 6 past incidents against v1.2.0, 6 agree", 45). The learning page shows another figure: "5 of 6 past incidents pass (78 of 79 checks)" (41). Screenshots: 31, 41, 45.
- **M3. "One click rolls it back" is false after approval.** On `/learning/technical-services-chilled-water-leak` the only rollback control is `Roll back to v1.3.0`, disabled with "Available once a new version is proposed and approved." Nothing rolls v1.3.0 back to v1.2.0. The glossary says "any approved version can be rolled back" (46). Screenshot: 41.
- **M4. The reuse payoff shows nothing.**
  - The approval banner's primary CTA is `See it in INC-2026-1012` (the DC incident, not the story incident), and it opens at `Event 0 / 9`, "None triggered yet" (35).
  - After `Jump to end`, TS-14 still never appears. Under "not applicable" it says `Incident type "water_ingress" does not match required "condensate_leak"`.
  - So the new rule never fires in either demo incident (36). The pill hub agrees: "Not triggered in any recorded incident yet" (40).
  - Screenshots: 34, 35, 36.
- **M5. The decision record restamps past decisions with the new version.**
  - Rajesh escalated TS-07 at 07:54:19Z, under v1.2.0. v1.3.0 was approved at 07:57:57Z.
  - The exported decision record still lists that gate as `"pillVersion": "1.3.0"`, and "Pills applied" says `v1.3.0 … approved 12 Oct 2026, 15:57` for an incident opened under v1.2.0.
  - For an audit artefact, that is wrong data.
  - Screenshot: 44 (JSON `decision-record-INC-2026-1011-…json`).
- **M6. Wrong provenance on the proposed rule.** The approvals and canvas peer-gate card says "Audio: No audio was recorded: the note was typed." The note was the recorded demo note, and the draft card for the same note says "Recorded demo transcript · capture-qr-ahu-23-01 · no audio". The transcript id `capture-qr-ahu-23-01` (QR capture) is also odd on a gate task. Screenshots: 25, 26.
- **M7. Mobile 390x844: the key moments are buried.**
  - Step 1 auto-scrolls past `Play from 00:14:32` and focuses `Accept call` (51 vs 52).
  - In the incident room, the Blocked TS-07 banner sits about 3,250 px down (4 screens), below the whole evidence timeline, while the guide covers about 40% of the viewport (53, 56).
  - There is no horizontal overflow on any of the three screens checked.
  - Screenshots: 51, 52, 53, 56.

## MINOR

- Sign-in: `Start the guided demo` with no passcode only focuses the field. "Enter the demo passcode first." goes only to a live region and is not visible (03).
- Most pages share the generic title "Keystone — expert judgement, governed": capture, canvas, incident, approvals, registry, pulse.
- Collapsing the guide carries over to the next step, so step 2 opened with its "Do this" hidden (07).
- Ambiguity: step 4 says "the recorded demo note" but two are offered (20). Step 5 says "Rajesh's draft" but the note produced two (DRAFT-01 and DRAFT-02).
- Mixed clocks:
  - "Escalated … at 15:54" and peer "confirmed 15:57" use wall-clock time while the incident clock reads 08:11.
  - SLA countdowns ("4:56 left") tick in real time and reset on reload (3:15, then 4:12).
- Consent ("Before you record") is asked again for every capture task. A close-out task opened by mistake stays open as a second card (18).
- Disabled buttons (`Approve`, `Confirm as peer`) are grey-filled and look active (31). The `Reject` tooltip uses jargon: "Governance store is append-only — …".
- The rule diff shows `TS-14 Before: — After: added` instead of the rule text (26). `Eval pass 78/79` with `Regressions 0` is not explained.
- The "Show N not applicable" list exposes raw engine strings, for example `All-conditions failed: evidence.immediate_life_safety_hazard (undefined) eq true — not matched` (36).
- `Finish the demo` closes the guide silently. `/pulse` afterwards still says "Start the guided demo / Go to your step: approve and reuse".
- After `Approve` the page stays scrolled down. The "v1.3.0 is live" banner is off-screen, so the card just appears to vanish (33 vs 34).
- The mobile header shows only icons. Who is signed in is not visible without opening a menu (52).
- Not verifiable in headless Chromium: synthetic-voice audio. Captions completed instantly (12).

## What works well

- Each step's role switch is correct and visible ("Signed in as …" plus "You are …" in the guide). Each switch is also audit-logged.
- The separation-of-duties messages are clear, for example "Tan Wei Ming proposed this version, so an independent peer must confirm it." and "Priya Nair put v1.3.0 into Shadow, so someone else must approve it" with a `Hand to Goh Boon Kheng` button.
- The read-back step (five highlighted values, Right/Wrong) and the draft-with-verbatim-quote are convincing.
- The export package is complete and the CHANGELOG credits every person in the chain.
