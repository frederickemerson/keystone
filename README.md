# Keystone

*Expert judgement, governed.* The keystone is the stone that holds the arch — the expert judgement that holds operations together.

> **Turn expert judgement into governed, versioned Intelligence Pills.**

Keppel "AI HARVEST" track · Tencent Cloud AI CAN DO IT SG 2026 · Submission 16 Oct 2026.

Keystone is an operating model and a working platform for turning a retiring expert's
incident-response judgement into **Intelligence Pills** — plain-text, versioned,
governed decision artefacts that a deterministic engine can execute, test, approve,
roll back and re-apply across a portfolio.

It is built on the Keppel challenge statement ("turning expert know-how into reusable
intelligence") and reads as Keppel, not as generic PropTech: fictional Grade A office
and colocation data-centre assets, iBMS/CMMS evidence feeds, LEW electrical-safety
gates, REIT-manager → property/facility-manager operating structure, and Keppel's own
"cut downtime and costs" KPI vocabulary.

**All data is mock. All assets, people, tenants and incidents are fictional.**

---

## The problem

Commercial real estate runs on the judgement of a few experienced people, and that
judgement is not written down anywhere an organisation can reuse it:

- Critical knowledge is concentrated in a handful of experts.
- New staff take months to reach competence.
- Best practice is applied inconsistently across assets.
- Institutional knowledge leaves when the expert retires.

A retrieval chatbot answers questions. It cannot stop an unsafe action, cannot show
where a rule came from, cannot be tested against past incidents, and cannot be rolled
back. Keystone encodes judgement as a **compiled, executable, governed artefact** instead.

---

## The 3-minute demo path

Run `npm run dev`, open `/` (the landing page), sign in at `/sign-in` with the demo
passcode, and follow the story *"the Chief Engineer is retiring.
His judgement stays — governed."*

| # | Screen | What happens |
|---|--------|--------------|
| 1 | **Expert Call** `/capture` | A simulated onboarding call with **Tan Wei Ming, Chief Engineer** (a scripted transcript tagged with CDM + ACTA probes, timed captions, read aloud with browser text-to-speech). Rule candidates appear as he speaks. The interviewer surfaces one **contradiction**: he says *"always isolate the whole riser"* (00:06:30) but later *"for an AHU branch leak, isolate the sub-valve and leave the riser open"* (00:22:15). |
| 2 | **Decision Canvas** `/canvas/technical-services-chilled-water-leak` | The contradiction is **resolved with a distinguishing condition** rather than dropping either statement (00:23:30). The expert confirms/edits/rejects each of the 13 candidate tiles; every tile shows the expert's recorded quote + timestamp (hover or click the quote button). Tile reviews are audited and restricted to the pill's owner, steward, approver or `access.roles_allowed`. Publish as **v1.3.0 draft** (a UI confirmation in the demo; the governed draft is created on `/learning`). |
| 3 | **Incident Room** `/incident/INC-2026-1011` | A chilled-water riser/AHU leak on **L23 of Harbourfront One** above a bank tenant's ceiling. Replay the evidence timeline to **step 10 of 17** (T+08:42). A recorded AI proposal (fixture labelled hy4-preview) suggests *"Re-energise AHU-23-01 / DB-23A"*. |
| 4 | **Blocked** | Gate **TS-07 v1.2.0 — LEW sign-off missing (+2 more)** fires red: `lew_signoff`, `insulation_resistance_ok`, `area_dry`. The gate is deterministic; no LLM output can open it. |
| 5 | **Why / Hear the expert** | Open the Why drawer: evidence used vs missing, the rule + version, the risk if ignored, and **Hear the expert**, which reads the 00:14:32 provenance quote aloud with a synthetic browser voice (his recorded words, not his voice). Then **Escalate to Duty LEW · Rahul Menon** (a named human). |
| 6 | **Learning** `/learning/technical-services-chilled-water-leak` | Capture the outcome (isolated in 7 min). The Chief Engineer corrects TS-02's deadline **15 → 10 min**. Propose v1.3.0 → see the **diff** → **validate against every past incident** (evals: 5 pass, 1 flagged) → **shadow mode** → **approval** → **rollback**, with separation of duties across **three different people**, enforced in code: **Tan Wei Ming** (Chief Engineer) proposes v1.3.0; **Priya Nair** (Asset Operations Manager) promotes it to Shadow and replays the 6 closed incidents through both versions (6/6 agreements); she is then refused approval of her own Shadow (*"Separation of duties: …"*) and offered **Switch user to Goh Boon Kheng · Head of Technical Services**; **Goh Boon Kheng** approves, and later rolls back with a reason, which appends **v1.4.0** restoring the v1.2.0 rules and marks v1.3.0 Retired. Audit: `version_proposed` (Tan) → `version_shadowed` (Priya) → `version_approved` (Goh) → `version_rolled_back` (Goh). |
| 7 | **Apply to DC1** | Click **Apply to Harbourfront DC1** in the Incident Room. The *same* pills run against a colocation data-centre profile: the tenant first-notice action **disappears**, a **client-SLA notice via the Critical Facilities Manager** appears, and TS-07 escalates to the **CFM** instead of the duty LEW. The engine takes no model input, so changing the LLM cannot change a gate decision (true by construction; there is no model-swap control in the app). |

### Screenshots

| Expert Call — contradiction detected | Decision Canvas — resolved + confirm |
|---|---|
| ![Expert Onboarding Call with contradiction detected](docs/screens/expert-call-contradiction.png) | ![Decision Canvas with resolved contradiction and rule tiles](docs/screens/decision-canvas.png) |

| Incident Room — TS-07 blocks the AI | Why drawer — hear the expert |
|---|---|
| ![Incident Decision Room with TS-07 blocked](docs/screens/incident-blocked-ts07.png) | ![Why drawer showing expert source and missing evidence](docs/screens/why-drawer-hear-expert.png) |

| Learning — outcome, correction, diff, evals, rollback | Portfolio Pulse |
|---|---|
| ![Outcome and Learning flow](docs/screens/learning.png) | ![Portfolio Pulse dashboard](docs/screens/portfolio-pulse.png) |

---

## Architecture summary

```
Next.js 15 (App Router, TS) + React 19 + Tailwind v4 + shadcn-style components
├─ pills/                         ← SOURCE OF TRUTH — portable, plain text
│   └─ <domain>/<name>/
│       ├─ SKILL.md               agentskills/Anthropic/CodeBuddy-compatible frontmatter
│       ├─ rules.yaml             deterministic rules (docs/SPEC.md §4)
│       ├─ evidence.yaml          the evidence vocabulary every rule may read
│       ├─ provenance.json        rule_id → transcript span + confirmation
│       ├─ evals/*.yaml           replayed past incidents + expected decisions
│       └─ CHANGELOG.md           semantic version history
├─ lib/engine/                    pure TS, NO LLM: evaluate() → decisions + trace;
│                                 counterfactual(); runEvals(); schema; conditions
├─ lib/llm/                       CodeBuddy Agent SDK → Hunyuan hy4-preview (primary,
│                                 needs CodeBuddy credentials; local today). Falls
│                                 through to TokenHub → Hunyuan hy4-preview (live), then OpenAI.
│                                 Opt-in extraction + tenant drafts; recorded fallback.
│                                 Probes, contradictions and summaries remain recorded.
├─ lib/auth/ + middleware.ts      demo sign-in, signed HTTP-only session cookie (with jti),
│                                 default-deny routing with a public allowlist,
│                                 same-origin (CSRF) checks on auth routes
├─ lib/ratelimit/                 per-session / per-IP / per-instance quotas (in memory)
├─ lib/governance/                versions (semver + jsondiffpatch + rollback),
│                                 approval (three-person separation of duties:
│                                 author ≠ Shadow promoter ≠ approver; eval gate),
│                                 access + scope (server-side redaction per role), audit
├─ components/                    mosaic (shared), capture, canvas, incident,
│                                 learning, registry, pulse, approvals, shell
└─ data/                          mock assets, incidents, timelines, transcripts,
                                  roles, and recorded LLM fixtures
```

> **What runs where.** Sign-in, the acting role and data redaction are enforced on
> the server from a signed session (`docs/DECISIONS.md` D1): each page reads the role
> from the verified session and masks records above that role's clearance before
> anything reaches the browser. It is still a demo login: one shared passcode unlocks
> every persona. The governance store (versions, approvals, audit log) lives in the
> browser's localStorage, append-only and validated on load, but anyone with devtools
> can bypass it. A production deployment would persist governance server-side behind
> enterprise SSO.

The decision path is deliberately **not** an LLM. `lib/engine` is a ~500-line pure-TS
rule evaluator (`evaluate.ts` + `conditions.ts`): structured conditions (`op: eq | neq | gt | gte | lt | lte | in | exists`),
a strict status precedence (`not_applicable → blocked → escalate → needs_approval →
allowed`), evidence-coverage confidence (**a count, never a fabricated percentage**),
and a trace for every rule. The LLM is confined to language work where it is safe.

Jev (TypeSafe AI) provides fast (3 s timeout), **unconfirmed** evidence suggestions for timeline events in the Incident Room; it never gates — evidence counts only once a human in the key's `confirmable_by` confirms it.

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full Mermaid diagrams
(the eight required diagram points, and the component/data-flow view) and
**[docs/SUBMISSION.md](docs/SUBMISSION.md)** for the challenge-mapped write-up.

---

## The pill format

A pill is a folder of plain text — YAML, JSON and Markdown only. No runtime dependency,
no binary, no vendor lock-in.

```
pills/technical-services/chilled-water-leak/
  SKILL.md          # frontmatter: name, description, version, owner, steward,
                    # approver, status, scope, access, review_cadence
                    # body: prose heuristics + an explicit Boundaries section
  rules.yaml        # TS-01..TS-13 — structured triggers, required_evidence,
                    # action_class (recommend|requires_approval|must_escalate),
                    # escalate_to, owner, deadline, asset_overrides, provenance
  evidence.yaml     # evidence key → { label, type, confirmable_by, description }
  provenance.json   # rule_id → { source, start, end, quote, confirmation, ... }
  evals/*.yaml      # past incidents with evidence maps + expected decisions
  CHANGELOG.md      # semantic version history: who approved what, and why
```

Two pills ship in this repository:

| Pill | Domain | Version | Rules | Evals | Status |
|------|--------|---------|-------|-------|--------|
| `technical-services/chilled-water-leak` | Technical Services | 1.2.0 | TS-01..TS-13 | 6 | approved |
| `tenant-experience/incident-comms` | Tenant Experience | 1.0.0 | TE-01..TE-07 | 3 | approved |

### How it installs as a CodeBuddy / WorkBuddy skill

The pill folder is a standard `SKILL.md` skill package. **Verified in CodeBuddy Code** (11 Oct 2026, `docs/proof/04a`, `04b`): copied unchanged into `.codebuddy/skills/`, the skill was invoked as `/chilled-water-leak` (model selector: Auto) and CodeBuddy reached the same TS-07 decision as the Keystone engine (blocked, escalate to duty LEW, with the Chief Engineer's provenance quote). WorkBuddy and ADP use the same `SKILL.md` convention per their documentation, but have **not yet been tested** by us:

- **CodeBuddy** — copy the folder to `.codebuddy/skills/<name>/`. The `SKILL.md`
  frontmatter (`name`, `description`, `version`) is read by the skill loader;
  `rules.yaml` and `evals/` are consumed by the Keystone engine.
- **WorkBuddy** *(designed for, untested)* — would import via **Skills & Expert Center**, where `SKILL.md`
  would become a skill. WorkBuddy documents a security scan before installation; the
  pill's `access` frontmatter could map to WorkBuddy's RBAC.
- **Tencent Cloud ADP** *(designed for, untested)* — would be packaged as a ZIP with `SKILL.md` at the root.
  ADP documents YAML metadata, semantic versioning, sandbox security review, and
  enterprise sharing through the Approval Center.
- **Any SKILL.md-compatible host** — the structure follows the Anthropic agentskills
  convention (the same shape is used by Claude Code, CodeBuddy and Cursor).

See `pills/README.md` for the full portability note.

---

## Run instructions

Requires Node 22.12+ (AI SDK 7 and Vitest require Node 22).

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest run — the full suite
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

### Environment variables (all optional)

**Every screen opens on recorded output, even when credentials are present.**
Only **re-extract live** on `/capture`, **draft live** in the Incident Room, and the
on-demand Jev evidence suggestions make outbound requests. The scripted voice call
stays offline.

| Variable | Default | Purpose |
|---|---|---|
| `MOSAIC_LLM_PROVIDER` | `auto` | `auto`, `codebuddy`, `tokenhub`, `openai`, or `fixtures` (a provider name forces only that provider) |
| `CODEBUDDY_API_KEY` | _(unset)_ | CodeBuddy international API key; requires a **Pro plan** |
| `TOKENHUB_API_KEY` | _(unset)_ | TokenHub → Hunyuan `hy4-preview` (verified live, 12 Oct) |
| `TOKENHUB_BASE_URL` | `https://tokenhub.tencentcloudmaas.com/v1` | TokenHub endpoint (area gz, verified for our key; the `-intl` Singapore host returned 401 for it) |
| `MOSAIC_MODEL` | `hy4-preview` | TokenHub model only; CodeBuddy always requests Hunyuan `hy4-preview` |
| `OPENAI_API_KEY` | _(unset)_ | OpenAI, the final live fallback |
| `OPENAI_MODEL` | `gpt-5.4-mini` | OpenAI model id |
| `JEV_API_KEY` | _(unset)_ | TypeSafe Jev key (server-only) for evidence suggestions; unset → suggestions unavailable |

`auto` tries, in order, each provider that has credentials, falling through to the
next on an error, timeout, invalid JSON or schema/safety rejection:

1. **CodeBuddy Agent SDK → Hunyuan hy4-preview** (CodeBuddy key or local saved CLI login; 15 s)
2. **TokenHub → Hunyuan hy4-preview** (`TOKENHUB_API_KEY`; 22 s)
3. **OpenAI** (`OPENAI_API_KEY`; 15 s) — final live fallback
4. **Recorded fixtures**

Each timeout is capped by a 35-second budget for the whole chain (enough for a
TokenHub timeout and then an OpenAI answer); providers left when under 3 s remain
are skipped. The browser waits up to 40 s, showing an elapsed-time counter, then
reports the outcome truthfully (live, or recorded with the reason). Live extraction
decodes against the wire schema with strict structured output (`json_schema`) on
both TokenHub and OpenAI, and the DRAFT-only guard still validates every result.
`hy4-preview` is a thinking model: left on, it spent all 6,000 output tokens on
reasoning without answering, so the TokenHub request sends `thinking: {type:
"disabled"}`. In our 12 Oct app-path run (TokenHub first, as on Vercel), 10 of 10
live extractions were answered by TokenHub, p50 11.4 s, p95 12.9 s; tenant drafts
2 of 2 (3–6 s). An earlier run had 6 of 6 OpenAI extractions at p50 5.7 s. A forced provider that fails goes to the fixture.
Local login detection reads only the installed SDK's shared auth-cache shape and
logout marker, without spawning a CLI or decrypting credentials. The SDK handles
actual login reuse/refresh; a stale login fails safely to recorded output.

**Which provider answers where.** Locally, with CodeBuddy credits and a CLI login
(or a CodeBuddy Pro API key), live calls run on Hunyuan `hy4-preview` through the
CodeBuddy Agent SDK. The public Vercel deployment has a TokenHub key but no
CodeBuddy key (API-key access requires Pro, and Vercel/CI never inspect a local CLI
login), so its live calls go to Hunyuan `hy4-preview` via TokenHub first; OpenAI
`gpt-5.4-mini` is the final fallback, then recorded output. The output badge always
names the provider that actually answered. With no CodeBuddy, TokenHub or OpenAI credentials, the API
selects recorded fixtures without any SDK spawn or network attempt. Explicit `codebuddy` with neither a key nor a local login also falls
back without spawning. Set `MOSAIC_LLM_PROVIDER=fixtures` to force offline mode.
Do **not** set `CODEBUDDY_INTERNET_ENVIRONMENT`; this integration uses the
international edition. Keep all credentials server-side (never `NEXT_PUBLIC_*`).

The Node routes `/api/llm/extract` and `/api/llm/tenant-message` have a 60-second
platform budget and the 35-second provider-chain budget above. Requests are limited to 64 KB;
extraction permits at most 100 turns of 4,000 characters each. Results include
`data`, `source`, `provider`, `model`, `latencyMs`, `attempts` (earlier providers that
failed, with an outcome only) and a safe `reason`. `provider`/`model` always name
the provider that produced `data` (`fixtures` for recorded output).
The badge reports actual provenance and latency; recorded output exposes its reason
on hover. Keys, full prompts and raw provider errors are not logged by this layer;
SDK conversation persistence is disabled. Tool whitelists are empty, with an
additional deny-all permission callback and pre-tool hook; no model tool execution
is permitted. Each SDK query requests an ephemeral local listener port so it does
not collide with an existing developer CLI session.

All extracted rules pass `lib/llm/candidates.ts` and remain **DRAFT** previews for
Tan Wei Ming's review, not automatically copied to Canvas or applied to pills.
Tenant drafting is bounded to selecting/arranging reviewed factual sentences from
the **INC-2026-1011 first-notice snapshot at 08:20**, not current replay evidence.
A fail-closed sentence bank rejects unverified cause claims (TE-03), completion
promises (TE-02), and other unsupported prose, including claims in the subject.
Recipients, sensitivity and approver are server-owned; each live draft gets a fresh
id and needs **Lim Hui Fen's** named approval. Nothing is sent by Keystone. Unknown
incidents and DC clients do not receive the office fixture (DC uses the CFM SLA flow).

The bundled CLI is externalized and its headless assets traced for Node deployment.
Hunyuan via CodeBuddy has not been run on Vercel. The LLM and Jev APIs require a
signed demo session, and one shared, published passcode unlocks it, so the paid
routes are rate-limited (`docs/DECISIONS.md` D7): LLM 10/min and 40/day per session
(plus per-IP and per-instance ceilings; over quota the route returns the recorded
fixture), Jev 60/min per session, and failed sign-ins 10/min per IP. The windows are
**in memory, per serverless instance**, so they stop one client hammering the demo
but are not a deployment-wide quota; production would use a shared store (e.g.
Redis) or a WAF rule, plus real identity. Middleware is default-deny with an explicit
public allowlist; responses carry security headers (CSP with `frame-ancestors 'none'`,
`X-Content-Type-Options: nosniff`, a referrer policy) and the site is `noindex`.
Session tokens carry a `jti`, so sessions issued before 12 Oct need one re-sign-in.

---

## Tests

`npm test` runs the regression suite (593 tests in 38 files, 12 Oct 2026) across the deterministic core, LLM boundary and governance layer,
including the safety invariants that make the demo defensible:

- **Evidence can never be faked open** — a required item counts only when it is
  *confirmed* **and** its value is exactly `true`. A confirmed `"LEW did not sign off"`
  is *not* satisfied.
- **`forbidden_if_missing_evidence` always wins** — a blocked gate outranks
  `must_escalate` and `requires_approval`; the escalation target is still populated.
- **Exceptions never relax a gate** — an exception may add required evidence, never
  remove it.
- **Separation of duties** — three different people: the author cannot put a version
  into Shadow; neither the author nor the Shadow promoter can approve it; only Shadow
  versions can be approved; rollback follows the same identity rules. Every refusal is
  audited.
- **Eval regression blocks approval** — only the pill's approver role may override, with
  a recorded reason.
- **Rollback never deletes history** — it appends a new approved version carrying the
  restored rules and marks the rolled-back version Retired.

Coverage spans `lib/engine` (conditions, evaluate, counterfactual, evals, schema,
real-pill conformance), `lib/governance` (versions, approval, access, audit, store),
`lib/data` (schema + cross-file consistency), `lib/pills` (package loading), and
`lib/llm` (mocked SDK/provider selection, no-spawn fallback, timeout, malformed JSON,
injected controls, bounded HTTP inputs, and TE-02/TE-03 rejection). Tests make no
inference requests.

---

## Built with

Honest attribution — this was a two-tool build.

- **CodeBuddy Code** — the initial application scaffold and routing; first versions
  of both Intelligence Pills (`SKILL.md`, `rules.yaml`, `evidence.yaml`,
  `provenance.json`, `evals/`, `CHANGELOG.md`), the deterministic engine
  (`lib/engine`), the mock data model (`data/`) and the UI screens (Capture, Canvas,
  Incident Room, Learning, Registry, Portfolio Pulse, Approvals). Models used:
  `hy4-preview` (shown in `docs/proof/`); `hy3` and `deepseek-v4.1-flash` were also
  used (no screenshot).
- **Claude Code** — planning and architecture; code review; the governance, data,
  auth and LLM-provider layers (`lib/governance`, `lib/auth`, `lib/llm`, the data
  loaders/schemas and cross-file consistency tests); engine hardening; and the
  landing page.

Proof-of-usage screenshots from the CodeBuddy build session are in `docs/proof/`
(see `docs/SUBMISSION.md` for the full list). `.codebuddy/skills/` (the two pills,
installed as CodeBuddy skills) is committed; no CodeBuddy plan files are committed.

**Mock data only.** Every asset, tenant, client, person, incident and figure in this
repository is fictional. No real Keppel property names, logos or personnel are used.
