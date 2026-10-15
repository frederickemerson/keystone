// CLOSE — one pill, three destinations, the lockup, the credit card, black.
//
// Blueprint: logo-assemble-lockup / constellation-hub (CTA). Rules: depth-
// scatter-assemble (inverted — the pill splits outward into three), spring-
// pop-entrance (labels), waterfall-entry (the line), ambient-glow-bloom. The
// final scene may fade out: this is the one place an exit is allowed.
const PILL = `
            <p class="pill-name">chilled-water-leak</p>
            <p class="pill-ver">v1.2.0 &middot; approved</p>
            <ul class="pill-rules">
              <li>TS-07 &mdash; no re-energisation without LEW sign-off</li>
              <li>TS-02 &mdash; branch sub-valve before the riser</li>
              <li>TS-01 &mdash; water near electrical: evacuate, escalate</li>
            </ul>
            <p class="pill-foot">13 rules &middot; 6 evals &middot; owner, steward, approver</p>`;

export default {
  label: '',
  lead: 0.8,
  beat: 0.5,
  tail: 2.2,
  keystonAt: 1.2,
  reactAt: (c) => (c.at(2) ?? 11.8) + 2.4,
  reactTilt: 5,
  css: () => `
        #root .pillwrap { position: absolute; left: 50%; top: 50%; width: 720px; margin-left: -360px; margin-top: -250px; perspective: 1600px; }
        #root .pill-art { position: absolute; left: 0; top: 0; width: 720px; border-radius: 20px; background: #f6f5fa; color: #1d1a2b; padding: 32px 40px; text-align: left;
          box-shadow: 0 44px 130px rgba(139,124,246,0.42); opacity: 0; will-change: transform; }
        #root .pill-name { margin: 0; font-family: "IBM Plex Mono", monospace; font-size: 32px; font-weight: 700; }
        #root .pill-ver { margin: 6px 0 0; font-family: "IBM Plex Mono", monospace; font-size: 20px; color: #6b6484; }
        #root .pill-rules { margin: 22px 0 0; padding: 0; list-style: none; }
        #root .pill-rules li { font-size: 23px; line-height: 1.5; color: #2a2740; padding-left: 18px; border-left: 3px solid #8b7cf6; margin-bottom: 10px; }
        #root .pill-foot { margin: 20px 0 0; font-family: "IBM Plex Mono", monospace; font-size: 18px; color: #6b6484; }
        #root .dest { position: absolute; top: 100%; left: 0; width: 720px; margin-top: 22px; text-align: center; font-family: "IBM Plex Mono", monospace; font-size: 30px; letter-spacing: 0.14em;
          text-transform: uppercase; color: #8b7cf6; opacity: 0; }
        #root .lockup { position: absolute; left: 0; right: 0; top: 50%; margin-top: -150px; text-align: center; }
        #root .mark { display: inline-block; width: 92px; height: 78px; margin-bottom: 18px; opacity: 0; }
        #root .word { font-weight: 900; font-size: 150px; letter-spacing: -0.05em; line-height: 1; }
        #root .word .w { display: inline-block; opacity: 0; margin: 0 0.02em; will-change: transform; }
        #root .line { margin-top: 18px; font-weight: 700; font-size: 44px; letter-spacing: -0.02em; color: #f6f5fa; }
        #root .line .w { display: inline-block; opacity: 0; margin-right: 0.26em; will-change: transform; }
        #root .line em { font-style: normal; color: #8b7cf6; }
        #root .credit { position: absolute; left: 0; right: 0; bottom: 70px; text-align: center; font-family: "IBM Plex Mono", monospace; font-size: 20px; line-height: 1.6; color: #9a93b5; opacity: 0; }
        #root .credit b { color: #f6f5fa; font-weight: 700; }
  `,
  stage: () => `
          <div class="pillwrap" id="close-wrap" data-layout-allow-overlap="true">
            <div class="pill-art" id="close-p0">${PILL}</div>
            <div class="pill-art" id="close-p1">${PILL}<div class="dest" id="close-d1">agent</div></div>
            <div class="pill-art" id="close-p2">${PILL}<div class="dest" id="close-d2">platform</div></div>
            <div class="pill-art" id="close-p3">${PILL}<div class="dest" id="close-d0">skill</div></div>
          </div>
          <div class="lockup" id="close-lockup">
            <svg class="mark" id="close-mark" viewBox="0 0 60 50" aria-hidden="true"><path d="M18 11 H42 L39.5 42 H20.5 Z" fill="#8b7cf6" /><path d="M18.6 13.4 L8 21.5 L10.5 38 H21 Z M41.4 13.4 L52 21.5 L49.5 38 H39 Z" fill="rgba(139,124,246,0.35)" /></svg>
            <div class="word" id="close-word"><span class="w">Keystone</span></div>
            <p class="line" id="close-line"><span class="w">expert</span><span class="w">judgement,</span><span class="w"><em>governed.</em></span></p>
          </div>
          <div class="credit" id="close-credit"><b>&ldquo;Beauty Flow&rdquo;</b> &middot; Kevin MacLeod (incompetech.com)<br>Licensed under Creative Commons: By Attribution 4.0 &middot; creativecommons.org/licenses/by/4.0/</div>
  `,
  motion: (c) => {
    const g0 = c.at(0) ?? 0.8, g1 = c.at(1) ?? 7.6, g2 = c.at(2) ?? 11.8;
    return `
        // one pill
        tl.fromTo("#close-p0", { opacity: 0, scale: 0.86, rotationX: 18 }, { opacity: 1, scale: 1, rotationX: 0, duration: 0.8, ease: "back.out(1.4)" }, 0.3);
        tl.set(["#close-p1", "#close-p2", "#close-p3"], { opacity: 1 }, ${(g0 + 2.0).toFixed(2)});
        tl.set("#close-p0", { opacity: 0 }, ${(g0 + 2.0).toFixed(2)});
        // ...splits into three, each flying to its destination (depth-scatter-assemble, outward)
        tl.to("#close-p3", { x: -600, y: -40, scale: 0.62, rotationY: 14, duration: 0.8, ease: "power3.out" }, ${(g0 + 2.05).toFixed(2)});
        tl.to("#close-p1", { x: 0, y: -40, scale: 0.62, duration: 0.8, ease: "power3.out" }, ${(g0 + 2.55).toFixed(2)});
        tl.to("#close-p2", { x: 600, y: -40, scale: 0.62, rotationY: -14, duration: 0.8, ease: "power3.out" }, ${(g0 + 3.1).toFixed(2)});
        tl.fromTo("#close-d0", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, ${(g0 + 2.5).toFixed(2)});
        tl.fromTo("#close-d1", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, ${(g0 + 3.0).toFixed(2)});
        tl.fromTo("#close-d2", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, ${(g0 + 3.55).toFixed(2)});
        // "so the new person works as if Tan Wei Ming is sitting next to them" — the three clear, the lockup lands
        tl.to("#close-wrap", { opacity: 0, scale: 0.9, y: -60, duration: 0.6, ease: "power2.in" }, ${(g1 + 1.2).toFixed(2)});
        tl.fromTo("#close-mark", { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.8)" }, ${(g1 + 1.9).toFixed(2)});
        waterfall("#close-word", ${(g1 + 2.2).toFixed(2)});
        // "He still retires. His judgement doesn't."
        waterfall("#close-line", ${(g2 + 2.2).toFixed(2)});
        // the licence condition
        tl.fromTo("#close-credit", { opacity: 0 }, { opacity: 1, duration: 0.6 }, ${(g2 + 4.6).toFixed(2)});
        tl.to("#close-keyston", { opacity: 0, duration: 0.8 }, ${(c.D - 1.4).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const g0 = c.at(0) ?? 0.8, g1 = c.at(1) ?? 7.6, g2 = c.at(2) ?? 11.8;
    return [
      { name: 'pop', at: 0.3, vol: 0.26 },
      { name: 'sparkle', at: g0 + 2.05, vol: 0.3 },
      { name: 'impact-bass-2', at: g1 + 1.3, vol: 0.4 },
      { name: 'chime', at: g2 + 2.2, vol: 0.3 },
    ];
  },
};
