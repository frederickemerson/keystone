# Changelog — Tenant Experience / Incident Comms Pill

## 1.0.0 — 2026-10-02

**Status:** approved

**Approved by:** Head of Technical Services

**Steward:** Asset Operations Manager

**Why this version was promoted:**

- Property / Tenant Experience Manager onboarding interview completed
  (2026-10-02, CDM/ACTA probes). All 6 rules confirmed on the Decision
  Canvas.
- TE-01 (first notice within 30 minutes, named approval) confirmed as
  `requires_approval` — no autonomous comms, consistent with IMDA MGF
  for Agentic AI 2026 (irreversible actions: "sending communications").
- TE-04 (bank anchor tenant account-manager call) confirmed as
  `must_escalate` with `asset_overrides` for data-centre assets routing
  to `dc_critical_facilities_manager`.
- TE-06 (DC client SLA notice via CFM) added — the data-centre overlay
  that makes the same pill portable across office and DC assets with
  different comms channels and approvers.
- TE-05 (PII masking) added — PDPA compliance, `sensitivity: tenant_pii`
  on all rules.
- Evals: 3 past incidents replayed (condensate, riser near DB with anchor
  tenant, DC CRAH SLA notice). 3/3 pass. Shadow badge: 3/3 agreements.

**Seed sources:**

- Adapted from `docs/research/research_domain.md` §2.5 seed rules
  `TE-WTR-009` and `TE-WTR-010`.
- Expanded with anchor-tenant protocol, DC SLA overlay, PII masking,
  and no-unverified-cause rule based on the Property Manager interview.
