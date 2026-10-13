# Demo footage

## `keystone-demo-v1.mp4` — 2:29, 1920×1080, 25 fps, H.264 + AAC

A music-and-title cut that stands on its own with no voiceover. Built from a
real browser recording of the live deployment, not a slideshow: Playwright's
`recordVideo` captured the Chromium compositor at 25 fps while a script drove
the app with eased, human-paced scrolling and hover.

Structure: the problem (3 cards) → the reveal → the five-step loop, each act
introduced by a card and shown on the live app → the CodeBuddy skill proof →
what we will not claim → close.

### Provenance

- Source recording: 141.5 s pass over `keystone-tencent.vercel.app`, signed in
  as Tan Wei Ming, coach panel off so screens render full width.
- Still at 01:38 is `docs/proof/04b-codebuddy-skill-ts07-answer.png`, the pill
  running as a native CodeBuddy skill (captured 11 Oct 2026).
- Music: "Beauty Flow" by Kevin MacLeod (incompetech.com), **CC BY 4.0**. The
  attribution is on the end card and must stay there — it is a licence
  condition, not a courtesy. If the end card is ever cut, swap the track.
- Audio normalised to −16 LUFS (−17.0 dB mean, −1.1 dB peak).

### What this cut does NOT have

- **No narration.** `docs/submission/video-script.md` holds the full 7:30
  narrated script with per-scene timecodes for when a voice take exists.
- **No in-app audio.** Playwright records video only, so the "Hear the expert"
  playback and the onboarding call are seen but not heard.
- **No live ADP import.** Not recorded because it has not been done yet.
