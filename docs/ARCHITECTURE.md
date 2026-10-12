# Keystone — Architecture

Two views:

1. **The eight required diagram points** (`§1`) — capture → pill compile → registry /
   governance → incident command → learning loop → multi-asset.
2. **Component & data flow** (`§2`) — how the deterministic engine, the LLM boundary,
   the governance layer and the mock data fit together.

Implemented today: the deterministic engine, both pills, the governance layer, the data
model, the landing page, demo sign-in with a signed server session and server-side
redaction, and all seven app screens. The opt-in LLM path runs Hunyuan via the CodeBuddy
Agent SDK where CodeBuddy credentials exist (local); the public Vercel deployment falls
back to OpenAI gpt-5.4-mini; the TokenHub adapter is built but has not answered live.
Proposed / production-only: live BMS/iBMS/DCIM integration, the TRTC live voice call,
a server-side (e.g. Postgres) governance store, enterprise SSO, and the EdgeOne
deployment.

---

## 1. The eight required diagram points

```mermaid
flowchart TD
    subgraph P2["② Whose expertise · how undocumented knowledge is obtained"]
        EXP["Retiring Chief Engineer<br/>(Tan Wei Ming · 18 yrs M&E)"]
        IV["Expert Onboarding Call (scripted in demo)<br/>CDM + ACTA probes ·<br/>contradiction probe · coverage audit"]
        EXP -->|"speaks, is probed"| IV
    end

    subgraph P3["③ How it becomes reusable"]
        EXT["Schema-constrained extraction<br/>rule candidates + transcript span"]
        CAN["Decision Canvas<br/>expert confirms / edits / rejects"]
        PILL["Intelligence Pill (plain text)<br/>SKILL.md · rules.yaml · evidence.yaml<br/>provenance.json · evals/ · CHANGELOG.md"]
        IV --> EXT --> CAN --> PILL
    end

    subgraph P4["④ Registry · governance"]
        REG["Pill Registry<br/>versions · owner / steward / approver ·<br/>evals · shadow badge · coverage"]
        GOV["Governance<br/>Draft→Shadow→Approved→Retired ·<br/>diff · separation of duties · audit log"]
        PILL --> REG --> GOV
    end

    subgraph P5["⑤ Incident command — AOM uses, supervises, verifies, escalates"]
        EVID["Evidence feed (mock)<br/>iBMS alarm · leak detector ·<br/>tenant call · CMMS ticket"]
        ENG["Deterministic engine<br/>evaluate() → Recommend /<br/>Requires approval / Must escalate"]
        WHY["Why drawer + Hear the expert (TTS of quote)<br/>evidence · rule + version · quote + timestamp"]
        HUMAN["Named human<br/>approve / escalate"]
        EVID --> ENG --> WHY --> HUMAN
    end

    GOV -->|"approved pill applied"| ENG

    subgraph P6["⑥ Learning loop — reviewed, validated, versioned, approved"]
        OUT["Capture outcome"]
        COR["Expert correction"]
        DIFF["Diff v1.2.0 → v1.3.0"]
        EVAL["Validate: replay evals<br/>v1.2.0: 5 pass · 1 flagged"]
        SHADOW["Shadow mode (steward)<br/>6 closed incidents · 6/6 agreements"]
        APPR["Approval (approver of record)<br/>author ≠ Shadow promoter ≠ approver"]
        ROLL["One-click rollback<br/>(append-only)"]
        OUT --> COR --> DIFF --> EVAL --> SHADOW --> APPR --> ROLL
    end

    HUMAN -->|"outcome + correction"| OUT
    ROLL -->|"new approved version"| REG

    subgraph P7["⑦ Extend to multi-asset / BU / enterprise"]
        OVER["Asset-type overrides<br/>office → data centre"]
        DIST["Portable skill package<br/>CodeBuddy (verified) ·<br/>WorkBuddy · ADP (designed for)"]
    end
    PILL --> OVER
    PILL --> DIST

    subgraph P8["⑧ Credible implementation path (Tencent Cloud)"]
        TC["Today: CodeBuddy skill · CodeBuddy SDK → Hunyuan (local) ·<br/>TokenHub adapter (pending)<br/>Proposed: WorkBuddy Experts · ADP distribution ·<br/>TRTC voice · EdgeOne / Lighthouse hosting ·<br/>iBMS + CMMS integration"]
    end
    DIST --> TC
    ENG -.->|"language work only"| TC

    P1["① Business problem<br/>expert know-how concentrated in few people ·<br/>inconsistent across assets · lost on retirement ·<br/>no trusted way to let AI act safely"]
    P1 -.-> P2
```

**Point ①** is the problem statement above the flow. **Point ⑤** is the incident command
loop (AOM uses / supervises / verifies / escalates). **Point ⑥** is the post-deployment
governance loop. **Point ⑦** is multi-asset and enterprise reach. **Point ⑧** is the
Tencent Cloud implementation path. Points **②③④** are capture, compilation and the
registry/governance that turns a one-off answer into a reusable, governed capability.

Point **⑤ "why more than a chatbot"** is argued in `SUBMISSION.md` §11: the engine
produces a decision with a trace and a gate, not a retrieved snippet.

---

## 2. Component & data flow

```mermaid
flowchart LR
    subgraph SRC["Source of truth (plain text)"]
        PILLS["pills/&lt;domain&gt;/&lt;name&gt;/<br/>SKILL.md · rules.yaml · evidence.yaml ·<br/>provenance.json · evals/ · CHANGELOG.md"]
    end

    subgraph DATA["data/ (mock)"]
        ASSETS["assets.json"]
        INC["incidents.json"]
        TL["timelines/*.json"]
        TR["transcripts/*.json"]
        ROLES["roles.json"]
        FIX["fixtures/llm/*.json<br/>(recorded LLM fallbacks)"]
    end

    subgraph LOAD["Loaders"]
        PLOAD["lib/pills/load<br/>loadPill · loadAllPills"]
        DLOAD["lib/data<br/>zod-validated loaders"]
    end

    subgraph ENGINE["lib/engine — deterministic, no LLM"]
        EVAL["evaluate(pill, asset, incident, evidence)<br/>→ actions · confidence(count) · trace"]
        CF["counterfactual()"]
        EV["runEvals()"]
        COND["conditions · schema"]
    end

    subgraph LLM["lib/llm — provider chain"]
        CLIENT["CodeBuddy Agent SDK → Hunyuan hy4-preview<br/>→ TokenHub (AI SDK 7, pending)<br/>→ OpenAI gpt-5.4-mini (AI SDK 7)"]
        USE["live (opt-in): extraction · tenant message<br/>recorded only: probes · contradiction ·<br/>incident summary"]
    end

    subgraph AUTH["lib/auth + middleware"]
        SESS["signed session cookie (jti)<br/>role → server-side redaction<br/>default-deny allowlist · CSRF · headers"]
        RL["lib/ratelimit<br/>per session / IP / instance (in memory)"]
    end

    subgraph GOV["lib/governance — pure + client-safe"]
        VER["versions<br/>semver · diff (jsondiffpatch) · rollback"]
        APP["approval<br/>three-person separation of duties ·<br/>eval-regression gate"]
        ACC["access<br/>role/sensitivity RBAC · redaction"]
        AUD["audit"]
        STORE["store<br/>zustand + localStorage"]
    end

    subgraph UI["components/ + app/ — 9 pages"]
        LAND["/ Landing"]
        SIGN["/sign-in"]
        PULSE["/pulse Portfolio Pulse"]
        CAP["/capture Expert Call"]
        CANVAS["/canvas/[pillId] Decision Canvas"]
        REGI["/registry Pill Registry"]
        INCR["/incident/[id] Incident Room"]
        APPRO["/approvals"]
        LEARN["/learning/[pillId] Outcome & Learning"]
    end

    PILLS --> PLOAD
    DATA --> DLOAD
    PLOAD --> ENGINE
    DLOAD --> ENGINE
    ENGINE --> GOV
    ENGINE --> UI
    GOV --> UI
    LLM --> USE
    USE -->|"falls back to"| FIX
    DLOAD --> LLM
    PLOAD --> LLM
    UI -->|"user events"| GOV
    AUTH --> UI
    AUTH --> LLM
    RL --> LLM

    style ENGINE fill:#e8f5e9,stroke:#2e7d32
    style GOV fill:#e3f2fd,stroke:#1565c0
    style LLM fill:#fff3e0,stroke:#ef6c00
```

### Reading the boundary

- **`pills/` is the source of truth.** The engine reads `rules.yaml`; the app never
  generates decision logic at runtime.
- **`lib/engine` is deterministic and LLM-free.** Given the same pill, asset, incident
  and evidence it always returns the same actions and trace, and it takes no model
  input — so changing the LLM cannot change a decision.
- **`lib/llm` is confined to language work**, and every call site has a recorded
  fallback in `data/fixtures/llm/`, so the app runs fully offline.
- **Separation of duties is three people.** The author cannot put a version into
  Shadow; neither the author nor the Shadow promoter can approve it; only Shadow
  versions can be approved; rollback follows the same identity rules
  (`lib/governance/approval.ts`, `docs/DECISIONS.md` D2). Every refusal is audited.
- **Paid routes are rate-limited** (`lib/ratelimit`, `docs/DECISIONS.md` D7): LLM
  10/min and 40/day per session plus per-IP and per-instance ceilings, Jev 60/min per
  session, failed sign-ins 10/min per IP. The windows are in memory per serverless
  instance; production would use a shared store or a WAF rule.
- **`lib/governance` is pure and client-safe.** It owns versions, the approval gate,
  role/sensitivity redaction and the audit log. Redaction runs on the server per
  signed-in role (`lib/governance/scope.ts`, `docs/DECISIONS.md` D1). The runtime
  governance store is a zustand store backed by `localStorage` (append-only audit,
  validated on load), with "Export pill" and "Reset demo"; production would persist it
  server-side (e.g. a Postgres `pill_version` table).

### Status precedence (the safety core)

```mermaid
flowchart TD
    A["rule trigger evaluated<br/>(incident type + all + any)"] --> B{triggered?}
    B -- no --> NA["not_applicable"]
    B -- yes --> C{forbidden_if_missing_evidence<br/>AND evidence missing?}
    C -- yes --> BL["blocked<br/>(escalateTo still populated)"]
    C -- no --> D{action_class}
    D -- must_escalate --> ES["escalate"]
    D -- requires_approval --> AP["needs_approval"]
    D -- recommend --> AL["allowed"]

    style BL fill:#ffebee,stroke:#c62828
    style ES fill:#fff3e0,stroke:#ef6c00
    style AP fill:#fffde7,stroke:#f9a825
    style AL fill:#e8f5e9,stroke:#2e7d32
```

A required evidence key counts as satisfied **only when it is confirmed and its value is
exactly `true`**; exceptions may add required evidence but never relax a gate. These
invariants are enforced by the test suite (`npm test`).
