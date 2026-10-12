# Keystone — Project Submission

**Track:** The Real Estate Track — Keppel · **Challenge:** AI HARVEST — Turning Expert
Know-How into Reusable Intelligence · **Event:** Tencent Cloud "AI CAN DO IT" Hackathon
Singapore 2026 · **Submission date:** 16 Oct 2026.

This document maps 1:1 to the hackathon submission form (§8 of the handbook). The
challenge-specific scorecard used in preliminary judging — the 11 "Solution should be"
properties and the 8 "Solution should include" diagram points — is answered in full in
its own sections below.

---

## 1. Project title

**Keystone** — *Expert judgement, governed.* The keystone is the stone that holds the arch; here it is the expert judgement that holds operations together.

## 2. Short blurb

> **Turn expert judgement into governed, versioned Intelligence Pills.**

_(8 words, under the 10-word hard limit.)_

---

## 3. Project Overview

### Target scenarios

Incident response and operational decision-making in commercial real estate, where
experienced judgement is not written down and must be reused across a portfolio:

- **Capture** — a retiring Chief Engineer's incident-response know-how, elicited through
  a structured onboarding interview (scripted and simulated in the demo), turned into
  governed decision rules.
- **Apply** — a live chilled-water leak in a Grade A office tower, where an AI proposal
  (recorded in the demo) is blocked by a deterministic safety gate and escalated to a
  named human.
- **Learn** — an operational outcome and an expert correction feed a version diff, an
  eval replay, shadow mode, approval by someone other than the author, and one-click
  rollback.
- **Reuse** — the same pill re-applied to a colocation data-centre profile with asset
  overrides. The engine takes no model input, so changing the LLM cannot change a gate
  decision (true by construction; not a demo step).

### Users

Two primary users, per the challenge's own roles. Everyone else is a name in the RACI.

1. **The retiring Chief Engineer (domain expert / pill owner)** — 18 years of M&E
   judgement at the asset, employed by the property/facility manager. He confirms,
   edits or rejects every extracted rule on the Decision Canvas, and later corrects a
   threshold when an incident proves it wrong.
2. **The Asset Operations Manager (AOM / steward)** — sits at the REIT-manager layer
   supervising property and facility managers. The primary Incident Room user: she
   supervises and verifies AI recommendations, approves `requires_approval` actions,
   stewards the pill through shadow → approved, and escalates.

Supporting roles (implemented in `data/roles.json`, 14 in total): Head of Technical
Services (approver of record), Duty Licensed Electrical Worker (electrical-safety
sign-off), Fire Safety Manager, Tenant Experience Manager, Duty Facilities Manager,
DC Critical Facilities Manager, Technician, Executive, and others.

### Value proposition

Expert judgement becomes a **compiled artefact** — rules with deterministic gates,
provenance to the spoken word, tests, an owner and a version — that:

- **outlives the expert** and can be re-applied at every asset of the same type;
- **cannot be talked past** by an LLM, because the gates are deterministic;
- **proves itself** against replayed past incidents before it is promoted;
- **can be rolled back** in one click when it is wrong;
- **stays the organisation's property**, as vendor-neutral plain text.

---

## 4. Real-World Scenario Insights

### Source of pain points

Pain points are sourced from the Keppel challenge brief and launch material (handbook
§3, "AI HARVEST"), from Keppel's own public AI/operating narrative, and from the
research dossier in `docs/research/`. Key sources:

- **Keppel challenge brief** (handbook §3): critical knowledge concentrated in limited
  experts; new employees take significant time to build expertise; best practices
  applied inconsistently; institutional knowledge lost on retirement. Six named pill
  domains: Asset Operations, Energy Optimisation, Leasing, Technical Services,
  Sustainability, Tenant Experience.
- **Keppel Investor Day 2026 (Real Estate),** Louis Lim: *"AI-driven predictive
  maintenance and smart building diagnostics cut downtime and costs"* (Technical
  Services); *"Buildings become data-generating operating systems."*
- **Keppel AR2025 / Keppel Insights (Nov 2025):** KAI is described as enabling *"AI
  agents that think like experts, trained on proprietary data and subject matter
  expertise"* that *"collaborate like digital co-workers"* — and it is already
  **multi-model**. Athena is a *"black swan detector, predicting rare but high-impact
  failures like cooling system breakdowns."*
- **Keppel REIT SR24:** *"Each property is overseen by a dedicated team of property and
  facility managers"*; and the deployment of *"water leakage detectors and isolation
  sub-valves to enable quicker identification and mitigation of water losses."*
- **Keppel DC REIT AR2025:** ~12% reduction in effective PUE for fully-fitted colocation
  assets that underwent major asset enhancement, independently assured.

Full citations and verification flags: `docs/research/research_domain.md` and
`docs/research/research_keppel_critique.md` (Appendix A/C).

### Target audience

REIT asset-management and property/facility-management organisations running a mixed
portfolio of offices, data centres, logistics and residential assets. The operating
structure modelled is the real one: **REIT manager → property/facility manager → FM
contractor**, with the AOM at the manager layer and the Chief Engineer at the FM.

### Core problems solved

| Core problem | How Keystone addresses it |
|---|---|
| Knowledge concentrated in one expert | Structured CDM/ACTA interview (scripted in the demo) yields rules, each with a transcript span |
| Undocumented tacit knowledge | Incident-anchored probing + contradiction detection (both recorded in the demo) surface judgement that was never written down |
| Inconsistent application across assets | One governed pill + per-asset-type overrides; the registry shows coverage and gaps |
| Knowledge lost on retirement | The pill is a portable file the organisation owns, independent of the person and the model |
| AI that cannot be trusted to act safely | Deterministic gates, named-human escalation, evidence preconditions; no AI proposal executes, every one is held for a named human |
| Governance that is only a diagram | Evals, shadow mode, approval gate, audit log and rollback are all executable |

---

## 5. Comprehensive Solution Design

### 5.1 Business architecture

```
   Expert (Chief Engineer)                 Asset Operations Manager (steward)
        │  onboarding interview                    │  incident room + approvals
        ▼                                          ▼
 ┌──────────────────┐   extract    ┌───────────────────────────┐   apply   ┌──────────────────┐
 │  Expert Capture  │─────────────▶│      Pill Registry        │──────────▶│ Incident Decision │
 │  (CDM + ACTA)    │  confirm     │  versions · owners · RACI │  gates    │      Room         │
 └──────────────────┘  on Canvas   │  evals · shadow · health  │           └──────────────────┘
                                    └───────────────────────────┘                    │
                                                ▲                                    │ outcome
                              approve / rollback│                                    ▼
                                    ┌───────────┴────────────┐        ┌──────────────────────┐
                                    │  Steward + Approver    │◀───────│  Outcome & Learning   │
                                    │  (separation of duties)│  diff  │  correction · evals   │
                                    └────────────────────────┘        └──────────────────────┘
```

**RACI per pill:** Owner (domain expert) · Steward (AOM) · Approver (Head of Technical
Services) · review cadence (6 months, or on any override / new asset type / regulatory
change / eval regression). Every pill's `SKILL.md` frontmatter carries this.

### 5.2 Technical architecture

```
Next.js 15 (App Router, TS) · React 19 · Tailwind v4
├─ pills/                 SOURCE OF TRUTH — SKILL.md + rules.yaml + evidence.yaml
│                         + provenance.json + evals/*.yaml + CHANGELOG.md
├─ lib/engine/            DETERMINISTIC, pure TS, no LLM:
│                         evaluate(pill, asset, incident, evidence) → actions + confidence + trace
│                         counterfactual() · runEvals() · conditions · schema
├─ lib/llm/               CodeBuddy Agent SDK → Hunyuan hy4-preview (primary, opt-in,
│                         needs CodeBuddy credentials) → TokenHub adapter (pending
│                         account verification) → OpenAI gpt-5.4-mini (final live
│                         fallback; the only live provider on the Vercel deployment)
│                         → recorded fixtures (default view and last resort)
├─ lib/auth/ + middleware demo sign-in; signed HTTP-only session cookie
├─ lib/governance/        versions (semver, jsondiffpatch diff, rollback) ·
│                         approval (separation of duties + eval-regression gate) ·
│                         access + scope (server-side redaction per role) · audit log
├─ components/            mosaic · capture · canvas · incident · learning · registry ·
│                         pulse · approvals · shell
└─ data/                  mock assets, incidents, timelines, transcripts, roles, fixtures
```

Nine pages ship: `/` (landing), `/sign-in`, `/pulse` (Portfolio Pulse), `/capture`,
`/canvas/[pillId]`, `/registry`, `/incident/[id]`, `/approvals`, `/learning/[pillId]`,
plus API routes for auth, LLM and Jev. Full Mermaid diagrams in `docs/ARCHITECTURE.md`.

### 5.3 How prompts drive AI generation

The LLM is confined to **language work**. Extraction and tenant drafting have
opt-in live endpoints: Hunyuan hy4-preview via the **CodeBuddy Agent SDK** when a
CodeBuddy key or local login exists, otherwise TokenHub or OpenAI (gpt-5.4-mini) as
fallbacks; the public Vercel deployment uses OpenAI. Interviewer probes and
contradiction detection remain scripted/recorded, not live inference. All screens
default to recorded fixtures in `data/fixtures/llm/`. The prompts below describe the
design; items 1 and 3 run as recorded output in the demo:

1. **Interviewer probes (Expert Capture).** The scripted demo interview is tagged
   against a 31-probe library drawn from the Critical Decision Method and ACTA
   (`research_domain.md` §1.3), anchored to the last incident ("walk me through the
   last time…"). Live adaptive probing is proposed, not implemented.
2. **Rule extraction.** The scribe prompt maps expert speech into the `rules.yaml`
   schema: `trigger` conditions, `required_evidence`, `decision`, `allowed_actions`,
   `forbidden_actions`, `exceptions`, `action_class`, `escalate_to`, `owner`, `deadline`,
   `provenance`. Output is a *candidate*, never a committed rule — the expert confirms it.
3. **Contradiction detection (recorded in the demo).** The design is a prompt that
   compares statement pairs across the transcript and flags conflicts. The recorded example flags *"always isolate the whole riser"*
   (00:06:30) against *"for an AHU branch leak, isolate the sub-valve and leave the riser
   open"* (00:22:15), then resolves it with a **distinguishing condition** (00:23:30)
   rather than dropping either statement.
4. **Tenant-message drafting.** A prompt drafts the first notice under hard constraints
   expressed in the Tenant Experience pill: no cause before the source is confirmed
   (TE-03), no completion time before isolation (TE-02), PII masking (TE-05). The draft
   is `needs_approval`; a named human signs off but Keystone never sends it. Live
   drafting selects and arranges reviewed first-notice sentences for INC-2026-1011
   as of 08:20. Unsupported prose, cause claims and completion promises fail closed
   to the recorded fixture. This is bounded composition, not unrestricted drafting.

`MOSAIC_LLM_PROVIDER=auto` tries each credentialed provider in order — CodeBuddy
Agent SDK → Hunyuan hy4-preview, TokenHub, OpenAI gpt-5.4-mini — each with its own
timeout, falling through on error, timeout, invalid JSON or safety rejection, within
an overall time budget (values in `README.md`); if none succeeds it returns the recorded fixture with a reason.
**TokenHub has not answered live: account verification is pending.** Output badges
name the provider and model that actually answered (on the deployed site, for
example, `Live · gpt-5.4-mini via OpenAI`) or show `Recorded output`. The CodeBuddy
SDK has no tools, one model turn, plan permission mode and no session persistence.
All extraction output passes the existing DRAFT-only guard.

**Where each provider runs.** CodeBuddy API keys require a Pro plan, and Vercel
never inspects a local CLI login, so Hunyuan via CodeBuddy runs locally (CodeBuddy
credits and login). The public Vercel deployment has no CodeBuddy or TokenHub key;
its live calls go to OpenAI gpt-5.4-mini, the final fallback, and to the recorded
fixture if that fails. With no provider credentials at all, the API selects recorded
fixtures without spawning the SDK or attempting inference. Do not set
`CODEBUDDY_INTERNET_ENVIRONMENT` (the integration uses the international edition).
The LLM and Jev endpoints require a signed demo session, but one shared passcode
unlocks it and there is no rate limiting; real identity and rate limiting are needed
before production use with billable credentials.

### 5.4 What is deliberately deterministic

Everything that decides an action is deterministic and LLM-free:

- **The rule engine** — ~500 lines of pure TypeScript (`evaluate.ts` + `conditions.ts`) over `rules.yaml`. Structured
  conditions only (`op: eq | neq | gt | gte | lt | lte | in | exists`); no string
  expressions, no `eval`.
- **Status precedence** — `not_applicable → blocked → escalate → needs_approval →
  allowed`. `forbidden_if_missing_evidence` always outranks the action class.
- **Evidence satisfaction** — a required item counts only when it is *confirmed* **and**
  its value is exactly `true`. A confirmed *"LEW did not sign off"* never opens a gate.
- **Confidence** — evidence coverage expressed as a **count** ("2 of 3 required evidence
  items confirmed"), never a fabricated model percentage.
- **Approval** — the eval-regression gate, separation of duties, and role authority are
  code, not prose.
- **Rollback** — appends a new approved version; history is never deleted.

Because the engine takes no model input, changing the LLM cannot change a gate
decision. This holds by construction; the app has no model-swap control. The model
changes the language; it cannot change the safety outcome.

---

## 6. Business Value with Quantifiable Metrics

All figures come from external sources cited in `docs/research/`; none is checkable
inside this repository. Items marked **[verify before slide]** are flagged in the
research dossier as needing a primary-source check before they are shown on a slide;
**[secondary]** means a reputable but non-primary source.

### 6.1 The cost of the problem

| Metric | Figure | Source | Confidence |
|---|---|---|---|
| Water is the #2 cause of commercial property loss (behind fire) | ~20% of all property insurance losses are non-weather water | Chubb commercial brochure | secondary |
| Commercial escape-of-water claims | "reach seven figures" (GBP) | Zurich UK Property Major Loss Team | secondary |
| Average commercial water-damage loss | ≈ US$89,000 | ATI Restoration whitepaper (470k+ claims) | **[verify before slide]** |
| Mould/remediation window | materials must be dry within **24–48 h** or remediation costs escalate | US EPA | verified |
| Institutional knowledge unique to one person | **42%** of knowledge is unique to the employee's role; **5.3 h/week** lost waiting for or recreating information | Panopto 2018 (n=1,000) | verified (via HR Dive) |
| Cost to replace an employee | **0.5–2×** annual salary | Gallup | verified |
| FM workforce ageing (Singapore) | ~**40%** of Built Environment PMETs are aged 50+ | MND, 2022 | **[verify before slide]** |
| FM talent supply | growth in FM talent "is not keeping pace"; ageing workforce threatens cost and service standards | JTC, 18 Sep 2025 | verified |
| Data-centre outage cost | **54% (2025) / 57% (2026)** of significant outages cost > US$100k; ~1 in 5 > US$1M | Uptime Institute Annual Outage Analysis | secondary |
| Grade A office rent exposure | S$12.50 psf/month (CBRE Q2 2026); a 10,000 sq ft floor ≈ **S$125,000/month** | CBRE press release | secondary |

### 6.2 Illustrative value line

> One avoided switchroom flood, or one anchor-tenant floor kept open, is worth a lot:
> a two-week closure of one Grade A floor ≈ **S$58k in rent alone**; a significant
> data-hall outage exceeds **US$100k** in most cases. (No pilot cost has been
> estimated yet.)

### 6.3 What the product shows today

Portfolio Pulse and the Registry show, over the mock data:

- **Avg time-to-isolate**, computed from the incident records (open to the TS-02
  completion event).
- **Downtime avoided** — an illustrative estimate: 4 h assumed per incident where the
  re-energisation gate blocked action.
- **Replay agreement** — the engine's own eval pass rate across approved pills
  ("x of y assertions", not a score). Engine-derived.
- **Decisions awaiting approval** and **pills approved** — governance posture.
- **Eval pass** and **shadow agreements** per pill, plus pending corrections.

An override-rate metric is proposed for the pilot, not built.

### 6.4 Keppel-anchored value

- Keppel's own Technical Services KPI is to *"cut downtime and costs"* (Investor Day
  2026). Keystone's downtime-avoided estimate points at that KPI; a pilot would
  measure it on real incidents.
- Keppel DC REIT reports ~**12%** improvement in effective PUE on asset-enhanced
  colocation assets; Keystone's DC overlay preserves the isolation and SLA logic that
  protects those gains.

**Pilot measurement plan (proposed):** instrument time-to-isolate, escalation latency,
gate-block rate, override rate, eval agreement and rollback frequency per pill; target
a measurable reduction in time-to-isolate and in unplanned re-energisation risk, and a
reduction in the "learn from the senior" onboarding ramp from months toward day-one
guided decisions with named escalation.

---

## 7. Solution Diagram — the 8 required points

Each point below maps to a node in the Mermaid diagram in `docs/ARCHITECTURE.md` (§1).

### 7.1 The specific business problem being addressed

Critical incident-response know-how lives in a few experienced engineers, is applied
inconsistently across assets, and is lost on retirement — while AI that could help is
either a chatbot that cannot be trusted to act, or an autonomous system no one will
authorise on live building systems. The business cost is downtime, unsafe
re-energisation risk, tenant/SLA exposure, and a multi-month onboarding ramp.

### 7.2 Whose expertise is captured, and how undocumented knowledge is obtained

**Tan Wei Ming, Chief Engineer** (18 years M&E; employed by the property/facility
manager) — the person who decides, at 08:09 on a live leak, whether to isolate the
branch or the riser and whether anyone may re-energise. His knowledge is elicited by a
**structured CDM + ACTA interview** (scripted and simulated in the demo), not a
questionnaire: incident-anchored probes ("walk me through the last time…", "where did you make a real decision?"),
novice-error probes, and a coverage audit that surfaces what he has *not* said. The
contradiction probe is what extracts the tacit rule: the two statements about riser
isolation are reconciled into the distinguishing condition that becomes TS-02.

### 7.3 How the captured expertise becomes reusable rather than a one-off

It is **compiled into a pill** — a plain-text package (`SKILL.md`, `rules.yaml`,
`evidence.yaml`, `provenance.json`, `evals/`, `CHANGELOG.md`) with an owner, a steward,
an approver, a version and tests. The same package is applied to a **second asset type**
(Harbourfront DC1, a colocation data centre) through asset overrides, and it installs
unchanged as a CodeBuddy skill (verified: CodeBuddy Code reached the same TS-07 decision as our engine — `docs/proof/04a`, `04b`), with WorkBuddy/ADP as the designed, untested next hosts. It is a file, not an answer.

### 7.4 How an Asset Operations Manager uses, supervises, verifies and escalates

In the **Incident Decision Room**, the AOM sees each pill's actions as chips —
Recommend / Requires approval / Must escalate. She **verifies** through the
**evidence-coverage meter** (a count of confirmed required evidence) and the **Why
drawer** (evidence used vs missing, rule + version, expert quote + timestamp, risk if
ignored). She **supervises** by approving `requires_approval` actions, and
**escalates** when a gate blocks: TS-07 routes to the duty LEW with a fallback to the
Head of Technical Services, and the DC overlay reroutes to the Critical Facilities
Manager. Nothing executes without a named human.

### 7.5 Why the proposal is more than a chatbot or information-retrieval tool

See §11. In one line: a pill is an **executable, testable, versioned, owned artefact
with deterministic gates and provenance** — RAG retrieves text; a pill decides, and
refuses, and can be rolled back.

### 7.6 How feedback, outcomes and new expertise are reviewed, validated, versioned and approved after deployment

The **Outcome & Learning** loop: capture the outcome → expert correction → **diff**
(v1.2.0 → v1.3.0) → **validate** (replay evals against every past incident; v1.2.0:
5 pass, 1 flagged; v1.3.0: 6 of 6) → **shadow mode** (replays the 6 evals through the
approved and the candidate version: "6/6 agreements") → **approval** (separation of
duties: the author cannot approve; eval regressions block unless the approver role
overrides with a reason) → **one-click rollback** (append-only; the rolled-back version
is marked Retired). "Validated" is defined concretely: **evals pass + sign-off by an
authorised approver**.

### 7.7 How the concept extends to multiple assets, business units or enterprise environments

Three mechanisms: (1) **asset-type overrides** in the pill change gates per
profile (office → data centre) with no fork; (2) the **Pill Registry** shows coverage
per asset type and flags gaps, so scaling is a visible mechanism, not a claim; (3) the
pill is a **portable skill package**, verified in CodeBuddy and designed for WorkBuddy
(Skills & Expert Center) and ADP (ZIP import, semantic versioning, Approval Center),
both untested — the enterprise distribution path is the artefact itself.

### 7.8 A credible path to implementation using current or near-term technology

See §10. Each component has a shipping Tencent Cloud counterpart we propose to use:
TokenHub for models, WorkBuddy Experts/Skills, ADP for governed enterprise
distribution, TRTC for the voice interview, EdgeOne Pages / Lighthouse for hosting,
with iBMS + CMMS as evidence feeds. Integrated today: the CodeBuddy skill (verified)
and the CodeBuddy Agent SDK path to Hunyuan (runs locally). The TokenHub adapter is
built but has not answered live.

---

## 8. The 11 "Solution should be" properties

| # | Property | Where it shows in the product |
|---|----------|-------------------------------|
| 1 | **Human-supervised** | Decision Canvas (expert confirms/edits/rejects every tile); every action chip carries an `action_class`; the Approval Panel and `/approvals` queue; **nothing executes without a named human**. |
| 2 | **Transparent** | The Why drawer: rule id + version, evidence used vs missing, transcript quote + timestamp, risk if ignored; "Hear the expert" reads the exact quote aloud (synthetic browser voice reading his recorded words, not his voice); the counterfactual "what would change the decision?". |
| 3 | **Accountable** | Per-pill RACI (Owner / Steward / Approver) in `SKILL.md`; per-action owner + deadline; append-only audit log (who / when / pill version / action / outcome), browser-local in the demo; production would persist it server-side. |
| 4 | **Reliable** | Pills compile into evals; "Replay" runs the pill against past incidents and reports agreement; approval is **blocked if evals regress** (unless the approver overrides with a reason); shadow mode replays the evals through the candidate version before promotion. |
| 5 | **Reusable** | The pill package; the same Technical Services pill applied to a second asset type (DC overlay) with gates that change but logic that does not. |
| 6 | **Scalable** | Asset-profile overrides + registry coverage per asset type; the pill is a distributable skill; Portfolio Pulse shows portfolio-wide posture. |
| 7 | **Governed** | Draft → Shadow → Approved → Retired lifecycle; "validate" = evals pass + authorised sign-off; separation of duties (author ≠ approver); reason required on proposal, override and rollback. |
| 8 | **Portable** | Plain text (YAML/JSON/Markdown) with no vendor lock-in; installs unchanged as a CodeBuddy skill (verified) and follows the SKILL.md convention used by WorkBuddy/ADP (designed for, untested); the engine takes no model input, so changing the LLM cannot change a gate. |
| 9 | **Version-controlled** | Semantic versions + CHANGELOG; jsondiffpatch diff for approval; **one-click rollback**; history is append-only (rollback adds a version, never deletes one). |
| 10 | **Secure** | Sensitivity labels (`public`/`internal`/`tenant_pii`/`commercial`) on rules, incidents and evidence; demo sign-in and "Switch user" (Technician / AOM / Tenant Experience / Executive / …) with server-side PII and lease-term masking (one shared demo passcode — not identity proofing); pills declare an access scope (not yet enforced). |
| 11 | **Clearly bounded** | Mandatory `action_class` on every rule (Recommend / Requires approval / Must escalate), colour-coded everywhere; forbidden actions listed per rule; "outside approved scope → escalate to a named human" fires live on TS-07. |

---

## 9. Responsible AI mapping

Keystone's constructs map onto the IMDA Model AI Governance Framework (2020), the IMDA
**Model AI Governance Framework for Agentic AI** (2026), AI Verify, ISO/IEC 42001:2023,
NIST AI RMF 1.0, and EU AI Act Article 14 (as design alignment only — Keystone is not an
EU high-risk system). Full analysis: `research_domain.md` §3.

| Keystone construct | IMDA MGF 2020 | MGF Agentic AI 2026 | ISO/IEC 42001 | NIST AI RMF | EU AI Act Art. 14 |
|---|---|---|---|---|---|
| **Recommend** (AI proposes; human acts) | Human-in-the-loop — "AI only providing recommendations" | Routine action: simple approve/reject | A.9.2 responsible use; A.8.2 info for users | MAP 3.5 oversight processes | 14(4)(c) interpret output |
| **Approve** (named approver signs) | HITL with "affirmative action by the human" | Checkpoint for **irreversible** actions (sending comms) | A.6.2.8 event logs; A.3.2 roles | GOVERN 3.2 roles | 14(4)(d) override/reverse |
| **Escalate** (gate blocks; route to role + deadline) | §3.18 safety-critical: person assumes control / safe shutdown | Deny by default when no policy covers the action (Keystone: every AI proposal is held for a named human) | A.9.4 intended use → outside scope triggers A.5 impact assessment | MANAGE 2.4 disengage; MANAGE 1.3 planned responses | 14(4)(e) stop/interrupt |
| **Portfolio Pulse / evidence monitoring** (no actions) | Human-over-the-loop for low-severity, reversible, monitoring-only | Real-time monitoring, alert thresholds | A.6.2.6 operation & monitoring | MANAGE 4.1 monitoring | 14(4)(a) monitor anomalies |
| **Not used** — autonomous control of building systems | Explicitly human-out-of-the-loop, excluded by Keystone | — | — | — | — |
| **Why drawer** | HITL requires factors, value and weighting be provided | Transparency to end users | A.8.2 | MAP/MEASURE transparency | 14(4)(a),(c) |
| **Override capture + version diff** | Operations management / audit trail | Human override rate as health metric (proposed for the pilot); audit approvals | A.6.2.8; A.8.4 | MANAGE 4.1 appeals/overrides; MANAGE 4.3 incidents | — |
| **Role/sensitivity scoping** (server-side redaction of incident data; pill `access` declared, not yet enforced) | — | "Bound risks by design": limit tools, permissions, scope; least privilege | A.10.2 allocation of responsibilities | GOVERN 3.2 | 14(3) proportionality |

**AI Verify alignment** (design alignment, not an AI Verify assessment — no AI Verify
test has been run): Keystone is designed to align with Human Agency & Oversight
(named-human approval, escalation), Accountability (RACI + audit log), Transparency and
Explainability (Why drawer + provenance), Reproducibility (deterministic engine with no
model input), Safety (evidence gates; no AI proposal executes) and Data Governance
(sensitivity labels + server-side role-based masking).

**Responsible-AI evidence checklist.** In the product: action class on every rule;
deterministic gates with evidence preconditions; named approver + timestamp on
approve-tier actions; override reasons recorded on approval; provenance per rule;
version history with rollback; server-side role-based redaction; an explicit **"no
autonomous control of building systems"** statement. Proposed for a pilot: an
override-rate KPI, an incident-report pipeline, enforced pill-level access, and AI
Verify process checks.

**Boundary statement.** Keystone never executes a physical action. It recommends,
drafts and escalates. There is no actuator, no live BMS write path, and no autonomous
control of building systems anywhere in the design.

---

## 10. Credible implementation path on Tencent Cloud

Current state: mock incident data and recorded defaults. Opt-in live extraction and
bounded tenant drafting run on Hunyuan via the CodeBuddy Agent SDK where CodeBuddy
credentials exist (local); the public deployment falls back to OpenAI gpt-5.4-mini.
TokenHub is wired but blocked by pending account verification. Rows marked
*proposed* are the production path, not completed integrations.

| Layer | Tencent product | Role in Keystone |
|---|---|---|
| **Models (built, runs locally)** | **CodeBuddy Agent SDK → Hunyuan `hy4-preview`** | Opt-in extraction and tenant drafts; local CLI login (with CodeBuddy credits) or Pro API key. Recorded defaults and fallback. No autonomous approvals or tool use. |
| **Models (built, pending verification)** | **TokenHub** (`https://tokenhub-intl.tencentcloudmaas.com/v1`) | OpenAI-compatible adapter; has not answered live because account verification is pending. |
| Models (fallback, non-Tencent) | OpenAI `gpt-5.4-mini` | Final live fallback; the only live provider on the current Vercel deployment. |
| **Builder skills (verified)** | **CodeBuddy** — `.codebuddy/skills/<name>/SKILL.md` | The same pill loads as a CodeBuddy skill (`docs/proof/04a`, `04b`); `rules.yaml` and `evals/` are executed only by the Keystone engine. |
| **Expert host (proposed)** | **WorkBuddy** — Skills & Expert Center, Experts, Expert Teams | A pill would become a Skill; a domain pill + persona an Expert; the Asset Ops orchestrator an Expert Team leader. WorkBuddy documents a security scan before install; `access` could map to its RBAC. |
| **Enterprise governance (proposed)** | **ADP** (Agent Development Platform) — custom skills as a ZIP with `SKILL.md` at the root, YAML metadata, semantic versioning, sandbox security review, **Approval Center** for enterprise sharing | The governed distribution path for pills across business units. |
| **Sandbox (proposed)** | **Agent Runtime / CubeSandbox** | Isolated execution for deterministic rule checks (architecture reference; not built). |
| **Voice (proposed)** | **TRTC Conversational AI** (STT + LLMConfig OpenAI-compatible + TTS; captions via custom messages) | The live Expert Onboarding Call: real-time captions and "rule extracted" chips. Today the demo uses a scripted transcript read by browser text-to-speech; TRTC is the proposed production path. |
| **Hosting (proposed)** | **EdgeOne Pages** (Next.js SSR, free HTTPS) with **Lighthouse** (Singapore) for a persistent backend | Today the app runs on Vercel. Lighthouse if a long-lived Node backend (TRTC token service) is needed. |
| **Integration (proposed)** | **iBMS** alarm feed, leak-detector telemetry, **CMMS** work orders, FM-agreement SLAs | Evidence sources (mock data today). The pill references **Brick 1.5.0** classes (not vendor point IDs) and optional Haystack tags / COBie components, so any site whose BMS/CMMS can be tagged to Brick/Haystack can run the same pill. |

Sources for the Tencent mapping: `docs/research/research_tencent.md` (all pages fetched
2026-10-11). Items it flags as unverified (e.g. the exact WorkBuddy skill-file
discrepancy, custom Expert creation UI) are treated as **proposed**, not implemented.

---

## 11. Why more than a chatbot

| RAG chatbot / retrieval tool | Keystone Intelligence Pill |
|---|---|
| Retrieves text snippets | Evaluates structured rules against an evidence map |
| No deterministic gates | Gates **block** unsafe actions; an LLM cannot override them |
| No provenance | Every rule links to a transcript quote + timestamp |
| No tests | Evals replay past incidents; approval is blocked if evals regress |
| No versions | Semantic versioning, diff, one-click rollback |
| No owner | RACI: owner, steward, approver per pill |
| Cannot be rolled back | Version-controlled artefact; history is append-only |
| Model-coupled | Vendor-neutral plain text; the engine takes no model input |

The single frame that makes the difference visible: the orchestrator proposes
*"Re-energise AHU-23-01 / DB-23A"*, and a red gate refuses because **TS-07 (v1.2.0)
blocks it until LEW sign-off, insulation resistance and area-dry are confirmed**. The refusal is traceable to a human sentence spoken at
00:14:32. That one frame demonstrates human-supervised, transparent, bounded and
accountable simultaneously.

---

## 12. Build process & CodeBuddy tips

### Build process

A two-tool build over five days (Sun 11 – Thu 15 Oct 2026), scope frozen on day 1 per
the red-team plan (`research_keppel_critique.md` §B4).

- **CodeBuddy Code.** The initial application scaffold and routing; first versions of
  both Intelligence Pills, the deterministic engine (`lib/engine`), the mock data model
  (`data/`) and the UI screens. Models used: `hy4-preview` (shown in `docs/proof/`);
  `hy3` and `deepseek-v4.1-flash` were also used (no screenshot).
- **Claude Code.** Architecture and scope planning; code review; the governance,
  data, auth and LLM-provider layers (`lib/governance`, `lib/auth`, `lib/llm`, data
  loaders/schemas, cross-file consistency tests); engine hardening; and the landing
  page.

### CodeBuddy tips (for the video reflection)

1. **Start in Plan mode.** It writes a Markdown plan you can review before any file
   changes.
2. **Freeze scope first, then build one closed loop.** Seven half-working screens lose to
   one working loop. The pill is the differentiator; the loop is the demo.
3. **Encode safety as tests, not comments.** The invariants (evidence cannot be faked
   open; `forbidden_if_missing_evidence` always wins; exceptions never relax a gate;
   separation of duties) are the artefacts a judge can run.
4. **Confine the LLM.** Route language work through the LLM and decisions through pure
   functions. Then "model-agnostic" holds by construction rather than by assertion.
5. **Record every LLM path as a fixture from day 1.** The demo then runs offline and
   never depends on the network on stage.
6. **Use sub-agents and skills for parallel work**, and commit `.codebuddy/skills/`
   so the skills are inspectable.
7. **Take proof screenshots from the very first prompt.** Proof of usage is a hard gate.

### Proof-of-usage screenshots

Committed in `docs/proof/` (CodeBuddy build session):

- `docs/proof/01a-codebuddy-plan-mode-hy4-subagents.png`
- `docs/proof/01b-codebuddy-plan-clarifying-questions.png`
- `docs/proof/01c-codebuddy-plan-subagent-answered-questions.png`
- `docs/proof/02a-codebuddy-scaffold-permission-prompt.png`
- `docs/proof/02b-codebuddy-scaffold-tasks-smoke-test.png`
- `docs/proof/02c-codebuddy-scaffold-build-pass-7-routes.png`
- `docs/proof/03a-codebuddy-hy4-learning-screen-build.png`
- `docs/proof/04a-codebuddy-skill-invoked.png` (model selector: Auto)
- `docs/proof/04b-codebuddy-skill-ts07-answer.png` (model selector: Auto)

---

## 13. Submission checklist (TODO placeholders)

Replace each placeholder before submitting. Copy-paste-ready answers for every form field: `docs/submission/form-answers.md`.

- [ ] **Project title:** Keystone ✔
- [ ] **Short blurb:** "Turn expert judgement into governed, versioned Intelligence Pills." ✔
- [ ] **Project Description:** this document ✔
- [ ] **CodeBuddy/WorkBuddy conversation history (≥3):** `docs/proof/*.png` ✔
- [x] **Cover image (16:9, 380×216 recommended):** `docs/submission/cover-small.png` (380×216); 4× master `docs/submission/cover.png` (1520×864); source `docs/submission/cover.html`
- [ ] **Demo video (5–8 min):** TODO — `[VIDEO LINK]`; script, shot list and 60-second backup cut in `docs/submission/video-script.md`
- [x] **Solution diagram (8 required points):** `docs/submission/solution-diagram.png` (1920×1080); source `docs/submission/solution-diagram.html`
- [x] **Live URL / demo link (optional, bonus):** https://mosaic-psi-rouge.vercel.app (demo passcode `keystone`, shown on the sign-in page; demo: /incident/INC-2026-1011?step=10)
- [ ] **Source code (GitHub repository):** https://github.com/frederickemerson/mosaic (private — grant judges access)

### Open TODOs to resolve before submission

- [ ] Verify the demo path end-to-end on the live Vercel URL (EdgeOne Pages remains the proposed Tencent Cloud host).
- [ ] Publish the GitHub repository and paste the URL.
- [ ] Record the 5–8 min video from `docs/submission/video-script.md` (overview → core agent
      features → CodeBuddy reflection) and paste the link.
- [x] Export the 16:9 cover image (`docs/submission/cover-small.png`).
- [ ] Re-check the **[verify before slide]** figures in §6 against primary sources
      before quoting them on a slide.
