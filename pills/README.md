# MOSAIC Intelligence Pills

## What is a pill?

An Intelligence Pill is a **plain-text, versioned, governed decision
artefact** that encodes an expert's incident-response judgement as
deterministic rules with provenance, tests, owners, and rollback.

A pill is **not** a prompt, a RAG index, or a chatbot. It is a compiled
artefact: rules with structured conditions that a deterministic engine
evaluates against an evidence map to produce bounded actions
(Recommend / Requires approval / Must escalate). An LLM host reads the
prose heuristics in `SKILL.md` for context, but **cannot override the
gates** in `rules.yaml`.

## Pill structure

```
pills/<domain>/<name>/
  SKILL.md          Frontmatter (name, version, owner, steward, approver,
                    status, scope, access, review_cadence) + prose
                    heuristics and a Boundaries section for the LLM host
  rules.yaml        Deterministic rules following docs/SPEC.md §4 schema
                    (structured conditions, op: eq|neq|gt|gte|lt|lte|in|exists)
  evidence.yaml     Evidence catalogue: key → { label, type, confirmable_by,
                    description }. Every evidence key a rule reads (trigger,
                    exception, required_evidence) is declared here; incident
                    timelines and evals may only use declared keys
  provenance.json   { pill, version, source_interview, expert, rules: rule ID →
                    { source, start, end, quote, confirmation, confirmed_by,
                    confirmed_at } } — the quote is verbatim from the expert turn
  evals/*.yaml      Past incidents with evidence maps and expected decisions
                    per rule (status: allowed | blocked | needs_approval |
                    escalate | not_applicable)
  CHANGELOG.md      Semantic version history with who approved and why
```

## Pills in this repository

| Pill | Domain | Version | Rules | Evals | Status |
|------|--------|---------|-------|-------|--------|
| `technical-services/chilled-water-leak` | Technical Services | 1.2.0 | TS-01..TS-12 | 6 | approved |
| `tenant-experience/incident-comms` | Tenant Experience | 1.0.0 | TE-01..TE-06 | 3 | approved |

## Portability — install unchanged

Each pill folder installs **unchanged** as a skill in any
agentskills-compatible host:

- **CodeBuddy** — copy to `.codebuddy/skills/<name>/SKILL.md`. The
  frontmatter (`name`, `description`, `version`) is read by the skill
  loader. `rules.yaml` and `evals/` are consumed by the MOSAIC engine.
  [CodeBuddy skills docs](https://www.tencentcloud.com/document/product/1256/77295)

- **WorkBuddy** — import via Skills & Expert Center. The pill's
  `SKILL.md` becomes a skill; rules and evals are available to the
  multi-expert collaboration layer. Skills are "scanned for security
  risks before installation"; the pill's `access` frontmatter maps to
  WorkBuddy's RBAC (admin/member/viewer).
  [WorkBuddy](https://www.tencentcloud.com/act/pro/workbuddy)

- **Tencent Cloud Agent Development Platform (ADP)** — package as a ZIP
  with `SKILL.md` at the root. ADP supports YAML metadata, semantic
  versioning, automated sandbox security review, and enterprise sharing
  via the Approval Center.
  [ADP custom skills](https://www.tencentcloud.com/document/product/1254/81540)

- **Any SKILL.md-compatible host** — the frontmatter and file structure
  follow the Anthropic agentskills convention. The pill is
  vendor-neutral plain text: YAML, JSON, and Markdown only. No runtime
  dependency, no binary, no vendor lock-in.

## Why pills, not prompts?

| RAG chatbot | Intelligence Pill |
|---|---|
| Retrieves text snippets | Evaluates structured rules against evidence |
| No deterministic gates | Gates block unsafe actions; LLM cannot override |
| No provenance | Every rule links to a transcript quote + timestamp |
| No tests | Evals replay past incidents; approval blocked if regress |
| No versions | Semantic versioning, diff, one-click rollback |
| No owner | RACI: owner, steward, approver per pill |
| Chatbots cannot be rolled back | Pills are version-controlled artefacts |

## Rule schema (summary)

See `docs/SPEC.md` §4 for the full schema. Key fields:

- `trigger` — structured conditions (`all`/`any` with `{ path, op, value }`)
- `required_evidence` — evidence items that must be present
- `action_class` — `recommend` | `requires_approval` | `must_escalate`
- `escalate_to` — role + fallback for escalation
- `owner` — role responsible for the action
- `deadline_minutes` — time budget (or `null` for no deadline)
- `asset_refs` — Brick 1.5.0 class names (e.g., `brick:Switchgear`)
- `sensitivity` — `public` | `internal` | `tenant_pii` | `commercial`
- `provenance` — transcript timestamp pointers

## Governance

- **Nothing executes without a named human.** `action_class: must_escalate`
  rules route to a named role with a deadline.
- **Provenance on every rule.** `provenance.json` maps each rule to the
  exact transcript span where the expert stated it.
- **Evals as regression tests.** A version cannot be approved if evals
  regress. Shadow mode runs new versions silently alongside the approved
  version before promotion.
- **One-click rollback.** Semantic versions + CHANGELOG + jsondiffpatch
  diff + reverse.
- **Role/sensitivity policy.** The `access` frontmatter and `sensitivity`
  labels enforce who can see and act on each rule.
