// ACT 0 — cold open. A plain assistant, no product chrome. The question types,
// the answer streams, a timer lands on 2.0 s, and the two things it cites get
// circled and stamped unverifiable.
//
// Blueprint: prompt-type-submit-generate (sub-shape B — typed ask, status
// theater, streaming answer). Rules: discrete-text-sequence (typing),
// context-sensitive-cursor (caret), streaming-text's measured token rhythm,
// css-marker-patterns (circle), headline-slam signature (stamp),
// multi-phase-camera (one slow push).
const QUESTION = 'After a chilled water leak, who must approve re-energising?';

export default {
  label: 'The problem in one shot',
  lead: 0.5,
  keystonAt: 1.2,
  reactAt: (c) => (c.at(2) ?? 12.4) + 4.2,
  reactTilt: -8,
  css: () => `
        #root .co { position: absolute; left: 50%; top: 50%; width: 1440px; margin-left: -720px; margin-top: -330px;
          background: #ffffff; color: #15121f; border-radius: 18px; padding: 54px 64px 70px; box-shadow: 0 60px 140px rgba(0,0,0,0.65); will-change: transform; }
        #root .co-chrome { font-family: "IBM Plex Mono", monospace; font-size: 18px; letter-spacing: 0.16em; text-transform: uppercase; color: #9a93b5; display: flex; justify-content: space-between; }
        #root .co-q { margin: 30px 0 34px; font-size: 48px; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; min-height: 116px; }
        #root .co-q .caret { display: inline-block; width: 4px; height: 44px; background: #15121f; vertical-align: -6px; margin-left: 6px; }
        #root .co-status { font-family: "IBM Plex Mono", monospace; font-size: 22px; color: #9a93b5; opacity: 0; height: 30px; position: relative; overflow: hidden; }
        #root .co-status .sheen { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%); }
        #root .co-a { font-size: 38px; line-height: 1.42; color: #2a2740; margin-top: 10px; min-height: 170px; }
        #root .co-a .w { opacity: 0; }
        #root .co-timer { font-family: "IBM Plex Mono", monospace; font-size: 22px; color: #9a93b5; font-variant-numeric: tabular-nums; }
        #root .co .stamp { left: 64px; bottom: -40px; color: #d79a3a; }
        #root .co-hint { position: absolute; right: 64px; bottom: 26px; font-family: "IBM Plex Mono", monospace; font-size: 17px; letter-spacing: 0.12em; text-transform: uppercase; color: #c9c3d9; opacity: 0; }
  `,
  stage: () => `
          <div class="co" id="act-00-co">
            <div class="co-chrome"><span>assistant</span><span class="co-timer" id="act-00-timer">0.0 s</span></div>
            <p class="co-q"><span id="act-00-q"></span><span class="caret" id="act-00-caret"></span></p>
            <div class="co-status" id="act-00-status">Thinking<span class="sheen" id="act-00-sheen"></span></div>
            <div class="co-a" id="act-00-a">
              <span class="w">The</span> <span class="w">Duty</span> <span class="w">Engineer</span> <span class="w">must</span> <span class="w">approve</span> <span class="w">re-energisation.</span>
              <span class="w">This</span> <span class="w">is</span> <span class="w">governed</span> <span class="w">by</span> <span class="w">rule</span>
              <span class="w mark" id="act-00-m1">TS-07<svg class="ring" id="act-00-r1" viewBox="0 0 200 100" preserveAspectRatio="none"></svg></span><span class="w">,</span>
              <span class="w">pill</span> <span class="w">version</span>
              <span class="w mark" id="act-00-m2">2.1<svg class="ring" id="act-00-r2" viewBox="0 0 200 100" preserveAspectRatio="none"></svg></span><span class="w">.</span>
            </div>
            <div class="stamp" id="act-00-stamp">unverifiable</div>
            <div class="co-hint" id="act-00-hint">no source · no owner · no version to check</div>
          </div>
  `,
  motion: (c) => {
    const t1 = c.at(1) ?? 6.4;   // "Two seconds. Confident. It cites a rule, and it cites a version number."
    const t2 = c.at(2) ?? 12.4;  // "And you have no way to tell..."
    return `
        tl.fromTo("#act-00-co", { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" }, 0.1);
        // one slow push for the whole act (multi-phase-camera: push phase only)
        tl.to("#act-00-co", { scale: 1.06, y: -10, duration: ${(c.D - 0.8).toFixed(2)}, ease: "none" }, 0.8);
        // the question types itself — discrete-text-sequence: one tl.set per character
        const Q = ${JSON.stringify(QUESTION)};
        for (let i = 1; i <= Q.length; i++) tl.set("#act-00-q", { textContent: Q.slice(0, i) }, 0.6 + (i / Q.length) * 1.7);
        tl.to("#act-00-caret", { opacity: 0.1, duration: 0.3, repeat: 9, yoyo: true, ease: "none" }, 0.6);
        tl.set("#act-00-caret", { opacity: 0 }, 3.6);
        // status theater: "Thinking" with a sheen that sweeps left to right
        tl.fromTo("#act-00-status", { opacity: 0 }, { opacity: 1, duration: 0.2 }, 2.5);
        tl.fromTo("#act-00-sheen", { xPercent: -100 }, { xPercent: 100, duration: 0.7, ease: "power1.inOut" }, 2.6);
        tl.to("#act-00-status", { opacity: 0, duration: 0.2 }, 3.35);
        // the answer streams in bursts — the measured token rhythm from the registry's streaming-text
        const GAPS = [0.167, 0.1, 0, 0.367, 0, 0.167, 0.133, 0.1, 0.1, 0.133, 0.167, 0.133, 0, 0.233, 0.167, 0.1, 0, 0.133, 0.133, 0.1, 0.167, 0.133, 0.1, 0.133];
        let st = 3.4;
        qa("#act-00-a .w").forEach((w, i) => {
          if (i > 0) st += GAPS[i % GAPS.length];
          tl.set(w, { opacity: 1 }, st);
          tl.fromTo(w, { color: "#9a93b5" }, { color: "#2a2740", duration: 0.27, ease: "none" }, st);
        });
        // the corner timer runs while it answers and lands on 2.0 s
        const timer = { v: 0 };
        tl.to(timer, { v: 2, duration: 2.0, ease: "none", onUpdate() { const el = q("#act-00-timer"); if (el) el.textContent = timer.v.toFixed(1) + " s"; } }, 2.5);
        // it cites a rule, and it cites a version number — circled, amber, not red
        ring("#act-00-r1", ${(t1 + 1.9).toFixed(2)}, "#d79a3a");
        ring("#act-00-r2", ${(t1 + 3.2).toFixed(2)}, "#d79a3a");
        tl.to(["#act-00-m1", "#act-00-m2"], { color: "#b87b1e", duration: 0.4, stagger: 1.3 }, ${(t1 + 1.9).toFixed(2)});
        // nothing on this screen is checkable
        stamp("#act-00-stamp", ${(t2 + 3.9).toFixed(2)});
        tl.fromTo("#act-00-hint", { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, ${(t2 + 5.2).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const t1 = c.at(1) ?? 6.4, t2 = c.at(2) ?? 12.4;
    return [
      { name: 'typing', at: 0.6, vol: 0.3 },
      { name: 'ping', at: t1 + 1.9, vol: 0.3 },
      { name: 'ping', at: t1 + 3.2, vol: 0.3 },
      { name: 'impact-bass-1', at: t2 + 3.85, vol: 0.5 },
    ];
  },
};
