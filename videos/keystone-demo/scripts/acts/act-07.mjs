// ACT 7 — "all these are disjointed". One click, and the question becomes a
// task; the relay — asked, answered badly, corrected, shipped — one record.
//
// Blueprint: camera-journey (A: action round-trip — a click fires, the camera
// swoops to where the consequence lands). Rules: motion-blur-streak (the
// question lifting off), spring-pop-entrance (the task card, the relay
// chips), nudge-curve (the lift), waterfall-entry. Fastest act in the film.
// Source: adp-session.webm from 49 s — "This answer is wrong" at ~52 s.
import { focus, view } from '../lib/chrome.mjs';
// Centre high enough (fy <= 818 - 409/S) that the painted footage fills the frame; spotlight where the button lands.
const WRONG = focus(0.45, 0.51, 1.95);
const WRONG_AT = view(0.45, 0.67, 1.95, WRONG.slideX, WRONG.slideY);

export default {
  label: 'Disputing an answer',
  cardAt: 0.55,
  keystonAt: 1.0,
  reactAt: (c) => (c.at(0) ?? 1.5) + 3.6,
  reactTilt: -9,
  css: () => `
        #root .frame { left: 120px; right: 120px; top: 112px; bottom: 150px; }
        #root .qchip { position: absolute; left: 230px; top: 470px; max-width: 760px; padding: 16px 22px; border-radius: 12px; background: #ffffff; color: #15121f;
          font-weight: 700; font-size: 28px; line-height: 1.25; box-shadow: 0 30px 80px rgba(0,0,0,0.5); opacity: 0; will-change: transform, filter; }
        #root .task { position: absolute; right: 150px; top: 250px; width: 520px; padding: 22px 26px; border-radius: 14px; background: rgba(14,12,22,0.94); border: 1px solid #d79a3a;
          box-shadow: 0 30px 90px rgba(0,0,0,0.6); opacity: 0; will-change: transform; }
        #root .task .tk { font-family: "IBM Plex Mono", monospace; font-size: 15px; letter-spacing: 0.14em; text-transform: uppercase; color: #d79a3a; }
        #root .task .tt { margin-top: 8px; font-weight: 800; font-size: 30px; letter-spacing: -0.01em; color: #f6f5fa; }
        #root .task .tq { margin-top: 12px; font-size: 20px; line-height: 1.35; color: #cfc9e0; min-height: 56px; }
        #root .task .to { margin-top: 12px; font-family: "IBM Plex Mono", monospace; font-size: 15px; color: #9a93b5; }
        #root .relay { position: absolute; left: 0; right: 0; bottom: 48px; display: flex; justify-content: center; align-items: center; gap: 14px; }
        #root .relay .chip { position: static; font-size: 24px; }
        #root .relay .arrow { font-family: "IBM Plex Mono", monospace; font-size: 34px; color: #8b7cf6; opacity: 0; }
  `,
  stage: (c) => `
          <div class="frame" id="act-07-frame">
            <div class="edge"></div>
            <div class="cam" id="act-07-cam" data-layout-allow-overflow="true">
              <video id="act-07-vid" class="shot" src="assets/footage/adp-session.webm" muted data-start="0" data-duration="${c.D}" data-media-start="49"></video>
            </div>
            <div class="yt-hl" id="act-07-hl"></div>
          </div>
          <div class="qchip" id="act-07-q">After a chilled water leak, who must approve re-energising?</div>
          <div class="task" id="act-07-task">
            <div class="tk">pulse &middot; task</div>
            <div class="tt">Agent answer disputed</div>
            <div class="tq" id="act-07-tq"></div>
            <div class="to">addressed to the pill's owner &middot; original question attached</div>
          </div>
          <div class="relay" id="act-07-relay">
            <span class="chip" id="act-07-c1">asked</span><span class="arrow" id="act-07-a1">&rarr;</span>
            <span class="chip red" id="act-07-c2">answered badly</span><span class="arrow" id="act-07-a2">&rarr;</span>
            <span class="chip amber" id="act-07-c3">corrected</span><span class="arrow" id="act-07-a3">&rarr;</span>
            <span class="chip green" id="act-07-c4">shipped &middot; v1.3.0</span>
          </div>
          <p class="lower" id="act-07-low"><span class="w">one</span><span class="w">record,</span><span class="w"><em>not</em></span><span class="w"><em>four</em></span></p>
  `,
  motion: (c) => {
    const g0 = c.at(0) ?? 1.5, g1 = c.at(1) ?? 7.6, g2 = c.at(2) ?? 21.2;
    return `
        frameIn("#act-07-frame", 0.15);
        // the click: "This answer is wrong." — spotlight it
        cam("#act-07-cam", ${(g0 + 0.4).toFixed(2)}, { zoom: ${WRONG.zoom}, slideX: ${WRONG.slideX}, slideY: ${WRONG.slideY}, dur: 0.9 });
        // the question lifts off the chat and flies to the task — motion-blur-streak on the fast leg
        tl.fromTo("#act-07-q", { opacity: 0, y: 30, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.4)" }, ${(g0 + 3.4).toFixed(2)});
        tl.to("#act-07-q", { x: 90, y: -30, duration: 0.5, ease: "power3.in" }, ${(g0 + 4.1).toFixed(2)});
        tl.to("#act-07-q", { x: 860, y: -140, scale: 0.6, filter: "blur(14px)", opacity: 0, duration: 0.35, ease: "power2.out" }, ${(g0 + 4.6).toFixed(2)});
        camReset("#act-07-cam", ${(g0 + 4.2).toFixed(2)}, 1.0);
        // ...and lands as a task card, the original question attached
        pop("#act-07-task", ${(g0 + 4.9).toFixed(2)}, 0, 0.5);
        tl.set("#act-07-tq", { textContent: "After a chilled water leak, who must approve re-energising?" }, ${(g0 + 5.0).toFixed(2)});
        tl.to("#act-07-task", { opacity: 0, y: -16, duration: 0.35, ease: "power2.in" }, ${(g1 + 6.8).toFixed(2)});
        // they answer, it becomes a draft — a slow push on the form while the relay is spoken
        tl.to("#act-07-cam", { scale: 1.12, y: -80, duration: ${(c.D - g1 - 1).toFixed(2)}, ease: "none" }, ${(g1 + 1).toFixed(2)});
        // the relay: four beats, 3–4 s each in the script; here they snap in on the narration's own list
        ${['c1', 'c2', 'c3', 'c4'].map((k, i) => `chip("#act-07-${k}", ${(g2 + 0.4 + i * 0.62).toFixed(2)});`).join('\n        ')}
        ${['a1', 'a2', 'a3'].map((k, i) => `tl.fromTo("#act-07-${k}", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.25, ease: "power2.out" }, ${(g2 + 0.75 + i * 0.62).toFixed(2)});`).join('\n        ')}
        waterfall("#act-07-low", ${(g2 + 4.4).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const g0 = c.at(0) ?? 1.5, g2 = c.at(2) ?? 21.2;
    return [
      { name: 'click', at: g0 + 1.2, vol: 0.28 },
      { name: 'whoosh', at: g0 + 4.1, vol: 0.38 },
      { name: 'notification', at: g0 + 4.9, vol: 0.28 },
      ...[0, 1, 2, 3].map((i) => ({ name: 'whoosh-short', at: g2 + 0.4 + i * 0.62, vol: 0.26 })),
    ];
  },
};
