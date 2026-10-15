---
workflow: general-video
flow: automation
storyboard: no
message: "An expert's judgement can be captured, governed, and kept after he leaves"
destination: hackathon-submission
aspect: 1920x1080
language: en
length: 7m
angle: problem-to-solution
---

## Intent

The demo film for Keystone, submitted to the Tencent Cloud "AI CAN DO IT"
hackathon (Real Estate track, Keppel's AI HARVEST challenge). It has to do
three things the handbook names: a project overview, the core agent features
and how they are used, and a short reflection on the build approach with
CodeBuddy.

The organising idea is not a feature tour. Every act answers a problem the
challenge owner said out loud in the Keppel briefing, in roughly the order he
raised them — six of his sentences appear as quote cards, and the product
answers each one. Pain first, then the thing that solves it, never the reverse.

Tone: a builder showing a colleague something that works. Quick, concrete, a
little dry. Not a product launch.

## Assets

- ../../docs/submission/video-script-v2.md — the shooting script: 12 acts, VO, visuals, motion notes. The source of truth for this film.
- ../../components/teach/Mascot.tsx — Keyston, the keystone mascot, as SVG. Ported into the composition as the guide figure.
- ../../components/teach/ScenarioStage.tsx — the animated building section used in Act 2.
- footage recorded from https://keystone-tencent.vercel.app — real 1080p capture of the deployed product, one clip per act.

## Customizations

- **Narration** generated with MiniMax Speech 2.8 HD through Tencent TokenHub — the same voice path the product itself uses, so the film and the product sound like one thing.
- **Keyston as the guide.** The mascot carries the viewer between acts: he reacts to each beat (listening, thinking, puzzled at the contradiction, pleased at the close) rather than narrating. He is decoration with a job, never the source of information.
- **Real product footage only.** Every screen in this film is the deployed site, recorded; nothing is mocked up. Where a shot would need a mock-up, the act is cut instead.

## Notes

- Six quote cards, and only six: one per unsolved problem the challenge owner
  named, plus the two that frame the piece. Using them everywhere would read as
  flattery.
- **The fictional-scenario disclosure in Act 1 is mandatory.** Tan Wei Ming,
  Rajesh Kumar, the tower and every incident are invented; the system, the
  rules and the tests are real. One card, three seconds, early.
- Act 0 and Act 5 must be frame-identical — the callback only works if the
  viewer recognises the shot.
- Do not cut Act 9. It is the strongest thing in the film.
- Music: "Beauty Flow" by Kevin MacLeod, CC BY 4.0. The credit card is a
  licence condition and must appear. Fetched by `scripts/fetch-music.sh`
  (not committed); carved under the narration group with
  `hyperframes-audio/scripts/carve.mjs`, once per bed half.
- Act 8 ("top five, and why") is cut for length — the script's own cut
  order, applied after Acts 1B, 2A and 12 were added. `scripts/film.config.mjs`
  → `CUT`; the act module stays in `scripts/acts/` to reinstate.
- The last tip in Act 11 is also cut (15 Oct), the next item in the same cut
  order, to pay for the new Act 2A line ("So we leave that one as a drawing...")
  and keep the film under eight minutes. Its clip (`act-11-04.mp3`) stays on
  disk; the VO is in the script as a struck note.
- The film opens on Tan (Act 1), then the AI asked what he knows (Act 0), then
  Keppel's four problems (Act 12), then "This is Keystone" (Act 1B). The order
  is the script's section order; on-screen act numbers follow the film.
- The Keystone lockup (mark from `components/shell/BrandMark.tsx`, wordmark in
  Geist 600 from `assets/fonts/geist-latin.woff2`, copied from the app's own
  build) lands on "This is Keystone" and again at the close.
- `/teach` was re-shot on the local production build after it changed
  (`scripts/record-teach.mjs`): the chooser with the describe-a-situation card
  (`teach-chooser.webm`, badge "Live · hy4-preview via TokenHub") and the
  chilled-water session (`act-02.webm`). Phase marks in
  `assets/footage/teach-marks.json`.
