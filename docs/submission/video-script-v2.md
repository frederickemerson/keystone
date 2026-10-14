# Keystone — demo video (shooting script)

**Runs 6:44–7:32.** One narrated voice. Upbeat, fast cuts, motion graphics over live product.

**Measured, not estimated:** 1,033 words of VO, 35 held beats, 6 quote cards. At a
conversational 150 wpm that is **7:32**; read upbeat at 170 wpm, **6:44**. Either way it sits
inside the handbook's 5–8 minutes with room at both ends. The per-act timecodes below are
computed from the same count at 160 wpm, so they move when the words do.

**Re-measure if you rewrite a block.** The first draft of this script came out at 8:52 and
nobody noticed until it was counted; the Act 2 rewrite pushed it to 7:41 and was trimmed back.
The method: count words inside `> **VO:**` blocks, 0.7s per `[beat]`, 2.5s per quote card.

**The handbook asks for three things in this video** (handbook §"Demo video", 5–8 minutes),
and each has its own place here:

| Required | Where |
| --- | --- |
| Project overview | Acts 0–2 |
| Core Agent features and how it's used | Acts 3–10 |
| A short reflection on your build approach, with CodeBuddy/WorkBuddy tips | **Act 11** |

**The organising idea:** this is not a feature tour. Every act answers a problem the
challenge owner stated out loud in the Keppel briefing, in roughly the order he raised them.
Six times his words appear as a lower-third quote card — then the product answers it.

**Text on screen is punctuation, never paragraph.** If the narrator says it, the screen does
not spell it out. Under 40 words total outside the quote cards.

---

## Voice direction

Conversational, quick, a bit wry — showing a mate something you're pleased with, not
presenting to a board. Short sentences. Land the full stops. On **[beat]**, stop properly:
the picture is working.

Do not read stage directions or quote cards aloud — the cards are read by the viewer.

**Quote card style:** small, lower third, his words in quotes, attributed
*Keppel · AI HARVEST briefing*. On screen 2.5s. Never over a busy shot.

**Six cards, and these six.** One per unsolved problem he named, plus the two that frame the
whole thing. Every act could carry one; using them everywhere would read as flattery, so the
acts that answer something he said was *already solved internally* carry none.

---

## ACT 0 — COLD OPEN · the problem in one shot (0:00–0:17)

| | |
| --- | --- |
| **Visual** | Hard cut, already mid-question. A plain chat box — deliberately NOT Keystone, no product chrome: *"After a chilled water leak, who must approve re-energising?"* Answer streams in fast. Slow push-in. |
| **Motion gfx** | Marker-circle the rule id and the version number it quotes. Both stamp **amber — unverifiable**, not red-wrong. Corner counter spins to `2s`. |
| **Music** | In on frame one. Driving. No build-up — we're already moving. |

> **VO:**
> "An AI agent. Asked who signs off before you re-energise after a flood.
> [beat]
> Two seconds. Confident. It cites a rule, and it cites a version number.
> [beat]
> And you have no way to tell whether it read that somewhere or made it up. Nothing on this
> screen is checkable. That is the whole problem."

---

## ACT 1 — "we lose institutional knowledge" (0:17–0:52)

> **QUOTE CARD 1:** *"Every time we have someone leaving the organisation — retirement,
> changing jobs — we lose some of this institutional knowledge."*

| | |
| --- | --- |
| **Visual** | Building at dusk. A hard-hat figure walks out of frame. |
| **Motion gfx** | A stack of SOPs builds — crisp, official. As he exits, the pages stay but the glowing threads *between* them drain away with him. Then the Keystone wordmark lands, small. |
| **Text on screen** | **18 years. Walking out the door.** |
| **Disclosure** | Small, bottom of frame, 3s, unobtrusive: *"Scenario, people and incidents are fictional. The system, the rules and the tests are real."* **This is not optional — see production notes.** |

> **VO:**
> "Tan Wei Ming has run technical services for eighteen years. He retires next year.
> [beat]
> The procedures stay. But a written procedure is codified understanding — it gives you the
> steps. Not which step to break, and when.
> [beat]
> That part isn't in any document. It's in him.
> [beat]
> This is Keystone. It turns one expert's judgement into an Intelligence Pill — a versioned,
> tested, plain-text artifact with an owner and an approver — and then governs how that pill
> gets used, argued with, and added to."

---

## ACT 2 — capturing the judgement (0:52–1:59) ← *centrepiece*

> **Shoot this on `/teach`, not `/capture`.** The simulated phone call is still in the
> product — every provenance citation points into that transcript — but it is no longer
> the surface that leads, and it is the weaker thing to film: a waveform and a timer.

| | |
| --- | --- |
| **Visual** | Live `/teach`. The animated section of the building: Level 28, the coupling fails, water through the void onto 27, then the dashed line creeping along the conduit toward DB-27B. Five stages, each landing on a caption. |
| **Motion gfx** | Let the creep run its full 2.6s. The cupboard throbs red. The measure snaps in last and says **how close is too close?** — hold on that question before cutting. |

> **VO:**
> "So we sit him down. Not a form — a situation. Judgement only shows up against a case.
> [beat]
> Then one question, deliberately the widest we have: walk me through what you did, and why."

| | |
| --- | --- |
| **Visual** | He types — or holds to talk. On the right, the board titled **What the rule still needs**: eight fields of a rule, most of them grey. |
| **Motion gfx** | As the account lands, one square ticks. The rest stay grey. Push in slightly on the grey. |

> **VO:**
> "That panel isn't progress through a script. Those are the fields of an actual rule — the
> ones the engine reads — and grey means genuinely unknown.
> [beat]
> So it only asks what's missing. Two taps, not twenty minutes: who signs it off, what has
> to be confirmed first, how long is too long."

| | |
| --- | --- |
| **Visual** | A single-choice card: *"First call. What do you isolate?"* → **The whole riser.** Then, later, a card that opens with a grey scenario strip: *"An AHU branch leak on Level 27. The branch sub-valve is accessible, and closing it stops the flow."* → **The branch sub-valve.** |
| **Motion gfx** | The moment the second answer lands, the amber panel snaps in. Both answers side by side. Keyston tilts and looks two ways at once. |

> **VO:**
> "Then he contradicts himself.
> [beat]
> And it catches him. Both answers, side by side.
> [beat]
> He isn't wrong twice. There's a condition he never said out loud — branch leak, sub-valve
> reachable. Twenty years of instinct, and nobody ever wrote down the *if*.
> [beat]
> That's the thing that was walking out the door."

> **Say this one slowly — it is the strongest technical claim in the video:**
>
> "And notice what *found* it. Not a model reading his answers back. Two taps about the same
> field of the same rule, with different values — the code compares two strings. There is
> nothing there to hallucinate."

**Production note — the voice takes are no longer needed.** Every line in this act is spoken
by the product itself, pre-rendered on **Tencent Cloud's MiniMax Speech 2.8 HD** via TokenHub
(`English_Trustworth_Man` for the expert, `English_CalmWoman` for Keystone) and served as a
static file, so it is identical on every take and works with the venue wifi down. There is no
longer any point in the sidebar where a human voice stands in for a fictional engineer —
which also removes the whole class of objection the claims audit raised.
`~/Desktop/keystone-voice/` can stay empty.

Worth a sentence in Act 11 if there is room: the synthesis endpoint is
`/v1/wand/minimax-tts/sync_tts`, nothing like the OpenAI-compatible shape the same host
serves chat on, which is exactly the kind of thing that costs an afternoon.

---

## ACT 3 — not one expert. several. (1:59–2:43) ← *new*

> **QUOTE CARD 2:** *"You just need to know what kind of skill or agent you give me, so that
> I can start teaching it — what Paul knows, what I know, what another colleague knows."*

| | |
| --- | --- |
| **Visual** | Hard cut to a phone, on site. Rajesh Kumar, technician, is blocked by a gate. The prompt: **"Tell us why — 20 seconds."** He holds to talk. |
| **Motion gfx** | Waveform. Then read-back chips pop one at a time — a number, an asset tag, a role — and **he** taps each one to confirm. Then the draft rule assembles itself, the quote highlighted inside the note it came from. |
| **Then** | Quick-cut the gate: Hafiz — neither the speaker nor the proposer — confirms. Shadow. Approve. Version flips **1.2.0 → 1.3.0**. |
| **Payoff shot** | Back to the pill page. The line under the title **re-types itself**: "Whose knowledge this is: Tan Wei Ming (13 rules)" → "**Tan Wei Ming (13 rules), Rajesh Kumar (1 rule)**". |

> **VO:**
> "But a pill isn't one person. The man on the floor knows things the chief engineer doesn't.
> [beat]
> So when a gate blocks Rajesh, it asks him why. Twenty seconds, his own voice.
> [beat]
> Watch who checks the numbers, though — *he* does. It reads back what it heard, and he
> confirms each one before any of it becomes a rule. Then a colleague who neither said it nor
> proposed it confirms. Three different people, and the code refuses if they're not.
> [beat]
> And now the pill says whose knowledge it is. Thirteen rules from the chief engineer, one
> from a technician — and it'll name the next person too."

**Walked end-to-end on the live URL (14 Oct), 11 checks, all passing.** Rajesh blocked by
TS-07 → escalate → the capture task opens → consent (two boxes, and "Continue" stays dead
until both are ticked) → demo note → four read-back values he confirms himself → draft rule
credited to him by name → Tan proposes it on the canvas → Hafiz, who neither spoke nor
proposed, confirms. Shoot it in that order; the consent step is worth two seconds on screen
rather than cutting around.

---

## ACT 4 — "the human in the loop cannot be missing" (2:43–3:08)

> **QUOTE CARD 3:** *"The human in the loop cannot be missing. So the energy manager — what's
> the role of this energy manager?"*

| | |
| --- | --- |
| **Visual** | Live incident room, evidence ticking in. TS-07 hits and the screen **stops** — hard red BLOCKED. |
| **Motion gfx** | Everything else desaturates. Three missing items light one at a time: `lew_signoff` · `insulation_resistance_ok` · `area_dry`. A padlock, not a spinner. |
| **Sound** | Music ducks hard on "stops". One clean mechanical *clunk*. |

> **VO:**
> "The answer: the role isn't advisory. It's structural.
> [beat]
> Live incident, evidence arriving — and here it stops. Not a suggestion. A gate. Three things
> confirmed by a named person, in a role this pill allows.
> [beat]
> And no model can open it. The engine making this call takes no AI output at all. Not a
> setting — the architecture."

---

## ACT 5 — "govern that the knowledge is not tainted by hallucination" (3:08–3:35)

> **QUOTE CARD 4:** *"How do we then govern that the knowledge is not tainted by
> hallucination?"*

| | |
| --- | --- |
| **Visual** | **Return to the exact cold-open frame.** Same box, same question, typed identically. |
| **Motion gfx** | The red answer ghosts in behind, wipes away as the new one streams. Circle **Duty LEW**, **1.2.0**, three evidence keys — stamp **green**. Then: **5 passages retrieved**. |
| **Music** | Full lift. This is the turn. |

> **VO:**
> "Now the same question, to the agent the approved pill is published to.
> [beat]
> Duty LEW. All three items. Rule TS-07, version one-two-zero — and it tells you it pulled
> five passages out of the pill to answer.
> [beat]
> Then ask it something the pill does not cover. 'This is not covered by an approved pill.'
> It would rather tell you nothing than tell you something. A confident guess and a real
> answer look identical — unless something measures the difference."

---

## ACT 6 — keep talking to it (3:35–3:58) ← *new*

| | |
| --- | --- |
| **Visual** | Still on that grounded answer. Cursor goes to the follow-up chips and picks **"Does that change if the area is still wet?"** |
| **Motion gfx** | Hold one beat on the word **that**, circled. Then the follow-up lands, indented under the first with a ↳. Counter in the corner: **follow-up 2 of 8**. |

> **VO:**
> "Now ask a follow-up with the word *that* in it.
> [beat]
> A question box has no idea what *that* means. This does — the thread is held open. On our
> server, against your session, so nobody can pick up somebody else's.
> [beat]
> That's the bit he asked for and said they hadn't built: management arguing with the agent,
> not querying it."

**Shooting note.** The live agent is not deterministic. All three follow-up presets resolved
their reference when last measured, but phrasing varies run to run — shoot two or three takes
and keep the clearest. If it answers *"the pill does not specify an alternative approver"* —
which is what *"what if that person is not on site?"* tends to get — **that is a usable take,
not a failed one.** It resolved the pronoun and then refused to invent, which is the
behaviour this whole submission argues for. Do not re-shoot waiting for something flashier.

---

## ACT 7 — "all these are disjointed" (3:58–4:25)

> **QUOTE CARD 5:** *"Management asks questions, the energy manager answers — all these are
> verbal in the meeting and it's not captured… all these are disjointed."*

| | |
| --- | --- |
| **Visual** | Cursor hits **"This answer is wrong."** Form opens — rule, site, who should answer. One click. |
| **Motion gfx** | The question itself *lifts off* the chat box and flies across a cut into `/pulse`, landing as a task card: **Agent answer disputed**. Then quick-cut: expert records a reply → draft → diff → approve → version bumps. |
| **Pacing** | Fastest sequence in the film. 3–4s per beat. It should feel like a relay. |

> **VO:**
> "And when somebody reads an answer and knows it's wrong — one click, and the question
> doesn't evaporate.
> [beat]
> It becomes a task, addressed to whoever actually owns that knowledge, with the original
> question attached. They answer in their own voice. That becomes a draft. Reviewed,
> approved, versioned.
> [beat]
> Asked, answered badly, corrected, shipped — and all four are now one record. Not four
> disconnected things."

---

## ACT 8 — top five, and why (4:25–4:49) ← *new*

| | |
| --- | --- |
| **Visual** | `/pulse`, **"What to look at first"**. Push in on row one. |
| **Motion gfx** | The reason sentence types itself out and the three evidence items it names light up: *"TS-07 is holding this until **LEW sign-off**, **insulation resistance test passed** and **area confirmed dry** are confirmed by someone the pill allows."* |

> **VO:**
> "He described the report his own team already builds — top five issues, and *because of*
> what.
> [beat]
> So: five, worst first, each one saying why it's there and who it's waiting on.
> [beat]
> And it's not a score — there's nothing to tune. Same record, same order, every time. You
> can argue with it. You can't argue with a number somebody weighted."

---

## ACT 9 — "is this a new skill?" (4:49–5:39) ← *new, and the strongest*

> **QUOTE CARD 6:** *"How do we capture if there's a new skill discovered? It's a problem
> we've never faced before and we've actually solved that problem. So is this a new skill?"*

| | |
| --- | --- |
| **Visual** | `/pulse`, **"Is this a new skill?"**. The sentence reads itself: *1 of the 4 incidents that could be replayed fired no rule at all across all 2 approved pills, and was solved anyway.* |
| **Motion gfx** | `INC-2026-0923` opens. Chiller plant, **+18% over baseline, four days**, every point inside its limits — green ticks all the way down, and the total still red. Cut to the pill hub for one second: run the replay, **nothing fires**. |
| **Then** | Back to the card. Press **"How did you solve it?"**. The task lands, addressed to the Chief Engineer. |

> **VO:**
> "This is the one he said they hadn't solved at all.
> [beat]
> An incident the record can't explain. Plant eighteen percent over baseline for four days —
> every single reading inside spec. Somebody solved it: they read the façade and the humidity
> before they suspected the plant.
> [beat]
> Replay it through every approved pill and not one rule fires. The system notices that
> itself.
> [beat]
> And then it does the honest thing. It does *not* write a rule — you can't infer somebody's
> reasoning from their result, and a rule built that way is a guess in a rule's clothes.
> [beat]
> It asks the person who knew. And their answer goes through the same approval as everything
> else, because an answer nobody approved isn't a skill yet."

---

## ACT 10 — one-off or systemic, and the questions nobody asked (5:39–6:10)

| | |
| --- | --- |
| **Visual** | Registry rules. Recurrence chips stamp in. Then the blind-spot panel, highlighting one row. |
| **Motion gfx** | **Recurring** ×4 · **Seen once** ×3 · **Not in the record** ×6. Then `distance_to_electrical_m` pulses in the blind-spot row. |

> **VO:**
> "The triage *is* the expertise — one-off, you just fix it; recurring, that's worth a skill.
> So every rule says which it is. Four recurring. Six the record has never seen — and we say
> so, instead of pretending.
> [beat]
> And this row is the one that started it. Operations have always recorded how far the water
> is from live electrics. No rule read it, until he told us where his line was.
> [beat]
> It found a question we forgot to ask."

---

## ACT 11 — how it was built (6:10–6:52) ← *required by the handbook*

| | |
| --- | --- |
| **Visual** | Screen recording, real: CodeBuddy in **Plan mode**, writing the markdown plan before touching a file. Then a fast scroll of the test suite running green. Then `.codebuddy/skills/` in the tree, and the pill installed as a native CodeBuddy skill answering the TS-07 question. |
| **Motion gfx** | Counter ticks up to **1,253 tests · 100 files**. Keep it quick — this is a reflection, not a victory lap. |
| **Pacing** | Calmer than the rest. Drop the music under. You're talking to another builder now. |

> **VO:**
> "Quickly, how it got built — four things worth stealing.
> [beat]
> CodeBuddy in Plan mode first. It writes the plan as markdown and you argue with *that*
> before it touches a file.
> [beat]
> Freeze the scope, build one closed loop. Seven half-working screens lose to one that
> closes.
> [beat]
> Safety rules as tests, not comments — evidence can't be faked open, the author can't
> approve their own version. Eleven hundred of them. That's the part you can actually run.
> [beat]
> And the model only ever does language; every decision is a pure function. So swapping the
> model can't change a safety outcome. Not a promise — the shape of the code."

---

## CLOSE (6:52–7:06)

| | |
| --- | --- |
| **Visual** | The pill artifact splits into three, each flying to its destination: **skill** · **agent** · **platform**. |
| **Text on screen** | **Keystone — expert judgement, governed.** Then the music credit card (licence condition — must stay). |

> **VO:**
> "One pill. Ships as a skill. Runs as an agent. Lives in the platform.
> [beat]
> So the new person works as if Tan Wei Ming is sitting next to them.
> [beat]
> He still retires. His judgement doesn't."

---

## Production notes

- **1,033 words of VO · 35 beats · 6 quote cards → 6:44 (upbeat, 170 wpm) to 7:32
  (conversational, 150 wpm).** Counted, not guessed. Inside the handbook's 5–8 minutes. If a
  take comes in slower than 150 wpm it will scrape the ceiling, so watch the clock on the
  read rather than trusting this number afterwards.
- **If it runs long**, cut in this order: Act 10's two-metre beat → Act 8 entirely → the last
  tip in Act 11. Do **not** cut Act 9; it is the strongest thing in the film.
- **If it runs short**, the eval/drift replay (`/learning`) is the one real feature still
  unshown and would add ~40s.
- **Never hold a static screen past 3 seconds.** Push-in, parallax, or a graphic landing —
  always something moving.
- **Act 0 and Act 5 must be frame-identical.** The callback only works if the viewer
  recognises the shot.
- **Act 3 and Act 9 are the two that answer things Keppel said they had NOT solved.** Give
  them the energy. Act 9 especially — slow down for the "it does not write a rule" line; it
  is the single most load-bearing sentence in the submission.
- **Everything here is real and already on screen in the product** — five passages, the
  refusal line "This is not covered by an approved pill", the follow-up thread counter, the
  attribution line, the reason sentence, `INC-2026-0923`, 4/3/6 recurrence,
  `distance_to_electrical_m`. All of it is recorded footage of the deployed site.
- **Act 0 is the one deliberate exception, and it is not a product shot.** An earlier draft
  claimed the agent invented a version number, "v2.1". That was never observed — and asking
  the published agent something outside the pill produces the OPPOSITE behaviour: it answers
  "This is not covered by an approved pill." So Act 0 is a generic chat box with no Keystone
  chrome, illustrating the situation any ungoverned assistant puts you in, and Act 5 answers
  it with two real frames: the grounded answer, and the refusal.
- **Every path in this script has now been run in production**, including the frontline
  capture path in Act 3, which was the last one outstanding: 11 checks, all passing. The
  only thing left to confirm on the day is that the recording you make matches the figures
  in the VO, which the production notes below already list.
- **The fictional-scenario disclosure in Act 1 is mandatory, not a nicety.** Tan Wei Ming,
  Rajesh Kumar, the tower and every incident are invented, and the narration speaks about
  them as if they were real because that is how a worked example reads. A review of the
  earlier 7:30 script (`docs/review/claims-audit.md`) found lines that a judge could fairly
  call false for exactly this reason — including narration claiming the expert's "own voice"
  over what was actually speech synthesis. One small card removes the whole class of problem,
  and costs three seconds. Act 2 no longer has that exposure at all: the product speaks its
  own lines, pre-rendered, and the screen names the model and voice doing it. If any human
  recording is ever cut in for the expert, it is an actor reading a fictional character's
  lines, and must never be described on camera as a real recording of a real engineer.
- **Music:** "Beauty Flow" (CC BY 4.0) with its credit card, or swap for more drive — if
  swapped, re-check the licence and change the credit with it.

### Music credit (licence condition — must appear)

```
"Beauty Flow"
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
http://creativecommons.org/licenses/by/4.0/
```

---

## What changed from the 3:35 cut

The earlier version of this script ran ~3:35, which was **under** the handbook's stated 5–8
minutes, and it was missing a section the handbook explicitly asks for.

| Change | Why |
| --- | --- |
| **Act 11 added** (build reflection, CodeBuddy tips) | The handbook requires "a short reflection on your build approach and any development tool tips with reference to CodeBuddy/WorkBuddy". The old script had none. |
| **Act 3 added** (frontline capture → attribution) | Answers *"what Paul knows, what I know, what another colleague knows"*, and shows the frontline capture path, which was a whole built feature never on screen. |
| **Act 6 added** (follow-up thread) | Answers the "discussing things together with the management" ask he said they had not built. |
| **Act 8 added** (top five, and why) | His own internal report, built his way, with the "because of ABCD" visible. |
| **Act 9 added** (is this a new skill?) | The third of the three problems he said were unsolved, and the only act where the *system* notices the gap rather than a person reporting it. |
| **Overview line added to Act 1** | The handbook asks for a project overview; the old cut never actually said what Keystone is. |
| **Quote cards: 5 → 6** | One per unsolved problem, plus the two framing ones. The old note said "four" while the script already used five — now the number and the script agree. |
| **Act 2 moved from `/capture` to `/teach`** | The simulated call was a waveform and a timer, and the contradiction in it was reported by a model and checked by a guard. On `/teach` the situation is animated, the coverage board shows what is still unknown as fields of a real rule, and the contradiction is computed from two structured answers — which is both the better shot and the stronger claim. |
| **Voice takes dropped** | The product now speaks its own lines, pre-rendered and served as static files. There is no point left where a human stands in for a fictional engineer, which removes that class of objection entirely and makes every take identical. |
| **Act 10's two-metre beat cut** | Act 2 now shows that number being captured, so "nobody ever wired it up" had become a contradiction with something the viewer watched happen. The blind-spot row now reads as the setup Act 2 paid off. |
| **Runtime: ~3:35 → 6:13–6:58 → re-measured after the Act 2 rewrite** | Measured by counting the VO, not estimated. The first draft of the earlier rewrite ran 8:52 — over the ceiling — and was trimmed by ~130 words. See the header for the current count. |
