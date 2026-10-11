# Keystone — Product decisions

Decisions taken on the demo's scope and governance behaviour, each with the
reason behind it. Where a decision changes how the product should be
described (README, submission), the wording to use is recorded here.

## D1 — Redaction stays client-side in the demo

**Decision.** Role/sensitivity redaction (`lib/governance/access.ts`
`redact` / `redactText`) runs in the browser, keyed by the role picked in
the role switcher. The demo has no server login, so there is no
authenticated identity a server could enforce against.

**Rationale.** Without authenticated sessions a server-side check would
only trust the same client-chosen role, so it would add no real protection.
It is more honest to keep redaction where it is and say what it is.

**How to describe it.** In the demo, redaction is presentation-level: it
shows what each role would see, and it fails closed (the unresolved
server-render role sees public data only). It is not access control,
because the full record still reaches the browser. In production, role and
sensitivity are enforced server-side against authenticated sessions:
records above a user's clearance are masked before they leave the server,
and the same policy (`data/roles.json` grants and sensitivity levels) also
gates every governance action on the server.

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
