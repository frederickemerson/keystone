# Keystone design brief — "the expert's field notebook"

Reference: superr.ai (screens: `ref-superr-hero.png`, `ref-superr-notes.png`) and the Superr style tokens below.
Adapted for an operations product judged on professionalism, readability and responsible AI.

## Scope decision (user, 11 Oct): one handwritten quote, Geist everywhere else
Caveat is reserved for the **single expert quote on the landing notebook card**. Its attribution and PillLabel are typeset; there are no handwritten margin notes. Every app screen (pulse, capture, canvas, registry, incident, approvals, learning, shell/sidebar, drawers) is fully typeset and professional: Geist for headings, text and data, Geist Mono for ids/versions. Expert provenance in the app = typeset quote with a quiet attribution line (name · role · timestamp). The paper palette, ink borders, pill buttons and status tints stay.

## The one idea
**Spoken judgement becomes governed rules.**
The landing notebook pairs one handwritten expert quote with a typeset safety gate; all other content is crisp typeset UI on cream paper with thin ink borders. Human provenance stays visible without making the operational interface look handwritten.

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
- Ops density is preserved: tables stay tables, timelines stay scannable. Superr's 104px display type is for the landing hero only; app page titles 32–40px, **sentence case** (first word capitalised: "Chilled water leak", "How it works").
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
- Display / headings: **Geist** (Google Fonts), weight 600–700, through the shared `--font-display` variable. **Sentence case** headlines (user decision 11 Oct: first word capitalised, proper nouns/ids as written — no all-lowercase, no Title Case, no ALL CAPS), letter-spacing **−0.02em**, left-aligned; **1.05 line-height at display sizes**, with more room for small multi-line headings. No Fraunces.
- Body / UI / tables: **Geist** 400/500; **Geist Mono** for rule ids, versions, timestamps and evidence keys.
- Expert quote only: **Caveat** 600, accessible marker ink `#c4470c`, slight rotation (−2° to 2°), on the landing notebook. The quote is loaded from the real pill; its attribution, PillLabel and all other landing text are typeset.

## Signature components
1. **Pill label sticker** (name-label): white card, 1px charcoal border, 8px radius, slight rotation on hero only. Fields: *name* (Geist: "chilled-water leak"), *class* (Technical Services), *roll no.* (Geist Mono: v1.2.0) + typeset owner/approver. Used on Registry cards, Canvas header, Incident "pills in use".
2. **Flow figures**: Hairline line drawings in paper tiles, with 1px charcoal SVG arrows; horizontal on desktop, stacked on mobile. Theme is light with paper-coloured plates, charcoal highlights, cocoa edges and grey supporting strokes. Each figure has a meaningful accessible label; autoplay is omitted for reduced motion and can be paused. The safety padlock stays closed.
3. **Expert quote**: typeset body and attribution in the app; only the landing notebook quote body uses Caveat. "Hear the expert" is an outlined pill button with a small speaker icon.
4. **Marker highlight**: one key word per screen underlined with a wobbly orange SVG stroke (e.g. "blocked", "learns").
5. **Pill buttons**: cream fill, 1.5px charcoal border, 20px radius; primary = charcoal fill with cream text is allowed ONLY for the single most important action per view (Superr never fills — we bend this one rule for operational clarity of the primary action).
6. **Roman-numeral step lists** for the Learning flow (I–VII) and the interview phases.
7. **Stickers**: 2–4 small flat SVG stickers (lightning bolt = incident, droplet = water, shield = gate, star = approved) on the landing page and empty states only. Never inside data areas.
8. **Brand band footer**: marker orange, 56px top radius, on landing + bottom of app sidebar.

## Landing page (new route `/`; Portfolio Pulse moves to `/pulse`)
Hero (two-column): Geist headline "the expert retires. his judgement stays." → one-sentence body with marker highlight on "governed" → pill CTA "open the incident room" + secondary "hear the onboarding call" → right: the paper notebook with one handwritten quote, a typeset attribution and PillLabel, and a typeset TS-07 rule card. Quote, attribution and evidence keys come from the real pill.
Immediately after the hero: **the problem**, comparing today (20 years in one person → retirement and an empty drawer → a team guessing at 3am) with Keystone (call → compiled rules → non-overridable gates → versioned corrections → reuse). Paper Hairline figures carry the story, with blocked-red and safe-green outcome chips.
Then (as built): "The problem" as a scroll story with large Hairline figures (one expert → retires → team guesses → unsafe re-energisation, all facts from the data) → pinned scroll-driven "How it works" story (I capture → II compile → III apply → IV learn → V reuse) → "Safe and bounded" (recommend / requires approval / must escalate) → "See it in action" demo video (NEXT_PUBLIC_DEMO_VIDEO_URL; poster placeholder until set) → orange brand band footer with a fictional-demo-data note.
