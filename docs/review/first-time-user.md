# First-time user walkthrough: why "there's no flow"

Reviewer: first-time visitor acting as a hackathon judge (Tencent Cloud AI CAN DO IT 2026, Keppel "AI HARVEST" track).
Site: https://keystone-tencent.vercel.app, desktop 1440x900, 12 Oct 2026.
Method: no README or docs read beforehand. Landing, sign in, then every sidebar screen, switching between Technician (Rajesh), Chief Engineer (Tan Wei Ming), Asset Operations Manager (Priya) and Head of Technical Services (Goh).
Screenshots: `.playwright-mcp/ftue/NN-name.png`.

> Note on demo state: following the UI, I recorded a demo close-out note as Rajesh, proposed it as Tan Wei Ming, peer-confirmed it and moved it to Shadow as Priya, then approved it as Goh. That made **v1.3.0 (TS-14, "check the LD-23-04 cable first") live** in my session, and opening `/c/AHU-23-01` created a capture task. I did not press "Reset demo". The audit IDs started fresh (seeded 14:28, the time of my first visit), so this state is probably per-session. If it is shared, the demo needs a reset before the next judge.

## The short answer

The landing page tells one clear five-step story: **Capture, Compile, Apply, Learn, Reuse**. Once you sign in, that story disappears:

1. **Nothing carries the story into the app.** Sign-in drops you on Portfolio pulse, a KPI dashboard. No screen says "you are at step III of V" and no screen says what to do next. The sidebar order (Pulse, Expert call, Decision canvas, Registry, Incident room, Approvals, Learning) is close to the story but has no numbers and no labels.
2. **You have to act as six different people to see one story, and the UI never tells you when to switch or who to switch to.** Sign-in lists 15 personas with no "start here". Pressing Enter without picking anyone signed me in as Muhammad Hafiz, a persona the story never uses.
3. **Screens dead-end.** The incident room has **zero links** (`main a` count = 0). You cannot click from the blocking rule to its pill, its canvas, the expert call it came from, or its learning history. The registry's pill detail has no links either. Approving a version gives no "see it live" link.
4. **The two learning stories collide.** The landing page and Learning page promise "v1.3.0 = TS-02 deadline 15 to 10 min". The frontline-note path (which the landing hero itself advertises with Rajesh's voice note) **also** creates v1.3.0, as TS-14. After I followed the UI, Learning showed "v1.3.0 Approved" next to "Shadow: Propose the correction in step 2 first", and the TS-02 correction never happened.
5. **Jargon is used before it is explained.** Intelligence Pill, Shadow, gate, evidence keys (`lew_signoff`), rule ids (TS-07), Roll no., Jev, Brick, LEW, CFM, eval, Steward, `SKILL.md`, `roles.json`.
6. **The look changes completely at sign-in.** The landing page has a dark photographic hero with an Instrument Serif headline. The app is a beige admin shell with sans-serif headings and a large orange "Expert judgement, governed." block in the sidebar. It feels like a different product.

The parts that work are excellent: the blocked TS-07 banner, the "Why? · Hear the expert" drawer, the expert call's contradiction moment, and the separation-of-duties gate. A newcomer just can't find them in order.

## Recommended 3-minute judge story

**"One sentence from a retiring expert stops an unsafe action, and a technician's 10-second note becomes a governed rule."**

| # | Time | Screen | What the judge sees | Persona |
|---|---|---|---|---|
| 1 | 0:00–0:20 | Landing hero | "The expert retires. His judgement stays." Click **Start the 3-minute demo** | none |
| 2 | 0:20–0:50 | Expert call, jumped to 00:14:32 | Tan Wei Ming says "never re-energise before the LEW signs off"; the TS-07 card appears beside the transcript | Chief Engineer |
| 3 | 0:50–1:10 | Decision canvas, TS-07 tile | The sentence is now a rule with 3 required evidence items, confirmed by the expert and approved in **pill Chilled water leak v1.2.0** | Chief Engineer |
| 4 | 1:10–1:50 | Incident room `?step=10` | The AI proposes "Re-energise". **Blocked by TS-07 v1.2.0**. Click Why, then Hear the expert: his voice and the missing evidence | Technician |
| 5 | 1:50–2:20 | Incident room, Close out job | Rajesh's 10-second note: read back, then drafted as a rule | Technician |
| 6 | 2:20–2:50 | Approvals | Peer confirms, Shadow, then a **different person** approves. Separation of duties is visible | AOM, then Head of TS |
| 7 | 2:50–3:00 | Incident room again | Pill badge now reads **v1.3.0 · includes Rajesh's rule**. Rollback is one click away | any |

Reuse (DC1 override) and the eval replay stay as optional side trips, reached through "Apply to Harbourfront DC1" and Learning.

## P0: confuses every newcomer

### P0-1. No journey carried through the app
- **Evidence:** 01-landing.png has the I–V steps; 05-pulse.png onwards has no trace of them.
- **Fix:** add a persistent **journey bar** under the top bar on every app screen:
  `I Capture · II Compile · III Apply · IV Learn · V Govern`, with the current step highlighted, each step linked to its screen, and a right-aligned **Next: Apply it in the incident room →**.
- Number the sidebar items in story order and group them:
  - "Story": 1 Expert call, 2 Decision canvas, 3 Incident room, 4 Approvals, 5 Learning
  - "Operate": Portfolio pulse, Pill registry
- **Copy for the journey bar tooltip:** "Follow one rule from the expert's mouth to a blocked unsafe action."

### P0-2. Persona switching is invisible and unguided
- **Evidence:** 04-sign-in.png shows 15 equal cards and no recommended start. Pressing Enter without a selection silently signed me in as Muhammad Hafiz (05-pulse.png). The radio inputs are `sr-only`, so the selected state is weak.
- **Fixes:**
  - Sign-in: add a top card, **"Take the guided demo (3 min)"**, that signs in as Tan Wei Ming and opens step 1. Below it, put a "Choose a role yourself" disclosure holding the 15 personas, with the 4 story personas pinned first and marked "in the demo story".
  - Disable **Sign in** until a persona is chosen. Never default to a hidden persona.
  - Remove "roles.json" from the subtitle. Use: "What you see and what you may approve depends on the role you pick."
  - Wherever a step needs another role, show an inline **role hand-off** instead of a disabled button. Examples:
    - Close-out draft (17-close-out-propose-readonly.png): replace "Technician has read-only access to this pill (SKILL.md access.roles_read_only)" with "Technicians can't change pills. **Hand to Tan Wei Ming (Chief Engineer) to propose →**". The link switches user and opens the canvas tile.
    - Approvals after Shadow (28-approvals-shadow-separation.png): replace "someone else must approve it" with "Approver for this pill: Goh Boon Kheng, Head of Technical Services. **Switch to Goh to approve →**".

### P0-3. The incident room has no links: you can't see which pill is driving a decision or go to it
- **Evidence:** 07, 10, 11. Pill pills are shown as slugs (`chilled-water-leak@1.2.0`) in plain `<span>` elements. The Why drawer cites `ce-interview-2026-10-02` without a link. The pill cards say "Roll no. (version)".
- **What works:** the blocked banner does name **"Rule TS-07 v1.2.0"**, and every decision card carries `chilled-water-leak@1.2.0` or `incident-comms@1.0.0`. So a careful reader can tell which pill and version decided. A newcomer can't act on it.
- **Fixes:**
  - Make each pill card at the top a link to the pill (registry detail), and rename "Roll no." to **"Version"**.
  - In the decision cards, replace the slug with a human chip, **"Chilled water leak · v1.2.0"**, linking to `/canvas/...#TS-07`.
  - In the Why drawer, link the expert source to the call: **"Hear it in the onboarding call (00:14:32) →"** goes to `/capture?t=00:14:32`. Link "Approved by Goh Boon Kheng" to the Learning version history.
  - Show a one-line provenance strip in the blocked banner: "From Tan Wei Ming's onboarding call · confirmed by him · approved by Goh Boon Kheng · v1.2.0".

### P0-4. Learning stories collide on v1.3.0, and the hero's own example dead-ends
- **Evidence:** 15, 16, 24, 30.
  - The landing hero shows Rajesh's note ("Closed ISV-L23-CHW at 08:20 …"). In the incident room, the same demo note first returned **"The extractor found no rule in this note"**, while the green banner above it said "The draft waits on the pill's canvas" (15). It only produced a draft on retry (16). The live model is non-deterministic on the showcase input.
  - After propose, peer, Shadow and approve, Learning shows "v1.3.0 Approved · Step 5 of 7 · Shadow: Propose the correction in step 2 first". The eval row "the correction" still **fails on v1.3.0 (13/14)**. The landing page says "6 of 6 past incidents pass on replay" and "v1.3.0: TS-02's deadline moves from 15 to 10".
- **Fixes:**
  - Make the demo note path deterministic: use the recorded draft for "Use this demo note" and keep live extraction behind an explicit "Re-draft live" button, the way the expert call does.
  - Never show "The draft waits on the pill's canvas" unless a draft exists.
  - Choose **one** v1.3.0 story for the demo. Either the frontline note becomes v1.3.0 and the TS-02 correction becomes v1.4.0, or the reverse. The landing copy, Learning step labels and eval table must all agree.
  - Learning step tabs: the active tab (I) and the counter ("Step 5 of 7") disagree. Highlight the step the counter names.

### P0-5. Unexplained vocabulary on every screen
Terms a newcomer met without a definition, with the screen where they first appeared and a proposed fix:

| Term | First seen | Proposed plain label or tooltip |
|---|---|---|
| Intelligence Pill | Landing hero, sidebar logo | "Pill: a versioned package of one expert's rules for one kind of incident" (tooltip on first use per screen) |
| Shadow | Hero badge "Peer-confirmed before Shadow" | "Shadow (trial run): the new version watches live incidents and records what it would have done, without acting" |
| Gate / Blocked | Hero, incident room | "Safety gate: a fixed check the AI can't override" |
| Evidence keys (`lew_signoff`, `area_dry`) | Hero card, incident | Show the human label first ("LEW written sign-off") and the key in small mono only in a details view |
| TS-07, TE-01 | Everywhere | "Rule TS-07" on first use; tooltip "TS = Technical Services rule, TE = Tenant Experience rule" |
| Roll no. (version) | Pill cards | "Version" |
| Jev ("Suggest evidence · Jev") | Incident timeline | "Suggest evidence (AI)" or explain who Jev is |
| LEW, CFM, FCC | Incident, sign-in | Expand on first use: "Licensed Electrical Worker (LEW)" |
| Brick, `brick:Switchgear` | Registry | "Covers 23 equipment types", with the Brick list behind a disclosure |
| Eval pass 78/79, Replay agreement 99 of 100 | Registry, Pulse | "Past-incident checks passed: 78 of 79". Use one metric name everywhere |
| Steward, RACI | Canvas, registry | Tooltip: "Steward keeps the pill healthy; approver signs off versions" |
| `SKILL.md access.roles_read_only`, `roles.json`, `asset-hf1` | Close-out, sign-in, approvals | Remove file names and internal IDs from UI copy |

Add a small **"?" glossary popover** in the top bar listing these.

## P1: confuses most newcomers

### P1-1. Portfolio pulse is the wrong landing screen after sign-in
- **What I thought in 5 s:** an ops dashboard for a portfolio manager.
- **What it is for:** a portfolio overview: incidents, coverage, KPIs.
- **Problems** (05, 06):
  - The same view for every role. As Technician, "Open capture tasks" is empty and there is no "your next step".
  - The KPIs aren't clickable.
  - Coverage column headers are raw slugs (`technical-services-chilled-water-leak`).
  - Every "Outcome →" link goes to the same Learning page.
  - Roof intrusion (Logistics) and Domestic water leak (Residential) show **Pass**, yet coverage marks Logistics and Residential as **Gap**. A judge will spot this.
  - "Detected 3h 28m" against the incident room's "T+00:00 since detection" is confusing.
- **Fix:** after sign-in, send guided-demo users to step 1, not Pulse. Add a role-aware **"Your next step"** card at the top of Pulse:
  - Technician: "INC-2026-1011 is blocked waiting on the LEW. Open the incident room →"
  - Chief Engineer: "13 rule candidates from your call await review →"
  - Approver: "v1.3.0 awaits your approval →"
- Rename the coverage headers to "Chilled water leak" and "Incident comms".

### P1-2. Incident room is cluttered and starts empty
- **What I thought in 5 s:** a live incident console.
- **What it is for:** a replay showing evidence arriving and rules firing.
- **Problems:**
  - It opens at "Event 0 / 17", "No rule triggered yet", "0 of 0 required evidence confirmed" (07). Only the landing "Try the demo" link adds `?step=10`; the sidebar link doesn't.
  - **"Reset demo"** sits directly under the primary action with equal weight.
  - Countdowns ("4:58 left") tick in real time while the replay is paused.
  - The tenant message shows **"NaN min overdue on replay clock"** (09).
  - For Technician, masking turns every SLA time into "[masked: tenant PII]", so the comms panel is unreadable.
- **Fixes:**
  - Default the sidebar link to the "moment of risk" (`?step=10`), with a banner: "Replaying INC-2026-1011 at 08:11, the moment the AI proposed re-energising. ◀ Earlier events".
  - Move Reset demo into a "Demo controls" overflow menu with a confirm step.
  - Freeze deadlines while the replay is paused.
  - Fix the NaN.
  - Mask only names, not times.
  - Add an orientation line under the title: "Approved pills check every new piece of evidence. Red means an action is blocked until the listed evidence arrives."

### P1-3. The expert call is strong but slow, and it doesn't hand off cleanly
- **What I thought in 5 s:** a call recording with extracted rules. That is correct.
- **Problems** (18–22):
  - Accept call, then 15 s later it is still on the greeting.
  - At 4x it took more than 3 minutes to reach "Call complete". The good CTA, "Review on the decision canvas", appears only then.
  - Transcript order is odd: the current utterance sits above 00:00:12.
  - Coverage fell from 87% mid-call to 82% at the end without explanation.
  - "Draft, awaiting your confirmation": confirming TS-07 here (20) **did not carry over**. On the canvas TS-07 was still "Pending" and "0 confirmed" (23).
  - Before switching, as Technician, "awaiting your confirmation" was shown to someone who can't confirm.
- **Fixes:**
  - Make the "Jump to 00:14:32 LEW rule" chip the first thing on the page.
  - Show "Review on the decision canvas →" at all times, not only at the end.
  - Persist confirmations between call and canvas, or label them "preview only".
  - Address the copy to the role: "Tan Wei Ming confirms these" when the viewer isn't him.

### P1-4. The decision canvas contradicts itself
- **What I thought in 5 s:** a draft review screen.
- **What it is for:** reviewing candidates for the next version of an already-approved pill.
- **Problems** (23, 24):
  - The pill card says **Approved v1.2.0**, yet all 13 tiles say "Pending" and the footer says "0 of 13 decided · Publish as v1.3.0 draft". After my proposal, it jumped to "v1.4.0 draft" with no explanation.
  - The frontline-note card says "No audio was recorded: **the note was typed**" for a demo note that was never typed.
- **Fixes:**
  - Add a header line: "You are reviewing changes to **Chilled water leak v1.2.0 (live)**. Decisions here create the next draft version; the live version keeps running."
  - Show each rule tile's live status ("In v1.2.0 · live") separately from the review status.
  - Fix the audio label so it says "Recorded demo note".

### P1-5. Registry pill detail starts with access control, not with what the pill does
- **What I thought in 5 s:** a catalogue of pills. That is correct.
- **Problems** (25, 26):
  - The detail panel opens with "Sensitivity & access" and a wall of `brick:` classes.
  - It doesn't list the 13 rules.
  - It doesn't say where the pill is used (INC-2026-1011, INC-2026-1012, AHU-23-01).
  - It has no link to the canvas, Learning or incidents.
  - "Awaiting review 1" is shown, but the draft isn't in the list.
  - The empty right half before a selection reads like a broken layout.
- **Fix:** order the detail as:
  1. "What it decides": the rule list with action class.
  2. "Where it's used": incidents and assets, each a link.
  3. Version history, linked to Learning.
  4. Access and portability, collapsed.

  Before a selection, show "Select a pill. Chilled water leak drives the blocked decision in INC-2026-1011."

### P1-6. Approvals: Shadow is ceremonial and the diff isn't human-readable
- **Problems** (27–29):
  - "It must run in Shadow before anyone can approve it." I moved it to Shadow and the next user was "Clear to approve" immediately, with **0 shadow runs**.
  - The "Human-readable changes" diff shows "TS-14: — → added" without the rule text.
  - After approval the card vanishes, with no "v1.3.0 is live. See it in the incident room →".
  - The toast "v1.3.0 promoted to Shadow." persisted after switching user.
- **Fixes:**
  - Either require at least one shadow replay, or reword to "Shadow records what it would do; approval may follow at any time."
  - Show the full rule text in the diff.
  - Add a success state with links to the incident room and Learning.

### P1-7. Inconsistent numbers across screens
Landing "6 of 6 past incidents pass" against the "Replayed incidents 0/6 pass" visual on the same page. Pulse "Replay agreement 99 of 100". Registry and Approvals "78/79". Learning "6 eval cases" with one failing. Pick one metric ("past incidents replayed: 5 of 6 pass, 78 of 79 checks") and use it everywhere.

## P2: polish

- **Visual break from the hero** (01 against 05): the app headings are not Instrument Serif. The sidebar's orange "Expert judgement, governed." block is louder than any content and carries no information. Fixes:
  - Use Instrument Serif for page H1s.
  - Replace the orange block with a small dark card in the hero's palette, showing the journey step and "Guided demo: step 3 of 7".
  - Carry one muted photographic motif into empty states.
- **Pill "film slate" cards** (Name / Class / Roll no.) take a lot of space and look like form fields. Make them a compact chip: "Chilled water leak · Technical Services · v1.2.0 ✓ Approved".
- **"See it in action: Walkthrough video — coming soon"** on the landing page looks unfinished to a judge. Remove it, or replace it with the guided-demo CTA.
- **`/c/AHU-23-01` (Teach this asset)** isn't in the sidebar and is only reachable by URL. It still shows "Chilled water leak v1.2.0" after v1.3.0 went live (31). Simply opening it creates a capture task and an audit event. Link it from the incident's asset name. Show the live version. Create the task only on submit.
- **Close-out panel:** "Close capture" next to "Dismiss" is ambiguous. Rename to "Finish note" and "Not now". The "Check what we heard" read-back is asked twice, once for the transcript and again inside the draft.
- **Audit log** is the best recap of the story ("proposed by A, shadowed by B, approved by C"). Offer it as the final step: "See the whole story in the audit log".

## Per-screen notes

| Screen | 5-second read vs actual purpose | Next step obvious? | Connects to story? |
|---|---|---|---|
| Landing (01–03) | Clear: an expert-knowledge product. Correct | Yes: "Open the incident room" and "Hear the onboarding call" | Yes, best on the site |
| Sign-in (04) | "Pick a user". 15 options, no guidance | No | No |
| Portfolio pulse (05–06) | Generic ops dashboard | No; the Technician has nothing to do | Weak |
| Incident room (07–17) | Live console. Actually a replay plus a gate demo | Only inside the panels; no links out | Apply step is strong; no links back to Capture or forward to Learn |
| Close-out note (12–17) | Voice memo. Correct | Dead-ends at "read-only" for Technician | Should hand off to the canvas |
| Expert call (18–22) | Call transcript plus extraction. Correct | Only at call end | Good CTA to the canvas, but slow |
| Decision canvas (23–24) | Draft review, while the pill is already approved | "Publish" disabled until 13 decisions | Partial |
| Pill registry (25–26) | Catalogue | No links | No |
| Approvals (27–29) | Governance queue. Correct | No success next step | Partial |
| Learning (30) | Outcome form plus version pipeline | Step counter contradicts tabs | Partial; collides with the frontline-note version |
| Teach AHU-23-01 (31) | QR capture page | Consent, then record | Orphaned (not in nav) |

## Concrete build list (in order)

1. **Guided demo mode** (`?tour=1`): a 7-step stepper overlay matching the table above. Each step auto-switches persona, deep-links to the right anchor (`/capture?t=00:14:32`, `/canvas/...#TS-07`, `/incident/INC-2026-1011?step=10`), and shows one sentence of orientation plus **Next →**. Launch it from the hero ("Start the 3-minute demo") and from sign-in.
2. **Journey bar** (I–V) on every app screen, with numbered and grouped sidebar items.
3. **Link everything pill-related:** pill chips go to the registry detail, rule ids to the canvas tile, the expert source to the call timestamp, and versions to Learning.
4. **Role hand-off CTAs** in place of disabled or read-only dead ends.
5. **Fix the v1.3.0 collision**, make the demo note deterministic, fix NaN, sync TS-07 confirmation, and freeze countdowns on pause.
6. **Glossary popover** plus plain-language labels (Version, Trial run (Shadow), Safety gate, human evidence labels first).
7. **Visual alignment** of the app shell with the hero.
