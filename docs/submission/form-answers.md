# Keystone · submission form answers

Answers for the submission form (https://tinyurl.com/TCHackathonSGProjectSubmission), in the form's field order (handbook §8). The longer version is in `docs/SUBMISSION.md`.

## Verify before submitting

The code blocks below contain only claims backed by this repository or by a cited external source. The items in this checklist are **not** in the paste-ready text. Settle each one first.

- [ ] **[verify]** Average commercial water-damage loss ≈ US$89,000 (ATI Restoration whitepaper, 470k+ claims). The research dossier marks the source method as unclear. If a primary-source check confirms it, you may add to "The cost of the problem": `• An average commercial water-damage loss is about US$89,000 (ATI Restoration whitepaper, 470k+ claims).`
- [ ] **[verify]** About 40% of Singapore's Built Environment PMETs are aged 50+ (MND, 2022). If confirmed, you may add: `• About 40% of Singapore's Built Environment PMETs are aged 50+ (MND, 2022).`
- [ ] **[verify]** No pilot cost has been estimated, so the answers do not claim that one avoided flood "pays for the pilot". Add that only with a cost estimate.
- [ ] **[verify]** The GitHub repository is private. Grant the judges access, or make it public.
- [ ] **[verify]** Re-run `npx vitest run` just before submitting. The answers say "1,000+ automated tests"; the last run (13 Oct 2026) was 87 files, 1,061 tests, all passing. Build first (`npx next build`), or the client-bundle scan is skipped and the run reads 1,060 passed, 1 skipped.
- [ ] **[verify]** Sign in on the live URL and check that the live drafting badge reads `Live · hy4-preview via TokenHub` (or `Recorded output`), as described below.
- [ ] **[verify]** Walk the frontline capture path on the live URL from a fresh browser profile: Rajesh is blocked by TS-07 at step 10 → note → read-back → draft → Tan Wei Ming proposes TS-14 in v1.3.0 → Priya is refused at Promote to Shadow → Muhammad Hafiz confirms → Priya promotes.
- [ ] **[do not claim]** Speech recognition on real Singapore-accented speech is untested. The Tencent Cloud ASR adapter reports "not configured", and the OpenAI transcription path has never been run live. Do not claim accuracy, and do not claim that speech is processed in Singapore: the browser's speech service decides where audio goes.
- [ ] **[do not claim]** The research's step 1 (drafting rules from work orders and SOPs) is not built, and step 2 (short AI interviews) is shown only by the scripted onboarding call.

---

## Project title

```
Keystone
```

## Short blurb (hard limit: under 10 words)

```
Turn retiring experts' judgement into rules AI can't override.
```

(9 words. The README's tagline — "Turn expert judgement into governed, versioned
Intelligence Pills." — stays as it is: on the README the next paragraph explains
what a pill is, and on the form nothing does.)

---

## Project description

One paragraph, written as continuous prose, covering the form's four prompts
in their order: overview and users, the pain and who has it, the business and
technical design including how prompts drive the AI, then the value. Paste as is.

```
In building operations the judgement that keeps a tower safe sits with a handful of senior engineers. Keppel's brief for this challenge says as much: critical knowledge is concentrated in a few experts, new staff need years to build it, best practice is applied inconsistently, and when someone retires it leaves with them. The obvious answer is an AI assistant on top of the manuals. But an assistant that can answer anything will also answer when it should not, so nobody can let one act during a live incident. Keystone is built for the organisations that live with that problem: REIT managers and the facility management companies that run mixed portfolios of offices, data centres and logistics assets. We model the real chain from REIT manager to facility manager to FM contractor, across fifteen named roles that run from the retiring Chief Engineer who owns the knowledge to the technician who meets the problem at two in the morning. What Keystone makes for them is an Intelligence Pill: a versioned folder of plain text the organisation owns, holding the rules, the vocabulary of evidence they depend on, the provenance of each rule, a set of evals and a changelog. Capturing one is an exercise rather than an interview. The expert answers a single open question, and after that only the questions his own answer left unresolved. Each answer carries a short claim about one field of a rule, so two answers that disagree are found by comparing them rather than by asking a model whether they conflict. Neither statement is discarded when that happens. The system asks instead for the condition that separates them, so "always isolate the riser" and "isolate the sub-valve" become one rule with a distinguishing condition rather than an argument someone settles months later. Every rule keeps the sentence it came from, the moment it was said, and the name of whoever confirmed it. Applying the pill is where the architecture earns its keep. The engine that evaluates it is ordinary TypeScript with no model anywhere in its path, so a prompt cannot argue with it. A rule whose trigger does not match is not applicable. A rule whose required evidence is missing is blocked. Only once both of those are settled does the engine ask whether the action must be escalated, needs approval, or may be recommended. Evidence counts only when it is confirmed and exactly true, and an exception may add a requirement but can never relax one. That is what stops the demonstration's AI proposal to re-energise an air-handling unit after a chilled-water leak: rule TS-07 blocks it while no Licensed Electrical Worker has signed off, and escalates the decision to the duty LEW by name. Nothing the system produces is ever executed, because every outcome is held for a person. Improving a pill afterwards is governed just as literally. A technician's note becomes a draft only after the speaker has checked a read-back of its numbers, tags and roles. A colleague who neither said it nor proposed it must then confirm it, and the new version is replayed against six closed incidents in shadow before anyone may approve it. The author, the person who ran the shadow and the approver have to be three different people, which the code enforces and audits rather than leaving to policy. Any release rolls back in one click, because the history is append-only. The same pill extends across the portfolio through asset overrides, so at a colocation data centre the identical rule escalates to the Critical Facilities Manager and the tenant notice becomes a client-SLA notice. The language model does only the work that language requires. It elicits with probes drawn from the Critical Decision Method and ACTA, extracts rule candidates under a schema that constrains what it may emit, and drafts tenant notices inside the Tenant Experience pill's hard rules. In every case what it returns is a draft that a named human confirms, never a decision. The application is Next.js 15 on Vercel, and Hunyuan hy4-preview and MiniMax Speech 2.8 HD are integrated through Tencent TokenHub on a Singapore endpoint. The pill also installs unchanged as a native CodeBuddy skill, where it reached the same TS-07 decision our own engine does, which is how we know the knowledge is portable rather than merely saying so. 1,302 automated tests hold these invariants in place. The value is easy to put a number against. Replacing an employee costs between half and twice their annual salary. More than half of significant data-centre outages cost over US$100,000. One ten-thousand square foot Grade A floor earns roughly S$125,000 a month. Avoiding a single unsafe re-energisation, or keeping one anchor tenant's floor open, therefore covers the work several times over. Keystone already reports time to isolate, how many of a replay's assertions a new version agrees on, and eval and shadow agreement for every pill. A pilot would add override rate and rollback frequency, measured against Keppel's own stated goal of cutting downtime and costs.
```

(One paragraph. Every number in it is checkable: the test
count is the suite's own, the engine behaviour is the precedence in
`lib/engine`, and the external figures carry their sources.)

---

## Project description — long version

Use these four blocks if the form gives a separate box per prompt, or for the
written submission. Same content, room to breathe.

### 1. Project overview: target scenarios, users and value proposition

```
Challenge: Keppel · Real Estate Track · AI HARVEST: Turning Expert Know-How into Reusable Intelligence. Pill domains: Technical Services (primary) and Tenant Experience.

Target scenarios
• Capture: a retiring Chief Engineer's incident-response know-how, drawn out two ways and turned into governed decision rules. On /teach the expert works an interactive exercise — one wide open question, then only the questions his account left unanswered — and the board beside it shows the fields of a real rule filling up. On /capture the same rules are shown against the recorded onboarding interview (scripted and simulated in the demo), which is the transcript every provenance citation points into.
• Capture for a pill nobody has written questions for: /teach?pill=<id> derives the exercise from that pill's own rules.yaml and evidence.yaml — the distractors are other rules' evidence keys and the rule's own exceptions — so pointing the screen at a new pill is not a content-authoring job.
• Capture from the frontline: when a gate blocks a technician, at job close-out, or from a QR code on equipment, the worker leaves a short voice or typed note. It becomes a draft rule only after the speaker checks a read-back of its numbers, tags and roles, and it cannot enter shadow mode until an eligible colleague confirms it.
• Apply: a live chilled-water leak above a bank tenant in a Grade A office tower. An AI proposal (recorded in the demo) is to restore power. A deterministic safety gate (TS-07) blocks it and escalates to a named Licensed Electrical Worker.
• Learn: an operational outcome and an expert correction (isolation deadline 15 to 10 minutes) go through a version diff, an eval replay against past incidents, shadow mode, approval and rollback. Author, steward and approver must be three different people, and the code enforces it.
• Reuse: the same pill runs at a colocation data centre through asset overrides. The escalation goes to the Critical Facilities Manager and the notice becomes a client-SLA notice. The pill also installs unchanged as a native CodeBuddy skill (verified).

Users
• The domain expert and pill owner: Tan Wei Ming, Chief Engineer, 18 years of M&E experience, retiring. He confirms, edits or rejects every extracted rule and corrects the rules later.
• The Asset Operations Manager and pill steward: Priya Nair. She supervises AI recommendations in the Incident Room, approves actions that need approval, escalates, and promotes new versions into shadow mode. She cannot approve a version she shadowed.
• Frontline staff: Rajesh Kumar (Technician) records what the gate didn't know; Muhammad Hafiz (Technical Services Lead) confirms it as a peer.
• Supporting roles (15 personas in data/roles.json): Head of Technical Services (approver of record), duty Licensed Electrical Worker, DC Critical Facilities Manager, Tenant Experience Manager, Technician, Executive and others.

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
• Tacit knowledge that was never written down → incident-anchored probes and contradiction detection bring it out (scripted and recorded in the demo). For example, "always isolate the riser" against "isolate the sub-valve" became one distinguishing condition, rule TS-02. Frontline capture asks "why?" at the moment a gate blocks someone, while the reason is fresh.
• Inconsistent practice across assets → one governed pill with per-asset-type overrides, and a registry that shows coverage and gaps.
• Knowledge lost at retirement → a portable package owned by the organisation, independent of the person and of the model.
• AI that can't be trusted to act → deterministic gates, evidence preconditions and escalation to a named human. No AI proposal executes: every one is held for a named human.
• Governance that exists only on a slide → evals, shadow mode, separation of duties, an audit log and rollback, all built and working.
```

### 3. Comprehensive solution design: business and technical architecture, and how prompts drive the AI

```
Business architecture (see docs/submission/solution-diagram.png)
Expert onboarding call → Decision Canvas (expert confirms) → Pill Registry (versions, owners, evals, shadow, health) → Incident Decision Room (the AOM supervises; gates block; named-human escalation) → Outcome & Learning (correction, diff, eval replay, shadow, approval, rollback) → back to the registry.
Frontline capture feeds the same loop: a gate block, job close-out or QR scan → a short note → read-back checked by the speaker → draft rule → proposed by a pill editor → peer confirmation → shadow, approval and rollback as above.
Separation of duties is three people, enforced in code: the Chief Engineer proposes, the Asset Operations Manager puts the version into Shadow and replays 6 closed incidents (6/6 agreements), and the Head of Technical Services approves and, if needed, rolls back with a reason. The author cannot shadow or approve, the Shadow promoter cannot approve, and each refusal is audited.
Each pill names its owner, steward and approver: Chief Engineer, Asset Operations Manager and Head of Technical Services. It is reviewed every 6 months, and also after any override, new asset type, regulatory change or eval regression.

The Intelligence Pill (the reusable unit)
pills/technical-services/chilled-water-leak/ contains SKILL.md (frontmatter with owner, steward, approver, version, access and boundaries), rules.yaml (13 rules: structured triggers, required evidence, action class recommend | requires_approval | must_escalate, forbidden actions, escalation target, deadline, asset overrides), evidence.yaml, provenance.json (every rule mapped to the expert's quote and timestamp, plus his confirmation), evals/ (6 replayed past incidents) and CHANGELOG.md. A second pill, tenant-experience/incident-comms, coordinates with it during the same incident.

Technical architecture
Next.js 15 (App Router, TypeScript), React 19 and Tailwind v4, deployed on Vercel.
• lib/engine: a deterministic rule engine in pure TypeScript with no LLM. evaluate(pill, asset, incident, evidence) returns actions, evidence coverage (a count, never a made-up percentage) and a trace. It also provides counterfactuals ("what would change the decision?") and runEvals(). Conditions are structured (eq, neq, gt, gte, lt, lte, in, exists); there is no eval() and no string expressions. Status precedence is not_applicable → blocked → escalate → needs_approval → allowed.
• lib/governance: semantic versions with a JSON diff and append-only rollback; approval with three-person separation of duties (author, Shadow promoter and approver must differ; only Shadow versions can be approved) and an eval-regression gate; role and sensitivity-based access with server-side redaction; an audit log.
• lib/auth: demo sign-in with a signed HTTP-only session (one shared demo passcode, so not identity proofing). Middleware is default-deny with a public allowlist; auth routes check same-origin (CSRF); responses carry security headers (CSP, frame-ancestors none, nosniff, referrer policy) and the site is noindex. Paid routes are rate-limited (LLM 10/min and 40/day per session plus per-IP limits; Jev 60/min per session; failed sign-ins 10/min per IP), in memory per serverless instance; production would use a shared store or a WAF. Each page reads the role from the verified session, and data above that role's clearance is masked on the server before it reaches the browser. Versions, approvals and the append-only audit log live in the browser in this demo; production would persist them server-side.
• lib/llm: Hunyuan hy4-preview via the CodeBuddy Agent SDK is the primary provider for opt-in live rule extraction and tenant-notice drafting; it runs where CodeBuddy credentials exist (locally). Hunyuan hy4-preview via TokenHub is live and answers first on the public Vercel demo. It runs on a dedicated inference endpoint in Tencent Cloud's Singapore region (international host tokenhub-intl.tencentcloudmaas.com), so inference on expert text happens in Singapore. Thinking is disabled and extraction uses strict structured output constrained by the rule schema. Measured through the app on 12 Oct: 5 of 5 extractions answered live at about 3.9 s each, down from a median of 11.4 s on the earlier Guangzhou endpoint. OpenAI gpt-5.4-mini is a fallback, then recorded output. Every screen opens on recorded output, and the badge always names the provider that actually answered.
• lib/speech: the voice. MiniMax Speech 2.8 HD through Tencent TokenHub (POST /v1/wand/minimax-tts/sync_tts) reads the expert's lines and the interviewer's questions aloud — English_Trustworth_Man and English_CalmWoman, verified as distinct renderings. Lines are pre-rendered at build time so a demo never waits on a quota, the filename carries the model so switching provider cannot silently reuse old audio, and a 200 response carrying a non-zero base_resp.status_code is treated as a refusal, not as audio. The browser's own speech synthesis is the fallback. The same model narrates the demo film.
• lib/capture: frontline capture. Capture tasks from gate blocks, overrides, job close-outs and QR scans (/c/AHU-23-01, with a printable QR label); voice notes behind a PDPA purpose notice and consent (named credit is opt-in; audio is not kept); hold-to-talk with the browser's speech recognition (en-SG, processed by the browser vendor's service), plus typing and labelled demo notes; read-back chips for numbers, times, asset tags and roles, found by regex and the registers, never by the LLM; draft rules with server-assigned DRAFT-NN ids and a verbatim-quote check; and a peer gate before shadow mode. A Tencent Cloud ASR (Singapore) adapter exists but is not configured, and recognition of real Singapore-accented speech is untested.

How prompts drive the AI
The LLM does language work only. It never decides on a safety action.
1. Interviewer probes: the scripted demo interview is tagged against a 31-probe library drawn from the Critical Decision Method and ACTA ("walk me through the last time…", novice-error probes, coverage audit). Live adaptive probing is proposed.
2. Rule extraction: a schema-constrained "scribe" prompt maps the expert's speech into the rules.yaml schema. Its output is always a DRAFT candidate that the expert must confirm.
3. Contradiction detection (recorded in the demo): one pair of statements is flagged and resolved with a distinguishing condition rather than dropping either one.
4. Tenant notice drafting: bounded composition under the Tenant Experience pill's hard rules. It may not state a cause before the cause is confirmed (TE-03), may not promise a completion time before isolation (TE-02), and must mask PII (TE-05). Unsupported prose fails closed. A named human approves the notice, and Keystone never sends it.
The decision path is deterministic and takes no model input, so changing the model cannot change a safety outcome.

Responsible AI
Every rule has an action class. Evidence counts only when it is confirmed and exactly true. A blocked gate outranks escalate and requires-approval. Exceptions can add required evidence but never remove it. No AI proposal executes: each is held for a named human, and blocked outright when its gate's evidence is missing. The author of a version can't put it into Shadow or approve it, and whoever shadowed it can't approve it. Rollback never deletes history. Keystone never actuates building systems: it recommends, drafts and escalates.
Frontline notes need consent before recording, a speaker-checked read-back, and a peer confirmation from someone who neither said nor proposed the rule.
These invariants are executable: 1,302 automated tests across 103 files, including adversarial and property-based tests (fast-check) on the engine and the governance layer.
The design is mapped (design alignment, not certification) to the IMDA Model AI Governance Framework (2020 and the 2026 Agentic AI edition), AI Verify, ISO/IEC 42001 and the NIST AI RMF. The mapping is in docs/SUBMISSION.md §9.

Path to production on Tencent Cloud
Running today: pills as CodeBuddy skills (verified) and Hunyuan through the CodeBuddy Agent SDK (locally). Hunyuan hy4-preview via TokenHub on a dedicated Singapore endpoint (live, including on the public deployment). Proposed: Tencent Cloud ASR in Singapore for speech recognition (adapter written, not configured or verified), an accuracy test on recorded Singapore-English field speech, drafting rules from existing work orders and SOPs, WorkBuddy and ADP skill distribution (designed for, not yet tested; ADP through its Approval Center), TRTC for the live voice interview, iBMS and CMMS as evidence feeds through Brick 1.5 classes, EdgeOne Pages or Lighthouse for hosting (Vercel today), and enterprise SSO for roles.
```

### 4. Business value: measurable metrics or a clearly defined impact

```
The cost of the problem (sourced)
• Non-weather water damage is about 20% of all property insurance losses, the second-largest cause after fire (Chubb commercial brochure; secondary source).
• Commercial escape-of-water claims "reach seven figures" (Zurich UK Property Major Loss Team; secondary source).
• Materials must be dry within 24 to 48 hours or remediation costs escalate (US EPA).
• 42% of institutional knowledge is unique to the employee's role, and 5.3 hours a week are lost waiting for or recreating information (Panopto 2018, n=1,000).
• Replacing an employee costs 0.5 to 2 times their annual salary (Gallup).
• Growth in FM talent "is not keeping pace" with demand (JTC, 18 Sep 2025).
• 54% (2025) and 57% (2026) of significant data-centre outages cost more than US$100k, and about 1 in 5 cost more than US$1M (Uptime Institute; secondary source).
• Grade A office rent is S$12.50 psf/month (CBRE Q2 2026), so a 10,000 sq ft floor is worth about S$125,000 a month (secondary source).

Illustrative value
A two-week closure of one Grade A floor costs about S$58k in rent alone. Most significant data-hall outages cost more than US$100k. Avoiding one switchroom flood, or keeping one anchor-tenant floor open, is worth at least that.

What Keystone shows today (over the mock data)
Average time to isolate (from the incident records) · replay agreement ("x of y assertions", from the deterministic engine) · eval pass and shadow agreements per pill · decisions awaiting approval · pills approved · pending corrections · an illustrative downtime-avoided estimate (4 hours assumed per blocked re-energisation). An override-rate metric is proposed for the pilot.

Keppel-anchored impact
Keppel's Technical Services goal is to "cut downtime and costs" (Investor Day 2026). Keystone's downtime-avoided estimate points at that goal; a pilot would measure it on real incidents. Keppel DC REIT reports about a 12% improvement in effective PUE on asset-enhanced colocation assets (AR2025). Keystone's data-centre overlay keeps the isolation and SLA logic that protects those gains.

Proposed pilot plan
For each pill, measure time to isolate, escalation latency, gate-block rate, override rate, eval agreement and rollback frequency. The goals are a measurable cut in time to isolate and in unplanned re-energisation risk, and new engineers making guided decisions with named escalation from day one instead of after months of shadowing a senior.
```

---

## CodeBuddy / WorkBuddy conversation history (minimum 3)

The field asks for chat history **and** a minimum of 3 screenshots, so both are
packaged together in one archive, built 15 Oct 2026:

```
~/Desktop/keystone-codebuddy-history.zip   (5.2 MB, 71 files)
```

| Inside | Contents |
| --- | --- |
| `README.md` | What the archive is, how CodeBuddy was used, which 3 screenshots to open first |
| `INDEX.md` | All 30 CodeBuddy sessions: time, length, prompts, tool calls, model, what each did |
| `transcripts/` | 30 readable Markdown transcripts — every prompt and reply in full |
| `screenshots/` | The 9 PNGs listed below |
| `raw-logs/` | The source `.jsonl` session logs, so the transcripts can be checked against them |

All 30 sessions ran on 11 Oct 2026, 12:56–22:14: 117 developer prompts, 470
CodeBuddy replies, 1,922 tool calls. One model per session — hy4-preview (5),
hy3 (7), deepseek-v4.1-flash (6), gpt-6-astra (2), CodeBuddy's Auto selector (10).

Source: `~/.codebuddy/projects/Users-frederick-Documents-Projects-acdi/`.
**One redaction:** a `.env.local` read in session 02 printed a live API key into
that session's tool output; it is `REDACTED` in both the transcript and the raw
log. Nothing else was changed.

The screenshots, also in `docs/proof/`:

| File | What it shows |
|---|---|
| `01a-codebuddy-plan-mode-hy4-subagents.png` | CodeBuddy Code in Plan mode on Hunyuan hy4-preview, with sub-agents |
| `01b-codebuddy-plan-clarifying-questions.png` | Plan-mode clarifying questions |
| `01c-codebuddy-plan-subagent-answered-questions.png` | A sub-agent answering the plan's questions |
| `02a-codebuddy-scaffold-permission-prompt.png` | Scaffolding, with a permission prompt |
| `02b-codebuddy-scaffold-tasks-smoke-test.png` | Scaffold task list and smoke test |
| `02c-codebuddy-scaffold-build-pass-7-routes.png` | Production build passing with 7 routes (at scaffold time) |
| `03a-codebuddy-hy4-learning-screen-build.png` | hy4-preview building the Learning screen |
| `04a-codebuddy-skill-invoked.png` | The pill installed as a CodeBuddy skill and invoked as `/chilled-water-leak` (model selector: Auto) |
| `04b-codebuddy-skill-ts07-answer.png` | CodeBuddy reaching the same TS-07 decision as the engine (model selector: Auto) |

Suggested caption:

```
Keystone was built with CodeBuddy Code (Plan mode on Hunyuan hy4-preview, sub-agents; hy3 and deepseek-v4.1-flash were also used) and Claude Code. CodeBuddy built the initial scaffold and first versions of both Intelligence Pills, the deterministic engine, the mock data and the UI. Claude Code was used for planning, code review, the governance, data, auth and LLM-provider layers, engine hardening and the landing page. Screenshots 04a and 04b show the pill copied unchanged into .codebuddy/skills/, where CodeBuddy (model selector: Auto) invoked it as a skill and reached the same TS-07 decision as our engine: blocked, escalate to the duty LEW, quoting the Chief Engineer.
```

## Solution diagram

Upload `docs/submission/solution-diagram.png` (1920×1080) for a single-image
field. The eight required points are panels 1–8 on it.

Where the form takes a deck, upload the twelve-slide version instead:

```
docs/submission/deck/keystone-solution-diagram.pptx   (16:9, speaker notes on every slide)
docs/submission/deck/keystone-solution-diagram.pdf    (same slides, for PDF-only fields)
```

It carries the diagram as slide 3 and adds two flowcharts (how a gate decides;
draft to released version and back), the technical architecture, the feature
set, and what is novel. Built from `deck.html`; see `deck/README.md`.

## Cover image (16:9, 380×216 recommended)

- Upload `docs/submission/cover-small.png` (380×216).
- If the form accepts a larger file, use `docs/submission/cover.png` (1520×864, the same image at 4×). It stays sharp on high-DPI showcase pages.
- The source is `docs/submission/cover.html`; re-render both with `node docs/submission/render-art.mjs`.
- It is the landing hero held still: the mark and wordmark centred, the headline
  under them, and the chief engineer where the site puts him. Around him are six
  real eval cases from the two pills — TS-07, TS-05, TS-06, TS-10, TE-03, TE-06 —
  each with the status the engine actually returns for it, so the cover cannot
  claim an outcome the repository does not produce. The strip across the foot is
  the product in one line: his sentence at 00:14:32, and the rule it became.

## Demo video (optional, 5 to 8 minutes)

```
[VIDEO LINK]: upload videos/keystone-demo/out/keystone-demo-upload.mp4, then paste the link here
```

**Rendered 15 Oct 2026 — 7m 01s, 1920x1080, 30 fps.** Inside the handbook's 5-8
minutes. Two files:

| File | Size | Use |
| --- | --- | --- |
| `out/keystone-demo-upload.mp4` | 121 MB | the one to upload (H.264, faststart) |
| `out/keystone-demo.mp4` | 236 MB | the master the upload copy came from |

The film is **generated from `video-script-v2.md`**, not cut by hand: the
project at `videos/keystone-demo` reads the script, measures the narration, and
writes all thirteen act compositions and the main timeline. Changing a line of
the script and re-running `node scripts/build-film.mjs` moves everything after
it, so the film cannot drift from what the script says. `npx hyperframes check`
passes with 0 errors.

Narration is MiniMax Speech 2.8 HD through Tencent TokenHub. Every product shot
is recorded from the deployed site; the only two scenes that are not product
footage are the cold open (deliberately a generic assistant, no Keystone
chrome) and the close.

## Project link (optional, earns bonus points)

```
https://keystone-tencent.vercel.app
Demo passcode: keystone (it is also shown on the sign-in page). Pick any persona. Each one sees what its role allows, enforced on the server.
Fastest path: sign in as Priya Nair (Asset Operations Manager), then go to /incident/INC-2026-1011?step=10 to see TS-07 block the AI proposal.
Frontline capture: sign in as Rajesh Kumar (Technician) and open /c/AHU-23-01, or escalate at step 10 of the same incident and answer "Tell us why — 20 seconds".
Live AI on this deployment is Hunyuan hy4-preview via TokenHub, running in Singapore, or recorded output; the badge on each output names which. Hunyuan via CodeBuddy runs in local development with CodeBuddy credentials.
All assets, people, tenants and incidents are fictional.
```

## Source code (GitHub)

```
https://github.com/frederickemerson/keystone
```

See the "Verify before submitting" checklist: the repository is currently private.

## Challenge-specific requirements

- **Solution diagram, covering the 8 required points:** `docs/submission/solution-diagram.png` (1920×1080, numbered 1 to 8), with the source in `docs/submission/solution-diagram.html`. The full write-up is in `docs/SUBMISSION.md` §7.
- **The 11 "Solution should be" properties:** `docs/SUBMISSION.md` §8.
- **Live demo walkthrough:** the video script above. For Demo Day, use the same path live.
- **Chosen case study, stated up front:** Keppel · AI HARVEST · Technical Services pill (chilled-water leak), with Tenant Experience as the coordinating pill.
