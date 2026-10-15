// ACT 10 — one-off or systemic, and the questions nobody asked. Recurrence
// chips stamp in; the blind-spot row; the question we forgot to ask.
//
// Blueprint: grid-card-assemble (three chips self-assemble). Registry/rules:
// spring-pop-entrance, yt-camera-move (punch to the blind-spot row),
// yt-feather-highlight, css-marker-patterns (highlight), waterfall-entry,
// counting-dynamic-scale (the three tallies tick up).
import { focus } from '../lib/chrome.mjs';
const ROW = focus(0.5, 0.55, 1.3);

export default {
  label: 'One-off, or systemic',
  lead: 0.7,
  keystonAt: 1.0,
  reactAt: (c) => (c.at(2) ?? 27.4) + 0.3,
  reactTilt: 6,
  css: () => `
        #root .frame { left: 120px; right: 120px; top: 112px; bottom: 150px; }
        #root .rec { position: absolute; right: 150px; top: 180px; display: flex; flex-direction: column; gap: 12px; align-items: flex-end; }
        #root .rec .chip { position: static; font-size: 26px; }
        #root .rec .chip b { font-weight: 700; color: #f6f5fa; margin-left: 10px; font-variant-numeric: tabular-nums; }
        #root .key { position: absolute; left: 150px; top: 180px; font-family: "IBM Plex Mono", monospace; font-size: 30px; font-weight: 700; color: #f6f5fa; padding: 10px 18px; opacity: 0; }
        #root .key .hl { position: absolute; inset: 0 -4px; border-radius: 6px; background: rgba(215,154,58,0.42); transform: scaleX(0); transform-origin: left center; }
        #root .key .t { position: relative; }
  `,
  stage: (c) => `
          <div class="frame" id="act-10-frame">
            <div class="edge"></div>
            <div class="cam" id="act-10-cam" data-layout-allow-overflow="true">
              <video id="act-10-vid" class="shot" src="assets/footage/act-10.webm" muted data-start="0" data-duration="${c.D}" data-media-start="2"></video>
            </div>
            <div class="yt-hl" id="act-10-hl"></div>
          </div>
          <div class="rec" id="act-10-rec">
            <span class="chip amber" id="act-10-c1">recurring <b>&times;<span id="act-10-n1">0</span></b></span>
            <span class="chip" id="act-10-c2">seen once <b>&times;<span id="act-10-n2">0</span></b></span>
            <span class="chip red" id="act-10-c3">not in the record <b>&times;<span id="act-10-n3">0</span></b></span>
          </div>
          <div class="key" id="act-10-key"><span class="hl" id="act-10-keyhl"></span><span class="t">distance_to_electrical_m</span></div>
          <p class="lower" id="act-10-low"><span class="w">it</span><span class="w">found</span><span class="w">a</span><span class="w">question</span><span class="w">we</span><span class="w"><em>forgot</em></span><span class="w"><em>to</em></span><span class="w"><em>ask</em></span></p>
  `,
  motion: (c) => {
    const g0 = c.at(0) ?? 0.7, g1 = c.at(1) ?? 15.8, g2 = c.at(2) ?? 27.4;
    return `
        frameIn("#act-10-frame", 0.15);
        tl.to("#act-10-cam", { scale: 1.07, y: -24, duration: ${(g1 - 1.5).toFixed(2)}, ease: "none" }, 0.9);
        // "so every rule says which it is" — four recurring, three once, six never seen
        chip("#act-10-c1", ${(g0 + 8.2).toFixed(2)});
        chip("#act-10-c2", ${(g0 + 9.0).toFixed(2)});
        chip("#act-10-c3", ${(g0 + 10.4).toFixed(2)});
        countUp("#act-10-n1", ${(g0 + 8.4).toFixed(2)}, 0.6, 4);
        countUp("#act-10-n2", ${(g0 + 9.2).toFixed(2)}, 0.6, 3);
        countUp("#act-10-n3", ${(g0 + 10.6).toFixed(2)}, 0.7, 6);
        tl.to("#act-10-rec", { opacity: 0, y: -12, duration: 0.4, ease: "power2.in" }, ${(g1 - 0.4).toFixed(2)});
        // "and this row is the one that started it" — punch to the blind-spot panel
        cam("#act-10-cam", ${(g1 + 0.2).toFixed(2)}, { zoom: ${ROW.zoom}, slideX: ${ROW.slideX}, slideY: ${ROW.slideY}, dur: 1.2 });
        hlIn("#act-10-hl", ${(g1 + 1.2).toFixed(2)}, { x: "50%", y: "50%", rx: "40%", ry: "20%" });
        // the key the record always had, that no rule read
        tl.fromTo("#act-10-key", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, ${(g1 + 3.6).toFixed(2)});
        tl.to("#act-10-keyhl", { scaleX: 1, duration: 0.5, ease: "power2.out" }, ${(g1 + 4.4).toFixed(2)});
        tl.to("#act-10-key", { scale: 1.06, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: 3 }, ${(g1 + 5.2).toFixed(2)});
        hlOut("#act-10-hl", ${(g2 - 0.2).toFixed(2)});
        waterfall("#act-10-low", ${(g2 + 0.2).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const g0 = c.at(0) ?? 0.7, g1 = c.at(1) ?? 15.8;
    return [
      { name: 'pop', at: g0 + 8.2, vol: 0.28 }, { name: 'pop', at: g0 + 9.0, vol: 0.28 }, { name: 'pop', at: g0 + 10.4, vol: 0.28 },
      { name: 'ping', at: g1 + 4.4, vol: 0.28 },
    ];
  },
};
