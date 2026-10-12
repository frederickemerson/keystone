# Polish plan: flow, links, guided demo, connectors, exports, restyle

Source reviews: `docs/review/first-time-user.md` (newcomer walkthrough) and
`docs/review/solution-gaps.md` (gap audit). Read both before starting.

## Shared contract (done; do not change without the coordinator)

- `lib/journey/routes.ts`: **every in-app link goes through `routes.*`**. New routes:
  `/registry/[pillId]` (pill hub, rule anchors `#rule-<id>` via `ruleAnchorId`),
  `/incidents`, `/incident/[id]/record`, `/c`, `/connectors`. Query params:
  `/capture?at=HH:MM:SS` (seek), `/canvas/[pillId]?rule=TS-07` (scroll + highlight),
  `/learning/[pillId]?incident=INC-…`.
- `lib/journey/demo-path.ts`: the guided demo's 8 steps (one persona, one screen each).
- `lib/journey/glossary.ts` + `components/journey/Term.tsx`: wrap jargon on first use
  per screen: `<Term k="shadow">trial run</Term>`.
- `lib/journey/handoff.ts` + `components/journey/HandoffButton.tsx`: wherever the
  current persona cannot act, show `HandoffButton` with
  `suggestHandoff(<the real authority check>, currentActor)`. Never a second copy of policy.
- `lib/connectors/contract.ts`: schema for `data/connectors.json`.
- Merge gate: `lib/journey/__tests__/contract.test.ts` ("every route pattern has a page").

## Global rules for every builder

- Start with `git status`; read `CLAUDE.md`, `LESSONS.md`, `~/.claude/AAR_LESSONS.md`.
- Only edit files you own (below). Need a change elsewhere? Note it in your final report.
- Gates stay deterministic; LLM output is only a draft; label simulated vs live honestly.
- Copy: sentence case, plain English, no handwriting fonts in the app, no hard-coded
  future version numbers (derive from history).
- Do not grow `components/incident/IncidentRoom.tsx`: put new pieces in new files.
- Full gate before you finish: `npx tsc --noEmit && npx vitest run && npx next build`
  (the contract's "every route pattern has a page" test may fail until all builders merge;
  everything else must pass). Commit on your branch; do not push.
- Never run `next build` while a `next dev` server shares the same `.next`.

## Builder A: correctness and one story

Owns: `lib/governance/**` (except `__tests__` added by others), `components/learning/**`,
`app/learning/**`, `components/canvas/**`, `app/canvas/**`, `components/pulse/**`
(not `app/pulse/page.tsx`), `components/incident/TenantMessagePanel.tsx`,
`data/fixtures/capture/**`, `lib/capture/fixtures.ts`.

1. **One story, no version collisions.** The Learning correction (TS-02 15→10 min) and
   the frontline note (TS-14) both claim "v1.3.0". Remove every hard-coded future version
   in copy (landing copy is owned by the coordinator; list any you find). Learning must
   show the *current* proposal state correctly (no "Approved" next to "propose the
   correction first"); its eval story must be consistent whichever version is next.
2. **Deterministic demo note.** The recorded demo close-out note must draft the same rule
   offline every time (add a recorded extraction to the fixture, labelled as recorded demo;
   the live extractor stays optional).
3. **Learning reads `?incident=`** (default the demo incident) and links back to the
   incident room (`routes.incident`).
4. **Canvas `?rule=`**: scroll to and highlight that tile; rule tiles get
   `id={ruleAnchorId(id)}`. Canvas header: approved version vs tile review states must not
   contradict ("Approved v1.2.0" beside 13 "Pending" → explain: "Rules in v1.2.0 are live;
   tiles track this review").
5. **No Shadow approval with zero trial runs** (governance rule + test), or state plainly
   why it is allowed. Pick the root-cause fix.
6. **One pass/fail count** across Pulse, Learning, Registry, Approvals (6/6 vs 0/6 vs 99 of
   100 vs 78/79): one helper, one wording.
7. **"NaN min overdue"** in the tenant message panel.
8. **Pulse** shows Pass outcomes for asset types its coverage table calls Gap: fix the logic.
9. Hand-offs (`HandoffButton`) on canvas and learning dead ends.

## Builder B: connect every screen

Owns: `components/incident/**` (except `TenantMessagePanel.tsx`), `app/incident/[id]/page.tsx`,
`app/registry/**`, `components/registry/**` (except `PillDetailPanel.tsx` `handleExport`,
owned by D), `app/incidents/**` (new), `components/approvals/**`, `app/approvals/**`,
`components/capture/ExpertCallClient.tsx`, `app/capture/**`.

1. **Incident room links**: every pill chip, rule id, version and expert quote links
   (`routes.pill`, `routes.canvas(…, rule)`, `routes.capture(timestamp)`); the Why drawer
   footer gets "Open rule in pill", "Hear the expert", "Suggest a correction" (→ learning).
   Show which pill versions are loaded ("Chilled water leak v1.2.0 · 15 rules").
2. **Pill hub `/registry/[pillId]`**: overview (owner/steward/approver, versions with
   status, live version from the governance store), rules list with anchors, each rule's
   expert quote + timestamp link, "applied in" incidents, links to canvas and learning,
   export (D's button). Registry list rows link to hubs.
3. **`/incidents`**: list of incidents (id, asset, type, status, pills applied) → rooms.
4. **Approvals**: each item links to its pill hub and rule; after an action, show the next
   step; dead ends become `HandoffButton`s.
5. **Expert call**: `?at=` seeks the call; confirming a rule on the call carries over to
   the canvas review (root cause: share the governance store action, do not duplicate).

## Builder C: guided demo, navigation, restyle

Owns: `components/app-shell.tsx`, `components/shell/**` (except `AuditLogDrawer.tsx`),
`app/sign-in/**`, `app/globals.css`, `app/layout.tsx`, `app/pulse/page.tsx`,
`components/journey/**` (new files; `Term.tsx`/`HandoffButton.tsx` may be refined, not
re-signed).

1. **Guided demo**: sign-in leads with "Start the guided demo" (as the first step's
   persona). A floating guide panel in the shell shows step n of N, stage, "Do this",
   "Notice", Back / Next. Next switches persona (`useSwitchUser`) and navigates to the
   step's href. State survives reloads (sessionStorage, try/catch) and can be closed and
   resumed from the header.
2. **Journey bar**: Capture · Compile · Apply · Learn · Reuse in the header, current stage
   derived from the route (and the guide step when active).
3. **Navigation by loop stage**, no hard-coded pill or incident: Operate (Pulse,
   Incidents), Knowledge (Pills = registry), Capture (Expert call, Equipment `/c`),
   Govern (Approvals), Integrate (Connectors). Breadcrumbs where useful.
4. **Sign-in**: Enter without a choice must not sign in a random persona; the demo cast
   first and labelled with what each does in the story; the rest under "Other roles".
5. **Pulse** (`app/pulse/page.tsx`): a role-aware "Start here" card that points at the
   guided demo or the persona's next job.
6. **Glossary**: a header "?" opening all `GLOSSARY` entries.
7. **Restyle (phase E)**: the app should feel like the landing hero: page titles in
   Instrument Serif (`--font-serif-display`, via the `main h1` rule in globals.css), a
   calmer sidebar, deep night/lavender accents from the hero palette, consistent cards.
   Only via globals.css tokens and shell components; do not edit other builders' files.

## Builder D: connectors and exports

Owns: `data/connectors.json` (new), `lib/connectors/**` (impl + tests; the contract file is
fixed), `app/connectors/**` (new), `components/connectors/**` (new),
`components/mosaic/EvidenceTimeline.tsx`, `app/incident/[id]/record/**` (new),
`lib/record/**` (new), `components/export/**` (new), `lib/export/**` (new),
`components/registry/PillDetailPanel.tsx` (`handleExport` only),
`components/shell/AuditLogDrawer.tsx` (export button only), `app/c/page.tsx` (new).

1. **Connectors**: `data/connectors.json` per the contract (iBMS alarms, leak detection,
   CMMS work orders, tenant hotline, technician app, LEW sign-off, contractor; AI services:
   CodeBuddy SDK / TokenHub Singapore / OpenAI fallback / Jev / Tencent ASR / browser
   speech; exports). Tests: schema; every evidence key exists in a pill's evidence.yaml;
   every timeline source in `data/incidents` maps to a connector; no telemetry connector
   can confirm gate evidence; AI service status computed from the same config checks the
   LLM chain uses (never "live" in the file). `/connectors` screen: grouped list, status
   chips, what each feeds, sample payload, the "a feed can raise an incident; only a named
   person opens a gate" principle.
2. **Timeline labels** from connectors (`lew` → LEW sign-off, etc.); no raw ids.
3. **Governed skill package export**: a `.zip` of the *approved* version (from the
   governance store) with `SKILL.md`, real `rules.yaml`, `evidence.yaml`, provenance,
   evals, CHANGELOG; test that the package loads back through the pill loader and passes
   the same evals. Replace `handleExport`. Add a small dependency only if needed (prefer
   `fflate`).
4. **Incident decision record** `/incident/[id]/record`: printable; pills and versions
   applied, gates and their evidence (source, confirmer, time), named-human decisions,
   what happened to the AI proposal, the incident's audit trail; "Download JSON". Respect
   role redaction (scope the incident server-side like the room does).
5. **Audit log export** (CSV and JSON) in the audit drawer.
6. **`/c` equipment index**: assets with QR/teach links.
