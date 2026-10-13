# Keystone Intelligence Pill — chilled-water-leak v1.2.0

Approved pill exported from Keystone on 2026-10-13. This is the authoritative source
for chilled-water leak response. Cite the rule ID and the version 1.2.0 exactly as
written below. Do not paraphrase a rule ID and never invent a version number.

---

## Part 1 — Pill definition

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
    - senior_technician
    - security_fcc_operator
    - duty_lew
  # Confirm-only grant: a fellow technician may peer-confirm a colleague's frontline note.
  roles_peer_confirm:
    - technician
    - senior_technician
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
  run the lift to "test". If a reportable safety incident occurred, the owner (or last
  maintenance contractor) must call BCA within 6 hours under the Building
  Control (Reportable Matters) Regulations 2025 (per BCA's published
  summary; source: `docs/research/research_domain.md` §2.1).

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
- BCA reportable lift incident — escalate and call BCA within 6 hours
  (Reportable Matters Regulations 2025, per BCA's published summary)
- SCDF escalation when structural or electrical injury risk exists

---

## Part 2 — Rules (13 total)

### TS-01 — Water near switchgear or electrical room — evacuate and escalate

- **Pill version:** 1.2.0
- **Action class:** Must Escalate
- **Owner:** Technical Services Lead
- **Escalate to:** Duty LEW, falling back to Head Technical Services
- **Required evidence (ALL must be confirmed):** visual_or_alarm_confirmation
- **Deadline:** 5 minutes

**Decision:** Treat as electrical hazard. Evacuate the electrical room immediately. Nobody enters until LEW confirms de-energised and safe. Isolate water upstream of the room outside the threshold. Call LEW and Duty Manager.

**Allowed:**
- Cordon and signage at electrical room threshold
- Call LEW
- Upstream water isolation outside the room
- Notify Duty Manager and FSM
- Log and photograph from outside the threshold

**Forbidden:**
- Entering the room before LEW confirms de-energised and safe
- Operating any wet breaker or switch
- Powering pumps or wet-vacs from the affected board
- Security 'quick look' entry

**Exceptions:**
- LEW confirms the affected section is a spare/dead board and documents it
- Water confined to a sealed trench with no contact path — LEW judgement

### TS-02 — Isolate at the nearest isolation sub-valve — branch before riser

- **Pill version:** 1.2.0
- **Action class:** Recommend
- **Owner:** Technical Services Lead
- **Escalate to:** Duty Facilities Manager, falling back to Head Technical Services
- **Required evidence (ALL must be confirmed):** location_confirmed, shutoff_map_available
- **Deadline:** 15 minutes

**Decision:** Isolate at the nearest accessible isolation sub-valve. For a branch leak where the sub-valve is accessible and stops the flow, isolate the branch only and leave the riser open. Isolate the riser only when the leak is on the riser pipe, the sub-valve is seized or inaccessible, or the source is not confirmed within 10 minutes. In a tenant-occupied area isolation must be complete within the deadline; if it is not, escalate to the Duty Facilities Manager.

**Allowed:**
- Close the branch isolation sub-valve
- Close the floor isolation sub-valve
- Close the riser valve (riser-pipe leak, seized sub-valve, or source unconfirmed at 10 min)

**Forbidden:**
- Closing any fire-protection valve without FSM authorisation (see TS-05)
- Shutting the whole riser for a branch leak the sub-valve can stop
- Leaving an isolated valve unlabelled

**Exceptions:**
- Leak is on the riser pipe itself — isolate the riser
- Branch sub-valve seized or inaccessible — isolate the riser
- Source is behind a locked tenancy — arrange tenant access, then isolate locally

### TS-03 — Do not shut down whole floor power unless electrical risk confirmed

- **Pill version:** 1.2.0
- **Action class:** Requires Approval
- **Owner:** Technical Services Lead
- **Escalate to:** Duty LEW, falling back to Head Technical Services
- **Required evidence (ALL must be confirmed):** lew_or_evidence_confirms_risk
- **BLOCKED if any required evidence is missing.**

**Decision:** Do not shut down a whole floor's power based on a tenant request or a precautionary instinct. Power-down only when electrical risk is confirmed by the LEW or by clear evidence: water on switchgear, breaker already tripped, or insulation resistance below threshold. A false power-down on a bank anchor tenant's trading floor is a seven-figure incident.

**Allowed:**
- Send technician to assess with moisture meter
- Request LEW inspection if risk uncertain
- Isolate individual affected circuit on LEW advice

**Forbidden:**
- Shutting down a whole floor on tenant request alone
- Shutting down a whole floor without LEW or confirmed evidence
- De-energising circuits not in the water path

**Exceptions:**
- Breaker already tripped — the LEW inspects the tripped circuit before any reset or wider power-down (a reset is a re-energisation, TS-07)

### TS-04 — Condensate vs active leak — distinguish before committing resources

- **Pill version:** 1.2.0
- **Action class:** Recommend
- **Owner:** Technician
- **Escalate to:** Technical Services Lead, falling back to Asset Operations Manager
- **Required evidence (ALL must be confirmed):** visual_inspection
- **Deadline:** 30 minutes

**Decision:** Determine whether this is condensate (tray overflow, drain blockage) or an active chilled-water branch leak. Condensate is a drip, ambient temperature, from the condensate tray or drain line. Active chilled-water is a stream, cold (8-14 degrees C), from the branch pipe or riser. Condensate: clear tray, place drip protection, schedule repair. Active leak: isolate the FCU chilled-water isolation valves immediately (TS-02). When in doubt, treat as active and isolate.

**Allowed:**
- Inspect condensate tray and drain line
- Clear blocked condensate drain
- Place drip tray and absorbent socks
- Close FCU chilled-water isolation valves if active leak suspected
- Check adjacent FCUs on same drain line
- Notify tenant
- Schedule repair work order

**Forbidden:**
- Assuming condensate without visual inspection
- Leaving FCU valves open overnight pending repair if active leak
- Working above live tenant workstations without clearing the area

### TS-05 — Fire-protection impairment requires FSM authorisation and red-tag

- **Pill version:** 1.2.0
- **Action class:** Requires Approval
- **Owner:** Fire Safety Manager
- **Escalate to:** Fire Safety Manager, falling back to Head Technical Services
- **Required evidence (ALL must be confirmed):** fsm_authorisation
- **BLOCKED if any required evidence is missing.**
- **Deadline:** 5 minutes

**Decision:** FSM (or deputy) authorises the impairment. Raise a red-tag impairment permit. Notify property insurer. Post fire watch patrols every 30 minutes in the affected zone. Restore protection as the first priority after life safety. Isolate the smallest sprinkler zone possible.

**Allowed:**
- Isolate smallest sprinkler zone possible
- Fire watch patrols every 30 minutes
- Insurer impairment notification
- Call fire-protection contractor

**Forbidden:**
- Technician closing a sprinkler control valve on own authority
- Leaving the system impaired overnight without fire watch and FSM sign-off
- Restoring protection without contractor functional test

### TS-06 — Lift pit water — take lift out of service and call contractor

- **Pill version:** 1.2.0
- **Action class:** Requires Approval
- **Owner:** Technical Services Lead
- **Escalate to:** Asset Operations Manager, falling back to Head Technical Services
- **Required evidence (ALL must be confirmed):** lift_out_of_service_confirmed
- **Deadline:** 15 minutes

**Decision:** Park lift at an upper floor and take out of service via FCC. Call lift maintenance contractor. Assess against BCA Reportable Matters Regulations 2025 — call BCA within 6 hours if a reportable safety incident occurred. Return to service only after contractor inspection and clearance.

**Allowed:**
- Take lift out of service via FCC
- Call lift maintenance contractor
- BCA incident call if reportable safety incident
- Cordon lift landing doors

**Forbidden:**
- Running the lift to 'test' with water in the pit
- Entering the pit without contractor and isolation
- Returning lift to service without contractor clearance

### TS-07 — No re-energisation without LEW sign-off

- **Pill version:** 1.2.0
- **Action class:** Must Escalate
- **Owner:** Chief Engineer
- **Escalate to:** Duty LEW, falling back to Head Technical Services
- **Required evidence (ALL must be confirmed):** lew_signoff, insulation_resistance_ok, area_dry
- **BLOCKED if any required evidence is missing.**

**Decision:** Re-energise affected AHU, DB, or circuit only after LEW inspection and certification. LEW inspects, tests insulation resistance, documents fitness. Technical Services restores in sequence. FCC confirms alarms normal. No re-energisation on visual inspection alone.

**Allowed:**
- Keep circuit isolated
- Request LEW inspection
- Staged re-energisation on LEW certification
- Alarm verification via FCC

**Forbidden:**
- Re-energise before LEW sign-off
- Re-energise on visual inspection alone
- Re-energise before the room is dry
- Reset a tripped breaker before LEW tests insulation resistance

**Exceptions:**
- Critical facilities manager co-signs the LEW sign-off before return to service; the client SLA notice goes via the CFM (TS-10, TE-06)

### TS-08 — Preserve evidence and photos for insurer before cleanup

- **Pill version:** 1.2.0
- **Action class:** Requires Approval
- **Owner:** Asset Operations Manager
- **Escalate to:** Asset Operations Manager, falling back to Head Technical Services
- **Required evidence (ALL must be confirmed):** pre_cleanup_photos, failed_component_retained
- **BLOCKED if any required evidence is missing.**
- **Deadline:** 60 minutes

**Decision:** Notify insurer or broker within the policy notification window. Preserve evidence: pre-cleanup photos with timestamps, failed component retained and tagged. Schedule loss adjuster. Separate landlord vs tenant damage scope. Do not commit to repairs beyond emergency mitigation before adjuster contact.

**Allowed:**
- Insurer notification
- Evidence pack compilation (photos, video, timeline)
- Retain and tag failed component
- Contractor quotations for emergency mitigation

**Forbidden:**
- Disposing of the failed component before adjuster release
- Committing to repairs beyond emergency mitigation before adjuster contact
- Allowing cleanup before pre-cleanup photos are taken

### TS-09 — Start extraction and drying within 24 hours, verify dry within 48

- **Pill version:** 1.2.0
- **Action class:** Recommend
- **Owner:** Technical Services Lead
- **Escalate to:** Asset Operations Manager, falling back to Head Technical Services
- **Required evidence (ALL must be confirmed):** moisture_meter_readings, affected_materials_inventory
- **Deadline:** 1440 minutes

**Decision:** Mobilise extraction, dehumidifiers and air movers. Moisture-map the affected area. Discard porous materials (ceiling tiles, fibreglass insulation). Re-check moisture at 24 hours and 48 hours. Drying equipment must be energised from circuits cleared by LEW, not from the affected board.

**Allowed:**
- Contractor mobilisation
- Equipment hire (dehumidifiers, air movers)
- Material disposal (wet ceiling tiles, insulation)
- Moisture mapping and logging

**Forbidden:**
- Closing up ceilings or walls before moisture readings are within target
- Running drying equipment from circuits not yet cleared by LEW
- Reusing wet porous materials

**Exceptions:**
- Category 2/3 water — disinfect before drying; PPE required

### TS-10 — Data-centre CRAH or chilled-water leak — contain, escalate to CFM

- **Pill version:** 1.2.0
- **Action class:** Must Escalate
- **Owner:** Technical Services Lead
- **Escalate to:** Dc Critical Facilities Manager, falling back to Head Technical Services
- **Required evidence (ALL must be confirmed):** leak_alarm_confirmed
- **Deadline:** 5 minutes

**Decision:** Notify DC operations and critical facilities manager immediately. Isolate the water source (CRAC/CRAH condensate, chilled-water branch). Deploy containment and drip diversion. Any IT power-down is proposed only and executed by the IT/BCP owner or critical facilities manager. Client SLA notification is triggered via the critical facilities manager, not via the tenant experience comms flow.

**Allowed:**
- Isolate CRAH/chilled-water branch
- Containment and drip diversion
- Notify critical facilities manager with evidence pack
- Client SLA notification via critical facilities manager

**Forbidden:**
- Switching off IT racks or UPS output without BCP owner approval
- Pumping water with equipment powered from in-room circuits
- Sending tenant-experience comms to DC clients (use SLA channel)

### TS-11 — Clear stagnant water within 24 hours — NEA vector control

- **Pill version:** 1.2.0
- **Action class:** Recommend
- **Owner:** Technical Services Lead
- **Escalate to:** Asset Operations Manager, falling back to Head Technical Services
- **Required evidence (ALL must be confirmed):** standing_water_location_photos
- **Deadline:** 1440 minutes

**Decision:** Remove standing water within 24 hours. Where it cannot be removed, treat with larvicide via pest-control contractor and inspect daily until dry. Record in the vector-control log. NEA holds owners and occupiers liable for mosquito breeding.

**Allowed:**
- Pump out standing water
- Larvicide via pest-control contractor
- Daily inspection until dry
- Vector-control log entry

**Forbidden:**
- Leaving pooled water over a weekend without treatment
- Discharging water into storm drains without checking for contaminants

### TS-12 — PUB heavy-rain alert — pre-emptive basement and roof checks

- **Pill version:** 1.2.0
- **Action class:** Recommend
- **Owner:** Technician
- **Escalate to:** Asset Operations Manager, falling back to Head Technical Services
- **Required evidence (ALL must be confirmed):** pub_alert_station_near_asset
- **Deadline:** 30 minutes

**Decision:** Within 30 minutes of the alert: test basement sump pumps and float switches, clear roof outlets and rainwater downpipes, stage flood barriers at carpark ramps and known low points, brief security on patrol points. Do not deploy barriers that block egress routes.

**Allowed:**
- Sump pump test
- Rainwater downpipe and roof drain clearance
- Flood barrier deployment at carpark ramps
- Security briefing on patrol points

**Forbidden:**
- Deploying barriers that block egress routes
- Ignoring a pump-run alarm during the warning window

### TS-13 — Emergency isolation before fire-protection red-tag — immediate life safety only

- **Pill version:** 1.2.0
- **Action class:** Must Escalate
- **Owner:** Fire Safety Manager
- **Escalate to:** Fire Safety Manager, falling back to Head Technical Services
- **Required evidence (ALL must be confirmed):** immediate_life_safety_hazard
- **BLOCKED if any required evidence is missing.**
- **Deadline:** 5 minutes

**Decision:** An immediate life-safety hazard (e.g. water on live equipment) is confirmed: isolate the fire-protection source first, inform the FSM within 5 minutes, and raise the red-tag impairment permit retrospectively. Fire watch, insurer notice and restoration then follow TS-05. This is the only path to a fire-protection isolation before FSM authorisation, and it holds only while the hazard is confirmed.

**Allowed:**
- Emergency isolation of the smallest zone that removes the hazard
- Inform the FSM within 5 minutes
- Raise the red-tag impairment permit retrospectively
- Post fire watch once the zone is isolated

**Forbidden:**
- Emergency isolation on an unconfirmed life-safety hazard
- Isolating more than the zone needed to remove the hazard
- Leaving the FSM uninformed beyond 5 minutes
- Skipping the retrospective red-tag permit

