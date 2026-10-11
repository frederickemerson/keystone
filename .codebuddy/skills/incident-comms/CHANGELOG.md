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

**Pre-release content correction (part of the authored 1.0.0 content, not a
governed runtime change — version unchanged):**

- TE-07 (new rule) — "Life-safety announcement — issue immediately": a
  life-safety instruction from the FSM / FCC goes out without Tenant
  Experience approval. Previously an exception note on TE-01, which the
  engine (correctly) never applies, because an exception never relaxes a
  gate. Now its own `recommend` rule, triggered and gated by a confirmed
  `life_safety_instruction_called` (replaces the unused
  `life_safety_instruction` key; confirmable by `fire_safety_manager`,
  `security_fcc_operator`). Owner `tenant_experience_manager`, approved with
  the rest of 1.0.0 by the Head of Technical Services. Provenance:
  `te-interview-2026-10-03#00:15:00` (P13 what-if probe at 00:14:40). The
  written follow-up notice still needs a named approver (TE-01).
- TE-01: the misleading life-safety exception was removed.
- Evals: every eval states TE-07 (`not_applicable` in all three). 3/3 pass.

**Seed sources:**

- Adapted from `docs/research/research_domain.md` §2.5 seed rules
  `TE-WTR-009` and `TE-WTR-010`.
- Expanded with anchor-tenant protocol, DC SLA overlay, PII masking,
  and no-unverified-cause rule based on the Tenant Experience Manager interview.
