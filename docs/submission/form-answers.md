# Keystone · submission form answers

These answers are ready to paste into the submission form (https://tinyurl.com/TCHackathonSGProjectSubmission), in the form's field order (handbook §8). The longer version is in `docs/SUBMISSION.md`.

Before you submit, settle every **[verify before submitting]** flag. Either check the figure against its primary source or delete the line.

---

## Project title

```
Keystone
```

## Short blurb (hard limit: under 10 words)

```
Turn expert judgement into governed, versioned Intelligence Pills.
```

(8 words.)

---

## Project description

### 1. Project overview: target scenarios, users and value proposition

```
Challenge: Keppel · Real Estate Track · AI HARVEST: Turning Expert Know-How into Reusable Intelligence. Pill domains: Technical Services (primary) and Tenant Experience.

Target scenarios
• Capture: a retiring Chief Engineer's incident-response know-how, drawn out in a structured AI onboarding interview and turned into governed decision rules.
• Apply: a live chilled-water leak above a bank tenant in a Grade A office tower. The AI proposes restoring power. A deterministic safety gate (TS-07) blocks it and escalates to a named Licensed Electrical Worker.
• Learn: an operational outcome and an expert correction (isolation deadline 15 to 10 minutes) go through a version diff, an eval replay against past incidents, shadow mode, approval by a separate approver, and one-click rollback.
• Reuse: the same pill runs at a colocation data centre through asset overrides. The escalation goes to the Critical Facilities Manager and the notice becomes a client-SLA notice. The pill also installs unchanged as a native CodeBuddy skill.

Users
• The domain expert and pill owner: Tan Wei Ming, Chief Engineer, 18 years of M&E experience, retiring. He confirms, edits or rejects every extracted rule and corrects the rules later.
• The Asset Operations Manager and pill steward: Priya Nair. She supervises AI recommendations in the Incident Room, approves actions that need approval, escalates, and stewards new versions through shadow mode.
• Supporting roles (14 personas in data/roles.json): Head of Technical Services (approver of record), duty Licensed Electrical Worker, DC Critical Facilities Manager, Tenant Experience Manager, Technician, Executive and others.

Value proposition
Keystone compiles expert judgement into an Intelligence Pill: a plain-text, versioned, tested artefact with an owner and an approver. It outlives the expert, can be reused at every asset of the same type, has deterministic gates an LLM cannot talk past, proves itself against replayed past incidents before release, rolls back in one click, and stays the organisation's property rather than a vendor's.
```

### 2. Real-world scenario insights: pain points, target audience and core problems

```
Sources of the pain points
• The Keppel challenge brief: critical knowledge is concentrated in a few experts, new staff need significant time to build expertise, best practice is applied inconsistently, and knowledge is lost when people retire.
• Keppel Investor Day 2026 (Real Estate): "AI-driven predictive maintenance and smart building diagnostics cut downtime and costs."
• Keppel REIT SR24: each property has a dedicated team of property and facility managers, and the REIT has deployed water-leak detectors and isolation sub-valves. Our scenario uses these same mechanisms.
• Keppel's KAI narrative: "AI agents that think like experts … collaborate like digital co-workers". KAI is already multi-model.

Target audience
REIT managers and property/facility-management organisations running mixed portfolios of offices, data centres and logistics assets. We model the real structure: REIT manager → property/facility manager → FM contractor. The Asset Operations Manager sits at the manager layer and the Chief Engineer at the FM layer.

Core problems solved
• Knowledge concentrated in one expert → a CDM/ACTA interview extracts rules, each anchored to the transcript span it came from.
• Tacit knowledge that was never written down → incident-anchored probes and contradiction detection bring it out. For example, "always isolate the riser" against "isolate the sub-valve" became one distinguishing condition, rule TS-02.
• Inconsistent practice across assets → one governed pill with per-asset-type overrides, and a registry that shows coverage and gaps.
• Knowledge lost at retirement → a portable package owned by the organisation, independent of the person and of the model.
• AI that can't be trusted to act → deterministic gates, evidence preconditions, deny-by-default and escalation to a named human.
• Governance that exists only on a slide → evals, shadow mode, separation of duties, an audit log and rollback, all built and working.
```

### 3. Comprehensive solution design: business and technical architecture, and how prompts drive the AI

```
Business architecture (see docs/submission/solution-diagram.png)
Expert onboarding call → Decision Canvas (expert confirms) → Pill Registry (versions, owners, evals, shadow, health) → Incident Decision Room (the AOM supervises; gates block; named-human escalation) → Outcome & Learning (correction, diff, eval replay, shadow, approval, rollback) → back to the registry.
Each pill names its owner, steward and approver: Chief Engineer, Asset Operations Manager and Head of Technical Services. It is reviewed every 6 months, and also after any override, new asset type, regulatory change or eval regression.

The Intelligence Pill (the reusable unit)
pills/technical-services/chilled-water-leak/ contains SKILL.md (frontmatter with owner, steward, approver, version, access and boundaries), rules.yaml (13 rules: structured triggers, required evidence, action class recommend | requires_approval | must_escalate, forbidden actions, escalation target, deadline, asset overrides), evidence.yaml, provenance.json (every rule mapped to the expert's quote and timestamp, plus his confirmation), evals/ (6 replayed past incidents) and CHANGELOG.md. A second pill, tenant-experience/incident-comms, coordinates with it during the same incident.

Technical architecture
Next.js 15 (App Router, TypeScript), React 19 and Tailwind v4, deployed on Vercel.
• lib/engine: a deterministic rule engine in pure TypeScript with no LLM. evaluate(pill, asset, incident, evidence) returns actions, evidence coverage (a count, never a made-up percentage) and a trace. It also provides counterfactuals ("what would change the decision?") and runEvals(). Conditions are structured (eq, neq, gt, gte, lt, lte, in, exists); there is no eval() and no string expressions. Status precedence is not_applicable → blocked → escalate → needs_approval → allowed.
• lib/governance: semantic versions with a JSON diff and append-only rollback; approval with separation of duties and an eval-regression gate; role and sensitivity-based access with server-side redaction; an audit log.
• lib/auth: demo sign-in with a signed HTTP-only session. Each page reads the role from the verified session, and data above that role's clearance is masked on the server before it reaches the browser.
• lib/llm: CodeBuddy Agent SDK → Hunyuan hy4-preview, opt-in for live rule extraction and tenant-notice drafting. The TokenHub adapter is ready but waiting on account verification. Every screen falls back to recorded output.

How prompts drive the AI
The LLM does language work only. It never decides on a safety action.
1. Interviewer probes: a library of 31 probes drawn from the Critical Decision Method and ACTA ("walk me through the last time…", novice-error probes, coverage audit).
2. Rule extraction: a schema-constrained "scribe" prompt maps the expert's speech into the rules.yaml schema. Its output is always a DRAFT candidate that the expert must confirm.
3. Contradiction detection: compares pairs of statements and resolves conflicts with a distinguishing condition rather than dropping either one.
4. Tenant notice drafting: bounded composition under the Tenant Experience pill's hard rules. It may not state a cause before the cause is confirmed (TE-03), may not promise a completion time before isolation (TE-02), and must mask PII (TE-05). Unsupported prose fails closed. A named human approves the notice, and Keystone never sends it.
Because the decision path is deterministic, swapping the model cannot change a safety outcome.

Responsible AI
Every rule has an action class. Evidence counts only when it is confirmed and exactly true. A blocked gate outranks escalate and requires-approval. Exceptions can add required evidence but never remove it. Unknown actions are denied by default. The author of a version can't approve it. Rollback never deletes history. Keystone never actuates building systems: it recommends, drafts and escalates.
These invariants are executable: 500 automated tests (32 files, all passing), including adversarial and property-based tests (fast-check) on the engine and the governance layer.
The design aligns with the IMDA Model AI Governance Framework (2020 and the 2026 Agentic AI edition), AI Verify, ISO/IEC 42001 and the NIST AI RMF. The mapping is in docs/SUBMISSION.md §9.

Path to production on Tencent Cloud
Pills as CodeBuddy and WorkBuddy skills (CodeBuddy verified; WorkBuddy and ADP designed for but not yet tested). Hunyuan through the CodeBuddy SDK or TokenHub. ADP for governed skill distribution through its Approval Center. TRTC for the live voice interview. iBMS and CMMS as evidence feeds, through Brick 1.5 classes. EdgeOne Pages or Lighthouse for hosting. Enterprise SSO for roles.
```

### 4. Business value: measurable metrics or a clearly defined impact

```
The cost of the problem (sourced)
• Non-weather water damage is about 20% of all property insurance losses, the second-largest cause after fire (Chubb commercial brochure; secondary source).
• Commercial escape-of-water claims "reach seven figures" (Zurich UK Property Major Loss Team; secondary source).
• An average commercial water-damage loss is about US$89,000 (ATI Restoration whitepaper, 470k+ claims) [verify before submitting].
• Materials must be dry within 24 to 48 hours or remediation costs escalate (US EPA).
• 42% of institutional knowledge is unique to the employee's role, and 5.3 hours a week are lost waiting for or recreating information (Panopto 2018, n=1,000).
• Replacing an employee costs 0.5 to 2 times their annual salary (Gallup).
• About 40% of Singapore's Built Environment PMETs are aged 50+ (MND, 2022) [verify before submitting].
• Growth in FM talent "is not keeping pace" with demand (JTC, 18 Sep 2025).
• 54% (2025) and 57% (2026) of significant data-centre outages cost more than US$100k, and about 1 in 5 cost more than US$1M (Uptime Institute; secondary source).
• Grade A office rent is S$12.50 psf/month (CBRE Q2 2026), so a 10,000 sq ft floor is worth about S$125,000 a month (secondary source).

Illustrative value
Avoiding one switchroom flood, or keeping one anchor-tenant floor open, pays for the pilot. A two-week closure of one Grade A floor costs about S$58k in rent alone. The average commercial water loss is about US$89k [verify before submitting]. Most significant data-hall outages cost more than US$100k.

What Keystone measures (computed by the deterministic engine, so it can be audited)
Average time to isolate · downtime avoided (hours where the re-energisation gate blocked premature action) · replay agreement ("x of y assertions") · decisions awaiting approval · pills approved · eval pass rate and expert agreement per pill · pending corrections · override rate.

Keppel-anchored impact
Keppel's Technical Services goal is to "cut downtime and costs" (Investor Day 2026). Keystone's downtime-avoided metric is that goal in operational form. Keppel DC REIT reports about a 12% improvement in effective PUE on asset-enhanced colocation assets (AR2025). Keystone's data-centre overlay keeps the isolation and SLA logic that protects those gains.

Proposed pilot plan
For each pill, measure time to isolate, escalation latency, gate-block rate, override rate, eval agreement and rollback frequency. The goals are a measurable cut in time to isolate and in unplanned re-energisation risk, and new engineers making guided decisions with named escalation from day one instead of after months of shadowing a senior.
```

---

## CodeBuddy / WorkBuddy conversation history (minimum 3)

Upload these from `docs/proof/`:

| File | What it shows |
|---|---|
| `01a-codebuddy-plan-mode-hy4-subagents.png` | CodeBuddy Code in Plan mode on Hunyuan hy4-preview, with sub-agents |
| `01b-codebuddy-plan-clarifying-questions.png` | Plan-mode clarifying questions |
| `01c-codebuddy-plan-subagent-answered-questions.png` | A sub-agent answering the plan's questions |
| `02a-codebuddy-scaffold-permission-prompt.png` | Scaffolding, with a permission prompt |
| `02b-codebuddy-scaffold-tasks-smoke-test.png` | Scaffold task list and smoke test |
| `02c-codebuddy-scaffold-build-pass-7-routes.png` | Production build passing with 7 routes |
| `03a-codebuddy-hy4-learning-screen-build.png` | hy4-preview building the Learning screen |
| `04a-codebuddy-skill-invoked.png` | The pill installed as a CodeBuddy skill and invoked |
| `04b-codebuddy-skill-ts07-answer.png` | CodeBuddy reaching the same TS-07 decision as the engine |

Suggested caption:

```
Keystone was built mainly in CodeBuddy Code (Plan mode, sub-agents, models hy4-preview, hy3 and deepseek-v4.1-flash): scaffold, both Intelligence Pills, the deterministic engine, the mock data and the UI. Claude Code was used for planning, code review and the governance, data and integration layers. Screenshots 04a and 04b show the pill copied unchanged into .codebuddy/skills/, where CodeBuddy loaded it as a native skill and reached the same TS-07 decision as our engine: blocked, escalate to the duty LEW, quoting the Chief Engineer.
```

## Cover image (16:9, 380×216 recommended)

- Upload `docs/submission/cover-small.png` (380×216).
- If the form accepts a larger file, use `docs/submission/cover.png` (1520×864, the same image at 4×). It stays sharp on high-DPI showcase pages.
- The source is `docs/submission/cover.html`.

## Demo video (optional, 5 to 8 minutes)

```
[VIDEO LINK]: record from docs/submission/video-script.md (about 7:00)
```

## Project link (optional, earns bonus points)

```
https://mosaic-psi-rouge.vercel.app
Demo passcode: keystone (it is also shown on the sign-in page). Pick any persona. Each one sees what its role allows, enforced on the server.
Fastest path: sign in as Priya Nair (Asset Operations Manager), then go to /incident/INC-2026-1011?step=10 to see TS-07 block the AI.
All assets, people, tenants and incidents are fictional.
```

## Source code (GitHub)

```
https://github.com/frederickemerson/mosaic
```

The repository is private. Grant the judges access, or make it public, before submitting. [verify before submitting]

## Challenge-specific requirements

- **Solution diagram, covering the 8 required points:** `docs/submission/solution-diagram.png` (1920×1080, numbered 1 to 8), with the source in `docs/submission/solution-diagram.html`. The full write-up is in `docs/SUBMISSION.md` §7.
- **The 11 "Solution should be" properties:** `docs/SUBMISSION.md` §8.
- **Live demo walkthrough:** the video script above. For Demo Day, use the same path live.
- **Chosen case study, stated up front:** Keppel · AI HARVEST · Technical Services pill (chilled-water leak), with Tenant Experience as the coordinating pill.
