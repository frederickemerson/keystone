# MOSAIC — Project Submission

**Track:** The Real Estate Track — Keppel · **Challenge:** AI HARVEST — Turning Expert
Know-How into Reusable Intelligence · **Event:** Tencent Cloud "AI CAN DO IT" Hackathon
Singapore 2026 · **Submission date:** 16 Oct 2026.

This document maps 1:1 to the hackathon submission form (§8 of the handbook). The
challenge-specific scorecard used in preliminary judging — the 11 "Solution should be"
properties and the 8 "Solution should include" diagram points — is answered in full in
its own sections below.

---

## 1. Project title

**MOSAIC** — *Managed Operational Skills As Intelligence Capsules.*

## 2. Short blurb

> **Turn expert judgement into governed, versioned Intelligence Pills.**

_(9 words, under the 10-word hard limit.)_

---

## 3. Project Overview

### Target scenarios

Incident response and operational decision-making in commercial real estate, where
experienced judgement is not written down and must be reused across a portfolio:

- **Capture** — a retiring Chief Engineer's incident-response know-how, elicited through
  a structured onboarding interview, turned into governed decision rules.
- **Apply** — a live chilled-water leak in a Grade A office tower, where an AI proposal
  is blocked by a deterministic safety gate and escalated to a named human.
- **Learn** — an operational outcome and an expert correction feed a version diff, an
  eval replay, shadow mode, steward approval and one-click rollback.
- **Reuse** — the same pill re-applied to a colocation data-centre profile with asset
  overrides, and swapped across models with an identical decision.

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

Supporting roles (implemented in `data/roles.json`, 13 in total): Head of Technical
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

| Core problem | How MOSAIC addresses it |
|---|---|
| Knowledge concentrated in one expert | Structured CDM/ACTA interview extracts rules, each with a transcript span |
| Undocumented tacit knowledge | Adaptive, incident-anchored probing + contradiction detection surface judgement that was never written down |
| Inconsistent application across assets | One governed pill + per-asset-type overrides; the registry shows coverage and gaps |
| Knowledge lost on retirement | The pill is a portable file the organisation owns, independent of the person and the model |
| AI that cannot be trusted to act safely | Deterministic gates, named-human escalation, evidence preconditions, deny-by-default |
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
├─ lib/llm/               CodeBuddy Agent SDK → Hunyuan hy4-preview (opt-in live).
│                         TokenHub ready pending KYC; recorded fixtures fallback.
├─ lib/governance/        versions (semver, jsondiffpatch diff, rollback) ·
│                         approval (separation of duties + eval-regression gate) ·
│                         access (role/sensitivity RBAC + redaction) · audit log
├─ components/            mosaic · capture · canvas · incident · learning · registry ·
│                         pulse · approvals · shell
└─ data/                  mock assets, incidents, timelines, transcripts, roles, fixtures
```

Seven routes ship: `/` (Portfolio Pulse), `/capture`, `/canvas/[pillId]`, `/registry`,
`/incident/[id]`, `/approvals`, `/learning/[pillId]`. Full Mermaid diagrams in
`docs/ARCHITECTURE.md`.

### 5.3 How prompts drive AI generation

The LLM is confined to **language work**. Extraction and tenant drafting have
opt-in live endpoints via **CodeBuddy Agent SDK → Hunyuan hy4-preview**. Interviewer
probes and contradiction detection remain scripted/recorded, not live inference.
All screens default to recorded fixtures in `data/fixtures/llm/`:

1. **Interviewer probes (Expert Capture).** The interviewer is driven by a probe library
   (`research_domain.md` §1.3 — 31 probes) drawn from the Critical Decision Method and
   ACTA. Prompts select and phrase adaptive follow-ups anchored to the last incident
   ("walk me through the last time…"), and a schema-constrained "scribe" prompt extracts
   rule candidates as structured JSON, one per rule, each anchored to the expert turns it
   came from.
2. **Rule extraction.** The scribe prompt maps expert speech into the `rules.yaml`
   schema: `trigger` conditions, `required_evidence`, `decision`, `allowed_actions`,
   `forbidden_actions`, `exceptions`, `action_class`, `escalate_to`, `owner`, `deadline`,
   `provenance`. Output is a *candidate*, never a committed rule — the expert confirms it.
3. **Contradiction detection.** A prompt compares statement pairs across the transcript
   and flags conflicts. The recorded example flags *"always isolate the whole riser"*
   (00:06:30) against *"for an AHU branch leak, isolate the sub-valve and leave the riser
   open"* (00:22:15), then resolves it with a **distinguishing condition** (00:23:30)
   rather than dropping either statement.
4. **Tenant-message drafting.** A prompt drafts the first notice under hard constraints
   expressed in the Tenant Experience pill: no cause before the source is confirmed
   (TE-03), no completion time before isolation (TE-02), PII masking (TE-05). The draft
   is `needs_approval`; a named human signs off but MOSAIC never sends it. Live
   drafting selects and arranges reviewed first-notice sentences for INC-2026-1011
   as of 08:20. Unsupported prose, cause claims and completion promises fail closed
   to the recorded fixture. This is bounded composition, not unrestricted drafting.

`MOSAIC_LLM_PROVIDER=auto` selects CodeBuddy with a server API key or cached local
CLI login, then TokenHub if only its key is present, otherwise recorded fixtures.
**TokenHub is not verified live: account KYC is pending.** A selected provider's
error, invalid JSON/schema, safety rejection or 25-second timeout falls back to a
recorded fixture with a reason, not a second live-provider retry. Output badges
show `live · hy4-preview via CodeBuddy · <measured seconds> s` or `recorded output`.
The CodeBuddy SDK has no tools, one model turn, plan permission mode and no session
persistence. All extraction output passes the existing DRAFT-only guard.

**CodeBuddy API keys require a Pro plan.** Vercel normally has no key and does not
have the local CLI login: when neither provider key exists it selects recorded
fixtures directly, **without spawning the SDK or attempting inference**. Local
CLI login reuse remains available. Do not set `CODEBUDDY_INTERNET_ENVIRONMENT`
(the integration uses the international edition). Vercel live inference is not
claimed as verified. The demo's optional inference endpoints need server-side auth
and rate limiting before production use with billable credentials.

### 5.4 What is deliberately deterministic

Everything that decides an action is deterministic and LLM-free:

- **The rule engine** — ~200 lines of pure TypeScript over `rules.yaml`. Structured
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

Because the gates are deterministic, swapping the model (hy4-preview → deepseek-v4-pro)
yields an **identical decision**. The model changes the language; it cannot change the
safety outcome.

---

## 6. Business Value with Quantifiable Metrics

All figures are sourced. Items marked **[verify before slide]** are flagged in the
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

> One avoided switchroom flood, or one anchor-tenant floor kept open, pays for the pilot:
> a two-week closure of one Grade A floor ≈ **S$58k in rent alone**; average commercial
> water loss ≈ **US$89k**; a data-hall outage exceeds **US$100k** in most cases.

### 6.3 What the product measures (implemented, not asserted)

MOSAIC's Portfolio Pulse and Registry report metrics derived from the deterministic
engine, so they are auditable rather than invented:

- **Avg time-to-isolate** (from incident open to the TS-02 completion event).
- **Downtime avoided** — hours where the re-energisation gate blocked premature action
  and no unplanned outage resulted.
- **Replay agreement** — the engine's own eval pass rate across approved pills
  ("x of y assertions", not a score).
- **Decisions awaiting approval** and **pills approved** — live governance posture.
- **Eval pass rate** and **expert agreement** per pill, plus pending corrections.

### 6.4 Keppel-anchored value

- Keppel's own Technical Services KPI is to *"cut downtime and costs"* (Investor Day
  2026). MOSAIC's downtime-avoided metric is the operational expression of that KPI.
- Keppel DC REIT reports ~**12%** improvement in effective PUE on asset-enhanced
  colocation assets; MOSAIC's DC overlay preserves the isolation and SLA logic that
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
**structured CDM + ACTA interview**, not a questionnaire: adaptive, incident-anchored
probes ("walk me through the last time…", "where did you make a real decision?"),
novice-error probes, and a coverage audit that surfaces what he has *not* said. The
contradiction probe is what extracts the tacit rule: the two statements about riser
isolation are reconciled into the distinguishing condition that becomes TS-02.

### 7.3 How the captured expertise becomes reusable rather than a one-off

It is **compiled into a pill** — a plain-text package (`SKILL.md`, `rules.yaml`,
`evidence.yaml`, `provenance.json`, `evals/`, `CHANGELOG.md`) with an owner, a steward,
an approver, a version and tests. The same package is applied to a **second asset type**
(Harbourfront DC1, a colocation data centre) through asset overrides, and it installs
unchanged as a CodeBuddy skill (verified: CodeBuddy on Hunyuan reached the same TS-07 decision as our engine), with WorkBuddy/ADP as the designed next hosts. It is a file, not an answer.

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
(v1.2.0 → v1.3.0) → **validate** (replay evals against every past incident; 5 pass, 1
flagged) → **shadow mode** (runs silently beside the approved version; the registry
shows "4/4 agreements") → **steward approval** (separation of duties; eval regressions
block unless the approver role overrides with a reason) → **one-click rollback**
(append-only; the rolled-back version is marked Retired). "Validated" is defined
concretely: **evals pass + steward sign-off**.

### 7.7 How the concept extends to multiple assets, business units or enterprise environments

Three mechanisms, all shown: (1) **asset-type overrides** in the pill change gates per
profile (office → data centre) with no fork; (2) the **Pill Registry** shows coverage
per asset type and flags gaps, so scaling is a visible mechanism, not a claim; (3) the
pill is a **portable skill package** that distributes through CodeBuddy, WorkBuddy
(Skills & Expert Center) and ADP (ZIP import, semantic versioning, Approval Center) —
the enterprise distribution path is the artefact itself.

### 7.8 A credible path to implementation using current or near-term technology

See §9. Every component maps to a shipping Tencent Cloud product today: TokenHub for
models, WorkBuddy Experts/Skills, CodeBuddy skills, ADP for governed enterprise
distribution, TRTC for the voice interview, EdgeOne Pages / Lighthouse for hosting,
and BMS/iBMS + CMMS for integration.

---

## 8. The 11 "Solution should be" properties

| # | Property | Where it shows in the product |
|---|----------|-------------------------------|
| 1 | **Human-supervised** | Decision Canvas (expert confirms/edits/rejects every tile); every action chip carries an `action_class`; the Approval Panel and `/approvals` queue; **nothing executes without a named human**. |
| 2 | **Transparent** | The Why drawer: rule id + version, evidence used vs missing, transcript quote + timestamp, risk if ignored; "Hear the expert" replays the exact clip; the counterfactual "what would change the decision?". |
| 3 | **Accountable** | Per-pill RACI (Owner / Steward / Approver) in `SKILL.md`; per-action owner + deadline; immutable audit log (who / when / pill version / action / outcome). |
| 4 | **Reliable** | Pills compile into evals; "Replay" runs the pill against past incidents and reports agreement; approval is **blocked if evals regress**; shadow mode runs new versions silently before promotion. |
| 5 | **Reusable** | The pill package; the same Technical Services pill applied to a second asset type (DC overlay) with gates that change but logic that does not. |
| 6 | **Scalable** | Asset-profile overrides + registry coverage per asset type; the pill is a distributable skill; Portfolio Pulse shows portfolio-wide posture. |
| 7 | **Governed** | Draft → Shadow → Approved → Retired lifecycle; "validate" = evals pass + steward sign-off; separation of duties; reason required on proposal, override and rollback. |
| 8 | **Portable** | Plain text (YAML/JSON/Markdown) with no vendor lock-in; installs unchanged as a CodeBuddy skill (verified) and follows the SKILL.md convention used by WorkBuddy/ADP (designed for, untested); model swap gives an identical decision because gates are deterministic. |
| 9 | **Version-controlled** | Semantic versions + CHANGELOG; jsondiffpatch diff for approval; **one-click rollback**; history is append-only (rollback adds a version, never deletes one). |
| 10 | **Secure** | Sensitivity labels (`public`/`internal`/`tenant_pii`/`commercial`) on rules and evidence; role switcher (Technician / AOM / Tenant Experience / Executive / …) with PII and lease-term masking; pills carry an access scope. |
| 11 | **Clearly bounded** | Mandatory `action_class` on every rule (Recommend / Requires approval / Must escalate), colour-coded everywhere; forbidden actions listed per rule; "outside approved scope → escalate to a named human" fires live on TS-07. |

---

## 9. Responsible AI mapping

MOSAIC's constructs map onto the IMDA Model AI Governance Framework (2020), the IMDA
**Model AI Governance Framework for Agentic AI** (2026), AI Verify, ISO/IEC 42001:2023,
NIST AI RMF 1.0, and EU AI Act Article 14 (as design alignment only — MOSAIC is not an
EU high-risk system). Full analysis: `research_domain.md` §3.

| MOSAIC construct | IMDA MGF 2020 | MGF Agentic AI 2026 | ISO/IEC 42001 | NIST AI RMF | EU AI Act Art. 14 |
|---|---|---|---|---|---|
| **Recommend** (AI proposes; human acts) | Human-in-the-loop — "AI only providing recommendations" | Routine action: simple approve/reject | A.9.2 responsible use; A.8.2 info for users | MAP 3.5 oversight processes | 14(4)(c) interpret output |
| **Approve** (named approver signs) | HITL with "affirmative action by the human" | Checkpoint for **irreversible** actions (sending comms) | A.6.2.8 event logs; A.3.2 roles | GOVERN 3.2 roles | 14(4)(d) override/reverse |
| **Escalate** (gate blocks; route to role + deadline) | §3.18 safety-critical: person assumes control / safe shutdown | **Deny by default** when no policy covers the action | A.9.4 intended use → outside scope triggers A.5 impact assessment | MANAGE 2.4 disengage; MANAGE 1.3 planned responses | 14(4)(e) stop/interrupt |
| **Portfolio Pulse / evidence monitoring** (no actions) | Human-over-the-loop for low-severity, reversible, monitoring-only | Real-time monitoring, alert thresholds | A.6.2.6 operation & monitoring | MANAGE 4.1 monitoring | 14(4)(a) monitor anomalies |
| **Not used** — autonomous control of building systems | Explicitly human-out-of-the-loop, excluded by MOSAIC | — | — | — | — |
| **Why drawer** | HITL requires factors, value and weighting be provided | Transparency to end users | A.8.2 | MAP/MEASURE transparency | 14(4)(a),(c) |
| **Override capture + version diff** | Operations management / audit trail | **Human override rate** as health metric; audit approvals | A.6.2.8; A.8.4 | MANAGE 4.1 appeals/overrides; MANAGE 4.3 incidents | — |
| **Role/sensitivity scoping of pills** | — | "Bound risks by design": limit tools, permissions, scope; least privilege | A.10.2 allocation of responsibilities | GOVERN 3.2 | 14(3) proportionality |

**AI Verify alignment** (11 principles): MOSAIC demonstrates Human Agency & Oversight
(named-human approval, escalation), Accountability (RACI + audit log), Transparency and
Explainability (Why drawer + provenance), Reproducibility (deterministic engine,
identical decision on model swap), Safety (gates + deny-by-default) and Data Governance
(sensitivity labels + role-based masking).

**Responsible-AI evidence checklist** (each item is visible in the product): tier on
every rule; deterministic gates with evidence preconditions; named approver + timestamp
on approve-tier actions; override log with reasons and override-rate KPI; deny-by-default
for unknown actions; provenance per rule field; version history with rollback;
role-based pill visibility; incident-report pipeline; an explicit **"no autonomous
control of building systems"** statement; AI Verify process-check mapping.

**Boundary statement.** MOSAIC never executes a physical action. It recommends,
drafts and escalates. There is no actuator, no live BMS write path, and no autonomous
control of building systems anywhere in the design.

---

## 10. Credible implementation path on Tencent Cloud

Current state: mock incident data and recorded defaults, with opt-in live Hunyuan
extraction and bounded tenant drafting through the CodeBuddy Agent SDK. TokenHub
is wired but blocked by pending account verification. Other integration points
below are the proposed production path, not claims of completed integrations.

| Layer | Tencent product | Role in MOSAIC |
|---|---|---|
| **Models (live)** | **CodeBuddy Agent SDK → Hunyuan `hy4-preview`** | Opt-in extraction and tenant drafts; local CLI login or Pro API key. Recorded defaults and fallback. No autonomous approvals or tool use. |
| **Models (pending verification)** | **TokenHub** (`https://tokenhub-intl.tencentcloudmaas.com/v1`) | OpenAI-compatible adapter ready once account KYC completes; not yet verified live. |
| **Expert host** | **WorkBuddy** — Skills & Expert Center, Experts, Expert Teams | A pill becomes a Skill; a domain pill + persona becomes an Expert; the Asset Ops orchestrator becomes an Expert Team leader. Skills are security-scanned before install; `access` maps to RBAC. |
| **Builder skills** | **CodeBuddy** — `.codebuddy/skills/<name>/SKILL.md` | The same pill loads as a CodeBuddy skill; `rules.yaml` and `evals/` are consumed by the MOSAIC engine. |
| **Enterprise governance** | **ADP** (Agent Development Platform) — custom skills as a ZIP with `SKILL.md` at the root, YAML metadata, semantic versioning, sandbox security review, **Approval Center** for enterprise sharing | The governed distribution path for pills across business units. |
| **Sandbox** | **Agent Runtime / CubeSandbox** | Isolated execution for deterministic rule checks (architecture reference; not built in 5 days). |
| **Voice** | **TRTC Conversational AI** (STT + LLMConfig OpenAI-compatible + TTS; captions via custom messages) | The live Expert Onboarding Call: real-time captions and "rule extracted" chips. Today the demo uses a scripted transcript + recorded clips; TRTC is the production path. |
| **Hosting** | **EdgeOne Pages** (Next.js SSR, free HTTPS) with **Lighthouse** (Singapore) for a persistent backend | Deploy from CodeBuddy; Lighthouse if a long-lived Node backend (TRTC token service) is needed. |
| **Integration** | **iBMS** alarm feed, leak-detector telemetry, **CMMS** work orders, FM-agreement SLAs | Evidence sources. The pill references **Brick 1.5.0** classes (not vendor point IDs) and optional Haystack tags / COBie components, so any site whose BMS/CMMS can be tagged to Brick/Haystack can run the same pill. |

Sources for the Tencent mapping: `docs/research/research_tencent.md` (all pages fetched
2026-10-11). Items it flags as unverified (e.g. the exact WorkBuddy skill-file
discrepancy, custom Expert creation UI) are treated as **proposed**, not implemented.

---

## 11. Why more than a chatbot

| RAG chatbot / retrieval tool | MOSAIC Intelligence Pill |
|---|---|
| Retrieves text snippets | Evaluates structured rules against an evidence map |
| No deterministic gates | Gates **block** unsafe actions; an LLM cannot override them |
| No provenance | Every rule links to a transcript quote + timestamp |
| No tests | Evals replay past incidents; approval is blocked if evals regress |
| No versions | Semantic versioning, diff, one-click rollback |
| No owner | RACI: owner, steward, approver per pill |
| Cannot be rolled back | Version-controlled artefact; history is append-only |
| Model-coupled | Vendor-neutral plain text; identical decision across models |

The single frame that makes the difference visible: the orchestrator proposes
*"re-energise L23 AHU"*, a red gate refuses because **TS-07 (v1.2.0) requires LEW
sign-off and moisture < X**, and the refusal is traceable to a human sentence spoken at
00:14:32. That one frame demonstrates human-supervised, transparent, bounded and
accountable simultaneously.

---

## 12. Build process & CodeBuddy tips

### Build process

A two-tool build over five days (Sat 11 – Wed 15 Oct 2026), scope frozen on day 1 per
the red-team plan (`research_keppel_critique.md` §B4).

- **CodeBuddy Code — primary builder.** Application scaffold and routing; both
  Intelligence Pills; the deterministic engine (`lib/engine`); the mock data model
  (`data/`); and the UI screens. Models used: `hy4-preview`, `hy3`, `deepseek-v4.1-flash`.
- **Claude Code — planning, code review, and the governance/data/integration layers.**
  Architecture and scope planning; review of the engine's safety invariants; and
  `lib/governance`, the data loaders/schemas, and the cross-file consistency tests.

### CodeBuddy tips (for the video reflection)

1. **Start in Plan mode.** It writes a Markdown plan you can review before any file
   changes — and the plan file itself is durable proof of process.
2. **Freeze scope first, then build one closed loop.** Seven half-working screens lose to
   one working loop. The pill is the differentiator; the loop is the demo.
3. **Encode safety as tests, not comments.** The invariants (evidence cannot be faked
   open; `forbidden_if_missing_evidence` always wins; exceptions never relax a gate;
   separation of duties) are the artefacts a judge can run.
4. **Confine the LLM.** Route language work through the LLM and decisions through pure
   functions. This is what makes "model-agnostic" demonstrable rather than a slide.
5. **Record every LLM path as a fixture from day 1.** The demo then runs offline and
   never depends on the network on stage.
6. **Use sub-agents and skills for parallel work**, and commit the `.codebuddy/`
   artefacts (plans, skills) — inspectable proof of "built on CodeBuddy".
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

---

## 13. Submission checklist (TODO placeholders)

Replace each placeholder before submitting.

- [ ] **Project title:** MOSAIC ✔
- [ ] **Short blurb:** "Turn expert judgement into governed, versioned Intelligence Pills." ✔
- [ ] **Project Description:** this document ✔
- [ ] **CodeBuddy/WorkBuddy conversation history (≥3):** `docs/proof/*.png` ✔
- [ ] **Cover image (16:9, 380×216 recommended):** TODO — add and link here
- [ ] **Demo video (5–8 min):** TODO — `[VIDEO LINK]`
- [ ] **Live URL / demo link (optional, bonus):** https://mosaic-psi-rouge.vercel.app (demo: /incident/INC-2026-1011?step=10)
- [ ] **Source code (GitHub repository):** https://github.com/frederickemerson/mosaic (private — grant judges access)

### Open TODOs to resolve before submission

- [ ] Add the live deployment URL (EdgeOne Pages) and verify the demo path end-to-end.
- [ ] Publish the GitHub repository and paste the URL.
- [ ] Record the 5–8 min video (overview → core agent features → CodeBuddy reflection)
      and paste the link.
- [ ] Export the 16:9 cover image and paste it into the submission.
- [ ] Re-check the **[verify before slide]** figures in §6 against primary sources
      before quoting them on a slide.
