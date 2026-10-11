# Changelog — Tenant Experience / Incident Comms Pill

## 1.0.0 — 2026-10-03

**Status:** approved

**Approved by:** Goh Boon Kheng, Head of Technical Services

**Steward:** Priya Nair, Asset Operations Manager

**Why this version was promoted:**

- Tenant Experience Manager onboarding interview completed (Lim Hui Fen,
  `te-interview-2026-10-03`, CDM/ACTA probes). All 6 rules confirmed on the
  Decision Canvas; each rule's provenance resolves to a verbatim quote.
- TE-01 (first notice within 30 minutes) confirmed as `requires_approval`:
  a named human (Tenant Experience Manager or delegate) approves before
  send — no autonomous comms, consistent with IMDA MGF for Agentic AI 2026.
  Approval is the action class, not an evidence item. TE-01 does not apply
  to data-centre assets.
- TE-03 gates the cause: stating a cause is blocked until Technical Services
  or the LEW confirms the source.
- TE-04 (bank anchor tenant account-manager call) confirmed as
  `must_escalate`, with `asset_overrides` for data-centre assets routing to
  `dc_critical_facilities_manager`.
- TE-06 (DC client SLA notice via CFM, 15-minute SLA window) — the
  data-centre overlay that swaps the tenant notice for the client SLA notice.
- TE-05 (PII masking) — PDPA, `sensitivity: tenant_pii`.
- `evidence.yaml` added as the canonical evidence catalogue.
- Evals: 3 past incidents replayed (condensate, riser near DB with anchor
  tenant, DC CRAH SLA notice). 3/3 pass. Shadow badge: 3/3 agreements.

**Seed sources:**

- Adapted from `docs/research/research_domain.md` §2.5 seed rules
  `TE-WTR-009` and `TE-WTR-010`.
- Expanded with anchor-tenant protocol, DC SLA overlay, PII masking,
  and no-unverified-cause rule based on the Tenant Experience Manager interview.
