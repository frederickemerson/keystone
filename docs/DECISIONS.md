# Keystone — Product decisions

Decisions taken on the demo's scope and governance behaviour, each with the
reason behind it. Where a decision changes how the product should be
described (README, submission), the wording to use is recorded here.

## D1 — Redaction runs on the server, per authenticated demo session

**Decision.** The demo has a sign-in (`/sign-in`): pick a persona from
`data/roles.json` and enter the shared demo passcode. The server issues a
signed session cookie (HS256 via `jose`, HTTP-only, SameSite=Lax, Secure in
production, 8 hours) carrying the role and its persona's name. Middleware
sends every app screen to `/sign-in` without a valid session, and the LLM API
answers 401. Each page reads the role from the verified session
(`lib/auth/session.ts`) and redacts on the server (`lib/governance/scope.ts`)
before any props reach a client component. Records above the role's clearance
are masked in the HTML and in the RSC payload. For example, a Technician's
browser never receives the anchor tenant's name.

The governance store takes its acting identity from the session on every
load, never from localStorage. Separation-of-duties and grant checks use that
identity. With no session, nothing can be proposed. "Switch user" replaces the
old free role picker. A valid session switches in one click, because every
persona shares the passcode the session already proved. Without a valid
session, switching goes through `/sign-in`.

**What is classified, and how.** Incidents, timeline events and
tenant-message drafts carry their own `sensitivity` labels, and `redact`
applies them. Asset tenant and client sub-records are not labelled in
`assets.json`, so `ASSET_FIELD_SENSITIVITY` classifies them field by field:
tenant name, floors and trading hours are tenant PII; the lease clause, client
name and SLA credit trigger are commercial. For an event above clearance, only
its narrative is masked. Its evidence keys and boolean facts still ship,
because they are the deterministic engine's inputs and the gates must come out
the same for every viewer (they name no one, and the UI masks their values
anyway). Pill rule definitions ship intact: a rule's label classifies the data
it acts on, and the engine needs the rule itself.

**How to describe it.** The demo enforces redaction on the server against an
authenticated session. It is still a demo login: one shared passcode unlocks
every persona, so it shows per-role enforcement but is not identity proofing.
The governance store (versions, approvals, audit) still lives in the
browser's localStorage, validated on load. In production, sign-in goes through
the enterprise identity provider (OIDC/SAML SSO), with roles mapped from IdP
groups. The same `data/roles.json` policy would gate every governance action
in a server-side store, and the LLM routes would scope their output to the
caller's role.

## D2 — Shadow mode requires the pill-promotion grant

**Decision.** Putting a Draft version into Shadow is the first step of
promotion, so it needs the same authority as approval: the pill's approver
role, or a role whose `roles.json` grants include pill version promotion.
For the chilled-water pill these are the steward (Asset Operations Manager),
the Head of Technical Services and the Executive. The governance store
refuses anyone else, writes the refusal to the audit log
(`version_shadow_blocked`) and throws `GovernanceError`, the same way
refused approvals, rollbacks and incident decisions are handled. `/learning`
and `/approvals` both use the store's policy (`shadowPromotionAuthority`),
so the button is disabled whenever the store would refuse, and the reason is
shown next to it.

**Rationale.** Without this, a pill author with no grant could start
running their own change in Shadow, which would bypass the steward's role
in promotion.

**Demo flow.** The Chief Engineer authors the TS-02 correction in step 2,
but he holds no promotion grant. Step 5 therefore shows why Promote is
disabled and offers a one-click hand-off: "Switch to Priya Nair · Asset
Operations Manager". The steward then promotes the version, replays it in
Shadow and approves it in step 6. She is not the author, so separation of
duties holds. The role switch is audited too.

## D3 — Empty proposals are refused

**Decision.** `proposeVersion` refuses a proposal that leaves the rules
identical to its base. That covers an empty change list, a change that
restates the current value, and changes that cancel each other out. The
check is a structural diff of the resulting rules, not a count of the
changes. The store audits the refusal (`version_proposal_blocked`) and
throws `GovernanceError` with the message "Nothing to propose: the changes
leave vX's rules identical — edit at least one rule value". Malformed input
(no reason, invalid rules) is still rejected without changing state, as
before.

**Rationale.** A version with no rule change has nothing to evaluate,
shadow or approve. Allowing one would only add noise to the version
history and the audit trail.

## D4 — Pill version stays 1.2.0

**Decision.** The chilled-water pill keeps version 1.2.0. The content
corrections made before release (TS-07 `cfm_cosign`, TS-03
`lew_inspected_tripped_breaker`, TS-13 split out of TS-05, and the TS-01
trigger tightening in D5) are recorded in the pill's `CHANGELOG.md` under
"Pre-release content correction". They belong to the authored 1.2.0
content; they are not governed runtime changes.

**Rationale.** 1.2.0 is the baseline that was approved and that the demo
seeds from. Bumping the version for authoring fixes would break the story
of the governed runtime change, in which the TS-02 correction becomes
v1.3.0.

## D5 — TS-01 enforces the electrical gate for water on the electrics

**Decision.** TS-01's `any` trigger now also includes `water_on_switchgear`,
`drip_onto_tenant_it` and `water_contacting_live_it` (all already declared
in `evidence.yaml`). The "TS-01 electrical gate applies" exceptions on
TS-03, TS-04 and TS-10 were removed. Those were notes only, which the engine
never enforced; the behaviour now lives in TS-01's trigger itself. TS-01
still requires `water_near_electrical` in its `all` conditions, and that
key's declared meaning ("within 2 m of, dripping onto, or tracking toward
energised electrical equipment") already covers all three keys. A
pill-semantics test makes sure no authored timeline or eval records one of
TS-01's hazard keys without also recording `water_near_electrical`.

**Rationale.** A safety requirement that lives only in note text is not
enforced. The rule should act on the exact evidence it names.

**Provenance.** TS-01's primary turn (`ce-interview-2026-10-02#00:25:30`)
now ends with the expert's sentence: "Same gate wherever the water is
actually on the electrics — on the switchgear itself, dripping onto a
tenant's IT or electrical kit, or touching live IT in a data hall: that's an
electrical hazard first, whatever else is going on." `provenance.json`
quotes this sentence verbatim.

**Effect.** Eval statuses are unchanged; only the DC CRAH case's TS-01
rationale wording changed. TS-02's deadline is still the only intentional
failure. Stepping through INC-2026-1011 and INC-2026-1012, every rule's
status, missing evidence and exception note is identical at every step, and
TS-07 still first appears BLOCKED at step 10 of INC-2026-1011.

## D6 — Public claims describe what runs, where it runs

**Decision.** Every public document (README, SUBMISSION, ARCHITECTURE, SPEC,
the submission pack and `pills/README.md`) states only what the repository
backs, following the claims audit in `docs/review/claims-audit.md`.

**How to describe the AI provider.** Locally, with CodeBuddy credits and a
login (or a CodeBuddy Pro key), live calls run on Hunyuan `hy4-preview`
through the CodeBuddy Agent SDK. The public Vercel deployment has no
CodeBuddy or TokenHub key, so its live calls are answered by OpenAI
`gpt-5.4-mini` (the final fallback) or by recorded output. TokenHub is wired
but has not answered live; account verification is pending. The output badge
always names the provider that actually answered. OpenAI gets one factual
line, not promotion.

**Other fixed wording.**
- "Hear the expert" is a synthetic browser voice reading the expert's
  recorded words, not his voice. The onboarding call is a scripted transcript.
- The step-10 AI proposal is a recorded fixture.
- The audit log is append-only in the browser store (plus server sessions
  for identity and redaction); production would persist it server-side.
  It is not described as immutable.
- Override-rate KPI, incident-report pipeline, enforced pill `access`, AI
  Verify process checks and "deny-by-default" are proposed, not built.
- Tencent integrations in the present tense: CodeBuddy skill (verified,
  model selector "Auto" in `docs/proof/04a`, `04b`) and the CodeBuddy Agent
  SDK path to Hunyuan. TokenHub is built but pending. WorkBuddy, ADP, TRTC
  and EdgeOne are proposed.
- Model swap: the engine takes no model input, so an LLM change cannot alter
  a gate. This holds by construction; there is no model-swap control.
- Separation of duties is described as "the author cannot approve" until a
  stricter rule is enforced in code.
