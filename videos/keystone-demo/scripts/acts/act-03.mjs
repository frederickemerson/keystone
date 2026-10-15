// ACT 3 — not one expert, several. Frontline capture as the technician:
// blocked gate → escalate → consent → note → read-back → draft rule.
//
// Blueprint: cursor-ui-demo (one workflow end-to-end). Registry/rules:
// yt-camera-move, yt-feather-highlight (the consent boxes, the read-back),
// spring-pop-entrance (three roles), waterfall-entry (whose knowledge).
// Footage events (record-footage.mjs, source seconds): escalate ~3.4 ·
// answer ~5.2 · consent boxes ~6.6 · continue ~7.6 · demo note ~9–10 ·
// read-back ~12–16.4 · draft ~16.4 · scroll ~19.4.
import { focus, view } from '../lib/chrome.mjs';
const SRC = 'assets/footage/act-03.webm';
const F1 = focus(0.55, 0.42, 1.3);   // the capture task
const F2 = focus(0.55, 0.45, 1.3);   // the read-back and the draft
const V1 = view(0.55, 0.42, 1.3, F1.slideX, F1.slideY);
const V2 = view(0.55, 0.45, 1.3, F2.slideX, F2.slideY);

export default {
  label: 'Frontline capture',
  cardAt: 0.55,
  keystonAt: 1.0,
  reactAt: (c) => (c.at(2) ?? 14) + 9.5,
  reactTilt: 6,
  css: () => `
        #root .roles { position: absolute; left: 0; right: 0; bottom: 48px; display: flex; justify-content: center; gap: 18px; }
        #root .roles .chip { position: static; font-size: 24px; }
        #root .roles .neq { font-family: "IBM Plex Mono", monospace; font-size: 40px; color: #8b7cf6; opacity: 0; align-self: center; }
  `,
  stage: (c) => `
          <div class="frame" id="act-03-frame">
            <div class="edge"></div>
            <div class="cam" id="act-03-cam" data-layout-allow-overflow="true">
              <video id="act-03-vid" class="shot" src="${SRC}" muted data-start="0" data-duration="${c.D}" data-media-start="0"></video>
            </div>
            <div class="yt-hl" id="act-03-hl"></div>
          </div>
          <div class="roles" id="act-03-roles">
            <span class="chip" id="act-03-r1">said it &middot; Rajesh</span><span class="neq" id="act-03-n1">&ne;</span>
            <span class="chip" id="act-03-r2">proposed it &middot; Tan</span><span class="neq" id="act-03-n2">&ne;</span>
            <span class="chip green" id="act-03-r3">confirmed it &middot; Hafiz</span>
          </div>
          <p class="lower" id="act-03-low"><span class="w">Tan</span><span class="w">Wei</span><span class="w">Ming</span><span class="w"><em>(13</em></span><span class="w"><em>rules)</em></span><span class="w">&middot;</span><span class="w">Rajesh</span><span class="w">Kumar</span><span class="w"><em>(1</em></span><span class="w"><em>rule)</em></span></p>
  `,
  motion: (c) => {
    const g1 = c.at(1) ?? 8.1, g2 = c.at(2) ?? 14.0, g3 = c.at(3) ?? 29.5;
    return `
        frameIn("#act-03-frame", 0.15);
        // the gate, blocked: a slow push while the quote card is read
        tl.to("#act-03-cam", { scale: 1.07, y: -20, duration: ${(g1 - 0.4).toFixed(2)}, ease: "none" }, 0.9);
        // "it asks him why" — punch to the capture task, spotlight the consent boxes
        cam("#act-03-cam", ${(g1 + 0.2).toFixed(2)}, { zoom: ${F1.zoom}, slideX: ${F1.slideX}, slideY: ${F1.slideY}, dur: 1.0 });
        hlIn("#act-03-hl", ${(g1 + 1.4).toFixed(2)}, { x: "${V1.x}", y: "${V1.y}", rx: "26%", ry: "24%" });
        // "watch who checks the numbers" — the read-back, each one his
        cam("#act-03-cam", ${(g2 + 0.4).toFixed(2)}, { zoom: ${F2.zoom}, slideX: ${F2.slideX}, slideY: ${F2.slideY}, dur: 0.9 });
        hlTo("#act-03-hl", ${(g2 + 0.6).toFixed(2)}, { x: "${V2.x}", y: "${V2.y}", rx: "30%", ry: "28%" }, 0.9);
        hlOut("#act-03-hl", ${(g2 + 7.4).toFixed(2)});
        camReset("#act-03-cam", ${(g2 + 7.6).toFixed(2)}, 1.2);
        // "three different people, and the code refuses if they're not"
        chip("#act-03-r1", ${(g2 + 9.2).toFixed(2)});
        tl.fromTo("#act-03-n1", { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, ${(g2 + 9.7).toFixed(2)});
        chip("#act-03-r2", ${(g2 + 10.0).toFixed(2)});
        tl.fromTo("#act-03-n2", { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, ${(g2 + 10.5).toFixed(2)});
        chip("#act-03-r3", ${(g2 + 10.8).toFixed(2)});
        tl.to("#act-03-roles", { opacity: 0, y: -12, duration: 0.4, ease: "power2.in" }, ${(g3 - 0.3).toFixed(2)});
        // "whose knowledge it is" — a slow drift on the draft and the attribution line
        tl.to("#act-03-cam", { scale: 1.1, y: -50, duration: ${(c.D - g3).toFixed(2)}, ease: "none" }, ${g3.toFixed(2)});
        waterfall("#act-03-low", ${(g3 + 2.6).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const g2 = c.at(2) ?? 14.0;
    return [
      { name: 'click', at: (c.at(1) ?? 8.1) + 0.2, vol: 0.25 },
      { name: 'pop', at: g2 + 9.2, vol: 0.3 }, { name: 'pop', at: g2 + 10.0, vol: 0.3 }, { name: 'pop', at: g2 + 10.8, vol: 0.3 },
      { name: 'chime', at: (c.at(3) ?? 29.5) + 2.6, vol: 0.22 },
    ];
  },
};
