// ACT 9 — "is this a new skill?" The one he said they hadn't solved. The
// incident the record can't explain; replay it and nothing fires; and then
// the honest thing — it does not write a rule.
//
// Blueprint: transcript-scroll-artifact-reveal (the panel read as evidence,
// the incident as the artifact). Rules: yt-feather-highlight, spring-pop-
// entrance (the two findings), kinetic-type-beats (the honest line, alone on
// a dimmed field), waterfall-entry, counting-dynamic-scale (+18%). Source: act-09.webm from 1 s — the pulse
// panel, then INC-2026-0923 opens at ~8 s.
import { focus } from '../lib/chrome.mjs';
const PANEL = focus(0.52, 0.40, 1.22);

export default {
  label: 'A skill nobody wrote down',
  cardAt: 0.55,
  keystonAt: 1.0,
  reactAt: (c) => (c.at(3) ?? 25.1) + 2.2,
  reactTilt: 0,
  css: () => `
        #root .frame { left: 120px; right: 120px; top: 112px; bottom: 150px; }
        #root .find { position: absolute; right: 150px; top: 180px; display: flex; flex-direction: column; gap: 12px; align-items: flex-end; }
        #root .find .chip { position: static; font-size: 24px; }
        #root .find .chip b { font-weight: 700; font-variant-numeric: tabular-nums; }
        #root .dim { position: absolute; inset: 0; background: rgba(14,12,22,0.82); opacity: 0; }
        #root .honest { position: absolute; left: 0; right: 0; top: 50%; margin-top: -80px; text-align: center; font-weight: 900; font-size: 96px; letter-spacing: -0.03em; line-height: 1.05; }
        #root .honest .w { display: inline-block; opacity: 0; margin: 0 0.14em; will-change: transform; }
        #root .honest .w.red { color: #e8503f; }
        #root .honest2 { position: absolute; left: 0; right: 0; top: 50%; margin-top: 50px; text-align: center; font-weight: 700; font-size: 44px; color: #f6f5fa; }
        #root .honest2 .w { display: inline-block; opacity: 0; margin: 0 0.14em; will-change: transform; }
        #root .honest2 .w em { font-style: normal; color: #8b7cf6; }
  `,
  stage: (c) => `
          <div class="frame" id="act-09-frame">
            <div class="edge"></div>
            <div class="cam" id="act-09-cam" data-layout-allow-overflow="true">
              <video id="act-09-vid" class="shot" src="assets/footage/act-09.webm" muted data-start="0" data-duration="${c.D}" data-media-start="1"></video>
            </div>
            <div class="yt-hl" id="act-09-hl"></div>
          </div>
          <div class="find" id="act-09-find">
            <span class="chip red" id="act-09-f1"><b id="act-09-n1">+0%</b> over baseline &middot; four days</span>
            <span class="chip green" id="act-09-f2">every reading inside its limits</span>
            <span class="chip amber" id="act-09-f3">replayed through 2 approved pills &middot; 0 rules fired</span>
          </div>
          <div class="dim" id="act-09-dim"></div>
          <p class="honest" id="act-09-h1"><span class="w">It</span><span class="w">does</span><span class="w red">not</span><span class="w">write</span><span class="w">a</span><span class="w">rule.</span></p>
          <p class="honest2" id="act-09-h2"><span class="w">It</span><span class="w">asks</span><span class="w">the</span><span class="w">person</span><span class="w">who</span><span class="w"><em>knew</em></span><span class="w">—</span><span class="w">and</span><span class="w">their</span><span class="w">answer</span><span class="w">goes</span><span class="w">through</span><span class="w">the</span><span class="w">same</span><span class="w">approval.</span></p>
  `,
  motion: (c) => {
    const g1 = c.at(1) ?? 4.4, g2 = c.at(2) ?? 18.2, g3 = c.at(3) ?? 25.1, g4 = c.at(4) ?? 35.9;
    return `
        frameIn("#act-09-frame", 0.15);
        // the sentence reads itself: "1 of the 4 incidents... fired no rule at all"
        cam("#act-09-cam", 1.2, { zoom: ${PANEL.zoom}, slideX: ${PANEL.slideX}, slideY: ${PANEL.slideY}, dur: 1.2 });
        camReset("#act-09-cam", ${(g1 + 2.8).toFixed(2)}, 1.0);
        // the incident opens: plant eighteen percent over, every reading inside spec
        tl.to("#act-09-cam", { scale: 1.1, y: -60, duration: ${(g2 - g1 - 3).toFixed(2)}, ease: "none" }, ${(g1 + 3.9).toFixed(2)});
        chip("#act-09-f1", ${(g1 + 4.6).toFixed(2)});
        countUp("#act-09-n1", ${(g1 + 4.7).toFixed(2)}, 1.1, 18, (n) => "+" + n + "%");
        chip("#act-09-f2", ${(g1 + 7.2).toFixed(2)});
        // "replay it through every approved pill and not one rule fires"
        chip("#act-09-f3", ${(g2 + 3.4).toFixed(2)});
        tl.to("#act-09-f3", { borderColor: "#f6f5fa", color: "#f6f5fa", duration: 0.25, yoyo: true, repeat: 3 }, ${(g2 + 3.9).toFixed(2)});
        // the honest thing — the frame dims to one line, said slowly
        tl.to("#act-09-find", { opacity: 0, y: -12, duration: 0.4, ease: "power2.in" }, ${(g3 - 0.2).toFixed(2)});
        tl.to("#act-09-dim", { opacity: 1, duration: 0.6, ease: "power2.inOut" }, ${(g3 + 1.6).toFixed(2)});
        tl.to("#act-09-cam", { filter: "blur(6px)", scale: 1.14, duration: 0.8, ease: "power2.inOut" }, ${(g3 + 1.6).toFixed(2)});
        waterfall("#act-09-h1", ${(g3 + 2.2).toFixed(2)});
        tl.to("#act-09-h1 .w.red", { scale: 1.12, duration: 0.25, ease: "power2.out" }, ${(g3 + 3.3).toFixed(2)});
        tl.to("#act-09-h1 .w.red", { scale: 1, duration: 0.4, ease: "power2.inOut" }, ${(g3 + 3.55).toFixed(2)});
        // it asks the person who knew — and their answer goes through the same approval
        tl.to("#act-09-h1", { y: -70, duration: 0.6, ease: "power2.inOut" }, ${(g4 + 0.2).toFixed(2)});
        waterfall("#act-09-h2", ${(g4 + 0.6).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const g1 = c.at(1) ?? 4.4, g2 = c.at(2) ?? 18.2, g3 = c.at(3) ?? 25.1;
    return [
      { name: 'pop', at: g1 + 4.6, vol: 0.28 }, { name: 'pop', at: g1 + 7.2, vol: 0.28 },
      { name: 'ping', at: g2 + 3.4, vol: 0.3 },
      { name: 'impact-bass-2', at: g3 + 0.3, vol: 0.5 },
    ];
  },
};
