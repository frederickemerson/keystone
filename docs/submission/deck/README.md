# Solution deck

Eight 16:9 slides for the submission form's **Solution Diagram** field, and a
presentable version of the **Project description** answers.

| File | What it is |
| --- | --- |
| `deck.html` | The source. Eight `1920×1080` sections in the product's own type and colour. |
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

## Why HTML and not PowerPoint

The same reason the solution diagram is HTML: a figure that changes in
`form-answers.md` changes here by editing one line, and the slides inherit the
product's fonts, palette and chip styles rather than approximating them. The
test count on slide 6 is the real one — 1,302 — not a remembered one.
