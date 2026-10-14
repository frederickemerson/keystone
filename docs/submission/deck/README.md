# Solution deck

Twelve 16:9 slides for the submission form's **Solution Diagram** field, and a
presentable version of the **Project description** answers.

| # | Slide |
| --- | --- |
| 1 | Title |
| 2 | The real-world problem |
| 3 | The solution diagram itself |
| 4 | The loop — Capture, Compile, Apply, Learn, Reuse |
| 5 | **Flow 1** — how a gate decides (with the TS-07 worked case) |
| 6 | **Flow 2** — from a spoken sentence to a released version, and rollback |
| 7 | The Intelligence Pill |
| 8 | **Technical architecture** — the deterministic path and the model path, and the line between them |
| 9 | How prompts drive the AI generation |
| 10 | Features that are built and working — and what we deliberately did not build |
| 11 | What is novel |
| 12 | Business value |

| File | What it is |
| --- | --- |
| `deck.html` | The source. Twelve `1920×1080` sections in the app's own tokens — a cool lavender-white canvas, night ink, an indigo accent, and orange reserved for the logo's keystone. The flowcharts and the architecture map are hand-authored SVG. |
| `build.mjs` | Renders each section to `slides/sN.png` at 2× with Playwright. |
| `to-pptx.py` | Wraps the slides into a 13.333×7.5in PowerPoint, one full-bleed image per slide, with speaker notes. |
| `keystone-solution-diagram.pdf` | The same eight slides as a PDF, for forms that take PDF. |

Slide 3 is `docs/submission/solution-diagram.png` itself — the eight-point
diagram — so the deck and the diagram can never disagree.

## Rebuilding

```bash
# Playwright is not a project dependency; point at any install that has it
ln -s /path/to/node_modules node_modules
node build.mjs
python3 to-pptx.py keystone-solution-diagram.pptx
rm node_modules
```

`slides/*.png` and the `.pptx` are derived and gitignored; the PDF is committed
so the deck is readable from the repository without rebuilding.

## Palette

The tokens are copied from `app/globals.css`, not chosen here. The product moved
from a warm cream-and-orange identity to the cool lavender-white canvas it uses
now, and the submission art had not followed — `solution-diagram.html` and
`cover.html` were rethemed to the same tokens at the same time, and
`render-art.mjs` (one directory up) re-renders their PNGs.

## Why HTML and not PowerPoint

The same reason the solution diagram is HTML: a figure that changes in
`form-answers.md` changes here by editing one line, and the slides inherit the
product's fonts, palette and chip styles rather than approximating them. The
test count on slide 6 is the real one — 1,302 — not a remembered one.
