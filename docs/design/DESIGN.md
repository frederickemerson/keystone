# MOSAIC design brief — "the expert's field notebook"

Reference: superr.ai (screens: `ref-superr-hero.png`, `ref-superr-notes.png`) and the Superr style tokens below.
Adapted for an operations product judged on professionalism, readability and responsible AI.

## The one idea
**The expert's voice is handwritten. The system's voice is typeset.**
MOSAIC turns a person's soft, spoken judgement into hard, governed rules. The UI shows that transformation:
- Anything that came from a human expert — interview quotes, provenance, "Hear the expert", contradiction notes, expert corrections, approver signatures — is rendered as **marginalia**: marker-orange handwriting, hand-drawn arrows, sticky labels.
- Anything the system decides or enforces — rules, gates, evidence, statuses, deadlines, approvals — is **crisp typeset UI** on cream paper with thin ink borders.

## Readability & professionalism rules (non-negotiable)
- Handwriting font is **decorative/attributive only**: max ~1–2 lines, ≥18px, never for anything a user must act on, never for numbers, statuses, rule ids, deadlines, buttons or table data. Every handwritten quote has a typeset equivalent available to screen readers (or is real text with sufficient contrast).
- Body text: clean sans (Geist), 15–16px in app screens (dense ops UI), 18–20px on the landing page. Line-height 1.5. Contrast ≥ 4.5:1.
- Status colours stay unmistakable and accessible (icon + text, never colour alone), rendered as muted "ink on paper" tints:
  - Blocked → brick red ink `#b42318` on `#fdecea`
  - Must escalate / Escalate → burnt sienna `#ce500a` on `#fdf0e6`
  - Requires approval / Needs approval → ochre `#a15c07` on `#fdf6e3`
  - Recommend / Allowed → leaf green `#2f7d32` on `#eef7ee`
  - Not applicable → `#6b6560` on Dew Drop
- Marker Orange `#ff6f1e` is for marginalia and brand moments only — not for statuses or primary data.
- Ops density is preserved: tables stay tables, timelines stay scannable. Superr's 104px display type is for the landing hero only; app page titles 32–40px lowercase.
- Light theme is the primary design. Dark mode may be dropped if it compromises the paper look (state it in README).

## Tokens (from Superr, adapted)
| Token | Value | Use |
|---|---|---|
| cream-paper | `#fdfbf9` | canvas, cards |
| dew-drop | `#f7efe9` | secondary surface, sidebars, table headers |
| charcoal | `#171717` | text, borders ("ink") |
| cocoa-ink | `#2b1a07` | headlines |
| marker-orange | `#ff6f1e` | handwritten marginalia, highlight underline, brand band |
| burnt-sienna | `#ce500a` | escalate status ink, emphasis borders |
| shadow-mist | `#bebcbb` | shadow base |
| sticker blue/pink/green | `#3b82f6` `#ff66cf` `#22c55e` | decorative stickers ONLY |

Radii: buttons/tags 20px (pill), cards 12px, inputs 8px, brand band 56px top corners. Borders 1–1.5px charcoal. Shadows whisper-light: card `rgba(0,0,0,.06) 0 2px 20px`, button `rgba(0,0,0,.25) 0 1px 2px`. No gradients, no glass, no neon. Base spacing 4px; card padding 24–32px.

## Type
- Display / headings: **Fraunces** (Google Fonts, `SOFT` 100, `WONK` 0, weight 600–700) — substitutes for gelica's soft heavy rounded feel. Lowercase headlines, normal tracking, left-aligned.
- Body / UI / tables: **Geist** (Google Fonts) 400/500; `Geist Mono` for rule ids, versions, evidence keys.
- Marginalia: **Caveat** (Google Fonts) 500–600, marker orange, slight rotation (−2° to 2°).

## Signature components
1. **Pill label sticker** (name-label): white card, 1px charcoal border, 8px radius, slight rotation on hero only. Fields: *name* (handwritten: "chilled-water leak"), *class* (Technical Services), *roll no.* (v1.2.0) + owner/approver as tiny signatures. Used on Registry cards, Canvas header, Incident "pills in use".
2. **Margin note**: Caveat marker-orange text + thin hand-drawn SVG curved arrow pointing at the element it annotates (e.g. next to the BLOCKED gate: "Wei Ming said this, 00:14:32 →").
3. **Expert quote**: typeset quote body (readable) with a handwritten attribution line + timestamp sticker; "Hear the expert" is an outlined pill button with a small speaker icon.
4. **Marker highlight**: one key word per screen underlined with a wobbly orange SVG stroke (e.g. "blocked", "learns").
5. **Pill buttons**: cream fill, 1.5px charcoal border, 20px radius; primary = charcoal fill with cream text is allowed ONLY for the single most important action per view (Superr never fills — we bend this one rule for operational clarity of the primary action).
6. **Roman-numeral step lists** for the Learning flow (I–VII) and the interview phases.
7. **Stickers**: 2–4 small flat SVG stickers (lightning bolt = incident, droplet = water, shield = gate, star = approved) on the landing page and empty states only. Never inside data areas.
8. **Brand band footer**: marker orange, 56px top radius, on landing + bottom of app sidebar.

## Landing page (new route `/`; Portfolio Pulse moves to `/pulse`)
Hero (two-column): margin note "dear keppel," → display headline "the chief engineer retires in december. his judgement doesn't." → body with marker highlight on "governed" → pill CTA "open the incident room" + secondary "hear the onboarding call" → right: a large paper notebook card (SVG/CSS, not stock photo) showing a handwritten rule ("never re-energise before the LEW signs off" — Tan Wei Ming, 00:14:32) with an arrow to a typeset rule card "TS-07 · blocked until lew_signoff" — the whole product in one image.
Then: roman-numeral "how it works" (I capture → II compile → III apply → IV learn → V reuse), each linking to its screen; a "safe & bounded" section (recommend / requires approval / must escalate); proof strip (161 tests, deterministic gates, CodeBuddy skill install); orange brand band footer "built with CodeBuddy · Tencent Cloud".
