# MOSAIC — Build Spec (v1, 2026-10-11)

Keppel "AI HARVEST" track · Tencent Cloud AI CAN DO IT SG 2026 · **Submission: 16 Oct 2026**
Built with **CodeBuddy Code** (primary builder: scaffold, pills, engine, data, UI) and **Claude Code** (planning, code review, governance/data layers). Keep this attribution accurate in the submission write-up.
Research backing every decision: `docs/research/*.md`.

Blurb (<10 words): **Turn expert judgement into governed, versioned Intelligence Pills.**

## 1. The one story the demo tells

*The Chief Engineer is retiring. His judgement stays — governed.*

1. **Capture** — Chief Engineer's onboarding interview (transcript, CDM/ACTA probes) → AI extracts rule candidates, each linked to the exact transcript span → one scripted contradiction surfaced → expert confirms/edits/rejects each tile on the Decision Canvas → pill v1.2 published.
2. **Apply** — Chilled-water riser / AHU leak on L23 of a fictional Grade A office ("Harbourfront One", Green Mark Platinum SLE, bank anchor tenant). Evidence timeline (leak detector, iBMS alarm, tenant call, CMMS ticket). Orchestrator selects approved pills → deterministic gates → action chips: **Recommend / Requires approval / Must escalate**.
   - **Wow 1:** AI proposes "re-energise L23 AHU"; gate TS-07 blocks it: *LEW sign-off missing. Source: Chief Engineer interview 00:14:32.* AOM escalates to named human.
3. **Learn** — Outcome captured → expert correction → version diff v1.2→v1.3 → evals replay 6 past incidents (5 pass, 1 flagged) → steward approves → **one-click rollback**.
   - **Wow 2:** "How does it get smarter after deployment?" answered live, with receipts.
4. **Reuse** — Apply the same Technical Services pill to a colocation data centre profile ("Harbourfront DC1", PUE 1.32): tenant-message action disappears, client-SLA gate appears. Swap model (hy4-preview → deepseek) → identical decision because gates are deterministic.
   - **Wow 3:** portable, scalable, model-agnostic in 30 seconds.

## 2. Scope (frozen)

**Seven screens** (team commits to all seven): `/capture` (Expert Onboarding Call), `/canvas/[pillId]` (Decision Canvas), `/registry` (Pill Registry), `/` (Portfolio Pulse), `/incident/[id]` (Incident Decision Room), approval panel (inside incident room + `/approvals` queue), `/learning/[pillId]` (Outcome & Learning) + global role switcher + audit log drawer.
**Simulated voice call:** "incoming call" UI; AI interviewer speaks via TTS (Tencent TTS or browser speechSynthesis); expert side is pre-recorded audio clips (or live mic via Web Speech); live captions; rule tiles appear as the call progresses. Every rule keeps its audio timestamp → "Hear the expert" button replays the exact clip.
**Two pills:** `technical-services/chilled-water-leak`, `tenant-experience/incident-comms`. Safety = gates inside Technical Services.
**Cut:** LLM agents chatting to each other, real BMS integration, 3rd pill.

## 3. Architecture

```
Next.js 15 (App Router, TS) + Tailwind + shadcn/ui
├─ pills/                         ← SOURCE OF TRUTH, portable, plain text
│   └─ <domain>/<name>/
│       ├─ SKILL.md               agentskills/Anthropic/CodeBuddy-compatible (frontmatter: name, description, version, owner, steward, approver, scope, access)
│       ├─ rules.yaml             deterministic rules (schema §4)
│       ├─ provenance.json        rule_id → transcript spans + confirmation status
│       ├─ evals/*.yaml           replayed past incidents + expected decisions
│       └─ CHANGELOG.md
├─ lib/engine/                    pure TS, no LLM: evaluate(pill, asset, evidence) → decisions + trace; counterfactual(); runEvals()
├─ lib/llm/                       AI SDK 7, OpenAI-compatible provider → Tencent TokenHub (SG). Used ONLY for: rule extraction, follow-up probe generation, contradiction detection, tenant-message drafting, incident summary.
├─ lib/governance/                versions, jsondiffpatch diff + reverse (rollback), status Draft→Shadow→Approved→Retired, RACI, audit log, role/sensitivity policy
└─ data/                          mock assets (Brick class names), incidents, evidence timelines, transcript
```

Key decisions (and why):
- **Own rule engine over `rules.yaml`, not GoRules ZEN / not LLM.** The deterministic engine is MOSAIC's core IP: ~200 lines, trace + counterfactual for free, deploys anywhere (no native binary), and an LLM cannot talk its way past it. ZEN JDM export is a stretch goal.
- **LLM via Tencent TokenHub** (`https://tokenhub-intl.tencentcloudmaas.com/v1`, models `hy4-preview`, `deepseek-v4-pro`). Env: `TOKENHUB_API_KEY`, `MOSAIC_MODEL`. **Every LLM path has a recorded fallback** (`data/fixtures/llm/*.json`) so the live demo never depends on network.
- **State:** seed pills from files; runtime versions/audit in a client store (zustand + localStorage) with "Export pill (.zip)" and "Reset demo". Production path: Postgres `pill_version` table (diagram only).
- **Graph UI:** `@xyflow/react` + `@dagrejs/dagre`. **Diff:** `jsondiffpatch`.
- **Deploy:** EdgeOne Pages (Tencent) from CodeBuddy; Vercel fallback.

## 4. Rule schema (rules.yaml)

```yaml
- id: TS-07
  title: No re-energisation without LEW sign-off
  # Structured conditions only — no string expressions, no eval. op: eq | neq | gt | gte | lt | lte | in | exists
  trigger:
    incident_type: water_ingress
    all: [ { path: evidence.water_near_electrical, op: eq, value: true } ]
    any: []
  required_evidence: [ lew_signoff, insulation_resistance_ok, area_dry ]
  decision: Re-energise affected AHU / DB
  allowed_actions: [ "Keep circuit isolated", "Request LEW inspection" ]
  forbidden_actions: [ "Re-energise before LEW sign-off" ]
  exceptions: [ { when: [ { path: asset.type, op: eq, value: data_centre } ], note: "Critical facilities manager co-signs" } ]
  action_class: must_escalate        # recommend | requires_approval | must_escalate
  forbidden_if_missing_evidence: true
  escalate_to: { role: duty_lew, fallback: head_technical_services }
  owner: chief_engineer
  deadline_minutes: null
  asset_overrides: { data_centre: { escalate_to: { role: dc_critical_facilities_manager } } }
  asset_refs: [ "brick:Switchgear", "brick:Electrical_Room" ]
  sensitivity: internal               # public | internal | tenant_pii | commercial
  provenance: [ "ce-interview-2026-10-02#00:14:32" ]
```
Seed rules: `docs/research/research_domain.md` §2.5 (15 rules JSON). Probe library: §1.3 (31 probes JSON).

## 5. Engine contract

```ts
evaluate(pill, asset, evidence): {
  actions: { ruleId, decision, actionClass, status: 'allowed'|'blocked'|'needs_approval'|'escalate',
             missingEvidence: string[], owner, escalateTo, deadline, provenance, pillVersion }[],
  confidence: { requiredEvidence: number, confirmed: number },   // evidence coverage — NO LLM percentages
  trace: TraceStep[]
}
counterfactual(pill, asset, evidence, ruleId): { flipsTo, ifEvidence: string[] }   // "What would change the decision?"
runEvals(pill): { case, expected, actual, pass }[]
```

## 6. Responsible AI / governance (must be visible in UI)
- action_class chip on every action; nothing executes without a named human.
- Why drawer: evidence used, rule + version, transcript quote + timestamp, missing evidence, risk if ignored.
- Role switcher: Technician / Asset Ops Manager / Tenant Experience / Executive; tenant PII + lease terms masked by role.
- Audit log: who/when/pill version/action/outcome.
- Version gate: cannot approve if evals regress; Shadow badge ("4/4 agreements") before promotion.
- Framework mapping slide: IMDA MGF (incl. Agentic AI 2026), AI Verify, ISO/IEC 42001, NIST AI RMF (`research_domain.md` §3.8).

## 7. Day plan
- **D1 Sat 11 Oct** — scaffold, pill schema + 2 pills + evals, engine + unit tests. CodeBuddy screenshots ×3.
- **D2 Sun 12** — `/capture`: transcript player, extraction (LLM + fixture), contradiction, Decision Canvas, publish.
- **D3 Mon 13** — `/incident`: evidence timeline, gates, chips, Why drawer, counterfactual, approval/escalate, tenant message.
- **D4 Tue 14** — `/learning` + `/registry`: diff, evals, approve, rollback, shadow, DC overlay, roles, audit. Deploy.
- **D5 Wed 15** — diagram (8 points), video, description, cover, README, dry runs. **Submit by 16 Oct.**
