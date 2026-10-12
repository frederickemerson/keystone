---
name: chilled-water-leak
description: >-
  Technical Services pill for chilled-water riser, AHU, FCU and CRAH leak
  response in Grade A office and colocation data-centre assets. Encodes the
  Chief Engineer's incident-response judgement as deterministic rules with
  LEW-gated electrical safety, isolation sub-valve sequencing, fire-
  protection impairment red-tagging, insurer evidence preservation, and
  data-centre SLA overlays.
version: 1.2.0
owner: chief_engineer
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
  systems:
    - chilled_water_riser
    - ahu
    - fcu
    - crah
    - condensate_drain
    - isolation_sub_valve
    - switchgear
    - electrical_room
  geographic_scope: Singapore
  standards:
    - "EMA Electricity (Electrical Installations) Regulations; LEW regime; SS 638"
    - "SCDF Fire Safety Act 1993; FSM/CERT/ERP"
    - "BCA Building Control (Reportable Matters) Regulations 2025"
    - "NEA Control of Vectors and Pesticides Act"
    - "PUB flood alert channels"
    - "IICRC S500 Water Damage Restoration"
    - "US EPA Mold Remediation (24-48 h drying window)"
    - "FM Global DS 10-7 Fire Protection Impairments (red-tag permit)"
    - "IMDA MGF 2020 §3.18; MGF Agentic AI 2026"
access:
  roles_allowed:
    - chief_engineer
    - asset_operations_manager
    - head_technical_services
    - duty_facilities_manager
    - technical_services_lead
    - fire_safety_manager
    - dc_critical_facilities_manager
  roles_read_only:
    - technician
    - security_fcc_operator
    - duty_lew
  sensitivity_default: internal
review_cadence:
  interval_months: 6
  next_review: 2027-04-11
  trigger_conditions:
    - "Any incident where a rule was overridden"
    - "New asset type added to scope"
    - "Regulatory change (EMA, SCDF, BCA, NEA)"
    - "Eval regression detected"
---

# Chilled-Water Leak — Technical Services Pill

## Purpose

This pill encodes the incident-response judgement of **Tan Wei Ming, Chief
Engineer** (18 years M&E, fictional Grade A office portfolio) as deterministic,
testable rules. An LLM host (CodeBuddy, WorkBuddy, Claude, or any
agentskills-compatible host) reads these heuristics for context, but the
gates in `rules.yaml` are the source of truth. Inside Keystone the deterministic
engine enforces them and no LLM reasoning can override a blocked action; an
external skill host reads the rules but does not itself enforce them.

## How to use this pill

1. **Incident mode** — When an incident is declared (iBMS leak alarm, tenant
   call, security patrol report), feed the evidence map to `rules.yaml`.
   Evidence keys are the vocabulary declared in `evidence.yaml` (label, type,
   who may confirm each item). A required item counts only when it is
   confirmed and true; an unknown fact is simply absent.
   The deterministic engine evaluates each rule's `trigger` conditions against
   the evidence and produces action chips: **Recommend**, **Requires approval**,
   or **Must escalate**.

2. **Why drawer** — For every action, the host can surface: the rule ID, the
   pill version, the evidence items used, the missing evidence, the owner,
   the escalation target, and the provenance (transcript quote + timestamp).

3. **Counterfactual** — "What would change this decision?" is answered by
   listing the unmet evidence items and exception conditions in each rule.

## Heuristics for the LLM host

The host LLM should follow these heuristics when drafting recommendations,
tenant messages, or incident summaries. They are **not** the decision logic —
the rules in `rules.yaml` are.

### Source identification and isolation

- The first priority after life safety is **stopping the water at the nearest
  isolation sub-valve**, not at the main. Keppel REIT assets have "water
  leakage detectors and isolation sub-valves to enable quicker identification
  and mitigation of water losses" — use them.

- Isolation proceeds: **local FCU/branch valve → floor isolation sub-valve →
  riser valve → domestic main** for the stack. Each step has a time budget.
  If the source is not found at 5 minutes, move to the next level. At 10
  minutes, isolate the riser and escalate to the Duty Facilities Manager.

- **Branch before riser.** For an AHU branch leak where the sub-valve is
  accessible and stops the flow, isolate the branch only and leave the riser
  open. Riser isolation is for a leak on the riser pipe, a seized or
  inaccessible sub-valve, or a source not confirmed within 10 minutes
  (resolved contradiction, interview 00:23:30).

- **Never close a fire-protection valve** (sprinkler, wet riser, hose reel,
  fire pump) without FSM authorisation. This is a red-tag impairment under
  FM Global DS 10-7. The FSM must be called, not informed after the fact.
  The one exception is a confirmed immediate life-safety hazard (TS-13).

- **Condensate vs active leak**: A condensate tray overflow or drain line
  blockage is a maintenance issue, not an emergency. An active chilled-water
  branch leak is. Distinguish by: (a) water volume — condensate is a drip,
  chilled-water is a stream; (b) temperature — condensate is ambient,
  chilled-water is cold (8–14°C); (c) alarm type — `Condensate_Leak_Alarm`
  vs `Water_Leak_Sensor` or `Leak_Alarm` on the riser. When in doubt, treat
  as active and isolate.

### Electrical safety

- If water is **in, above, or flowing toward** an electrical room,
  switchroom, riser cupboard, or lift motor room — **nobody enters**. The
  Licensed Electrical Worker (LEW) tests and signs off the affected
  electrical installation before re-energisation (EMA LEW regime).

- Do **not** shut down a whole floor's power unless the electrical risk is
  confirmed by the LEW or by clear evidence (water on switchgear, breaker
  tripped, insulation resistance below threshold). A false power-down on a
  bank anchor tenant's trading floor is a seven-figure incident in its own
  right.

- A tripped breaker is evidence of risk, but nobody resets it — and nobody
  widens the power-down on the strength of it — until the LEW has inspected
  the tripped circuit (TS-03 adds `lew_inspected_tripped_breaker` as
  required evidence). The reset itself is a re-energisation (TS-07).

- Re-energisation after any wetting event requires: LEW sign-off,
  insulation resistance test passed, and the area confirmed dry. No
  exceptions. The gate in TS-07 blocks this unconditionally.

### Fire-protection impairment

- Any isolation that affects sprinklers, wet risers, hose reels, or fire
  pump/alarm interlocks is an **impairment**. Raise a red-tag permit, notify
  the insurer, post a fire watch, and restore protection as the first
  priority after life safety.

- Emergency isolation to protect life (e.g., water on live switchgear)
  may proceed first, but the FSM must be informed within 5 minutes and the
  permit raised retrospectively. This is its own rule, **TS-13**, and it
  applies only once `immediate_life_safety_hazard` is confirmed; until then
  TS-05's FSM-authorisation gate stands alone. It is not an exception on
  TS-05 — an exception can never relax a gate.

### Lift shaft and pit

- Water in a lift pit or shaft → take the lift out of service immediately
  via the FCC. Park at an upper landing. Call the lift contractor. Do not
  run the lift to "test". If a safety incident occurred, BCA must be called
  within 6 hours under the Reportable Matters Regulations 2025.

### Evidence preservation for insurer

- Take photos and video **before** cleanup begins. Retain the failed
  component (valve, pipe section, gasket) and tag it. Do not dispose of
  evidence before the loss adjuster releases it. Notify the insurer/broker
  within the policy notification window.

- Separate landlord vs tenant damage scope. Do not commit to repairs beyond
  emergency mitigation before adjuster contact.

### Data-centre overlay

When `asset.type == data_centre`:

- The tenant-message action (TE pill) is **suppressed**. DC clients are
  notified via the **critical facilities manager** under the client SLA, not
  via the tenant experience comms flow.

- IT power-down decisions are proposed only, never executed by Technical
  Services. The IT/BCP owner or critical facilities manager makes that call.

- The `asset_overrides` block in TS-07 reroutes escalation from
  `duty_lew` to `dc_critical_facilities_manager`, and TS-07's data-centre
  exception adds `cfm_cosign` to the required evidence: the CFM co-signs
  any return to service in addition to — never instead of — the LEW sign-off,
  insulation resistance and area dry. TS-10 escalates data-hall leaks to the
  same role.

- CRAH unit condensate or chilled-water loop leaks follow the same isolation
  logic as office AHU/FCU leaks, but with higher urgency (PUE impact, thermal
  ride-through on IT equipment).

### Stagnant water and vector control

- Standing water must be cleared within 24 hours. NEA holds owners/occupiers
  liable for mosquito breeding. If water cannot be removed, treat with
  larvicide and inspect daily until dry.

### PUB/NEA flood alerts

- On a PUB heavy-rain or canal-level alert for a station near the asset:
  test basement sump pumps and float switches, clear roof outlets and
  rainwater downpipes, stage flood barriers at carpark ramps, brief security.
  This is pre-emptive, not reactive.

## Boundaries

### May be recommended (action_class: recommend)

- Close local/zone isolation sub-valves for chilled-water branches
- Isolate FCU chilled-water supply and clear condensate tray
- Cordon slippery areas and post signage
- Deploy absorbent socks, drip trays, bunds
- Move/raise equipment and documents away from drip path
- Take lifts out of service via FCC when water is in shaft/pit
- Call lift maintenance contractor
- Moisture-map affected areas
- Mobilise extraction and dehumidification equipment
- Test basement sump pumps on PUB flood alert
- Clear roof drainage outlets on PUB flood alert
- Remove standing water within 24 hours (NEA vector control)
- Engage licensed cleaning/restoration contractor for Category 2/3 water
- Take photographs and video before cleanup (insurer evidence)

### Requires approval (action_class: requires_approval)

- Closing the floor isolation sub-valve (affects multiple tenants)
- Closing the riser valve (affects multiple floors)
- Closing the domestic water main for the stack
- Any fire-protection impairment (sprinkler/wet riser/hose reel isolation)
  — requires FSM authorisation + red-tag permit
- Mobilising restoration contractor beyond emergency mitigation scope
- Notifying insurer/broker of a claim (Asset Operations Manager approval)
- Lift contractor return-to-service sign-off
- Drying equipment energised from circuits in the affected zone (LEW clearance)
- Tenant access arrangement for isolation behind locked tenancy

### Must escalate (action_class: must_escalate)

- **Re-energising any wetted or isolated electrical circuit** — LEW
  sign-off, insulation resistance test, and area dry confirmation required
  (plus the CFM co-signature on a data-centre asset).
  No LLM, no technician, and no Duty Manager can override this gate.
- Emergency fire-protection isolation on a confirmed immediate life-safety
  hazard (TS-13) — inform the FSM within 5 minutes, permit raised after
- Water in/near switchgear or electrical room — evacuate electrical room,
  call LEW, isolate upstream water only
- IT/DC power-down decision — escalate to critical facilities manager /
  IT BCP owner
- Any situation exceeding pill scope (unknown water source, structural
  damage, chemical contamination) — escalate to Duty Manager and
  Head of Technical Services
- BCA reportable lift incident — escalate and file within 6 hours
- SCDF escalation when structural or electrical injury risk exists
