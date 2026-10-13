# The ADP agent, before and after its knowledge base

**App:** Keystone Pill Agent (Standard mode, DeepSeek-V3.2) · **Probed:** 13 Oct 2026
**Knowledge base:** `keystone-chilled-water-leak-knowledge.md` (27 KB), Default Knowledge Base,
effective in **Debug/Publish** so it survives into production rather than working only in the test panel.

The same agent, the same question, the only change being whether the approved pill was
loaded as knowledge.

## The question

> After a chilled water leak, who must approve re-energising the affected electrical
> equipment, and what evidence is required before that approval? Cite the rule id and
> pill version.

## Ground truth, from the pill

Rule **TS-07**, pill version **1.2.0**. Escalates to **Duty LEW**, falling back to Head
Technical Services. Required evidence, all three of which must be confirmed:
`lew_signoff`, `insulation_resistance_ok`, `area_dry`. Blocked if any is missing.

## Before — no knowledge base

> Re-energising after a chilled water leak requires approval from the **Duty Engineer**,
> as per TS-07 (**Pill v2.1**).

Wrong approver. A pill version that **does not exist**. All three required evidence items
omitted. The citation is confident and fabricated — it names a rule id and a version
number, which is exactly what makes it dangerous: it reads like a quotation.

A second probe, after the agent's character prompt was given an honesty rule but before
the knowledge was loaded, moved to *"the Building Manager or Facilities Manager… (Based on
general leak-handling protocol; not currently assigned a specific rule ID in the approved
pill.)"* — still the wrong answer, but now at least admitting it was not quoting a pill.
Prompt discipline changed the *framing*. Only the knowledge base changed the *answer*.

## After — pill loaded as knowledge

> The Duty LEW must inspect and certify before re-energisation.
> Required evidence (all must be confirmed): lew_signoff, insulation_resistance_ok, area_dry.
>
> Rule TS-07, pill version 1.2.0.

Correct approver, correct version, all three evidence items — returned under the pill's own
key names. ADP's `Procedures` record shows **5 passages retrieved** from the knowledge base
before answering.

## Why this is the argument for Keystone, not just a fix

An agent with a good prompt and no governed source produced a *plausible* answer with an
invented rule version. Nobody reading it would have known. The pill did not make the model
smarter — it made the model **checkable**: the answer now carries a rule id and a version
that a person can look up in the registry, and Keystone reports how many passages actually
grounded it, so an ungrounded answer is visible as one instead of blending in.

That is the whole claim in one screen: the gate stays deterministic (`lib/engine` reads no
model output at all), and the model's job is language — drafting help for a named person.

## How Keystone reports it

`/connectors` asks the live agent and labels the result from ADP's own record of its steps,
never from the wording of the answer:

- **Grounded** — n passages retrieved; the pill backed the answer.
- **Ungrounded** — nothing retrieved; the answer came from the prompt alone, and any rule
  id or version in it is marked unverified.

The connector row itself reads "live" only on proof of a real answer in that process; an
AppKey sitting in the environment is never treated as proof (`lib/adp/status.ts`).

Screenshot: `docs/proof/05a-adp-agent-live-grounded.png`.

## The indicator is load-bearing, not decoration (observed in production)

Caught on the live deployment on 14 Oct 2026, asking the same question twice in a row:

| | Retrieved | Answer |
| --- | --- | --- |
| Call A | **5 passages** | "Pre-cleanup photos with timestamps must be taken, and the failed component must be retained and tagged… required for insurer notification." |
| Call B | **0 passages** | "1. The location of the leak. 2. The time the leak was discovered. *(Rule TS-07, Keystone Intelligence Pill v2.0)*" |

Call A matches the pill (`pre_cleanup_photos`, `failed_component_retained`). Call B is
generic building practice, cites the wrong rule — TS-07 governs re-energisation, not
pre-cleanup evidence — and invents **v2.0**, a version that does not exist.

Same agent, same question, same minute. The only difference was whether retrieval hit. This
is why the grounding count is reported rather than assumed: an agent with a knowledge base
attached is not the same thing as an agent that used it, and the failure is invisible in the
answer itself. Call B reads *more* authoritative than Call A — it has a numbered list and a
version in italics.

Keystone labels Call B ungrounded and marks its rule id and version unverified.

## What the live wire actually looks like

The published docs were wrong in three ways that each silently break a client, so the
adapter follows a captured stream instead (`lib/adp/__tests__/fixtures/live-stream-2026-10-13.sse`,
replayed as a test):

| Documented | Live |
| --- | --- |
| `Stream: true` (boolean) | `Stream: "true"` (string); a bool is refused outright |
| `text.delta` fragments to append | `text.replace` (whole answer, replaces) + `message.done` |
| `reference.added` events to count | `Response.Procedures[]` of `Type: "knowledge"` |

## Cost guard

Every call spends real ADP quota and the demo passcode ships with the submission, so a
session proves nothing about who is asking. `/api/adp/ask` carries the tightest limits in
the project — 3/min and 15/day per session, 5/min and 30/day per IP, 10/min and 100/day
across the instance — checked *before* the outbound call, so a refused request costs
nothing at Tencent (`lib/ratelimit/policies.ts`, tested in
`lib/ratelimit/__tests__/routes.test.ts`).
