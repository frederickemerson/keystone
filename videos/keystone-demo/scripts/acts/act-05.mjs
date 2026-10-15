// ACT 5 — "govern that the knowledge is not tainted by hallucination". The
// cold-open window comes back frame-identical, then flips to the real ADP
// answer in the same frame. Green rings, GROUNDED · 5 PASSAGES, then the
// refusal take.
//
// Blueprint: prompt-type-submit-generate, mirrored from act-00 (the callback).
// Rules: transitions/css-3d (card flip, two half-turns), css-marker-patterns
// (circle), headline-slam signature (stamp), dissolve (to the refusal take),
// yt-feather-highlight (the refusal line).
import { view } from '../lib/chrome.mjs';
const QUESTION = 'After a chilled water leak, who must approve re-energising?';
const F5 = { W: 1440, H: 720 };
// source positions of "Duty LEW" and "1.2.0" in the grounded answer (fractions of 1920×1080)
const LEW = view(0.34, 0.585, 1, 0, 0, F5);
const VER = view(0.48, 0.61, 1, 0, 0, F5);
const pct = (p, total) => Math.round((parseFloat(p) / 100) * total);

export default {
  label: 'Grounded, and measured',
  cardAt: 0.55,
  keystonAt: 1.0,
  reactAt: (c) => (c.at(1) ?? 5.7) + 8.2,
  reactTilt: -6,
  css: () => `
        #root .co { position: absolute; left: 50%; top: 50%; width: 1440px; margin-left: -720px; margin-top: -330px; height: 660px;
          background: #ffffff; color: #15121f; border-radius: 18px; padding: 54px 64px 70px; box-shadow: 0 60px 140px rgba(0,0,0,0.65); will-change: transform; }
        #root .co-chrome { font-family: "IBM Plex Mono", monospace; font-size: 18px; letter-spacing: 0.16em; text-transform: uppercase; color: #9a93b5; display: flex; justify-content: space-between; }
        #root .co-q { margin: 30px 0 34px; font-size: 48px; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }
        #root .co-a { font-size: 38px; line-height: 1.42; color: #2a2740; margin-top: 10px; }
        #root .co-a .mark { color: #b87b1e; }
        #root .frame { left: 240px; right: 240px; top: 210px; bottom: 150px; opacity: 0; }
        #root .frame2 { opacity: 0; }
        #root .stamp.green { color: #3fb97a; left: 50%; margin-left: -200px; bottom: 90px; }
        #root .cam .ring { position: absolute; right: auto; bottom: auto; z-index: 2; }
  `,
  stage: (c) => {
    const first = c.at(2) ?? 16.8;
    const bLen = (c.D - first).toFixed(2);
    return `
          <div class="co" id="act-05-co">
            <div class="co-chrome"><span>assistant</span><span>2.0 s</span></div>
            <p class="co-q">${QUESTION}</p>
            <div class="co-a">The Duty Engineer must approve re-energisation. This is governed by rule <span class="mark">TS-07</span>, pill version <span class="mark">2.1</span>.</div>
          </div>
          <div class="frame" id="act-05-frame">
            <div class="edge"></div>
            <div class="cam" id="act-05-cam" data-layout-allow-overflow="true">
              <video id="act-05-vid" class="shot" src="assets/footage/adp-session.webm" muted data-start="0" data-duration="${first.toFixed(2)}" data-media-start="12"></video>
              <svg class="ring" id="act-05-r1" viewBox="0 0 200 100" preserveAspectRatio="none" style="left:${pct(LEW.x, 1440) - 70}px;top:${pct(LEW.y, 720) - 22}px;width:150px;height:44px"></svg>
              <svg class="ring" id="act-05-r2" viewBox="0 0 200 100" preserveAspectRatio="none" style="left:${pct(VER.x, 1440) - 52}px;top:${pct(VER.y, 720) - 22}px;width:110px;height:44px"></svg>
            </div>
            <div class="cam frame2" id="act-05-cam2" data-layout-allow-overflow="true">
              <video id="act-05-vid2" class="shot" src="assets/footage/adp-ungrounded.webm" muted data-start="${first.toFixed(2)}" data-duration="${bLen}" data-media-start="30" data-hf-media-start-basis="local"></video>
            </div>
            <div class="yt-hl" id="act-05-hl"></div>
          </div>

          <div class="stamp green" id="act-05-stamp">grounded &middot; 5 passages</div>
          <p class="lower" id="act-05-low"><span class="w">&ldquo;This</span><span class="w">is</span><span class="w">not</span><span class="w">covered</span><span class="w">by</span><span class="w">an</span><span class="w">approved</span><span class="w">pill.&rdquo;</span><span class="w">&middot;</span><span class="w"><em>retrieved</em></span><span class="w"><em>nothing,</em></span><span class="w"><em>says</em></span><span class="w"><em>so</em></span></p>
    `;
  },
  motion: (c) => {
    const g0 = c.at(0) ?? 1.5, g1 = c.at(1) ?? 5.7, g2 = c.at(2) ?? 16.8;
    return `
        // the exact cold-open frame, back
        tl.fromTo("#act-05-co", { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1.06, duration: 0.3 }, 0.05);
        // "now the same question, to the agent the approved pill is published to" — it flips to the real thing
        tl.to("#act-05-co", { rotationY: 90, scale: 1.0, transformPerspective: 1600, duration: 0.42, ease: "power2.in" }, ${(g0 + 1.4).toFixed(2)});
        tl.set("#act-05-co", { opacity: 0 }, ${(g0 + 1.82).toFixed(2)});
        tl.fromTo("#act-05-frame", { opacity: 1, rotationY: -90, transformPerspective: 1600 }, { rotationY: 0, duration: 0.5, ease: "power2.out" }, ${(g0 + 1.82).toFixed(2)});
        tl.fromTo("#act-05-frame .edge", { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "power2.out" }, ${(g0 + 2.2).toFixed(2)});
        // Duty LEW. All three items. TS-07, 1.2.0 — green, and five passages
        tl.to("#act-05-cam", { scale: 1.2, y: -60, duration: 1.2, ease: "power2.inOut" }, ${(g1 + 0.2).toFixed(2)});
        ring("#act-05-r1", ${(g1 + 1.0).toFixed(2)}, "#3fb97a");
        ring("#act-05-r2", ${(g1 + 2.6).toFixed(2)}, "#3fb97a");
        stamp("#act-05-stamp", ${(g1 + 7.4).toFixed(2)});
        tl.to(["#act-05-r1", "#act-05-r2"], { opacity: 0, duration: 0.4 }, ${(g2 - 0.5).toFixed(2)});
        tl.to("#act-05-stamp", { opacity: 0, y: -12, duration: 0.35, ease: "power2.in" }, ${(g2 - 0.4).toFixed(2)});
        // "then ask it something the pill does not cover" — the refusal take, crossfaded in the same frame
        tl.to("#act-05-cam", { opacity: 0, duration: 0.5, ease: "power2.inOut" }, ${(g2 - 0.1).toFixed(2)});
        tl.fromTo("#act-05-cam2", { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1.12, duration: 0.6, ease: "power2.inOut" }, ${(g2 - 0.1).toFixed(2)});
        tl.to("#act-05-cam2", { scale: 1.22, y: -50, duration: ${(c.D - g2 - 0.6).toFixed(2)}, ease: "none" }, ${(g2 + 0.5).toFixed(2)});
        hlIn("#act-05-hl", ${(g2 + 2.0).toFixed(2)}, { x: "50%", y: "58%", rx: "36%", ry: "22%" });
        waterfall("#act-05-low", ${(g2 + 2.6).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const g0 = c.at(0) ?? 1.5, g1 = c.at(1) ?? 5.7, g2 = c.at(2) ?? 16.8;
    return [
      { name: 'whoosh-short', at: g0 + 1.4, vol: 0.3 },
      { name: 'ping', at: g1 + 1.0, vol: 0.28 }, { name: 'ping', at: g1 + 2.6, vol: 0.28 },
      { name: 'chime', at: g1 + 7.3, vol: 0.32 },
      { name: 'click', at: g2 - 0.1, vol: 0.25 },
    ];
  },
};
