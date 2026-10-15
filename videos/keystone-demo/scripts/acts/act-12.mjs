// ACT 12 — why this case study, and why this problem. Keppel's four stated
// pains land one at a time; then the choice, and why; then the line that
// holds. The real /teach drawing ghosts behind the type — recorded, not redrawn.
//
// Blueprint: kinetic-type-beats (Problem variant → statement build). Rules:
// waterfall-entry (every line), svg-path-draw (the underlines), spring-pop-
// entrance (the three reasons), ambient-glow-bloom.
// Unvoiced fallback: the same schedule, on type and music.
const PAINS = [
  'Knowledge concentrated in a few experts.',
  'New staff take years to build it.',
  'Best practice applied inconsistently.',
  'Institutional knowledge lost when people retire.',
];
const W = (t) => t.split(/\s+/).map((w) => `<span class="w">${w}</span>`).join('');

export default {
  label: 'Why this case study',
  lead: 1.0,
  beat: 0.6,
  tail: 1.5,
  fallbackDuration: 28,
  minDuration: 28,
  keystonAt: 1.0,
  reactAt: (c) => (c.at(1) ?? 15.2) + 0.5,
  reactTilt: -6,
  css: () => `
        #root .ghostvid { position: absolute; left: 120px; right: 120px; top: 112px; bottom: 112px; border-radius: 14px; overflow: hidden; opacity: 0.16; }
        #root .ghostvid .shot { object-position: right top; }
        #root .kep { position: absolute; left: 120px; top: 140px; font-family: "IBM Plex Mono", monospace; font-size: 20px; letter-spacing: 0.14em; text-transform: uppercase; color: #9a93b5; opacity: 0; }
        #root .pains { position: absolute; left: 120px; top: 200px; width: 1200px; }
        #root .pain { position: relative; font-weight: 700; font-size: 44px; letter-spacing: -0.015em; line-height: 1.15; margin-bottom: 26px; padding-bottom: 8px; }
        #root .pain .w { display: inline-block; opacity: 0; margin-right: 0.26em; will-change: transform; }
        #root .pain svg { position: absolute; left: 0; bottom: -4px; width: 100%; height: 12px; }
        #root .pain svg path { fill: none; stroke: #d79a3a; stroke-width: 5; stroke-linecap: round; }
        #root .choice { position: absolute; left: 120px; top: 200px; width: 1500px; }
        #root .choice h2 { margin: 0; font-weight: 900; font-size: 86px; letter-spacing: -0.035em; line-height: 1.0; }
        #root .choice h2 .w { display: inline-block; opacity: 0; margin-right: 0.24em; will-change: transform; }
        #root .choice h2 em { font-style: normal; color: #8b7cf6; }
        #root .reasons { margin-top: 44px; display: flex; gap: 22px; }
        #root .reason { flex: 1; padding: 22px 24px; border-radius: 14px; background: rgba(14,12,22,0.78); border: 1px solid rgba(139,124,246,0.4); opacity: 0; will-change: transform; }
        #root .reason b { display: block; font-family: "IBM Plex Mono", monospace; font-size: 16px; letter-spacing: 0.14em; text-transform: uppercase; color: #d79a3a; }
        #root .reason p { margin: 10px 0 0; font-size: 24px; line-height: 1.3; color: #f6f5fa; }
        #root .final { position: absolute; left: 120px; bottom: 120px; font-weight: 800; font-size: 54px; letter-spacing: -0.025em; line-height: 1.1; }
        #root .final .w { display: inline-block; opacity: 0; margin-right: 0.26em; will-change: transform; }
        #root .final em { font-style: normal; color: #8b7cf6; }
  `,
  stage: (c) => `
          <div class="ghostvid" id="act-12-ghostvid">
            <video id="act-12-vid" class="shot" src="assets/footage/teach-chooser.webm" muted data-start="0" data-duration="${c.D}" data-media-start="31"></video>
          </div>
          <div class="kep" id="act-12-kep">Keppel &middot; AI HARVEST &middot; the four problems the brief names</div>
          <div class="pains" id="act-12-pains">
            ${PAINS.map((p, i) => `<p class="pain" id="act-12-p${i}">${W(p)}<svg viewBox="0 0 1000 12" preserveAspectRatio="none"><path id="act-12-u${i}" d="M 4 7 C 250 2, 500 10, 996 5" /></svg></p>`).join('')}
          </div>
          <div class="choice" id="act-12-choice">
            <h2 id="act-12-h"><span class="w">Technical</span><span class="w">Services</span><span class="w">&middot;</span><span class="w"><em>the</em></span><span class="w"><em>chilled-water</em></span><span class="w"><em>leak</em></span></h2>
            <div class="reasons">
              <div class="reason" id="act-12-r1"><b>smallest case with all four</b><p>Water, electrics and a tenant floor in one call — one judgement, three disciplines.</p></div>
              <div class="reason" id="act-12-r2"><b>steps vs judgement</b><p>The procedure gives the steps. The expert knows which step to break, and when.</p></div>
              <div class="reason" id="act-12-r3"><b>a wrong call is unsafe</b><p>Get it wrong and someone re-energises a wet board. Governance has to be real here.</p></div>
            </div>
          </div>
          <p class="final" id="act-12-final"><span class="w">If</span><span class="w">governance</span><span class="w">holds</span><span class="w"><em>there,</em></span><span class="w">it</span><span class="w">holds</span><span class="w"><em>anywhere.</em></span></p>
  `,
  motion: (c) => {
    const g0 = c.at(0) ?? 1.0;                        // "Why this case study. Keppel named four problems..."
    const g1 = c.at(1) ?? (g0 + 14.2);                // "We chose Technical Services..."
    const g2 = c.at(2) ?? (g1 + 11.8);                // "Get that call wrong..."
    const painStep = c.vo[0] ? (c.vo[0].seconds - 4.2) / 4 : 2.6;
    return `
        tl.to("#act-12-vid", { scale: 1.3, x: -60, y: -40, duration: ${c.D.toFixed(2)}, ease: "none" }, 0);
        tl.fromTo("#act-12-kep", { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, ${(g0 + 0.2).toFixed(2)});
        // the four pains, one at a time, each underlined as it lands
        ${PAINS.map((p, i) => `waterfall("#act-12-p${i}", ${(g0 + 3.6 + i * painStep).toFixed(2)}); drawPath("#act-12-u${i}", ${(g0 + 4.1 + i * painStep).toFixed(2)}, 0.5, "power2.out");`).join('\n        ')}
        // the choice
        tl.to("#act-12-pains", { opacity: 0, y: -24, duration: 0.5, ease: "power2.in" }, ${(g1 - 0.3).toFixed(2)});
        tl.to("#act-12-kep", { opacity: 0, duration: 0.3 }, ${(g1 - 0.3).toFixed(2)});
        waterfall("#act-12-h", ${(g1 + 0.3).toFixed(2)});
        pop("#act-12-r1", ${(g1 + 3.2).toFixed(2)}); pop("#act-12-r2", ${(g1 + 6.4).toFixed(2)}); pop("#act-12-r3", ${(g2 + 0.2).toFixed(2)});
        // the line that holds
        waterfall("#act-12-final", ${(g2 + 3.4).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const g0 = c.at(0) ?? 1.0, g1 = c.at(1) ?? (g0 + 14.2), g2 = c.at(2) ?? (g1 + 11.8);
    const painStep = c.vo[0] ? (c.vo[0].seconds - 4.2) / 4 : 2.6;
    return [
      ...PAINS.map((p, i) => ({ name: 'whoosh-short', at: g0 + 3.6 + i * painStep, vol: 0.22 })),
      { name: 'impact-bass-1', at: g1 + 0.3, vol: 0.45 },
      { name: 'pop', at: g1 + 3.2, vol: 0.26 }, { name: 'pop', at: g1 + 6.4, vol: 0.26 }, { name: 'pop', at: g2 + 0.2, vol: 0.26 },
      { name: 'chime', at: g2 + 3.4, vol: 0.26 },
    ];
  },
};
