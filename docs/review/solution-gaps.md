# Keystone: solution gap analysis

Date: Mon 12 Oct 2026, four days before the Fri 16 Oct submission. This is a read-only audit: no code was changed and no browser was used (another agent is doing the UI walkthrough). Evidence comes from `CLAUDE.md`, `LESSONS.md`, `README.md`, `docs/SUBMISSION.md`, `docs/ARCHITECTURE.md`, `docs/review/judge-scorecard.md` and the source in `app/`, `components/`, `lib/`, `pills/` and `data/`.

The owner said: *"it feels incomplete and confusing: maybe we need more connectors, exports, and incident room. Where are pills being listed there?"* Judges will ask three things. How does data get in? How does knowledge get out and get reused? How does this fit Keppel's real systems?

**Short answer.** The core is strong: a deterministic engine, governed versions, provenance and evals. What makes it feel incomplete is not missing capability but missing **joins**:

- the Incident Room names pills and rules but links to nothing;
- the Registry is a dead end with no rule list and no deep link;
- the nav hard-codes one pill and one incident;
- the two answers judges ask for most, "where does evidence come from" and "what do I take away", have no screen. One exists only as an unlabelled `source` string on timeline events. The other is a JSON download that exports the wrong version.

Most of the fix is wiring that already-correct data together, plus two honest new surfaces: Connectors and the decision record.

Effort scale: **S** under 2 h, **M** under 6 h, **L** over 6 h. Impact is on judging: **H**, **M** or **L**.

---

## 0. Prioritised top 8 (impact × effort)

| # | Gap | Impact | Effort | Section |
|---|-----|--------|--------|---------|
| 1 | Make pills and rules in the Incident Room clickable: pills in use, rule ids and the Why drawer footer link to the pill's rule and its provenance | H | S–M | §3 G3.1–G3.3 |
| 2 | Turn the Registry into the pill hub: `?pill=&rule=` deep links, a rules tab with the expert quote, "applied in" incidents, and links to Canvas and Learning | H | M | §3 G3.4 |
| 3 | Add a Connectors screen. Contract first (`data/connectors.json` plus a consistency test), with honest statuses (simulated, live, adapter not configured, planned), sample payloads and the mapping to evidence keys | H | M | §1 |
| 4 | Fix the pill export: it ships the disk v1.2.0, not the governed live version, and omits `evidence.yaml`. Replace it with a governed-version `.zip` skill package and a round-trip test | H | M | §2 G2.1 |
| 5 | Incident decision record: a printable page plus JSON, with pills and versions applied, gates, evidence by source and confirmer, named-human decisions, the AI proposal's fate, and audit events filtered to the incident. Includes audit log export. | H | M | §2 G2.2–G2.3 |
| 6 | Navigation by loop stage (Operate · Knowledge · Capture · Govern · Integrate), with the hard-coded pill and incident nav entries removed, plus a "Demo path" stepper | M–H | S–M | §4 |
| 7 | Close the loop both ways: Learning takes `?incident=` instead of the hard-coded `INC-2026-1011`, links back to the room, and the room shows "evaluated with v1.3.0, opened under v1.2.0" | M | S | §3 G3.5–G3.6 |
| 8 | A model-agnostic proof that judges can see: an "Engine inputs" panel in the Why drawer (pill@version, asset profile, evidence; model input: none) and two recorded proposals from different models reaching the same gate | M | S | §5 G5.4 |

---

## 1. Connectors: how data gets in

### What exists today

| Thing | Evidence | What it really is |
|---|---|---|
| Evidence timelines | `data/timelines/INC-2026-1011.json`, `INC-2026-1012.json`. Schema at `lib/data/schemas.ts:226-233` (`source: z.string()`, `type`, `text`, `evidence_updates`, `sensitivity`) | Hand-authored mock events. Each event already carries its evidence-key updates, so the "mapping" from raw signal to evidence key is pre-baked by the author. |
| Event sources used | `CMMS`, `iBMS`, `tenant`, `tenant_experience`, `technician`, `technical_services`, `lew`, `critical_facilities` (all timelines) | A free-form string with no enum, no registry and no adapter behind it |
| Loader (the de facto "connector") | `lib/data/index.ts:98-101` `loadTimeline()` reads `data/timelines/<id>.json` with zod | A file read. No interface, no polling, no webhook. |
| Replay | `components/incident/ReplayControls.tsx`, `components/incident/engineInputs.ts:1` ("Adapters from data/ records to engine inputs, plus replay-step evidence") | Steps through recorded events; the engine sees accumulated evidence |
| Source icons and labels | `components/mosaic/EvidenceTimeline.tsx:20-31` `SOURCE_MAP` = `iBMS, CMMS, tenant, technician, contractor, LEW` | **Bug:** data uses `lew`, not `LEW`, and `technical_services`, `tenant_experience` and `critical_facilities` are not mapped. The UI falls back to a generic icon and the raw snake_case id, which breaks the sentence-case copy rule. |
| Brick / Haystack / COBie | `lib/data/schemas.ts:69-81` (equipment `brick_class`, `cmms_asset_code`), `:139-143` (`ontology_refs.brick_version`, `haystack_phIoT_version`, `cobie_facility_id`); `data/assets.json` (e.g. `LD-23-04` `brick:Water_Leak_Sensor`, `connected_to: iBMS`); `evidence.yaml` descriptions cite `brick:Leak_Alarm` | Real, consistent metadata. It is the best basis for a connector story ("bind by Brick class, not vendor point id"), but nothing in the UI shows it except the Registry's "Equipment classes (Brick)" row (`components/registry/PillDetailPanel.tsx:127-130`). |
| Live external services | Jev evidence suggestions `app/api/jev/suggest/route.ts` (live, unconfirmed suggestions only); LLM chain `lib/llm/providers.ts` (`expectedLiveProvider()`), TokenHub live in ap-singapore | The only genuinely live integrations. They are AI services, not building-data feeds. |
| Honest-status pattern already in code | `lib/capture/asr.ts:37-64`: `tencentAsrStatus()` returns `not_configured` or `not_verified`, and `serverAsrChain()` | The right model for connector status vocabulary: statuses are computed from configuration and never claimed |
| Docs position | `docs/ARCHITECTURE.md:20` "Proposed / production-only: live BMS/iBMS/DCIM integration"; `docs/SUBMISSION.md` §10 "Integration (proposed) … iBMS alarm feed, leak-detector telemetry, CMMS work orders" | Honest in the docs, invisible in the product |

**The safety property already holds in the data.** No `iBMS` event confirms a gating key (any `required_evidence` key or exception `add_required_evidence` key). Every gating key is confirmed by a human source (`technician`, `lew`, `technical_services`, `critical_facilities`, `tenant_experience`) or by `CMMS` (`shutoff_map_available`, a document-in-hand fact). This is the strongest connector claim available: **a feed can raise an incident but can never open a gate.** Nothing enforces or displays it yet.

### Gaps

- **G1.1 (H, M): no Connectors screen and no connector contract.** A judge cannot see where evidence comes from, which sources are real, or how a Keppel iBMS or CMMS would plug in.
- **G1.2 (M, S): source vocabulary is free text.** This causes the label bug above and leaves no test that every source is known.
- **G1.3 (M, S): the "feeds cannot open gates" invariant is implicit.** Make it a test and a sentence on the screen.
- **G1.4 (L, L): no runtime adapter interface or ingestion endpoint.** Do **not** build one before Friday. A fake "webhook receiver" would invite the question "show it receiving from a BMS", and the answer is no.

### Build spec: smallest honest version (G1.1–G1.3), about 4–5 h

**Contract first** (per `CLAUDE.md`: change the contract, then the content). New `data/connectors.json`, validated in `lib/data/schemas.ts` and loaded by `lib/data/index.ts` `loadConnectors()`:

```jsonc
{
  "connectors": [
    {
      "id": "ibms-hf1",
      "label": "iBMS alarms and trends",
      "system_class": "Building management system",
      "kind": "telemetry",              // telemetry | record | human | ai_service
      "status": "simulated",            // simulated | live | adapter_not_configured | planned
      "status_note": "Replayed from a recorded timeline. No BMS is connected.",
      "sites": ["asset-hf1"],
      "event_sources": ["iBMS"],        // must cover every timeline `source`
      "proposed_transport": "BACnet/IP gateway → MQTT topic per site (proposed)",
      "binds_by": "Brick class",
      "brick_classes": ["brick:Water_Leak_Sensor", "brick:AHU"],
      "maps_to": [
        { "event_type": "alarm", "evidence_key": "leak_alarm_active", "confirms": true },
        { "event_type": "sensor_anomaly", "evidence_key": "chw_flow_anomaly", "confirms": true },
        { "event_type": "sensor_anomaly", "evidence_key": "active_water_release", "confirms": false }
      ],
      "sample_event": "INC-2026-1011#EV-1011-01"
    }
    // cmms-hf1 (record, simulated, maps shutoff_map_available, confirmed_by_role technical_services_lead)
    // field-app (human: technician, lew, technical_services; simulated, entered via timeline)
    // tenant-desk (human: tenant, tenant_experience; simulated)
    // dcim-hfdc1 (telemetry, planned), fm-agreement-sla (record, planned)
    // ai: tokenhub-hy4 / openai / codebuddy-sdk / jev / tencent-asr / web-speech: status computed at request time
  ]
}
```

**Consistency tests** (extend `lib/data/__tests__/consistency.test.ts` with a new section "7. connectors"):

1. Every timeline event `source` appears in exactly one connector's `event_sources`.
2. Every `maps_to.evidence_key` is declared in some pill's `evidence.yaml`, with a matching type.
3. **A `telemetry` connector never maps a gating key with `confirms: true`.** Gating keys are collected from all `required_evidence` and `add_required_evidence` entries. This encodes "a feed can raise, never open".
4. A `record` connector that confirms a gating key names a `confirmed_by_role` that is in that key's `confirmable_by`.
5. `status: "live"` is forbidden in the JSON for data feeds. AI-service statuses are never stored; they are computed (next point).

**Status from authoritative signals.** AI-service rows read real configuration on the server: `expectedLiveProvider()` (`lib/llm/providers.ts`), `serverAsrChain()` (`lib/capture/asr.ts:64`) and the presence of `JEV_API_KEY`. Never hard-code "live".

**Fix the source labels.** Replace `SOURCE_MAP` in `EvidenceTimeline.tsx:20-27` with labels derived from the connector registry, passed in as props or resolved server-side. That also fixes the `LEW`/`lew` mismatch.

**Page.** `app/connectors/page.tsx` (server component; protected by default through `middleware.ts`, no allowlist change) plus `components/connectors/ConnectorTable.tsx` and `ConnectorDetail.tsx`.

- Header: **"Connectors"**. Subtitle: *"Where incident evidence comes from. Nothing here writes to a building system."*
- Status legend, sentence case: **Simulated**: "Replayed from recorded data. No system is connected." · **Live**: "Calls an external service now." · **Adapter not configured**: "Code exists; no credentials, never verified." · **Planned**: "Proposed for a pilot."
- Grouped table: *Building systems* (iBMS, DCIM), *Work and records* (CMMS, FM agreements), *People on site* (technician, LEW, Technical Services, Tenant desk), *AI services* (TokenHub hy4-preview, OpenAI fallback, CodeBuddy SDK, Jev, Tencent ASR, browser speech).
- Columns: Source · Status · Sites · Binds by · Evidence keys it can set.
- Detail drawer: the sample event rendered with `EvidenceTimeline`, the mapping table "Event field → evidence key → confirms?", and the rule. Rule copy: *"Telemetry can raise an incident. It can never confirm a gating item such as LEW sign-off: those need a named person in the key's confirmable-by list. Enforced by test."*
- Footer: *"Pilot path: bind iBMS points by Brick class (Brick 1.5.0) so the same pill runs at any site whose points are tagged; CMMS work orders by `cmms_asset_code`."*
- Link each evidence key to the registry rule(s) that read it (`/registry?pill=…&rule=…`, see §3).
- From the Incident Room evidence panel, the source chip on each event links to `/connectors#<connector-id>`.

---

## 2. Exports: how knowledge gets out

### What exists today

| Export | Evidence | State |
|---|---|---|
| Pill JSON bundle | `components/registry/PillDetailPanel.tsx:68-77` `handleExport()` → `${bundle.id}.pill.json`; button copy "Export pill (.json bundle)" at `:187-199` | **Exports the wrong thing.** It uses `bundle.pill.rules`, the file on disk (v1.2.0), not `focus.rules`, the governed live version computed at `:58-59`. After the Learning flow approves v1.3.0 (TS-02 15 → 10) or the v1.4.0 rollback, the export still ships v1.2.0 with the disk frontmatter version. It also **omits `evidence.yaml`**, so the exported rules reference undeclared keys. `rules.yaml` is emitted as parsed JSON, not YAML, so the bundle is not an installable skill folder. |
| SKILL.md frontmatter | `components/registry/registry-utils.ts:102-105` `skillFrontmatter()` (js-yaml dump of the manifest) | Works; it reuses the disk manifest version and status |
| CodeBuddy install snippet | `PillDetailPanel.tsx:201-206` (`cp -r pills/... .codebuddy/skills/...`); `package.json` `skills:sync` | Repo-level only. It copies disk files, never the governed version. |
| Printable QR label | `app/c/[assetId]/qr/page.tsx:18` print CSS, `components/capture/PrintButton.tsx` | The only print or export surface in the app |
| Audit log | `components/shell/AuditLogDrawer.tsx:33-83` (dialog, list); `lib/governance/audit.ts:44-63` events carry `pillId`, `pillVersion`, `incidentId`, `ruleId`, `evidenceKey`, `noteId` | View only. No filter, no export. The fields needed for an incident record are already there. |
| Incident decision record | none | Missing |
| Eval or shadow report | `components/learning/EvalMatrix.tsx`, `ShadowPanel.tsx` | View only |
| Tenant message | `components/incident/TenantMessagePanel.tsx` | Approve or reject only. No copy action (correct: "Keystone never sends"). |

### Gaps and build specs

**G2.1 (H, M): governed skill package export.** This is the "knowledge out, reused elsewhere" answer, and today it is subtly wrong.

- New pure module `lib/pills/package.ts`: `buildSkillPackage(bundle, version: PillVersion): Record<path, string>`. It returns the real files:
  - `SKILL.md`: the frontmatter re-dumped with `version`, `status` and an `approved_by` comment from the governed version, plus `skillBody`.
  - `rules.yaml`: `yaml.dump({rules: version.rules})` in the same shape `parsePill` reads.
  - `evidence.yaml`: re-serialised `evidenceCatalog`.
  - `provenance.json`: the disk provenance merged with any `version.capture` provenance for rules proposed from notes (TS-14).
  - `evals/*.yaml`: the original eval text.
  - `CHANGELOG.md`: the disk changelog plus generated entries for each governed version (who proposed, shadowed and approved, with the reason).
- Zip it client-side, because the governance store lives in `localStorage`. Use `fflate` (small and tree-shakeable) or a ~60-line store-only zip writer with CRC32. Either is fine; no server route is needed.
- **Round-trip test** (`lib/pills/__tests__/package.test.ts`): `parsePill(buildSkillPackage(b, v))` equals `pillAtVersion(b.pill, v)`, and `runEvals` gives identical results. Run it for v1.2.0, the v1.3.0 candidate and the v1.4.0 rollback. This is the test that would have caught the current bug.
- UI (`PillDetailPanel.tsx` "Portability"):
  - Primary button **"Download skill package (.zip)"**. Helper: *"v1.3.0 · approved by Goh Boon Kheng · SKILL.md at the root, the folder shape CodeBuddy loads. WorkBuddy and ADP import are designed for, not tested."*
  - Secondary **"Download as JSON"**: keep it, fix it to the governed version and include evidence.
  - Change the install snippet to `unzip chilled-water-leak-v1.3.0.zip -d .codebuddy/skills/chilled-water-leak`.
- Honesty: say only that CodeBuddy load is verified (`docs/proof/04a`, `04b`), and only for the disk version.

**G2.2 (H, M): incident decision record.** This answers "what does the AOM hand to the Head of TS, the insurer or the BCA reportable-matters file?"

- Route `app/incident/[id]/record/page.tsx`. A server shell scopes the incident, asset and timeline (reuse the `scenarioFor` logic in `app/incident/[id]/page.tsx:53-65`). A client body reads the governance store, `decisions` and audit, because they live in the browser.
- Sections, in sentence case:
  - **"Incident"**: id, asset, location, opened at, status.
  - **"Pills applied"**: every approved pill and version evaluated. Not just `incident.pill_applied`: `data/incidents.json` holds one pill, while the room evaluates all of them (`IncidentRoom.tsx:214-237`).
  - **"Gates and actions"**: one row per triggered rule: status, action class, missing evidence, escalation target, the named human who decided, and when.
  - **"Evidence"**: key, value, confirmed by whom, source connector, time.
  - **"AI proposals"**: text, model (labelled *recorded*), the gate that held it, e.g. *"Held by TS-07 v1.2.0: LEW sign-off, insulation resistance and area dry not confirmed"*.
  - **"Tenant communication"**: draft id, approver, decision; *"Not sent by Keystone"*.
  - **"Audit trail"**: events where `incidentId === id`.
- Footer: *"Generated from the demo governance store in this browser. Mock data."*
- Exports: **"Print or save as PDF"** (`window.print()` with the print CSS pattern from `app/c/[assetId]/qr/page.tsx:18`) and **"Download JSON"**. The JSON shape `IncidentDecisionRecord` goes in `lib/governance/record.ts`, with a pure builder and a unit test.
- Entry points: an Incident Room header button **"Decision record"**, and the Pulse closed-incident list.

**G2.3 (M, S): audit log export and filter.** In `AuditLogDrawer.tsx`, add filter chips (**All · This incident · This pill**) and **"Download CSV"** and **"Download JSON"** buttons. Columns: `at, actor, role, action, pill, version, incident, rule, detail`. A pure `toCsv(log)` in `lib/governance/audit.ts`, with a test for quoting and newlines.

**G2.4 (M, S): rule card print.** On the registry rule view (§3 G3.4), add **"Print rule card"**: the rule id and title, the action class chip, *"Never: …"* forbidden actions, required evidence, escalate to (name and role, with fallback), the expert quote and timestamp, version and approver. This is "the laminated card in the plant room". Use print CSS only. Pair it with the existing asset QR label. Keep the in-app font (no handwriting font in print either).

**G2.5 (L, S): eval report JSON** from `EvalMatrix`. Nice for "reliable"; skip unless time remains.

---

## 3. Pills in the Incident Room

### What exists today

- **Pills are listed**, but as static labels. `IncidentRoom.tsx:764-786` renders a `role="group" aria-label="Pills in use"` grid of `PillLabel`s (name, domain, version), plus a chip *"<id>: no approved version"* for unapproved pills. `PillLabel` (`components/mosaic/PillLabel.tsx`) has no link or interaction. The owner's question "where are pills listed there?" is answered by a header-meta strip that reads as decoration.
- **Which rule fired each action is shown, but is not navigable.**
  - The blocked banner reads *"Blocked · rule TS-07 v1.2.0 — …"* (`IncidentRoom.tsx:631-635`).
  - `ActionCard` shows `{pillId}@{pillVersion}` (`components/mosaic/ActionCard.tsx:97`) and *"Rule TS-07 · named human required"* (`:221`).
  - The Why drawer shows the version, the expert quote with source and confirmer, evidence used and missing, the counterfactual and forbidden actions (`components/incident/RuleWhyDrawer.tsx:105-225`). It has an unused `footer` slot (`:225`).
- **The live version does flow into the room.** The room evaluates `currentApproved()` from the governance store via `pillAtVersion` (`IncidentRoom.tsx:214-237`), so an approval or rollback in Learning changes the room. That is the best "loop" fact in the product, and nothing on screen says so.
- **Outbound links from the Incident Room: none.** A grep for `href` and `Link` in `components/incident/*` finds nothing; only the app-shell nav leaves the page.
- **Registry**:
  - selection is `useState` only (`components/registry/RegistryExplorer.tsx:26`), so a specific pill or rule cannot be linked to;
  - the detail panel shows access, versions and portability but **does not list the rules** (`PillDetailPanel.tsx:84-208`);
  - it has no outbound links to Canvas, Learning or incidents;
  - it is linked from the sidebar only (`components/app-shell.tsx:25`).
- **Learning**:
  - hard-codes `const INCIDENT_ID = 'INC-2026-1011'` (`app/learning/[pillId]/page.tsx:13`);
  - shows the incident id as plain text (`components/learning/LearningFlow.tsx:425`);
  - has no link back to the room.
- **Inbound to Learning**: nav, `DecisionCanvas.tsx:283` (*"Go to Learning & Approval"*) and Pulse `ClosedIncidentsList.tsx:90`. **Inbound to the Incident Room**: nav, Pulse `AssetGrid.tsx:97`, `ActiveIncidentsTable.tsx:154`, `CaptureTaskCard.tsx:81`, Approvals `IncidentDecisionCard.tsx:62`, and the landing CTA (`components/landing/LandingHeader.tsx:5`).

**Loop navigability today.** Pill → incident: no (Registry has no incident links). Incident → pill: no. Incident → learning: no. Learning → incident: no. Canvas → learning: yes. Pulse → learning (for closed incidents): yes. The loop exists in data and is broken in navigation.

### Gaps and build specs

**G3.1 (H, S): pills-in-use become a real panel.** Extract a new `components/incident/PillsInUse.tsx`. `IncidentRoom.tsx` is already 1,350 lines, over the 800-line soft ceiling, so do not grow it. Each pill becomes a link card to `/registry?pill=<id>`:

- *"Chilled-water leak · v1.2.0 · approved by Goh Boon Kheng"*
- *"4 of 13 rules triggered · 1 blocked"*
- *"6 of 6 evals pass"*

Give the section a visible heading, **"Pills applied to this incident"**, instead of an `aria-label` only. Keep *"no approved version"* as a chip.

**G3.2 (H, S): rule ids link.** In the blocked banner (`IncidentRoom.tsx:633`) and the `ActionCard` meta (`ActionCard.tsx:97`, `:221`), wrap `TS-07` and `pill@version` in `Link`s to `/registry?pill=<id>&rule=TS-07`. Add an optional `ruleHref` prop to `ActionCard`; the component stays presentational.

**G3.3 (H, S): Why drawer footer** (use the existing `footer` slot, `RuleWhyDrawer.tsx:225`). Three links:

- **"Open rule TS-07 in the registry"**
- **"See where it was captured"**: `/canvas/<pill>#TS-07` (the tile has the provenance)
- **"Suggest a correction"**: `/learning/<pill>?incident=<id>&rule=TS-07`

**G3.4 (H, M): Registry becomes the pill hub.**

- URL state: `?pill=<id>&rule=<ruleId>`. Read it with `useSearchParams` in `RegistryExplorer.tsx` and keep `setSelectedId` in sync with `router.replace`.
- New tabs in `PillDetailPanel`: **Rules · Versions · Access · Portability**.
- **Rules tab**, one row per rule of the governed version:
  - id, title, action class chip, required evidence (labels from `evidenceCatalog`), escalate to, deadline;
  - the expert quote and timestamp (reuse `expertQuoteFor` from `components/incident/provenance.ts`);
  - **"Applied in"**: incidents whose audit events or `incidents.json pill_applied` reference this pill, each linking to `/incident/<id>`.
- Row actions: **"Open in canvas"** and **"Print rule card"** (G2.4).
- Header links: **"Review in canvas"** (`/canvas/<id>`) and **"Learning and approval"** (`/learning/<id>`).
- Pure helpers go in `components/registry/registry-utils.ts` (`rulesView(pill, version)`, `incidentsUsing(pillId, incidents, audit)`), with unit tests.

**G3.5 (M, S): Learning closes back to the room.**

- `app/learning/[pillId]/page.tsx`: read `searchParams.incident`, validate it against `loadIncidents()` and keep `INC-2026-1011` as the fallback.
- In `LearningFlow.tsx:425`, render the incident id as a link.
- After approve or rollback, show a CTA: **"See v1.3.0 applied in INC-2026-1011"** → `/incident/INC-2026-1011?step=end`.

**G3.6 (M, S): version drift notice in the room.** `data/incidents.json` records `pill_version` at open (1.2.0). When the evaluated approved version differs, show under the pills panel: *"Evaluated with v1.3.0, approved 12 Oct after this incident opened under v1.2.0."* `ActiveIncidentsTable` already models `appliedAtOpen` (`components/pulse/ActiveIncidentsTable.tsx:148`), so reuse that wording. This is the visible proof that learning changes operations.

---

## 4. Information architecture

### Route inventory

| Route | In nav | Linked from (in app) | Links out to | Notes |
|---|---|---|---|---|
| `/` landing | – | brand mark on every page (`app-shell.tsx:48`), sign-in | `/sign-in`, `/incident/INC-2026-1011?step=10` (`LandingHeader.tsx:5,44`; `Hero.tsx:81`), `/capture` (`Hero.tsx:90`), `/pulse` (`BrandBand.tsx:19`) | Public |
| `/sign-in` | – | middleware redirect, landing | `next` or `/pulse` (`lib/auth/redirect.ts:5`) | Public |
| `/pulse` | yes | sign-in default, landing | incident (`AssetGrid.tsx:97`, `ActiveIncidentsTable.tsx:154`, `CaptureTaskCard.tsx:81`), learning (`ClosedIncidentsList.tsx:90`, **TS pill only**) | The coverage strip shows "Gap" (`PillCoverageStrip.tsx:62`) with no action |
| `/capture` | yes | nav, landing | `/canvas/<pill>` (`CallPanel.tsx:405`) | One transcript |
| `/canvas/[pillId]` | yes, **hard-coded TS pill** (`app-shell.tsx:21`) | nav, capture | `/learning/<pill>` (`DecisionCanvas.tsx:283`), `/approvals` (`NoteDrafts.tsx:145`) | `/canvas/tenant-experience-incident-comms` is an **orphan** (URL only) |
| `/registry` | yes | **nav only** | **nothing** | **Dead end**; no deep link (`RegistryExplorer.tsx:26`) |
| `/incident/[id]` | yes, **hard-coded INC-2026-1011** (`app-shell.tsx:27`) | nav, pulse, approvals, landing | **nothing** | **Dead end** apart from the nav. There is no incident list page; `INC-2026-1012` is reachable only through the "Apply to DC1" toggle or Pulse. |
| `/approvals` | yes | nav, canvas note drafts | `/incident/<id>` (`IncidentDecisionCard.tsx:62`) | No link to the version under review in Learning |
| `/learning/[pillId]` | yes, **hard-coded TS pill** (`app-shell.tsx:33`) | nav, canvas, pulse closed list | in-page anchors only (`LearningFlow.tsx:104`) | **Dead end**; incident hard-coded (`page.tsx:13`); the TE pill's learning page is an **orphan** |
| `/c/[assetId]` | – | `/c/[assetId]/qr` only (`qr/page.tsx:37`) | `/c/<id>/qr` (`page.tsx:71`) | **Orphan**: no in-app link from the asset grid, the room or the registry. The QR is the only way in. |
| `/c/[assetId]/qr` | – | `/c/[assetId]` | `/c/[assetId]` | Print page |
| `/connectors` | – | – | – | Proposed (§1) |
| `/incident/[id]/record` | – | – | – | Proposed (§2) |

**Root causes of "confusing":**

1. The nav lists **pages**, not **objects**. Three nav items are pinned to one pill and one incident (`app-shell.tsx:21,27,33`), so the second pill is invisible and "Decision canvas" and "Learning" look like global sections.
2. The **pill is not a hub**. Every screen talks about pills, and no screen is the pill.
3. **Dead ends** at Registry, Incident and Learning mean the story has to be driven from the sidebar, which runs in build order (pulse, capture, canvas, registry, incident, approvals, learning), not story order.

### Proposed navigation model

Group the sidebar by loop stage, with objects as hubs. Keep every existing route so nothing breaks.

```
Operate      Portfolio pulse · Incidents (list → room → decision record)
Knowledge    Pills (registry → pill hub: rules · versions · access · portability)
Capture      Expert call · Frontline notes (open capture tasks) · Equipment QR
Govern       Approvals (count badge) · Audit log
Integrate    Connectors
```

- `components/app-shell.tsx`:
  - make `NAV_ITEMS` sections with group headings;
  - point "Incidents" at a new light `/incidents` list (a server page reusing `ActiveIncidentsTable` and `ClosedIncidentsList`), or at `/pulse#incidents` if time is short;
  - remove the hard-coded canvas and learning entries; they are reached from the pill hub;
  - keep `isActive` section matching, and map `/canvas/*` and `/learning/*` to "Pills".
- **Equipment QR:** a short `/c` index listing equipment from `data/assets.json` with links to `/c/<id>`. Also add a **"Teach"** link on each `AssetGrid` equipment row and on the room's asset header (AHU-23-01).
- Breadcrumbs on pill-scoped pages: *Pills › Chilled-water leak › Learning*. Add an optional `breadcrumb` prop in `components/mosaic/PageHeader.tsx`.
- Effort: nav regroup S; `/incidents` and `/c` index S; breadcrumbs S. Together M.

### Guided demo path ("Demo path" stepper)

A small, dismissible chip in the app header, **"Demo path · step 3 of 9"**, driven by a static `components/shell/demo-path.ts` (route, one-line instruction, next href). It is not a tour overlay and does not change any logic. Steps, ordered to answer the judges' three questions:

1. **Connectors**: *"Evidence comes from iBMS, CMMS and people on site. Here it is replayed, and labelled so."*
2. **Portfolio pulse**: *"One active leak at Harbourfront One."* → open the incident.
3. **Incident room, step 10**: *"Two pills applied, chilled-water leak v1.2.0 and incident comms v1.0.0. The AI proposes re-energising; TS-07 blocks it."*
4. **Why drawer**: *"Hear the expert, then escalate to the duty LEW."* → **Open rule TS-07 in the registry**.
5. **Pill hub, rule TS-07**: *"The rule, its quote from 00:14:32, and every incident it was applied in."* → **See where it was captured**.
6. **Expert call and canvas**: *"Where the rule came from, including the riser-versus-branch contradiction."*
7. **Learning**: *"Correct TS-02 from 15 to 10 minutes, replay evals, shadow, then a different person approves."* → **See v1.3.0 applied**.
8. **Incident room, version drift notice, then Apply to Harbourfront DC1**: *"Same pills, different asset."*
9. **Take it away**: *"Download the skill package and the decision record."* Then **Equipment QR** (`/c/AHU-23-01`).

Update `README.md`'s "3-minute demo path" and `docs/submission/video-script.md` to match once built.

---

## 5. Other gaps against "capture → govern → apply → learn → reuse"

| # | Gap | Evidence | Impact | Effort | Spec |
|---|---|---|---|---|---|
| G5.1 | **Coverage gaps are not actionable.** Pulse shows logistics and residential as "Gap" with no next step. | `components/pulse/PillCoverageStrip.tsx:54,62`; assets `asset-mllh`, `asset-tr` in `data/assets.json` | M | S | On each Gap cell, add a link **"Start capture for logistics"** → `/capture` and a sentence: *"No approved pill covers this asset type. The engine returns nothing rather than guess."* (true by construction: rules scope by `asset_types`). This makes "scalable" a visible mechanism. |
| G5.2 | **No search.** A judge cannot ask "which rules mention LEW?" | No search component exists | M | S | A client-side filter box on the Registry rules tab over rule id, title, evidence labels, escalation role and the provenance quote. No LLM, no index. Copy: *"Search rules, evidence and expert quotes"*. |
| G5.3 | **Multi-pill orchestration is implicit and partly hard-coded.** The room runs every approved pill together, and the tenant gate is wired to the literal `'TE-01'`. | `IncidentRoom.tsx:172-180` (`evaluateAll`), `:604-614` (`te01`), `:988` (`p.domain === 'tenant-experience'`) | M | S (copy) / L (generalise) | Before Friday, copy only: in the pills panel (G3.1), add *"Pills run independently; each decides only its own rules. Tenant comms waits on TE-01."* After: replace the literal rule id with a pill-declared `gates_message: true` flag in `rules.yaml` (contract change first). |
| G5.4 | **Model-agnostic is asserted, not shown.** | `docs/review/judge-scorecard.md` (Portable: "no control to show it"); `README.md:54` | M | S | Add an **"Engine inputs"** section to the Why drawer: *"Pill chilled-water-leak v1.2.0 · asset profile grade A office · 17 evidence items · model input: none."* Add a recorded second proposal fixture labelled with a different model (`gpt-5.4-mini`, recorded), shown beside the hy4-preview one, both held by the same gate. Back it with a test in `lib/engine/__tests__` asserting that `evaluate()` has no model parameter and that the same evidence gives the same decision. Label: *"Recorded proposals from two models. The gate decision does not read either."* |
| G5.5 | **Capture step 1 (draft from existing records) is not built.** It is also the most credible "connector to CMMS" story. | `README.md` "Where capture goes next": "Step 1 is not built" | M | M | Add 3 mock closed work-order close-out notes to `data/fixtures/`. A **"Draft from work orders"** tile on `/capture` sends them through the existing `/api/llm/extract` (DRAFT-only guard `lib/llm/candidates.ts`) and shows the results as `DRAFT-NN` candidates labelled *"Draft from CMMS history (mock records)"*. Proposal still goes through Canvas → Learning. Optional; do it only after the top 8. |
| G5.6 | **Data model says one pill per incident; the engine applies all.** | `data/incidents.json` `pill_applied` and `pill_version` (single); `IncidentRoom.tsx:214-237` | L | S | The decision record (G2.2) lists every pill evaluated. Optionally change `pill_applied` to an array (contract and consistency test first, `consistency.test.ts:433`). |
| G5.7 | **Governance is browser-local.** Judges will ask how this fits Keppel's systems. | `docs/ARCHITECTURE.md:220-225` | M | S (copy) | On Connectors, add a "Platform" group, honest rows: *Governance store: browser (demo) → Postgres (proposed)*, *Identity: shared demo passcode → enterprise SSO (proposed)*, *Hosting: Vercel today → EdgeOne Pages (proposed)*. Do not build. |
| G5.8 | **Reuse across sites is shown with one asset pair.** The DC1 overlay switches to a different incident. | `app/incident/[id]/page.tsx:67-82` (`overlayFor` picks another incident); scorecard "Reusable: Adequate" | M | M | Optional: a **"Same evidence, other asset"** mode that runs the *current* incident's evidence against the DC1 profile (`toEngineAsset(overlay.asset)` with the primary evidence). This shows TS-07 rerouting to the CFM on identical facts. Pure engine call; label *"What-if: same evidence at Harbourfront DC1"*. |

---

## 6. Defects found while auditing (fix regardless)

1. **Pill export ships the disk version and omits evidence** (`PillDetailPanel.tsx:68-77`). See G2.1. H, because it undercuts "governed, versioned, portable" the moment a judge exports after the Learning demo.
2. **Evidence source labels.** `SOURCE_MAP` has `LEW`, data has `lew`, and `technical_services`, `tenant_experience` and `critical_facilities` are unmapped, so raw snake_case shows in the UI (`EvidenceTimeline.tsx:20-31`). Fixed by G1.2.
3. **The TE pill's canvas and learning pages are unreachable** without typing a URL (`app-shell.tsx:21,33`; `ClosedIncidentsList.tsx:90` passes the TS pill only). Fixed by G3.4 and §4.
4. **Learning's incident is hard-coded** (`app/learning/[pillId]/page.tsx:13`). Fixed by G3.5.

---

## 7. Guard-rails for whoever builds this

- **Contract first** (`CLAUDE.md`): `data/connectors.json` and its consistency tests come before any UI that reads them. Any rename of `source` values changes the timelines and the registry in one commit.
- **Honesty:**
  - No data feed may be labelled "live".
  - AI-service statuses come from `expectedLiveProvider()` and `serverAsrChain()`, never literals.
  - Recorded AI output keeps the word *recorded* on screen.
  - The export helper names only CodeBuddy as verified.
- **Deterministic gates:** nothing in this plan lets a connector, export or LLM change an engine input except through confirmed evidence. Connector rule 3 (telemetry cannot confirm a gating key) is a new invariant to test, not a relaxation.
- **Copy and type:**
  - All new copy is sentence case: "Download skill package", "Pills applied to this incident", "Decision record".
  - In-app and print views use the app's fonts. `PillLabel`'s `variant="handwritten"` stays landing-only.
- **File size:** put new Incident Room pieces in their own components (`PillsInUse.tsx`, `DecisionRecordButton.tsx`). `IncidentRoom.tsx` is already 1,350 lines.
- **Verification before pushing to `main`:** `npx tsc --noEmit && npx vitest run && npx next build`.
