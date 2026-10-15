// ACT 11 — how it was built. Calmer: four CodeBuddy proof screenshots as
// tilted cards sliding through on the right, four tips landing on the left
// as the narration names them, and the measured test count rising.
//
// Blueprint: titlecard-reveal chain + grid-card-assemble. Rules: split-tilt-
// cards (one card, tilted, entering from its side), motion-blur-streak (the
// card's fast leg), waterfall-entry (tips), counting-dynamic-scale (the
// counter: frame rows set on the timeline, tabular numerals, a landing pulse —
// the registry count-up's mechanic). Figures measured 15 Oct 2026: 1,329
// tests across 106 files (npx vitest run).
const STILLS = [
  { f: '01a-codebuddy-plan-mode-hy4-subagents.png', cap: 'CodeBuddy · Plan mode · hy4-preview' },
  { f: '01b-codebuddy-plan-clarifying-questions.png', cap: 'CodeBuddy · the plan, as markdown, argued with first' },
  { f: '02b-codebuddy-scaffold-tasks-smoke-test.png', cap: 'CodeBuddy · one closed loop, smoke-tested' },
  { f: '04b-codebuddy-skill-ts07-answer.png', cap: 'CodeBuddy · the pill as a native skill, answering TS-07' },
];
const TESTS = 1329, FILES = 106;

export default {
  label: 'How it was built',
  lead: 0.7,
  keystonAt: 1.0,
  reactAt: (c) => (c.at(3) ?? 19.1) + 7.4,
  reactTilt: 4,
  css: () => `
        #root .deck { position: absolute; left: 860px; top: 120px; width: 940px; height: 800px; perspective: 1600px; }
        #root .cardimg { position: absolute; inset: 0; border-radius: 14px; overflow: hidden; background: #0e0c16; box-shadow: 0 50px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,124,246,0.25);
          opacity: 0; will-change: transform, filter; }
        #root .cardimg img { width: 100%; height: 100%; object-fit: cover; object-position: top left; display: block; }
        #root .cardimg .cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 18px; background: rgba(14,12,22,0.85); font-family: "IBM Plex Mono", monospace; font-size: 16px; letter-spacing: 0.06em; color: #cfc9e0; }
        #root .tips { position: absolute; left: 120px; top: 190px; width: 680px; }
        #root .tip { position: relative; padding-left: 86px; margin-bottom: 44px; opacity: 0; will-change: transform; }
        #root .tip .n { position: absolute; left: 0; top: 2px; width: 56px; height: 56px; border-radius: 50%; border: 2px solid #8b7cf6; display: grid; place-items: center;
          font-family: "IBM Plex Mono", monospace; font-size: 24px; font-weight: 700; color: #8b7cf6; }
        #root .tip h3 { margin: 0; font-weight: 800; font-size: 36px; letter-spacing: -0.02em; line-height: 1.1; }
        #root .tip p { margin: 8px 0 0; font-size: 22px; line-height: 1.35; color: #cfc9e0; }
        #root .count { position: absolute; left: 120px; bottom: 150px; font-family: "IBM Plex Mono", monospace; font-variant-numeric: tabular-nums; opacity: 0; will-change: transform; }
        #root .count b { font-size: 84px; font-weight: 700; color: #f6f5fa; letter-spacing: -0.03em; }
        #root .count span { font-size: 26px; color: #9a93b5; margin-left: 14px; }
  `,
  stage: () => `
          <div class="deck" id="act-11-deck">
            ${STILLS.map((s, i) => `<div class="cardimg" id="act-11-s${i}" data-layout-allow-overflow="true"><img src="assets/stills/${s.f}" alt="" /><div class="cap">${s.cap}</div></div>`).join('')}
          </div>
          <div class="tips">
            <div class="tip" id="act-11-t1"><span class="n">1</span><h3>Plan mode first</h3><p>The plan is markdown. Argue with that before it touches a file.</p></div>
            <div class="tip" id="act-11-t2"><span class="n">2</span><h3>Freeze scope, close one loop</h3><p>Seven half-working screens lose to one that closes.</p></div>
            <div class="tip" id="act-11-t3"><span class="n">3</span><h3>Safety as tests, not comments</h3><p>Evidence can't be faked open; the author can't approve their own version.</p></div>
            <div class="tip" id="act-11-t4"><span class="n">4</span><h3>The model only does language</h3><p>Every decision is a pure function, so swapping the model can't change a safety outcome.</p></div>
          </div>
          <div class="count" id="act-11-count"><b id="act-11-num">0</b><span>tests &middot; ${FILES} files &middot; all green</span></div>
  `,
  motion: (c) => {
    const g1 = c.at(1) ?? 5.6, g2 = c.at(2) ?? 12.6, g3 = c.at(3) ?? 19.1, g4 = c.at(4) ?? 29.6;
    const beats = [1.0, g2, g3, g4 + 0.2];
    return `
        // the stills: one tilted card at a time, entering from the right, the previous leaving left (split-tilt-cards, one side)
        ${STILLS.map((s, i) => `
        tl.fromTo("#act-11-s${i}", { opacity: 0, x: 520, rotationY: -22, filter: "blur(10px)" }, { opacity: 1, x: 0, rotationY: -8, filter: "blur(0px)", duration: 0.7, ease: "power3.out" }, ${beats[i].toFixed(2)});
        tl.to("#act-11-s${i} img", { y: -60, duration: ${(i < 3 ? beats[i + 1] - beats[i] : c.D - beats[i]).toFixed(2)}, ease: "none" }, ${(beats[i] + 0.5).toFixed(2)});
        ${i < 3 ? `tl.to("#act-11-s${i}", { opacity: 0, x: -360, rotationY: 10, filter: "blur(8px)", duration: 0.45, ease: "power3.in" }, ${(beats[i + 1] - 0.1).toFixed(2)});` : ''}`).join('')}
        // the four tips land with the narration
        ${['t1', 't2', 't3', 't4'].map((k, i) => `tl.fromTo("#act-11-${k}", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.55, ease: "power3.out" }, ${[g1, g2, g3, g4][i].toFixed(2)});`).join('\n        ')}
        // "that's the part you can actually run" — the measured count, rows set on the timeline, then a landing pulse
        const rows = []; const F = 30, DUR = 1.6, last = Math.round(DUR * F); const ease = gsap.parseEase("sine.inOut");
        for (let f = 0; f <= last; f++) rows.push(Math.round(${TESTS} * ease(f / last)).toLocaleString("en-US"));
        tl.fromTo("#act-11-count", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, ${(g3 + 5.2).toFixed(2)});
        rows.forEach((r, f) => tl.set("#act-11-num", { textContent: r }, ${(g3 + 5.3).toFixed(2)} + DUR * (f / last)));
        tl.to("#act-11-count", { scale: 1.06, duration: 0.17, ease: "power3.out", transformOrigin: "0 100%" }, ${(g3 + 5.3 + 1.6).toFixed(2)});
        tl.to("#act-11-count", { scale: 1, duration: 0.17, ease: "power2.out" }, ${(g3 + 5.3 + 1.77).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const g2 = c.at(2) ?? 12.6, g3 = c.at(3) ?? 19.1, g4 = c.at(4) ?? 29.6;
    return [
      { name: 'whoosh-short', at: 1.0, vol: 0.22 }, { name: 'whoosh-short', at: g2, vol: 0.22 }, { name: 'whoosh-short', at: g3, vol: 0.22 }, { name: 'whoosh-short', at: g4 + 0.2, vol: 0.22 },
      { name: 'chime', at: g3 + 6.9, vol: 0.25 },
    ];
  },
};
