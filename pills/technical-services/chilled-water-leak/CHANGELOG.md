# Changelog — Technical Services / Chilled-Water Leak Pill

## 1.2.0 — 2026-10-02

**Status:** approved

**Approved by:** Head of Technical Services

**Steward:** Asset Operations Manager

**Why this version was promoted:**

- Chief Engineer onboarding interview completed (2026-10-02, CDM/ACTA
  probes). All 12 rules confirmed or edited on the Decision Canvas.
- TS-07 (LEW re-energisation gate) confirmed as `must_escalate` with
  `required_evidence: [lew_signoff, insulation_resistance_ok, area_dry]`.
  Provenance: `ce-interview-2026-10-02#00:14:32`.
- Data-centre overlay added to TS-06 and TS-07 via `asset_overrides`:
  `data_centre` assets route escalation to `dc_critical_facilities_manager`
  and trigger client SLA notification instead of tenant-experience comms.
- TS-04 (condensate vs active leak distinction) added — addresses the
  most common false-positive in the seed rule set.
- TS-03 (do not shut down whole floor unless electrical risk confirmed)
  added — addresses the bank anchor tenant trading-floor risk.
- TS-08 (insurer evidence preservation) and TS-11 (NEA vector control)
  split out from the seed rules for clarity.
- TS-12 (PUB flood alert pre-emptive checks) added.
- Evals: 6 past incidents replayed. 5 pass, 1 flagged
  (`eval-2025-09-tenant-area-isolation-deadline` — TS-03 deadline_minutes
  should be 10, not 15, for tenant-area isolation). Flagged for v1.3.0.
- Shadow badge: 5/6 agreements (1 flagged). Steward approved promotion
  to `approved` with the flagged eval documented and a v1.3.0 correction
  scheduled.

**Changes from 1.1.0:**

- Added TS-03, TS-04, TS-08 (split), TS-11 (split), TS-12.
- Added `asset_overrides` for `data_centre` on TS-06 and TS-07.
- Added `sensitivity` field to all rules.
- Added `forbidden_if_missing_evidence` field to all rules.
- Refined TS-02 to specify isolation sub-valve sequencing (local → floor → main).
- Refined TS-05 to reference FSM red-tag permit and fire watch explicitly.
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
