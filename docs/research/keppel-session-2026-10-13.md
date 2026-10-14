# Keppel challenge-owner session — what was actually asked for

Source: the recorded Keppel Q&A sharing session for the AI HARVEST track (~30 min),
transcribed locally. Speaker: **Sean** (Keppel, based in Shanghai), with a facilitator and
participant questions.

These are working notes. The full transcript is **not** committed — it is Keppel's
recording, this repo is public, and nothing here needs more than short quotes to be
actionable. Quotes below are verbatim from the transcript; the rest is paraphrase.

---

## 1. The naming is a direct hit — use his words

> "how do you capture expertise and a person's many years or decades of domain knowledge
> and distill that into an **intelligence pill**, so that when I give this pill in the form
> of can be a **skill**, could be an **agent**, it could be a whole **platform** to someone
> who is new and that person will be able to **function as if Paul is sitting next to this
> person**."

Keystone already calls the unit an **Intelligence Pill**, exports it as a **CodeBuddy
skill**, publishes it as an **ADP agent**, and is itself the **platform**. That is his
three-part framing matched exactly, unprompted. The submission should use this vocabulary
rather than paraphrasing around it.

"As if Paul is sitting next to this person" is the WorkBuddy/CodeBuddy framing in one line.

## 2. The problem is NOT a domain solution

> "the challenge that we have is not so much we are looking for a solution to address asset
> operations or energy management or tenant experience or leasing. It's more the challenge
> of **retaining and replicating our knowledge and our domain expertise**."

And, to a participant worried about lacking real-estate knowledge:

> "The solution that you should be testing out and presenting to us **does not need to be
> strictly related to our domains**, because that's not fair, because you don't have domain
> knowledge."

Implication: chilled-water-leak is a *worked example*, not the product. The pill format
being domain-agnostic is a feature to state plainly, not an apology.

Sean closed by widening it further — a participant observed the problem applies to any
organisation, and he agreed: *"We're not solving this only from the real estate
perspective... this is a broader problem statement than real estate."*

## 3. His model of tacit knowledge (worth adopting verbatim)

SOPs, policies and regulations are **"just codified understanding"**. The chain he describes:

```
codified understanding → applied to work → scenarios → problems
  → solving them builds EXPERIENCE → experience becomes SKILL
  → skill becomes KNOW-HOW (tacit)
```

> "it's during this whole process of solving the problems that the experience start building
> up... and eventually that skill will become the know-how of this person by combining
> codified understanding with scenarios with problems and solving those problems... and
> making the right kind of judgment. And that is actually know-how."

This is exactly why Keystone's capture step interviews around **one concrete incident**
rather than asking for rules in the abstract: the judgment only surfaces against a scenario.

## 4. EXPLICIT SCORING INSTRUCTION — must be answered

> "I have no illusion about someone building a full platform, that's not realistic... We're
> not looking at the whole rocket ship, we're looking at — if you can build a better
> combustion engine that will be cool. A landing gear will also be cool, **but you have to
> link it back to what part this is, what part of a problem it is that you're trying to
> solve**."

He also lowered the bar explicitly: showing *"a simple workflow where you can introduce a
skill to help me to ask the right questions or identify a problem better that could have
been a blind spot... that would be already a win for us."*

**Action:** `docs/SUBMISSION.md` currently has no section that names which part of the
problem Keystone solves and which parts it does not. That is a direct miss against a stated
scoring instruction. It needs one, in his vocabulary, near the top.

## 5. The three things Keppel has NOT solved — Keystone answers all three

Describing their internal energy-management agent experiment, Sean named the open problems:

> "whenever these questions are being asked and the agent answers those questions, **the
> human in the loop cannot be missing**. So the energy manager — what's the role of this
> energy manager? **How do we then govern that the knowledge is not tainted by
> hallucination?** And how do we then **capture if there's a new skill discovered by the
> agents**... is this a new skill? So how does that then get captured back into the system?"

> "these are the things that we are now contemplating, but **we have not solved the problem**
> of how do we actually do this from end to end."

| Sean's open problem | Keystone's answer |
| --- | --- |
| Human in the loop; what is the expert's role? | Gates are deterministic and only a **named person in a role the pill allows** can confirm evidence or approve. The role is structural, not advisory. |
| Governing against hallucination | `lib/engine` takes **no model input at all**. LLM and agent output is only ever a draft or an unconfirmed suggestion. The ADP answer reports its retrieval count, so an ungrounded answer is **labelled** rather than trusted. |
| Capturing a newly discovered skill back into the system | The learn step: rule candidate → expert review → approval → new pill version in the registry, with provenance back to the moment in the interview. |

This is the strongest alignment available and the submission should answer these three
**by name**.

## 6. The end-to-end ask maps 1:1 onto Keystone's loop

> "if you can demonstrate something like this, which is an **end-to-end workflow of one
> problem** — how you can actually facilitate the capturing of knowledge, and then capturing
> of new skills, **having it approved**, and then putting it back in the system so that the
> system will learn and say I can apply this same new skill to similar situations in the
> future."

capture → canvas → gate → learn → registry. "Having it approved" is the governance store and
the approvals screen; "apply to similar situations in future" is pill versioning plus the
eval corpus.

## 7. GAP — one-off vs systemic is the judgment he cares most about

On what expertise actually *is*:

> "the key point here is you're looking for **anomalies**. So how do you deal with anomalies
> is actually the experience and the domain knowledge... when you have an anomaly, **is it a
> typical problem every year? Or is this a one-time problem?** And the expert will then
> analyse the problem and say, okay, this is a one-time problem, it's never going to happen
> again, so we just solve the problem — **it's not an AI issue**. But if it's a systemic
> problem, this is a recurring problem — now how can we have this as a skill, an AI skill to
> help us to predict and to analyse, and then to suggest, to recommend **next best action**?"

> "is it the same way of solving the same kind of problem that I've done all these years? Or
> is this a **new kind of skill** that is needed?"

**Keystone has no concept of recurrence anywhere** — verified by search across `lib/`,
`pills/`, `data/` and `components/`. Every captured rule is treated as equally promotable.
Sean is saying the triage *is* the expertise: a one-off gets solved and dropped, only a
recurring pattern earns a place in the pill.

This is the clearest genuine capability gap the session surfaced, and the highest-value
thing to build.

### Constraint on building it honestly

The corpus is 8 incidents, of which **3 have replayable timelines** and 5 are closed records
carrying `description`, `outcome` and `eval_*` fields but **no evidence map**. So recurrence
can be computed deterministically (replay each timeline through `lib/engine`, count the
incidents each rule fires on) over 3 incidents only. Inferring the other 5 from their prose
would be exactly the string-heuristic shortcut `CLAUDE.md` forbids.

The honest shape is therefore the same one the eval corpus already uses: report the count
**and** the denominator — "seen in 2 of 3 incidents with a replayable timeline; 5 further
closed incidents carry no evidence map and were not counted."

> **Update, 14 Oct 2026.** Built as described (`lib/learning/recurrence.ts`), and the
> denominator has since moved: the corpus is **9 incidents, 4 with replayable timelines**,
> after `INC-2026-0923` was added to exercise the inverse finding — a solved incident that
> fires no rule in any approved pill (`lib/learning/uncovered.ts`). The classification
> counts for the Technical Services pill are unchanged at 4 recurring / 3 seen once / 6 not
> in the record, because the new incident fires nothing. The figures in this section are
> left as written: they record what the corpus was on the day of the session.

## 8. Enterprise, not personal

> "if you're developing something that can be applied maybe to yourself or to your team
> alone, then we're not going to invest in it. **We only invest in enterprise level
> applications**, be it a skill, agent or platform."

And on compliance:

> "Keppel is big on compliance, safety — and safety is not just physical safety, but also
> safety in terms of **reputation**, be it corporate or personal, to **governance** in how we
> manage funds and assets, and also how we manage data."

Keystone's audit trail, role-scoped access, tenant-PII sensitivity scoping and pill
versioning are the enterprise story. They should be foregrounded as *compliance* features,
not described as engineering hygiene. He said not to worry about their specific AI policies
at this stage, so no need to chase their actual no-compromise list.

---

## What to change, in priority order

1. **`docs/SUBMISSION.md`** — add a "what part of the problem" section using his framing,
   and answer his three open problems by name. Scoring-critical; he stated it as a
   requirement.
2. **Build recurrence** (§7) — the one real capability gap, with the honest denominator.
3. **Vocabulary pass** — "intelligence pill… as a skill, an agent, or a platform" is his own
   phrasing and Keystone already is all three. Say it that way.
4. **Domain-agnostic framing** — state that the pill format is the product and
   chilled-water-leak is the worked example.
