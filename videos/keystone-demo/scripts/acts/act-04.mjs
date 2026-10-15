// ACT 4 — "the human in the loop cannot be missing". Live incident room,
// evidence arriving — and here it stops. Everything else desaturates; the
// three missing items light one at a time behind a padlock, not a spinner.
//
// Blueprint: agent-progress-theater, inverted — the machine's state change IS
// the demo, and the state is BLOCKED. Registry/rules: yt-feather-highlight
// (lock on the gate), svg-path-draw (the padlock), spring-pop-entrance (the
// three keys), waterfall-entry. The bed ducks on the same frame (index.html
// volume lane) with one bass impact.
import { view } from '../lib/chrome.mjs';
const SRC = 'assets/footage/act-04.webm';
const GATE = view(0.63, 0.39, 1.14, 0, -40);
export const STOP_OFFSET = 3.3;   // seconds into VO group 1: "...and here it stops."

export default {
  label: 'The gate holds',
  cardAt: 0.55,
  keystonAt: 1.0,
  reactAt: (c) => (c.at(1) ?? 6.4) + STOP_OFFSET + 0.1,
  reactTilt: 0,
  css: () => `
        #root .keys { position: absolute; right: 150px; top: 300px; display: flex; flex-direction: column; gap: 14px; align-items: flex-end; }
        #root .keys .chip { position: static; font-size: 24px; }
        #root .lock { position: absolute; right: 150px; top: 196px; width: 84px; height: 92px; }
        #root .lock path, #root .lock rect { fill: none; stroke: #e8503f; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
        #root .blocked { position: absolute; left: 150px; top: 196px; font-family: "IBM Plex Mono", monospace; font-weight: 700; font-size: 44px; letter-spacing: 0.18em;
          text-transform: uppercase; color: #e8503f; padding: 12px 26px; border: 3px solid #e8503f; border-radius: 8px; background: rgba(14,12,22,0.9); opacity: 0; will-change: transform; }
  `,
  stage: (c) => `
          <div class="frame" id="act-04-frame">
            <div class="edge"></div>
            <div class="cam" id="act-04-cam" data-layout-allow-overflow="true">
              <video id="act-04-vid" class="shot" src="${SRC}" muted data-start="0" data-duration="${c.D}" data-media-start="2"></video>
            </div>
            <div class="yt-hl" id="act-04-hl"></div>
          </div>
          <div class="blocked" id="act-04-blocked">blocked</div>
          <svg class="lock" id="act-04-lock" viewBox="0 0 84 92">
            <path id="act-04-lock-arc" d="M 22 42 V 28 a 20 20 0 0 1 40 0 V 42" />
            <rect id="act-04-lock-body" x="10" y="42" width="64" height="44" rx="8" />
          </svg>
          <div class="keys" id="act-04-keys">
            <span class="chip red" id="act-04-k1">lew_signoff</span>
            <span class="chip red" id="act-04-k2">insulation_resistance_ok</span>
            <span class="chip red" id="act-04-k3">area_dry</span>
          </div>
          <p class="lower" id="act-04-low"><span class="w">the</span><span class="w">engine</span><span class="w">takes</span><span class="w"><em>no</em></span><span class="w"><em>AI</em></span><span class="w"><em>output</em></span><span class="w">—</span><span class="w">not</span><span class="w">a</span><span class="w">setting,</span><span class="w">the</span><span class="w">architecture</span></p>
  `,
  motion: (c) => {
    const g1 = c.at(1) ?? 6.4, g2 = c.at(2) ?? 16.7;
    const stop = g1 + STOP_OFFSET;
    return `
        frameIn("#act-04-frame", 0.15);
        // evidence arriving: a slow push, the room alive
        tl.to("#act-04-cam", { scale: 1.1, y: -30, duration: ${(stop - 0.9).toFixed(2)}, ease: "none" }, 0.9);
        // "— and here it stops." Everything else goes grey; the gate stays lit. One clunk.
        tl.to("#act-04-cam", { filter: "grayscale(1) brightness(0.62)", scale: 1.14, y: -40, duration: 0.22, ease: "power3.out" }, ${stop.toFixed(2)});
        hlIn("#act-04-hl", ${stop.toFixed(2)}, { x: "${GATE.x}", y: "${GATE.y}", rx: "28%", ry: "26%" });
        stamp("#act-04-blocked", ${(stop + 0.05).toFixed(2)});
        // three things confirmed by a named person — a padlock, not a spinner
        drawPath("#act-04-lock-body", ${(stop + 1.4).toFixed(2)}, 0.5);
        drawPath("#act-04-lock-arc", ${(stop + 1.8).toFixed(2)}, 0.45);
        ${['k1', 'k2', 'k3'].map((k, i) => `chip("#act-04-${k}", ${(stop + 2.4 + i * 0.75).toFixed(2)});`).join('\n        ')}
        // "no model can open it"
        waterfall("#act-04-low", ${(g2 + 1.2).toFixed(2)});
        tl.to("#act-04-lock", { scale: 1.08, duration: 0.3, ease: "power2.out", transformOrigin: "50% 60%" }, ${(g2 + 0.3).toFixed(2)});
        tl.to("#act-04-lock", { scale: 1, duration: 0.5, ease: "power2.inOut" }, ${(g2 + 0.6).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const stop = (c.at(1) ?? 6.4) + STOP_OFFSET;
    return [
      { name: 'impact-bass-1', at: stop - 0.05, vol: 0.55 },
      { name: 'click', at: stop + 2.4, vol: 0.3 }, { name: 'click', at: stop + 3.15, vol: 0.3 }, { name: 'click', at: stop + 3.9, vol: 0.3 },
    ];
  },
};
