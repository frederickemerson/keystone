# Changelog — Technical Services / Chilled-Water Leak Pill

## 1.2.0 — 2026-10-02

**Status:** approved

**Approved by:** Goh Boon Kheng, Head of Technical Services

**Steward:** Priya Nair, Asset Operations Manager

**Why this version was promoted:**

- Chief Engineer onboarding interview completed (Tan Wei Ming,
  `ce-interview-2026-10-02`, CDM/ACTA probes, 35 min). All 12 rules
  confirmed (TS-02 edited) on the Decision Canvas. Every rule's provenance
  resolves to the expert turn it was extracted from, with a verbatim quote.
- TS-07 (LEW re-energisation gate) confirmed as `must_escalate`,
  `forbidden_if_missing_evidence: true`, `required_evidence: [lew_signoff,
  insulation_resistance_ok, area_dry]`. Provenance:
  `ce-interview-2026-10-02#00:14:32`.
- TS-02 edited after the contradiction caught on the call (P28, 00:23:10):
  "always isolate the whole riser" (00:06:30) vs "isolate the sub-valve and
  leave the riser open" (00:22:15). Resolved with a distinguishing
  condition: branch sub-valve first; riser only for a riser-pipe leak, a
  seized or inaccessible sub-valve, or a source unconfirmed at 10 minutes.
- Evidence vocabulary: `evidence.yaml` added as the canonical catalogue
  (key, label, type, who may confirm). Every trigger path and required
  evidence key is declared there; timelines and evals use only declared
  keys. Approval is never an evidence item.
- Gates vs escalations: `forbidden_if_missing_evidence` is true only where
  the decision is itself hazardous or irreversible (TS-03 power-down, TS-05
  impairment, TS-07 re-energisation, TS-08 cleanup before evidence). An
  escalation (TS-01, TS-10) or a routine action (TS-06) is never blocked.
- Data-centre overlay: TS-07 `asset_overrides.data_centre` routes
  escalation to `dc_critical_facilities_manager` (CFM co-signs); TS-10
  escalates data-hall leaks to the CFM. The tenant first notice (TE-01) does
  not apply to data-centre assets.
- Evals: 6 past incidents replayed. 5 pass, 1 flagged:
  `eval-2025-09-tenant-area-isolation-deadline` expects TS-02
  `deadline_minutes` 10; v1.2.0 carries 15 (taken from the interview,
  00:11:35). All status expectations pass. Flagged for v1.3.0.
- Shadow badge: 5/6 agreements (1 flagged). Head of Technical Services
  approved promotion with the flagged eval documented and the v1.3.0
  correction scheduled.

**Changes from 1.1.0:**

- Added TS-03, TS-04, TS-08 (split), TS-11 (split), TS-12.
- Added `asset_overrides` for `data_centre` on TS-07.
- Added `sensitivity` and `forbidden_if_missing_evidence` to all rules.
- Refined TS-02 to the branch-before-riser hierarchy (contradiction
  resolution) with a tenant-area isolation deadline.
- Refined TS-05 to reference FSM red-tag permit and fire watch explicitly.
- Added `evidence.yaml`.
- Added 3 new evals (DC CRAH, sprinkler leak, tenant-area isolation).

## 1.1.0 — 2026-09-28

**Status:** approved (superseded by 1.2.0)

**Approved by:** Head of Technical Services

**Why this version was promoted:**

- Adapted seed rules from `docs/research/research_domain.md` §2.5 to
  the SPEC §4 schema (structured conditions, `op` set, `asset_refs`).
- Merged safety/fire rules into the Technical Services pill as gates
  (TS-01 electrical, TS-05 fire-protection impairment) per the spec
  cut: "Safety/Sustainability becomes a gate inside Technical Services."
- Added `asset_refs` with Brick 1.5.0 class names.
- Added `provenance` pointers to transcript timestamps.
- 3 evals created (condensate, riser near DB, DC CRAH).
- Shadow badge: 3/3 agreements.

**Changes from 1.0.0:**

- Converted 15 seed rules to 9 pill rules (merged safety gates, removed
  orchestrator and tenant-experience rules to their own pills).
- Added Brick asset_refs to every rule.
- Added provenance timestamps.
- Renamed rule IDs from `TS-WTR-0xx` to `TS-01`..`TS-09`.

## 1.0.0 — 2026-09-20

**Status:** approved (superseded by 1.1.0)

**Approved by:** Head of Technical Services

**Why this version was promoted:**

- Initial pill scaffold from seed rules in
  `docs/research/research_domain.md` §2.5.
- SKILL.md frontmatter and body prose authored.
- rules.yaml with 15 rules following the seed JSON structure.
- No evals yet (shadow mode, 0/0 agreements).
- Promotion approved as a baseline for expert onboarding interview
  and contradiction detection.
