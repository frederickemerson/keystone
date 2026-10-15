// ACT 8 — top five, and why. "What to look at first": push in on row one,
// the reason sentence, the three evidence items it names.
//
// Blueprint: dataviz-countup (lite: a list traversed to a hero row). Registry/
// rules: yt-camera-move, yt-feather-highlight, spring-pop-entrance (the three
// evidence chips), waterfall-entry ("no weights").
import { focus } from '../lib/chrome.mjs';
const ROW = focus(0.56, 0.58, 1.34);

export default {
  label: 'What to look at first',
  lead: 0.7,
  keystonAt: 1.0,
  reactAt: (c) => (c.at(2) ?? 13.1) + 4.6,
  reactTilt: 5,
  css: () => `
        #root .frame { left: 120px; right: 120px; top: 112px; bottom: 150px; }
        #root .ev { position: absolute; right: 150px; top: 180px; display: flex; flex-direction: column; gap: 12px; align-items: flex-end; }
        #root .ev .chip { position: static; font-size: 22px; }
  `,
  stage: (c) => `
          <div class="frame" id="act-08-frame">
            <div class="edge"></div>
            <div class="cam" id="act-08-cam" data-layout-allow-overflow="true">
              <video id="act-08-vid" class="shot" src="assets/footage/act-08.webm" muted data-start="0" data-duration="${c.D}" data-media-start="2"></video>
            </div>
            <div class="yt-hl" id="act-08-hl"></div>
          </div>
          <div class="ev" id="act-08-ev">
            <span class="chip amber" id="act-08-e1">LEW sign-off</span>
            <span class="chip amber" id="act-08-e2">insulation resistance test passed</span>
            <span class="chip amber" id="act-08-e3">area confirmed dry</span>
          </div>
          <p class="lower" id="act-08-low"><span class="w">not</span><span class="w">a</span><span class="w">score</span><span class="w">—</span><span class="w"><em>no</em></span><span class="w"><em>weights,</em></span><span class="w"><em>same</em></span><span class="w"><em>record,</em></span><span class="w"><em>same</em></span><span class="w"><em>order</em></span></p>
  `,
  motion: (c) => {
    const g1 = c.at(1) ?? 7.1, g2 = c.at(2) ?? 13.1;
    return `
        frameIn("#act-08-frame", 0.15);
        tl.to("#act-08-cam", { scale: 1.06, y: -20, duration: ${(g1 - 0.6).toFixed(2)}, ease: "none" }, 0.9);
        // "five, worst first" — push in on row one, and the reason sentence under it
        cam("#act-08-cam", ${(g1 + 0.2).toFixed(2)}, { zoom: ${ROW.zoom}, slideX: ${ROW.slideX}, slideY: ${ROW.slideY}, dur: 1.1 });
        hlIn("#act-08-hl", ${(g1 + 1.0).toFixed(2)}, { x: "50%", y: "50%", rx: "42%", ry: "16%" });
        // "each one saying why it's there and who it's waiting on" — the three things it names
        ${['e1', 'e2', 'e3'].map((k, i) => `chip("#act-08-${k}", ${(g1 + 2.2 + i * 0.5).toFixed(2)});`).join('\n        ')}
        hlOut("#act-08-hl", ${(g2 + 1.4).toFixed(2)});
        tl.to("#act-08-ev", { opacity: 0, y: -12, duration: 0.4, ease: "power2.in" }, ${(g2 + 1.6).toFixed(2)});
        camReset("#act-08-cam", ${(g2 + 1.6).toFixed(2)}, 1.3);
        tl.to("#act-08-cam", { scale: 1.05, y: -30, duration: ${(c.D - g2 - 3).toFixed(2)}, ease: "none" }, ${(g2 + 2.9).toFixed(2)});
        waterfall("#act-08-low", ${(g2 + 3.2).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const g1 = c.at(1) ?? 7.1;
    return [0, 1, 2].map((i) => ({ name: 'pop', at: g1 + 2.2 + i * 0.5, vol: 0.28 }));
  },
};
