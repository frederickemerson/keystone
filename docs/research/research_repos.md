# MOSAIC — Reusable open-source repos for a 5-day build

Research date: 2026-10-11. Every repo below was verified live via the GitHub REST API (`gh api repos/<owner>/<repo>`): stars, last push date and license are what GitHub returned today. Package versions are from `npm view` / PyPI today. Architecture notes come from DeepWiki queries (where the repo is indexed), the repos' own READMEs/source trees, and official docs. Nothing here is invented; where a search found no suitable repo, that is stated.

Verdicts: **INTEGRATE** = install/fork and use the code · **BORROW-PATTERN** = copy the design/data model/prompt structure, not the code (licence or weight reasons) · **SKIP** = evaluated, not worth it for 5 days.

Effort = rough integration hours for one competent dev who has not used the library before.

---

## 1. Master table

### 1. AI interviewer / knowledge elicitation

| Repo | URL | Stars | Last push | License | What to reuse | Effort | Verdict |
|---|---|---|---|---|---|---|---|
| friedrichgeiecke/interviews ("Conversations at Scale", LSE) | https://github.com/friedrichgeiecke/interviews | 71 | 2026-02-09 | **PolyForm Noncommercial 1.0.0** (code), CC BY-NC 4.0 (docs) | Prompt architecture only: `config.py` = `INTERVIEW_OUTLINE` (parts with per-part question budgets + scripted part openers) + `GENERAL_INSTRUCTIONS` (non-leading, "collect palpable evidence", follow-up patterns) + `CODES` (`x7y8` end / `5j3k` problematic) + closing summary with respondent self-rating 1–4. Streamlit app `interview.py`, voice variant `full_voice_interview.py`; multi-provider (OpenAI/Anthropic/Google/Azure). | 2 h (re-write prompts in own words) | **BORROW-PATTERN** — non-commercial licence, do not copy code |
| StanfordHCI/genagents (Generative Agents of 1,000 people) | https://github.com/StanfordHCI/genagents | 617 | 2024-11-18 | MIT | Closest "interview → digital twin" pipeline. `environment/interview/interview.py` (interview script = list of question/duration pairs → `responses.json`), `genagents/modules/memory_stream.py` (`ConceptNode` observation/reflection + LLM importance score), `genagents/modules/interaction.py`, `simulation_engine/prompt_template/generative_agent/memory_stream/{importance_score,reflection}/*.txt`. Python 3.7+, OpenAI-only, stale. | 3 h to port the memory-stream/reflection prompts to TS | **BORROW-PATTERN** |
| cookiy-ai/user-research-skill | https://github.com/cookiy-ai/user-research-skill | 1,567 | 2026-08-19 | MIT | A SKILL.md bundle. Local parts need no Cookiy API: `references/qualitative-research-planner/qualitative-research-planner.md` (interview-guide generator: "Big Q / little q", Outcome-Verb rule, decision mapping, saturation at 8–12 interviews) and `references/synthesize-research-report/phases/phase1…phase5` (codebook template with definition / inclusion / exclusion / exemplar / frequency — maps 1:1 onto a rule-candidate record). Also a worked example of a plugin-packaged skill (`.claude-plugin/marketplace.json`). | 2 h | **INTEGRATE** (prompts/templates) |
| anthropics/skills → `skills/skill-creator` | https://github.com/anthropics/skills/tree/main/skills/skill-creator | 180,368 (repo) | 2026-10-09 | no repo-level LICENSE file (check per-skill) | Interview-driven capture loop: *Capture Intent → Interview and Research → Write SKILL.md → 2–3 test prompts in `evals/evals.json` → run → rewrite*. This is MOSAIC's capture→pill→validate loop already written down. Also progressive-disclosure rules (metadata / body <500 lines / references). | 1 h | **BORROW-PATTERN** |
| getzep/graphiti | https://github.com/getzep/graphiti | 31,630 | 2026-10-10 | Apache-2.0 | Provenance + contradiction model: `EntityEdge.episodes[]` (fact → source transcript chunk), bi-temporal `valid_at / invalid_at / created_at / expired_at`, `resolve_edge_contradictions()` in `graphiti_core/utils/maintenance/edge_operations.py`, extraction prompts in `graphiti_core/prompts/extract_edges.py`. Needs Neo4j/FalkorDB → too heavy to run; copy the schema into the pill rule record. | 2 h | **BORROW-PATTERN** |
| YuzeHao2023/DelhiLM | https://github.com/YuzeHao2023/DelhiLM | 113 | 2026-05-04 | MIT | LLM-based Delphi expert-elicitation pipeline (multi-expert rounds → consensus). Relevant if two experts disagree on a rule. Not deep-inspected. | 2 h | BORROW-PATTERN (optional) |
| vzhong/e3 (rule extraction from procedural text) | https://github.com/vzhong/e3 | 48 | 2023-07-22 | none | Research code, no licence. | — | **SKIP** |
| 567-labs/instructor (Py) / Vercel AI SDK `generateObject` (TS) | https://github.com/567-labs/instructor | 13,996 | 2026-10-10 | MIT | Structured extraction of rule records from transcript with schema validation + retries. In TS use AI SDK `generateObject` + zod instead. | 1 h | INTEGRATE (TS path via AI SDK) |

**Gap (honest):** there is no mature, permissively-licensed OSS "expert interview → structured decision rules" agent. SparkMe/AInterviewer/K-GRASP are papers without usable repos. MOSAIC has to assemble this from the pieces above — which is also why it is defensible as "more than a chatbot".

### 2. Voice agent stack for the onboarding call

| Repo | URL | Stars | Last push | License | What to reuse | Effort | Verdict |
|---|---|---|---|---|---|---|---|
| openai/openai-realtime-agents | https://github.com/openai/openai-realtime-agents | 6,996 | 2026-01-07 | MIT | **Fastest path to a browser voice interview (`npm i`, add `OPENAI_API_KEY`, `npm run dev`).** Next.js + WebRTC via ephemeral key. Lift: `src/app/api/session/route.ts`, `src/app/hooks/useRealtimeSession.ts`, `src/app/contexts/TranscriptContext.tsx`, `src/app/components/Transcript.tsx`, `src/app/components/Events.tsx`, `src/app/agentConfigs/chatSupervisor/{index.ts,supervisorAgent.ts}` (realtime "chat" agent talks; text "supervisor" model does tool calls / hard reasoning = our rule extractor), `src/app/agentConfigs/guardrails.ts`, `src/app/agentConfigs/voiceAgentMetaprompt.txt`. Built on `@openai/agents` (handoffs, `needsApproval`). | 4–6 h | **INTEGRATE** |
| livekit/agents + livekit-examples/agent-starter-react | https://github.com/livekit/agents · https://github.com/livekit-examples/agent-starter-react | 14,686 · 948 | 2026-10-10 · 2026-10-10 | Apache-2.0 · MIT | Vendor-neutral alternative: `lk agent init --template agent-starter-python`, `AgentSession(stt, llm, tts)` or realtime model; transcripts stream to the Next.js starter out of the box; official quickstart claims <10 min. Needs a LiveKit Cloud free account (self-host possible). Plugin model means Tencent TRTC ASR/TTS could be slotted in later. | 4–8 h | INTEGRATE (alternative if STT/TTS must be swappable) |
| pipecat-ai/pipecat | https://github.com/pipecat-ai/pipecat | 16,344 | 2026-10-11 | BSD-2-Clause | `SmallWebRTCTransport` (`src/pipecat/transports/smallwebrtc/transport.py`, aiortc, no Daily needed), runner serves prebuilt `/client` UI (`src/pipecat/runner/run.py`), custom `FrameProcessor` can tap `TranscriptionFrame` for a parallel extractor. Quickstart needs Deepgram + OpenAI + Cartesia keys. `pipecat-ai/pipecat-flows` (structured dialogues) is **archived 2026-07-05** — don't depend on it. | 6–10 h | BORROW-PATTERN / fallback |
| openai/openai-realtime-console | https://github.com/openai/openai-realtime-console | 3,615 | 2025-08-28 | MIT | Superseded by realtime-agents. | — | **SKIP** |

### 3. Rule / decision representation, deterministic gates, policy, guardrails

| Repo | URL | Stars | Last push | License | What to reuse | Effort | Verdict |
|---|---|---|---|---|---|---|---|
| gorules/zen (ZEN Engine) | https://github.com/gorules/zen | 2,054 | 2026-10-09 | MIT | **The pill's decision logic as portable JSON (JDM).** `npm i @gorules/zen-engine` (2.1.4) / `pip install zen-engine` (2.1.3), Rust core, same answers everywhere. JDM = `{nodes[], edges[]}`; `decisionTableNode.content = {hitPolicy:"first"|"collect", inputs[{field,id,name,type}], outputs[...], rules[{_id, <inputId>: "> 10", <outputId>: "..."}]}` (see `test-data/table.json`, `test-data/graphs/customer-service-escalation.json`). Result carries `trace` (`bindings/nodejs/dts-header.d.ts: trace?: PolicyTrace`) → "Why this action?". Engine ignores unknown top-level fields → we can embed provenance/owner metadata in the same file. | 4 h | **INTEGRATE** |
| gorules/jdm-editor | https://github.com/gorules/jdm-editor | 341 | 2026-05-13 | MIT | `@gorules/jdm-editor` 1.52.0: `<JdmConfigProvider><DecisionGraph value onChange disabled simulate panels=[GraphSimulator]/>`, plus `DecisionTable`, `CodeEditor`, `decisionModelSchema`. Read-only (`disabled`) graph + simulation highlighting = Decision Canvas / Why-drawer for free. **Caveat:** needs `@gorules/zen-engine-wasm` init and `Cross-Origin-Embedder-Policy: require-corp` + `Cross-Origin-Opener-Policy: same-origin` headers (set in `next.config` headers). | 4–6 h (WASM/Next.js friction) | **INTEGRATE** (fallback: render JDM with React Flow — JDM nodes already carry x/y positions) |
| CacheControl/json-rules-engine | https://github.com/CacheControl/json-rules-engine | 3,143 | 2026-02-16 | ISC | Zero-friction TS alternative (7.3.1): `all/any` conditions, facts, events, `almanac`. No visual editor, no trace graph. Use if jdm-editor WASM fights Next.js. | 2 h | INTEGRATE (plan B) |
| NVIDIA-NeMo/Guardrails | https://github.com/NVIDIA-NeMo/Guardrails | 7,272 | 2026-10-10 | Apache-2.0 | Only the result shape: `RailOutcome.allow(reason)` / `.block(reason, metadata)` / `.transform` and the input/output/execution-rail taxonomy. Colang 2 + Python runtime is too heavy for 5 days. | 1 h | **BORROW-PATTERN** |
| apache/casbin → node-casbin | https://github.com/casbin/node-casbin (redirects to apache/casbin-node-casbin) | 2,921 (node) · 20,441 (core) | 2026-10-09 | Apache-2.0 | Embedded RBAC-with-domains (`model.conf` + `policy.csv`), `casbin` 5.51.1. Roles × asset × sensitivity (`pill:tenant_experience, action:approve, sensitivity:restricted`). No sidecar. | 1–2 h | **INTEGRATE** |
| cerbos/cerbos | https://github.com/cerbos/cerbos | 4,618 | 2026-10-09 | Apache-2.0 | YAML resource policies, PDP container, decision audit log, JS/Py SDKs. Name it as the production path in the diagram; don't run it in 5 days. | (3 h if used) | BORROW-PATTERN |
| open-policy-agent/opa | https://github.com/open-policy-agent/opa | 12,340 | 2026-10-10 | Apache-2.0 | Rego learning curve not worth it for a demo. | — | SKIP |
| openfga/openfga | https://github.com/openfga/openfga | 5,946 | 2026-10-07 | Apache-2.0 | ReBAC; overkill here. | — | SKIP |
| guardrails-ai/guardrails | https://github.com/guardrails-ai/guardrails | 7,504 | 2026-10-09 | Apache-2.0 | Validator hub (Python). Zod schema validation on the TS side covers the need. | — | SKIP |
| invariantlabs-ai/invariant · protectai/llm-guard | — | 468 · 3,218 | 2026-01 · archived | Apache-2.0 · MIT | llm-guard is **archived**; invariant is niche. | — | SKIP |
| bpmn-io/dmn-js · camunda/dmn-scala | https://github.com/bpmn-io/dmn-js | 365 · 42 | 2026-10-10 | bpmn.io licence (attribution watermark) · Apache-2.0 | DMN is the standards answer; ZEN JDM is DMN-like and far lighter. Cite DMN in "credible path". | — | SKIP |
| data-privacy-stack/presidio (ex microsoft/presidio) | https://github.com/data-privacy-stack/presidio | 11,271 | 2026-10-09 | MIT | PII redaction of transcripts before storage/sharing (the "secure" criterion). Python sidecar; optional. | 2 h | BORROW-PATTERN / optional |

### 4. Portable "Intelligence Pill" packaging formats

| Repo | URL | Stars | Last push | License | What to reuse | Effort | Verdict |
|---|---|---|---|---|---|---|---|
| agentskills/agentskills (Agent Skills spec) | https://github.com/agentskills/agentskills (`docs/specification.mdx`) | 26,028 | 2026-08-09 | Apache-2.0 | **Make each pill a valid skill folder.** Frontmatter: `name` (≤64, kebab, = dir name), `description` (≤1024), optional `license`, `compatibility`, `metadata` (string→string map — put `version`, `owner`, `approval_status`, `pill_id` here), `allowed-tools` (experimental). Conventional dirs `scripts/`, `references/`, `assets/`. Adopted by 30+ tools incl. Claude Code, Codex, Cursor. | 2 h | **INTEGRATE** |
| vercel-labs/skills (`npx skills`) | https://github.com/vercel-labs/skills | 33,692 | 2026-10-09 | MIT | Demo portability: `npx skills add <repo>` installs the pill into Claude Code / Codex / Cursor etc. | 1 h | BORROW-PATTERN (demo) |
| modelcontextprotocol/typescript-sdk (+ spec) | https://github.com/modelcontextprotocol/typescript-sdk | 13,550 (spec 9,426) | 2026-10-08 | MIT → Apache-2.0 transition | `@modelcontextprotocol/sdk` 1.32.1: expose a pill as an MCP server (`pill://<id>/rules` resource, `evaluate_gate` tool). Proves any MCP host can consume the pill, not just our UI. | 3 h | **INTEGRATE** (day 4 stretch) |
| letta-ai/agent-file (.af) | https://github.com/letta-ai/agent-file | 1,204 | 2026-03-24 | Apache-2.0 | Fields to mirror in `pill.manifest.json`: system prompt, memory blocks, tools (schema + source), **tool_rules** (sequencing constraints = our allowed/forbidden actions), env vars; schema lives in `letta/serialize_schemas/pydantic_agent_schema.py`. | 1 h | BORROW-PATTERN |
| oracle/agent-spec (Open Agent Spec) | https://github.com/oracle/agent-spec | 440 | 2026-10-09 | Apache-2.0 | Declarative, framework-agnostic Agents + Flows in JSON/YAML (`pip install pyagentspec`). Cite as a vendor-neutral runtime target. | 1 h | BORROW-PATTERN |
| a2aproject/A2A | https://github.com/a2aproject/A2A | 26,102 | 2026-10-08 | Apache-2.0 | AgentCard JSON as the capability manifest for each specialist agent (skills, auth, endpoints). | 1 h | BORROW-PATTERN |
| anthropics/skills | https://github.com/anthropics/skills | 180,368 | 2026-10-09 | per-skill | Reference skills (`pdf`, `docx`, `mcp-builder`, `skill-creator`) to copy layout conventions. | — | BORROW-PATTERN |
| agntcy/oasf · agi-inc/agent-protocol · agentsmd/agents.md | — | 339 · 1,458 · 24,865 | 2026-10 · 2025-04 · 2026-09 | Apache-2.0 · MIT · MIT | OASF niche; agent-protocol stale; AGENTS.md is for coding agents. | — | SKIP |

### 5. Multi-agent orchestration with human approval gates

| Repo | URL | Stars | Last push | License | What to reuse | Effort | Verdict |
|---|---|---|---|---|---|---|---|
| vercel/ai (AI SDK) | https://github.com/vercel/ai | 27,233 | 2026-10-11 | Apache-2.0 | `ai` 7.0.137. **Approval gates built in:** `toolApproval: { isolate_power: 'user-approval' }` on `streamText`/`generateText`/`ToolLoopAgent`; UI parts carry `state: 'approval-requested' | 'approval-responded' | 'output-denied'` with `part.approval.{id,requestReason,isAutomatic}`; `useChat().addToolApprovalResponse({id, approved, reason})`; `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses`; `experimental_toolApprovalSecret` to stop client spoofing. Inter-agent messages: `createUIMessageStream` + `writer.write({type:'data-agent-msg', id, data})` (persistent or transient). Files: `packages/ai/src/ui/process-ui-message-stream.ts`, `packages/react/src/use-chat.ts`. Model-agnostic (OpenAI-compatible provider works for Hunyuan). | 6 h | **INTEGRATE (primary)** |
| openai/openai-agents-js | https://github.com/openai/openai-agents-js | 3,903 | 2026-10-10 | MIT | `@openai/agents` 0.20.0: `tool({needsApproval: true | async fn})`, `result.interruptions`, `result.state.approve(item,{alwaysApprove})/reject(item,{message})`, `run(agent, state)` to resume, `state.toString()` / `RunState.fromString(agent, s)` (schema v1.16) for durable approvals; handoffs; tracing. Files `packages/agents-core/src/{tool,runState,handoff,items}.ts`. Non-OpenAI models via `@openai/agents-extensions/ai-sdk` `AiSdkModel`. Already the runtime of realtime-agents. | 4 h | INTEGRATE (if you fork realtime-agents, you get this for free) |
| mastra-ai/mastra | https://github.com/mastra-ai/mastra | 28,694 | 2026-10-11 | Apache-2.0 (`ee/` dirs separate) | `@mastra/core` 1.75.0: `createStep({resumeSchema, suspendSchema, execute: ({suspend, resumeData}) => …})`, `run.resume({step, resumeData})`, snapshots in LibSQL/Postgres storage, Studio for observability. Heavier framework; worth it only if you want durable workflows + playground in one. | 6–8 h | INTEGRATE (alternative) |
| langchain-ai/langgraphjs · langchain-ai/langgraph | https://github.com/langchain-ai/langgraphjs | 3,344 · 43,034 | 2026-10-10 | MIT | `interrupt(payload)` (throws `GraphInterrupt`, `libs/langgraph-core/src/interrupt.ts`) + `new Command({resume})`, requires checkpointer (`MemorySaver` / `PostgresSaver` in `libs/checkpoint-postgres`), `thread_id`; node re-runs from top on resume (keep side effects after the interrupt). Best choice if the team is Python-first. | 6 h | INTEGRATE (alternative, Python teams) |
| CopilotKit/CopilotKit + ag-ui-protocol/ag-ui | https://github.com/CopilotKit/CopilotKit · https://github.com/ag-ui-protocol/ag-ui | 37,920 · 16,442 | 2026-10-10 | MIT | AG-UI event protocol (state deltas, tool calls, HITL `renderAndWaitForResponse`) if you want a standard wire format for the Decision Room feed. | 4 h | BORROW-PATTERN |
| evilmartians/agent-prism | https://github.com/evilmartians/agent-prism | 394 | 2026-10-08 | MIT | React trace viewer for "observable inter-agent messages": `npx degit evilmartians/agent-prism/packages/ui/src/components`, `npm i @evilmartians/agent-prism-data @evilmartians/agent-prism-types`; `TraceViewer`, `TraceList`, `TreeView`, `DetailsView`; `openTelemetrySpanAdapter.convertRawDocumentsToSpans()`. Alpha; React 19 + Tailwind 3. | 3 h | **INTEGRATE** (Why-drawer / trace tab) |
| langfuse/langfuse | https://github.com/langfuse/langfuse | 35,622 | 2026-10-11 | MIT core (`ee/` separate) | Free cloud tracing of every agent step; plus a ready-made **version/label model** (see §7). | 2 h | INTEGRATE (tracing) |
| TencentCloudADP/youtu-agent | https://github.com/TencentCloudADP/youtu-agent | 4,623 | 2026-03-21 | Tencent custom licence | Tencent's OSS agent framework (Python). Judges may like the logo; 7 months since last push and Python-only. Mention in "credible path", don't build on it. | — | BORROW-PATTERN (mention) |
| crewAIInc/crewAI · microsoft/autogen · microsoft/agent-framework · google/adk-python · pydantic/pydantic-ai · anthropics/claude-agent-sdk-* · humanlayer/humanlayer · inngest/agent-kit | — | 59k · 61k · 14k · 21.8k · 20.5k · 8.2k/1.8k · 11.7k · 942 | various | MIT / CC-BY-4.0 / MIT / Apache / MIT / MIT / Apache / Apache | All real and alive except autogen (docs-only since 2026-04, superseded by agent-framework) and humanlayer (pivoted to coding agents 2026-06). None adds approval gates beyond the four above. | — | SKIP for this build |

### 6. Incident command / ITSM / CMMS / facility management

| Repo | URL | Stars | Last push | License | What to reuse | Effort | Verdict |
|---|---|---|---|---|---|---|---|
| Netflix/dispatch | https://github.com/Netflix/dispatch | 6,488 | 2025-09-03 (**archived**) | Apache-2.0 | Best incident data model to port to Drizzle/Prisma: `src/dispatch/incident/models.py` (`status, visibility, reported_at, stable_at, closed_at`, FK to `incident_priority`, `incident_severity`, `incident_type`, `commander`, `reporter`, `tasks`, `events`, `workflow_instances`, `duplicates`); `src/dispatch/incident_role/models.py` (**auto-assign role by incident_type × priority × tags → service/individual, `engage_next_oncall`** = our "owner" logic); `src/dispatch/task/models.py` (`resolve_by` default deadline, `owner`, `assignees`, `priority`, `status`); `src/dispatch/participant_role/models.py` (`assumed_at/renounced_at`); `src/dispatch/event/models.py` (timeline). UI reference: `src/dispatch/static/dispatch/src/incident/{TimelineTab,TasksTab}.vue`. | 3 h | **BORROW-PATTERN** |
| PagerDuty/incident-response-docs | https://github.com/PagerDuty/incident-response-docs | 1,053 | 2026-07-02 | Apache-2.0 | Role definitions for the Human Approval Panel: `docs/training/{incident_commander,deputy,scribe,subject_matter_expert,customer_liaison,internal_liaison}.md`; `docs/before/severity_levels.md`; `docs/during/external_communication_guidelines.md` (→ tenant message draft rules); `docs/after/post_mortem_template.md` (→ Outcome & Learning screen). | 1 h | **BORROW-PATTERN** |
| Grashjs/cmms (Atlas CMMS) | https://github.com/Grashjs/cmms | 810 | 2026-10-05 | **AGPL-3.0** + commercial | Facility-management entity model (work order, asset, location, preventive maintenance, request, roles) and screens for Portfolio Pulse. Spring Boot + React/TS. AGPL → look, don't copy. | 1 h | BORROW-PATTERN |
| BrickSchema/Brick | https://github.com/BrickSchema/Brick | 406 | 2026-10-07 | BSD-3-Clause | Use real Brick classes in the mock evidence feed and pill triggers so the demo is BMS-vendor-neutral: `Leak_Alarm`, `Condensate_Leak_Alarm`, `Water_Level_Alarm`, `Max_Water_Level_Alarm`, `Min_Water_Level_Alarm`, `Collection_Basin_Water_Level_Alarm` (`bricksrc/alarm.py`); `Water_Leak_Sensor`, `Water_Level_Sensor` (`bricksrc/sensor.py`); `Leak_Detector_Equipment` (`bricksrc/equipment.py`); `Emergency_Power_Off_System_Activated_By_Leak_Detection_System_Status` (`bricksrc/status.py`). | 1 h | **BORROW-PATTERN** |
| google/digitalbuildings · Project-Haystack/haystack-defs | https://github.com/google/digitalbuildings · https://github.com/Project-Haystack/haystack-defs | 464 · 87 | 2026-09-29 · 2025-07-07 | Apache-2.0 · AFL-3.0 | Alternative ontologies; cite as interoperability targets. | — | SKIP (mention) |
| yun-dam/BrickQA (BuildSys'26 LLM over Brick graphs) | https://github.com/yun-dam/BrickQA | 1 | 2026-04-14 | none | No licence; tiny. | — | SKIP |
| monzo/response · grafana oncall (now grafana-cold-storage/oncall) · linkedin/oncall · keephq/keep · openstatusHQ/openstatus | — | 1,558 · 3,884 · 1,258 · 12,383 · 9,178 | 2024 · archived 2026-03 · 2025-08 · 2026-09 · 2026-10 | MIT · AGPL · BSD-2 · custom · AGPL | Stale, archived, or AIOps-alerting-shaped. | — | SKIP |
| frappe/erpnext · odoo/odoo (maintenance modules) | — | 39,986 · 54,964 | 2026-10-11 | GPL-3.0 · LGPL-3.0 | Far too heavy; copyleft. | — | SKIP |
| openMAINT | not on GitHub (SourceForge/tecnoteca) | — | — | — | Cannot be vendored. | — | SKIP |

**Gap (honest):** no mature OSS LLM agent for building operations exists; the only hits were ≤11-star student repos (e.g. `Aniketgarg04/Eco-Loop-Building-Agents`, `jscott3201/open-control-library`).

### 7. Versioned knowledge, diffs, approvals

| Repo | URL | Stars | Last push | License | What to reuse | Effort | Verdict |
|---|---|---|---|---|---|---|---|
| benjamine/jsondiffpatch | https://github.com/benjamine/jsondiffpatch | 5,347 | 2026-05-14 | MIT | `jsondiffpatch` 0.7.6: `diff(v1, v2)` delta, `formatters/html` (visual) + `formatters/annotated`, JSON Patch RFC 6902 export, `reverse()/unpatch()` → **rollback is a one-liner**. Perfect for the pill-version diff screen. | 2 h | **INTEGRATE** |
| kpdecker/jsdiff + Aeolun/react-diff-viewer-continued | https://github.com/kpdecker/jsdiff · https://github.com/Aeolun/react-diff-viewer-continued | 9,210 · 236 | 2026-10-07 · 2026-08-12 | BSD-3 · MIT | Side-by-side text diff for rule rationale / tenant message versions (`react-diff-viewer-continued` 4.4.0). The original `praneshr/react-diff-viewer` (1,666★) is unmaintained since 2024-03 — use "continued". | 1 h | **INTEGRATE** |
| langfuse/langfuse (prompt management) | https://github.com/langfuse/langfuse | 35,622 | 2026-10-11 | MIT core | Copy its governance model: every edit = new immutable version; labels `production` / `latest` / custom; **rollback = move the label** (`PATCH /api/public/v2/prompts/{name}/versions/{version}` with `newLabels`); versioned `config` JSON field; diff dialog `PromptVersionDiffDialogContent`. Code: `web/src/features/prompts/server/actions/{createPrompt,updatePrompts}.ts`, `packages/shared/src/server/services/PromptService/index.ts`. You could literally store a pill as a Langfuse prompt with `config` = JDM, but own-DB + same semantics is cleaner. | 2 h | BORROW-PATTERN (model) / INTEGRATE (tracing) |
| promptfoo/promptfoo | https://github.com/promptfoo/promptfoo | 25,879 | 2026-10-11 | MIT | Regression suite that must pass before a pill version is approved (incident fixtures → expected gate outcomes). Gives a concrete answer to "Reliable". | 3 h | INTEGRATE (day 4 stretch) |
| dolthub/dolt · terminusdb/terminusdb | https://github.com/dolthub/dolt · https://github.com/terminusdb/terminusdb | 24,614 · 3,436 | 2026-10-10 | Apache-2.0 | Git-for-data with branch/merge/diff SQL. Name as the enterprise path; too heavy for 5 days. | — | SKIP (mention) |
| sigstore/cosign | https://github.com/sigstore/cosign | 6,357 | 2026-10-08 | Apache-2.0 | Sign approved pill bundles (provenance + tamper-evidence) in the credible-path slide. | — | SKIP (mention) |
| pezzolabs/pezzo · Agenta-AI/agenta · rtfpessoa/diff2html | — | 3,278 · 4,827 · 3,418 | 2026-08 · 2026-10 · 2026-05 | Apache · custom · MIT | Redundant with the above. | — | SKIP |

### 8. Decision-graph / provenance visualisation

| Repo | URL | Stars | Last push | License | What to reuse | Effort | Verdict |
|---|---|---|---|---|---|---|---|
| xyflow/xyflow (React Flow) | https://github.com/xyflow/xyflow | 38,631 | 2026-10-09 | MIT | `@xyflow/react` 12.12.0. Render the pill's JDM graph (nodes already have `position.x/y`) and the incident decision graph; custom node types for evidence / rule / gate / action / escalation; highlight the traced path from ZEN's `trace`. | 4 h | **INTEGRATE** |
| dagrejs/dagre | https://github.com/dagrejs/dagre | 5,823 | 2026-08-08 | MIT | `@dagrejs/dagre` 3.1.1 auto-layout for generated decision graphs. (elkjs is EPL-2.0 — avoid.) | 1 h | **INTEGRATE** |
| evilmartians/agent-prism | see §5 | 394 | 2026-10-08 | MIT | Trace tree for "what did the agents say to each other". | 3 h | INTEGRATE |
| rjsf-team/react-jsonschema-form | https://github.com/rjsf-team/react-jsonschema-form | 15,914 | 2026-10-11 | Apache-2.0 | Auto-generate the rule-tile edit form from the pill rule JSON Schema (expert confirm/edit on Decision Canvas). | 2 h | INTEGRATE (optional) |
| shadcn-ui/ui | https://github.com/shadcn-ui/ui | 125,295 | 2026-10-10 | MIT | Base UI kit (+ its Recharts-based charts for Portfolio Pulse). | — | INTEGRATE |
| cytoscape/cytoscape.js · reaviz/reagraph · AykutSarac/jsoncrack.com | — | 11,236 · 1,095 · 44,473 | 2026-10 · 2026-06 · 2026-09 | MIT · Apache · Apache | React Flow covers it; jsoncrack is an app, not a lib. | — | SKIP |
| NikitaKharya09/agenttrace-ui · ucalyptus/tracegraph | — | 6 · 0 | 2026-04 · 2026-06 | MIT · none | Too small / unlicensed. | — | SKIP |
| Arize-ai/phoenix | https://github.com/Arize-ai/phoenix | 11,782 | 2026-10-11 | ELv2 | Licence; Langfuse covers tracing. | — | SKIP |

### 9. Closest overall analogues

Ranked by closeness to "expert know-how → governed, reusable agent capability":

1. **StanfordHCI/genagents** (MIT) — interview → agent with memory/reflection; the only end-to-end "digital twin from interview" code that is open.
2. **anthropics/skills → skill-creator** — interview → SKILL.md → evals → iterate; the capture-validate loop in text.
3. **friedrichgeiecke/interviews** (PolyForm NC) — best adaptive-interview prompt architecture; pattern only.
4. **cookiy-ai/user-research-skill** (MIT) — interview guide + 5-phase synthesis/codebook as a skill.
5. **getzep/graphiti** (Apache-2.0) — provenance + contradiction + bi-temporal validity model.
6. **letta-ai/agent-file** (Apache-2.0) — portable agent-state file with tool rules.
7. **gorules/zen** (MIT) — rules humans read, machines run, with trace and portable JSON.
8. **Netflix/dispatch** (Apache-2.0, archived) — incident/role/task/timeline model.
Building-ops specific: **BrickSchema/Brick** for vocabulary; nothing agentic worth reusing.

---

## 2. Deep dives — exactly what to lift (top 8)

### 2.1 gorules/zen + gorules/jdm-editor → the pill's decision logic and Decision Canvas
- Store each pill's rules as one JDM file: `inputNode(evidence, incident, roles)` → `decisionTableNode` per concern (hit policy `first`) → `switchNode` for recommend / require_approval / escalate → `outputNode`. Rule rows are `rules[{_id, <inputColId>: "evidence.power_isolated != true", <outputColId>: '"BLOCK"'}]`; keep `_id` stable so provenance (`transcript_segment_id`, `confirmed_by`, `confirmed_at`) can live in a sibling `provenance.json` keyed by `_id`. JDM ignores unknown top-level keys, so `{"nodes":[],"edges":[],"mosaic":{...}}` is also legal.
- Deterministic gate = decision table returning `{decision: ALLOW|REQUIRE_APPROVAL|BLOCK|ESCALATE, reason, missing_evidence[]}` (same shape as NeMo's `RailOutcome`). The LLM may *propose* an action; the gate is evaluated in code, never by the model.
- Node: `const decision = engine.createDecision(jdmJson); const r = await decision.evaluate(ctx, { trace: true })` → `r.trace` feeds the "Why this action?" drawer and the counterfactual ("What would change the decision?" = re-evaluate with a flipped evidence field and diff the trace).
- Templates: `test-data/table.json` (minimal), `test-data/graphs/customer-service-escalation.json` (escalation table), `test-data/graphs/care-team-assignment-system.json` (owner assignment).
- Canvas: `@gorules/jdm-editor` `DecisionGraph disabled` + `GraphSimulator` for the expert to step through; or render the same JDM in React Flow if WASM/COOP headers bite (Vercel supports custom headers via `next.config.js`).

### 2.2 openai/openai-realtime-agents → Expert Onboarding Call
- Fork; keep `api/session/route.ts` (ephemeral key), `useRealtimeSession.ts`, `TranscriptContext.tsx`, `Transcript.tsx`, `Events.tsx` (becomes the live transcript + event log panels of the Onboarding Call screen).
- Replace `agentConfigs/chatSupervisor`: chat agent = interviewer (instructions adapted from the §2.3 pattern); `supervisorAgent.ts` = text model that, every N turns, extracts rule candidates with a zod schema (`trigger, evidence, decision, allowed_action, forbidden_action, escalation, owner, outcome, confidence, transcript_span`) and returns clarifying questions for contradictions. Model-swappable via `@openai/agents-extensions/ai-sdk`.
- `agentConfigs/guardrails.ts` shows the output-guardrail hook pattern for the voice side.

### 2.3 friedrichgeiecke/interviews → interview prompt architecture (pattern only)
- Re-implement (do not copy) the structure: `INTERVIEW_OUTLINE` = ordered parts, each with a question budget and a scripted opener (e.g. Part I "walk me through the last water-ingress you handled", Part II "what evidence do you check before isolating power", Part III "when do you escalate and to whom", Summary = read-back + expert rates fidelity 1–4). `GENERAL_INSTRUCTIONS` = non-leading, ask for palpable evidence, one question at a time, forward momentum. `CODES` = exact tokens that end the interview or flag problematic content → deterministic front-end handling. The fidelity rating becomes the first provenance confirmation.

### 2.4 StanfordHCI/genagents → expert twin memory & reflection
- `memory_stream.py`: `ConceptNode{node_id, node_type: observation|reflection, content, importance}` with LLM importance scoring; `reflect(anchor)` retrieves related memories and writes higher-level reflections. Use as the design for "rule candidates" (observations) → "rules" (reflections) with links back to observations = provenance chain. Prompts to port: `simulation_engine/prompt_template/generative_agent/memory_stream/{importance_score,reflection}/singular_v1.txt`.

### 2.5 agentskills spec + letta .af → the Intelligence Pill bundle
```
pills/technical-services-water-ingress/
├── SKILL.md                 # agentskills frontmatter: name, description, license, compatibility,
│                            # metadata: {pill_id, version: "1.3.0", owner, approval_status, approved_by}
├── references/rules.jdm.json      # ZEN decision graph (portable, executable anywhere)
├── references/provenance.json     # rule _id → transcript segment, expert, confirmed_at, status
├── references/playbook.md         # human-readable SOP rendered from rules
├── pill.manifest.json             # .af-inspired: scope, allowed_actions, forbidden_actions,
│                                  # escalation_targets, tool_rules, required_evidence, sensitivity
└── scripts/evaluate.ts            # thin wrapper: zen-engine evaluate with trace
```
Portability demo: `npx skills add ./pills/...` into Claude Code or Codex; `mcp-server/` exposes `evaluate_gate` via `@modelcontextprotocol/sdk`. Vendor neutrality: JDM runs in Node/Python/Go/Java/.NET; SKILL.md is read by 30+ agent hosts; no model is baked in.

### 2.6 vercel/ai → approval gates + observable inter-agent messages
- Server: `streamText({ model, tools: { propose_action, isolate_power, draft_tenant_message }, toolApproval: { isolate_power: 'user-approval', draft_tenant_message: 'user-approval' }, experimental_toolApprovalSecret })`. Deterministic gate runs *before* approval is even requested: if ZEN says `BLOCK`, return `'denied'` with reason; if `REQUIRE_APPROVAL`, `'user-approval'`.
- Client: render `part.state === 'approval-requested'` as the Human Approval Panel card (`approve / reject with reason`), `addToolApprovalResponse({id, approved, reason})`, `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses`.
- Inter-agent feed: orchestrator calls specialist pills as sub-agents and writes `writer.write({type:'data-agent-msg', id, data:{from:'technical-services', to:'orchestrator', claim, evidence_ids, rule_ids}})` → Incident Decision Room timeline; the same events become OTel-ish spans for agent-prism.

### 2.7 Netflix/dispatch + PagerDuty docs → incident data model
- Tables to port: `incident(id, title, status[active|stable|closed], visibility, type, priority, severity, reported_at, stable_at, closed_at, commander_id, reporter_id)`, `incident_role(role, incident_type, priority, tags → individual/service, engage_next_oncall)`, `participant(individual, team, location)` + `participant_role(role, assumed_at, renounced_at)`, `task(description, owner, assignees, priority, status, resolve_by)`, `event(started_at, source, type, description)`.
- Roles for the Approval Panel: Incident Commander (= Asset Ops Manager), Deputy, Scribe (= our auto-logger), SME (= pill owners), Customer Liaison (= Tenant Experience). Severity table from `docs/before/severity_levels.md`; tenant comms rules from `docs/during/external_communication_guidelines.md`; outcome capture from `docs/after/post_mortem_template.md`.

### 2.8 jsondiffpatch + Langfuse label model → Outcome & Learning
- `pill_version(id, pill_id, semver, parent_version_id, jdm, manifest, provenance, status[draft|in_review|approved|retired], created_from_outcome_id, approved_by, approved_at)`; labels `production` / `candidate` as in Langfuse; rollback = move `production` to an older version (`updatePromptLabelsForApi` semantics).
- Diff screen: `jsondiffpatch.diff(v_prod.jdm, v_candidate.jdm)` → `formatters/html` for the structural view; `react-diff-viewer-continued` for `playbook.md`. Expert correction → new candidate version; promptfoo suite over incident fixtures must pass before `approved`.

---

## 3. Recommended concrete stack for the 5-day build (TypeScript-first)

**Why TS:** all eight INTEGRATE picks have first-class TS packages, one repo deploys to Vercel for the live-URL bonus, and realtime-agents is already Next.js. (Python-first teams: swap AI SDK → LangGraph `interrupt()` + `zen-engine` PyPI + LiveKit agents; everything else is unchanged.)

| Layer | Choice | Package / repo |
|---|---|---|
| App | Next.js 15 + shadcn/ui + Tailwind; Vercel deploy | shadcn-ui/ui |
| Voice capture | Fork openai/openai-realtime-agents, chat-supervisor pattern | `@openai/agents` 0.20.0 |
| Extraction | AI SDK `generateObject` + zod rule schema (any provider) | `ai` 7.0.137 |
| Interview design | Own prompts following interviews `config.py` structure + cookiy planner heuristics | — |
| Rules & gates | ZEN JDM per pill; `evaluate(ctx,{trace:true})` | `@gorules/zen-engine` 2.1.4 |
| Decision Canvas / Why-drawer | jdm-editor `DecisionGraph disabled` + `GraphSimulator`; fallback React Flow + dagre | `@gorules/jdm-editor` 1.52.0, `@xyflow/react` 12.12.0, `@dagrejs/dagre` 3.1.1 |
| Orchestration + HITL | AI SDK `toolApproval` + `addToolApprovalResponse`; custom data parts for inter-agent messages | `ai`, `@ai-sdk/react` |
| RBAC / sensitivity | node-casbin RBAC with domains (asset) | `casbin` 5.51.1 |
| Pill format | agentskills SKILL.md folder + `rules.jdm.json` + `provenance.json` + `pill.manifest.json`; optional MCP server | `@modelcontextprotocol/sdk` 1.32.1 |
| Versioning / diff | Postgres (Supabase/Neon) `pill_version` + labels; jsondiffpatch html; react-diff-viewer-continued | `jsondiffpatch` 0.7.6, `react-diff-viewer-continued` 4.4.0 |
| Incident model | Port Dispatch tables; PagerDuty roles; Brick class names in mock evidence | — |
| Observability | Langfuse cloud tracing; agent-prism TraceViewer tab | `@evilmartians/agent-prism-data/-types` + degit UI |
| Eval gate (stretch) | promptfoo suite over incident fixtures before approval | promptfoo |

**Day plan (≈ 70 h of integration across 1–3 people):**
- **D1 (12 h):** scaffold; pill JSON Schema + first `technical-services` JDM from the water-ingress scenario; ZEN evaluate API route with trace; casbin roles; Postgres schema (pill_version, incident, task, event). Take CodeBuddy screenshots as you go (3 required).
- **D2 (14 h):** fork realtime-agents → Onboarding Call screen with live transcript; supervisor extractor → rule candidates with transcript spans; contradiction check (LLM pairwise + hard checks on overlapping triggers); Decision Canvas (jdm-editor read-only or React Flow) with confirm/reject tiles writing `provenance.json`; export pill folder.
- **D3 (14 h):** Incident Decision Room: mock evidence feed (Brick-typed), orchestrator selects approved pills, specialist sub-agents post observable messages, ZEN gates block unsafe actions when evidence missing, AI SDK approval cards, owners/deadlines from Dispatch-style role table, tenant message draft (PagerDuty comms rules), Why-drawer from trace, counterfactual by re-evaluation.
- **D4 (14 h):** Outcome capture → expert correction → candidate version → jsondiffpatch diff → approve/rollback; Pill Registry + Portfolio Pulse (shadcn charts); `npx skills` install demo; MCP server (stretch); Langfuse tracing; promptfoo regression (stretch).
- **D5 (10 h):** polish, accessibility pass, solution diagram (8 points), demo script/video, deploy to Vercel, README + licence attributions, submit.

**Licence watch-list (do not vendor code from):** friedrichgeiecke/interviews (PolyForm Noncommercial), Grashjs/cmms (AGPL-3.0), bpmn-io/dmn-js (bpmn.io attribution licence), kieler/elkjs (EPL-2.0), Arize phoenix (ELv2), `ee/` directories of mastra-ai/mastra and langfuse/langfuse, TencentCloudADP/youtu-agent and Tencent/WeKnora (Tencent custom licence — read before use). Netflix/dispatch is archived (fine to borrow the model; don't depend on the package). pipecat-ai/pipecat-flows and protectai/llm-guard are archived.

**Honest gaps found by this research:** (1) no permissively-licensed OSS "expert elicitation → decision rules" agent exists — MOSAIC must compose it (genagents memory model + interviews prompt structure + cookiy codebook + ZEN rules); (2) no reusable OSS LLM agent for building operations — use Brick vocabulary and Dispatch/PagerDuty patterns instead; (3) DeepWiki had several of the above repos un-indexed or rate-limited today, so architecture notes for gorules/zen, jdm-editor, realtime-agents, livekit and agentskills come from their READMEs, source trees and official docs rather than DeepWiki.
