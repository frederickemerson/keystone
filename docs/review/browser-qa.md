# Browser QA: Keystone (live)

- **Target:** https://keystone-tencent.vercel.app
- **Date:** 2026-10-12
- **Mode:** read-only. No approvals, publishes or other changes were submitted. Sign-in used the public demo passcode.
- **Tooling:** Playwright (Chromium), with an isolated browser context per run. axe-core 4.10.2 was injected from cdnjs. LCP and CLS were measured with a PerformanceObserver.
- **Roles tested:** Asset Operations Manager (every route at 1440×900, 1024×768 and 390×844); Technician, Head of Technical Services and Chief Engineer (every app route at 1440×900, with axe).
- **Routes:** `/`, `/sign-in`, `/pulse`, `/capture`, `/canvas/technical-services-chilled-water-leak`, `/registry`, `/incident/INC-2026-1011` (plain, `?step=10`, and the DC1 toggle), `/approvals`, `/learning/technical-services-chilled-water-leak`.
- **Screenshots:** `docs/review/qa/`

## Verdict: DO-NOT-SHIP

Five defects block shipping (D01 to D05). On phones, the two most important signed-in screens (`/pulse` and the incident room) scroll sideways by 260 to 444px. At tablet and laptop widths, the incident room's main "Escalate to …" action is cut off at the right edge. Each fix is a small CSS change. Once these five are fixed the build is **SHIP WITH FIXES**: everything else is Medium or Low.

## What passed

- **Console:** no errors, no warnings and no hydration warnings on any route, role or viewport. The only console error was the expected 401 after a deliberately wrong passcode.
- **Network:** no 4xx or 5xx responses and no failed requests. The only `ERR_ABORTED` entries are Next.js prefetches cancelled by navigation, which is normal.
- **Auth:** routes without a session redirect to `/sign-in?next=…`. A wrong passcode shows the inline alert "That passcode is not right."
- **Role masking:** Technician and Chief Engineer see `[masked: tenant PII]` in the incident room; Head of Technical Services sees the tenant name. Technicians get a disabled Approve button on `/approvals`.
- **Incident replay:** the DC1 toggle switches to INC-2026-1012 and back (`aria-pressed` updates correctly). "Jump to end" reaches Event 17 / 17.
- **Speed:** LCP was 0.37 to 1.27s on every page, all under the 2.5s target. CLS was 0 on most pages; the exceptions are D06 and D14.
- **Keyboard:** every control in the incident-room tab order shows a focus ring. Escape closes the audit drawer and returns focus to its trigger.
- **Landing animations:** with reduced motion on and off, each story section becomes fully readable (contrast 1.0 ink) once scrolled into view. No console noise.

## Defects

| # | Sev | Route | Viewport | Repro | Screenshot | Suspected file |
|---|-----|-------|----------|-------|------------|----------------|
| D01 | **High** | `/pulse` | 390×844 (82px of sideways scroll at 1024) | Sign in and open `/pulse`. The page scrolls 444px sideways and the extra area is blank. Cause: `sr-only` spans (absolutely positioned) inside the `overflow-x-auto` table wrapper have no positioned ancestor, so they are placed relative to the page and stretch it. | `qa/D01-pulse-390-horizontal-scroll-blank.png`, `qa/D05-pulse-1024-horizontal-scroll.png` | `components/pulse/ActiveIncidentsTable.tsx:64,126`, `ClosedIncidentsList.tsx:31,63,71`, `PillCoverageStrip.tsx:23`. Add `relative` to the `card-paper overflow-x-auto` wrapper. |
| D02 | **High** | every app route | 390×844 | The header's "Switch user" and "Audit log" buttons are 12px wider than the screen. "Audit log" is cut off and the whole app scrolls sideways by 12px. | `qa/D02-shell-390-audit-log-clipped.png` | `components/app-shell.tsx:129` (`ml-auto flex items-center gap-2.5`). Needs `min-w-0`, a shrinking label, or an icon-only button on small screens. |
| D03 | **High** | `/incident/INC-2026-1011` (all steps, both assets) | 390×844 | The header actions overflow by 260px: the asset toggle and Reset are right-aligned, and the two pill cards have a fixed width of `w-[19.5rem]` each. The page pans sideways and the "Apply to Harbourfront DC1" toggle is cut off. | `qa/D03-incident-390-header-overflow.png`, `qa/D03b-incident-dc1-390-overflow.png` | `components/incident/IncidentRoom.tsx:585-628` (`items-end`, `justify-end`, `w-[19.5rem]`) and the `PageHeader` actions slot |
| D04 | **High** | `/incident/INC-2026-1011?step=10` | 1024×768 | The blocked-gate card overflows by 43px. The main action "Escalate to Rahul Menon · Duty Licensed Electrical Worker" runs past the right edge (the button is 377px wide in a narrower column), and the page scrolls sideways. | `qa/D04-incident-step10-1024-escalate-clipped.png` | `components/mosaic/ActionCard.tsx` (escalate button: nowrap or no `min-w-0`) and the `lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]` grid in `IncidentRoom.tsx:631` |
| D05 | **High** | `/pulse` | 1024×768 | Same cause as D01; the page scrolls sideways by 82px. | `qa/D05-pulse-1024-horizontal-scroll.png` | same as D01 |
| D06 | Medium | `/incident/INC-2026-1011?step=10` | 1440×900 | Load the page with `?step=10`. CLS measured 0.23 to 0.32 in 4 of 5 runs (target < 0.1). The evidence timeline and the "Must escalate" panel jump after hydration, which suggests the server renders step 0 and the client then replays to step 10. | `qa/D06-incident-step10-1440-cls.png` | `components/incident/IncidentRoom.tsx:225` (`initialSteps` / step from search params). Seed the step on the server or reserve the space. |
| D07 | Medium | all app routes | all | Open the Audit log and press Tab once. Focus leaves the dialog and moves to the page behind it, even though the dialog sets `aria-modal="true"`. There is no focus trap and the panel has only one focusable element. | `qa/D07-audit-drawer-no-focus-trap.png` | `components/shell/AuditLogDrawer.tsx:36-57` |
| D08 | Medium | all app routes | all | Focus "Switch user" and press Enter. A `role="menu"` opens, but focus stays on the trigger and ArrowDown does not move into the menu. This breaks the ARIA menu keyboard pattern. | `qa/D08-switch-user-menu-focus.png` | `components/shell/SwitchUser.tsx:65` |
| D09 | Medium (axe serious) | all app routes | 1440 / 1024 | axe `color-contrast`: the "Keystone v1" label in the sidebar's orange band is 4.34:1 (`text-cocoa-ink/80` on `#ff6f1e` at 11px). The code comment claims 6:1, but the `/80` opacity brings it below 4.5:1. | `qa/D09-sidebar-brand-band-contrast.png` | `components/app-shell.tsx:120` |
| D10 | Medium (axe serious) | `/registry`, `/canvas/*`, `/incident/*` | all | axe `definition-list` and `dlitem` (10 to 20 nodes per page): the `<dl>` contains nested `<div><div><dt>`, and `<dt>`/`<dd>` sit in wrappers that are not allowed. Screen readers lose the term/value pairs. | `qa/D10-pillcard-dl-markup.png` | `components/mosaic/PillLabel.tsx:65-136` (also check `PillCard.tsx`, `RuleTile.tsx`) |
| D11 | Medium (axe serious) | `/incident/INC-2026-1011` | 1440 | axe `scrollable-region-focusable`: the tenant-message `<pre>` scrolls but cannot be reached by keyboard. | `qa/D11-tenant-message-pre-not-focusable.png` | `components/incident/TenantMessagePanel.tsx:86`. Add `tabIndex={0}` and a label. |
| D12 | Low | `/` | all | The "See it in action" section on the production landing page shows "Walkthrough video — coming soon". | `qa/D12-landing-video-coming-soon.png` | `components/landing/DemoVideo.tsx:42` (set `NEXT_PUBLIC_DEMO_VIDEO_URL` or hide the section) |
| D13 | Low (axe serious) | `/` | all, including reduced motion | Story sections that are not in view sit at 1.38 to 1.57:1 contrast (`#cfcac4` / `#dad7d4` on `#fdfbf9`). axe flags 9 to 10 nodes. They light up when in view, so this is a design choice. However, with reduced motion on, readers still see a long run of near-invisible text. | `qa/D13-landing-inactive-beats-low-contrast.png` | `components/landing/*` (`landing_problemBeat` / `problemCopy` styles). Under `prefers-reduced-motion`, consider showing every section at full ink. |
| D14 | Low | `/learning/technical-services-chilled-water-leak` | 1024 / 1440 | The "Audit events" section grows after load (height 97→137px). CLS measured 0.005 to 0.107; the 0.107 at 1024 is over the 0.1 target. | `qa/D14-learning-audit-events-cls.png` | `components/learning/HistoryRail.tsx:87` (reserve space or use a skeleton) |
| D15 | Low | all app routes | all | The app shell has no "Skip to content" link and `<main>` has no `id` (the landing page has both), so keyboard users tab through 8 nav links before reaching content. The `<main>` landmark exists, so this is not a WCAG failure. | (no visual) | `components/app-shell.tsx:158` |
| D16 | Low | `/sign-in` | all | When the passcode field has focus, only the 1.5px border colour changes (`outline-none focus-visible:border-ink`); there is no focus ring. | (no visual) | `app/sign-in/SignInForm.tsx` (passcode input) |

## Notes

- **Shared browser:** another agent appears to have been using the same browser during this run. One early pass was redirected to `localhost:3500` and lost its session. All results above come from isolated browser contexts and were re-checked with curl, so they are unaffected.
- **Clipped-text false positives:** the clipped-text scan reported `sr-only` spans, such as "(version)". Those are intentional and are not listed as defects.
- **Limits of axe:** axe covers roughly 30–40% of WCAG checks. A manual screen-reader pass was not done.
- **No visual baseline:** there are no committed baseline screenshots, so visual regression is **inconclusive**. The layout findings above come from overflow measurement and screenshot review.
