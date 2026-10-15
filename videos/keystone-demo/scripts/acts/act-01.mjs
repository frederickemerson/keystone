// ACT 1 — "we lose institutional knowledge". A tower at dusk, the procedures
// as a row of documents, and the judgement between them as threads that leave
// with the man who held them.
//
// Blueprint: kinetic-type-beats (Problem, a single line) composed with
// svg-path-draw (threads, un-drawn as he leaves), spring-pop-entrance (the
// documents), waterfall-entry (the caption), sine-wave-loop (the tower lights,
// the walk), counting-dynamic-scale ("18" counts up as it lands),
// multi-phase-camera (one slow push on the whole set). The film opens here.
const N = 6;
const X = (i) => 250 + i * 185;

export default {
  label: 'Walking out the door',
  lead: 1.6,
  keystonAt: 1.0,
  reactAt: (c) => (c.at(2) ?? 16.2) + 0.3,
  reactTilt: 6,
  css: () => `
        #root .tower { position: absolute; left: 0; right: 0; top: 0; bottom: 0; transform-origin: 64% 46%; will-change: transform; }
        #root .tower svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
        #root .floor { fill: rgba(246,245,250,0.05); stroke: rgba(246,245,250,0.12); }
        #root .lit { fill: rgba(215,154,58,0.55); }
        #root .doc rect.page { fill: #f6f5fa; }
        #root .doc rect.line { fill: #cdc8dc; }
        #root .thread { fill: none; stroke: #8b7cf6; stroke-width: 4; stroke-linecap: round; filter: drop-shadow(0 0 10px rgba(139,124,246,0.6)); }
        #root .figure { position: absolute; left: 150px; bottom: 150px; width: 70px; height: 190px; will-change: transform; }
        #root .figure .hat { position: absolute; left: 4px; top: 0; width: 62px; height: 38px; border-radius: 31px 31px 6px 6px; background: #d79a3a; }
        #root .figure .body { position: absolute; left: 10px; top: 40px; width: 50px; height: 150px; border-radius: 10px 10px 4px 4px; background: #332f4d; }
        #root .caption { position: absolute; left: 120px; top: 150px; font-weight: 900; font-size: 88px; letter-spacing: -0.03em; line-height: 1.02; }
        #root .caption .w { display: inline-block; opacity: 0; margin-right: 0.26em; will-change: transform; }
        #root .caption .w.amber { color: #d79a3a; }
        #root .caption .w.num { font-variant-numeric: tabular-nums; min-width: 1.15em; transform-origin: 0% 100%; }
        #root .sub { position: absolute; left: 124px; top: 362px; font-family: "IBM Plex Mono", monospace; font-size: 22px; letter-spacing: 0.1em; text-transform: uppercase; color: #9a93b5; opacity: 0; }
        #root .sub em { font-style: normal; color: #8b7cf6; }
  `,
  stage: () => {
    const floors = Array.from({ length: 9 }, (_, i) => `<rect class="floor" x="1380" y="${150 + i * 78}" width="360" height="70" rx="3" />`).join('');
    const lit = [[1400, 164], [1480, 164], [1640, 242], [1420, 320], [1560, 320], [1680, 398], [1440, 476], [1600, 554], [1680, 632], [1420, 710], [1540, 788]]
      .map(([x, y], i) => `<rect class="lit" id="act-01-lit-${i}" x="${x}" y="${y}" width="44" height="40" rx="2" />`).join('');
    const docs = Array.from({ length: N }, (_, i) => `
              <g class="doc" id="act-01-doc-${i}" style="transform-origin: ${X(i) + 72}px 760px">
                <rect class="page" x="${X(i)}" y="660" width="144" height="190" rx="8" />
                <rect class="line" x="${X(i) + 18}" y="690" width="96" height="8" rx="4" />
                <rect class="line" x="${X(i) + 18}" y="712" width="108" height="8" rx="4" />
                <rect class="line" x="${X(i) + 18}" y="734" width="80" height="8" rx="4" />
                <rect class="line" x="${X(i) + 18}" y="756" width="104" height="8" rx="4" />
                <rect class="line" x="${X(i) + 18}" y="778" width="70" height="8" rx="4" />
              </g>`).join('');
    const threads = Array.from({ length: N - 1 }, (_, i) =>
      `<path class="thread" id="act-01-th-${i}" d="M${X(i) + 72} 660 C ${X(i) + 130} 520, ${X(i + 1) + 14} 520, ${X(i + 1) + 72} 660" />`).join('');
    return `
          <div class="tower" id="act-01-tower">
            <svg viewBox="0 0 1920 1080">
              <rect x="1370" y="140" width="380" height="800" rx="6" fill="rgba(246,245,250,0.04)" stroke="rgba(246,245,250,0.16)" />
              ${floors}${lit}
              <g class="threads">${threads}</g>
              <g class="docs">${docs}</g>
            </svg>
          </div>
          <div class="figure" id="act-01-figure"><div class="hat" id="act-01-hat"></div><div class="body" id="act-01-body"></div></div>
          <p class="caption" id="act-01-cap"><span class="w amber num" id="act-01-n">18</span><span class="w amber">years.</span><br><span class="w">Walking</span><span class="w">out</span><span class="w">the</span><span class="w">door.</span></p>
          <p class="sub" id="act-01-sub">the steps stay &middot; <em>which step to break, and when</em> &middot; leaves</p>
          <div class="disclosure" id="act-01-disc">Scenario, people and incidents are fictional. The system, the rules and the tests are real.</div>
    `;
  },
  motion: (c) => {
    const t1 = c.at(1) ?? 7.1;   // "The procedures stay..."
    const t2 = c.at(2) ?? 16.2;  // "That part isn't in any document. It's in him."
    return `
        // one slow push on the whole set for the length of the act (multi-phase-camera: push phase only)
        tl.fromTo("#act-01-tower", { scale: 1 }, { scale: 1.07, duration: ${c.D.toFixed(2)}, ease: "none" }, 0);
        // the tower's lit windows breathe out of phase — a building at dusk, alive
        for (let i = 0; i < 11; i++) tl.fromTo("#act-01-lit-" + i, { opacity: 0.35 + (i % 3) * 0.2 }, { opacity: 0.9 - (i % 4) * 0.15, duration: 1.2 + (i % 5) * 0.3, ease: "sine.inOut", yoyo: true, repeat: 5 }, 0.2 + i * 0.13);
        tl.fromTo("#act-01-figure", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" }, 0.4);
        // the procedures: spring-pop-entrance, staggered so the row reads as one beat
        for (let i = 0; i < ${N}; i++) tl.fromTo("#act-01-doc-" + i, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }, ${(t1 + 0.3).toFixed(2)} + i * 0.07);
        // the judgement BETWEEN them draws itself
        for (let i = 0; i < ${N - 1}; i++) drawPath("#act-01-th-" + i, ${(t1 + 1.6).toFixed(2)} + i * 0.14, 0.8, "power1.inOut");
        // 18 years. Walking out the door. — the figure counts up as it lands (counting-dynamic-scale)
        waterfall("#act-01-cap", ${(t1 + 4.6).toFixed(2)});
        countUp("#act-01-n", ${(t1 + 4.6).toFixed(2)}, 1.3, 18);
        tl.fromTo("#act-01-n", { scale: 0.55 }, { scale: 1, duration: 1.3, ease: "power3.out" }, ${(t1 + 4.6).toFixed(2)});
        tl.fromTo("#act-01-sub", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${(t1 + 6.2).toFixed(2)});
        // he walks out of frame; the threads leave with him, the pages stay
        tl.to("#act-01-figure", { x: 1700, duration: 4.2, ease: "power1.in" }, ${(t2 - 1.4).toFixed(2)});
        // ...and walks, rather than slides: a bob on the body and the hat, out of phase (sine-wave-loop, finite)
        tl.fromTo("#act-01-body", { y: 0 }, { y: -7, duration: 0.21, ease: "sine.inOut", yoyo: true, repeat: 19 }, ${(t2 - 1.4).toFixed(2)});
        tl.fromTo("#act-01-hat", { y: 0, rotation: 0 }, { y: -9, rotation: 3, duration: 0.21, ease: "sine.inOut", yoyo: true, repeat: 19 }, ${(t2 - 1.35).toFixed(2)});
        tl.to("#act-01-figure", { opacity: 0, duration: 0.6 }, ${(t2 + 2.0).toFixed(2)});
        for (let i = 0; i < ${N - 1}; i++) undrawPath("#act-01-th-" + i, ${(t2 - 0.4).toFixed(2)} + i * 0.22, 1.0);
        tl.to(".thread", { opacity: 0.15, duration: 1.2, ease: "power1.in" }, ${(t2 + 0.6).toFixed(2)});
        // the fictional-scenario disclosure: mandatory, three seconds, early
        tl.fromTo("#act-01-disc", { opacity: 0 }, { opacity: 1, duration: 0.4 }, 2.0);
        tl.to("#act-01-disc", { opacity: 0, duration: 0.4 }, 5.4);
    `;
  },
  sfx: (c) => {
    const t1 = c.at(1) ?? 7.1, t2 = c.at(2) ?? 16.2;
    return [
      { name: 'pop', at: t1 + 0.3, vol: 0.3 },
      { name: 'sparkle', at: t1 + 1.6, vol: 0.25 },
      { name: 'whoosh-short', at: t2 - 0.4, vol: 0.3 },
    ];
  },
};
