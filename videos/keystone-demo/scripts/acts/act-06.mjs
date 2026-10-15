// ACT 6 — keep talking to it. The follow-up with the word "that" in it; the
// thread held open on the server.
//
// Blueprint: transcript-scroll-artifact-reveal (the thread read as evidence).
// Registry/rules: yt-camera-move (punch on the follow-up chips), css-marker-
// patterns (a ring around "that"), spring-pop-entrance (the counter chip).
// Source: adp-session.webm from 34 s — the follow-up is picked at ~36 s.
import { focus } from '../lib/chrome.mjs';
const CHIPS = focus(0.46, 0.72, 1.26);
const THREAD = focus(0.46, 0.80, 1.2);

export default {
  label: 'One thread, not one question',
  lead: 0.7,
  keystonAt: 1.0,
  reactAt: (c) => (c.at(1) ?? 4.5) + 3.0,
  reactTilt: -5,
  css: () => `
        #root .frame { left: 120px; right: 120px; top: 112px; bottom: 150px; }
        #root .that { position: absolute; left: 50%; top: 50%; margin-left: -420px; margin-top: -40px; font-family: "IBM Plex Mono", monospace; font-size: 54px; font-weight: 700;
          color: #f6f5fa; opacity: 0; padding: 6px 18px; }
        #root .that .ring { left: -10px; right: -10px; top: -6px; bottom: -6px; width: calc(100% + 20px); height: calc(100% + 12px); }
        #root #act-06-counter { right: 150px; top: 160px; }
  `,
  stage: (c) => `
          <div class="frame" id="act-06-frame">
            <div class="edge"></div>
            <div class="cam" id="act-06-cam" data-layout-allow-overflow="true">
              <video id="act-06-vid" class="shot" src="assets/footage/adp-session.webm" muted data-start="0" data-duration="${c.D}" data-media-start="34"></video>
            </div>
            <div class="yt-hl" id="act-06-hl"></div>
          </div>
          <div class="that" id="act-06-that">&ldquo;does <span class="mark">that<svg class="ring" id="act-06-ring" viewBox="0 0 200 100" preserveAspectRatio="none"></svg></span> change&hellip;&rdquo;</div>
          <span class="chip" id="act-06-counter">follow-up 2 of 8 &middot; thread held server-side</span>
          <p class="lower" id="act-06-low"><span class="w">arguing</span><span class="w">with</span><span class="w">the</span><span class="w">agent,</span><span class="w"><em>not</em></span><span class="w"><em>querying</em></span><span class="w"><em>it</em></span></p>
  `,
  motion: (c) => {
    const g0 = c.at(0) ?? 0.7, g1 = c.at(1) ?? 4.5, g2 = c.at(2) ?? 14.6;
    return `
        frameIn("#act-06-frame", 0.15);
        // the chips, punched: "now ask a follow-up with the word that in it"
        cam("#act-06-cam", ${(g0 + 0.3).toFixed(2)}, { zoom: ${CHIPS.zoom}, slideX: ${CHIPS.slideX}, slideY: ${CHIPS.slideY}, dur: 1.0 });
        hlIn("#act-06-hl", ${(g0 + 1.0).toFixed(2)}, { x: "50%", y: "50%", rx: "36%", ry: "18%" });
        // hold one beat on the word — ringed
        tl.fromTo("#act-06-that", { opacity: 0, y: 16, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.5)" }, ${(g0 + 2.2).toFixed(2)});
        ring("#act-06-ring", ${(g0 + 2.6).toFixed(2)}, "#d79a3a");
        tl.to("#act-06-that", { opacity: 0, y: -14, duration: 0.35, ease: "power2.in" }, ${(g1 + 2.4).toFixed(2)});
        hlOut("#act-06-hl", ${(g1 + 2.0).toFixed(2)});
        // the follow-up lands, indented under the first — follow it down
        tl.to("#act-06-cam", { scale: ${1 + THREAD.zoom}, x: ${THREAD.slideX}, y: ${THREAD.slideY}, duration: 1.4, ease: "power2.inOut" }, ${(g1 + 2.6).toFixed(2)});
        chip("#act-06-counter", ${(g1 + 5.0).toFixed(2)});
        tl.to("#act-06-cam", { scale: ${1 + THREAD.zoom + 0.04}, y: ${THREAD.slideY - 40}, duration: ${(c.D - g1 - 4.2).toFixed(2)}, ease: "none" }, ${(g1 + 4.1).toFixed(2)});
        waterfall("#act-06-low", ${(g2 + 2.6).toFixed(2)});
    `;
  },
  sfx: (c) => [
    { name: 'ping', at: (c.at(0) ?? 0.7) + 2.6, vol: 0.28 },
    { name: 'pop', at: (c.at(1) ?? 4.5) + 5.0, vol: 0.3 },
  ],
};
