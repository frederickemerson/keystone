---
name: incident-comms
description: >-
  Tenant Experience pill for incident communications to affected tenants
  and DC clients. Encodes the Property Manager's comms judgement: factual
  first notice within 30 minutes, named human approval before sending,
  no unverified cause claims, bank anchor tenant gets an account-manager
  call, DC clients get SLA notice via the critical facilities manager,
  and PII masking on all outbound messages.
version: 1.0.0
owner: tenant_experience_manager
steward: asset_operations_manager
approver: head_technical_services
status: approved
scope:
  asset_types:
    - grade_a_office
    - data_centre
  incident_types:
    - water_ingress
    - chilled_water_leak
    - condensate_leak
    - power_outage
    - fire_alarm
  geographic_scope: Singapore
  standards:
    - "BOMA Emergency Preparedness Guidebook (communications plan)"
    - "IMDA MGF 2020 §3.14-3.18 (human involvement levels)"
    - "IMDA MGF for Agentic AI 2026 (irreversible actions require approval)"
    - "PDPA (Personal Data Protection Act) — PII masking"
access:
  roles_allowed:
    - tenant_experience_manager
    - asset_operations_manager
    - property_manager
    - head_technical_services
  roles_read_only:
    - chief_engineer
    - duty_facilities_manager
  denied:
    - technician
    - tenant
    - external_contractor
  sensitivity_default: tenant_pii
review_cadence:
  interval_months: 6
  next_review: 2027-04-11
  trigger_conditions:
    - "Any incident where a comms rule was overridden"
    - "New asset type or tenant profile added"
    - "PDPA or IMDA regulatory change"
---

# Incident Comms — Tenant Experience Pill

## Purpose

This pill encodes the comms judgement of the **Tenant Experience Manager**
(10 years property management, Keppel REIT asset portfolio) as deterministic
rules for incident communications. An LLM host (CodeBuddy, WorkBuddy, Claude,
or any agentskills-compatible host) may draft messages, but every outbound
message requires a named human approver before sending — no autonomous
communications, consistent with IMDA MGF for Agentic AI 2026.

## How to use this pill

1. **Incident mode** — When an incident affects tenant premises, access,
   services, or safety, feed the evidence map to `rules.yaml`. The engine
   produces comms action chips: **Recommend** (draft notice), **Requires
   approval** (send notice), or **Must escalate** (anchor tenant / media
   risk / PII breach).

2. **Comms log** — Every notice (drafted, sent, updated) is logged with
   the approver name, timestamp, pill version, and message content. The
   comms log is part of the audit trail.

3. **PII masking** — The LLM host must mask tenant PII (unit numbers,
   individual names, contact details, lease terms) in any message visible
   to roles below `property_manager`. The `sensitivity: tenant_pii` label
   on every rule enforces this.

## Heuristics for the LLM host

### First notice

- The first notice goes to **affected tenants only** — not the whole
  building — within 30 minutes of incident declaration. It states: what
  happened, where, what we are doing, the next update time, and a contact.

- The notice is **factual and bounded**: "There is a water leak on Level
  23. Our technical team is on site isolating the source. We will provide
  the next update at [time]." No speculation about cause, no liability
  admission, no completion time promise.

### No unverified cause claims

- Do **not** state the cause until it is confirmed by the Technical Services
  lead or the LEW. "The source appears to be a chilled-water riser joint"
  is acceptable only after a technician has confirmed it. "We believe the
  cause is a pipe failure" before confirmation is forbidden.

- Do **not** promise a completion time before the source is confirmed and
  isolation is complete. "We expect to resolve this by 3 PM" is forbidden
  when isolation is not yet done. "We will provide an update on the repair
  timeline at [next update time]" is the correct formulation.

### Anchor tenant protocol

- A **bank anchor tenant** (or any tenant with a lease-defined notification
  SLA) gets an **account-manager phone call** in addition to the written
  notice, within 30 minutes. The account manager — not the technician,
  not the Duty Manager — makes this call. The written notice follows.

### Data-centre overlay

When `asset.type == data_centre`:

- DC clients do **not** receive tenant-experience comms. They receive an
  **SLA notice** via the **critical facilities manager** under the client
  SLA terms. The comms channel is different, the language is different
  (SLA event reference, impact assessment, estimated resolution window
  if known), and the approver is the CFM, not the Property Manager.

### PII masking

- Outbound messages must not include PII of other tenants. A message to
  Tenant A about a leak on their floor must not name Tenant B on the floor
  above, even if Tenant B is also affected. Each affected tenant gets
  their own notice.

- Lease terms, rental rates, and tenant commercial information must not
  appear in any message visible to roles below `property_manager`.

### Update cadence

- After the first notice, updates go at the **stated cadence** — typically
  every 30 minutes for a major incident, every 2 hours for a contained one.
  The cadence must be stated in the first notice. If the situation changes
  materially (evacuation ordered, source found, power restored), an
  immediate update goes regardless of cadence.

### Life-safety instructions

- Life-safety instructions (evacuate, stay put, do not use lifts) are
  issued **immediately** by the FSM/FCC via the building PA system and
  mass-notification system. These do not require Property Manager comms
  approval — the FSM has authority. The tenant-experience pill logs that
  the instruction was issued and follows up with a written notice.

## Boundaries

### May be recommended (action_class: recommend)

- Draft the first notice (what, where, what we are doing, next update, contact)
- Draft update notices at the stated cadence
- Compile the affected-tenant list from the incident log
- Draft an account-manager call script for the anchor tenant
- Mask PII in draft messages for lower-role viewers

### Requires approval (action_class: requires_approval)

- Send the first notice to affected tenants — requires Property Manager
  or named approver sign-off
- Send update notices — requires named approver sign-off
- Arrange tenant access for isolation behind locked tenancy

### Must escalate (action_class: must_escalate)

- Anchor tenant notification — escalate to account manager for phone call
- DC client SLA notification — escalate to critical facilities manager
- Media risk or potential PII breach — escalate to Asset Manager and
  Head of Technical Services
- Any situation where the cause is suspected but unconfirmed and a tenant
  is demanding a statement — escalate to Property Manager
