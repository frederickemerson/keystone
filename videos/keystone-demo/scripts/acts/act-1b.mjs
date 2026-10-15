// ACT 1B — how it builds together. The name first, then the solution
// diagram's own structure as one connected loop: a pill at the centre, five
// stations in a ring, a camera that visits each as the narration names it,
// and a token riding the loop.
//
// Opens on "This is Keystone": blueprints/logo-assemble-lockup (parts-arrive
// build — the two voussoirs lean in, the keystone drops and locks, the
// wordmark cascades; brandIn() in lib/chrome.mjs), then rules/scale-swap-
// transition into the pill it produces.
// Blueprint for the loop: spatial-pan-stations (Problem variant: stations on
// one oversized canvas, leading lines drawn ahead of the camera) closed into
// a loop. Rules: viewport-change (one .world transform, T = -offset × S),
// multi-phase-camera (pan beats), svg-path-draw (connectors), spring-pop-
// entrance (station callouts), ambient-glow-bloom (centre), waterfall-entry.
import { brandLockup } from '../lib/chrome.mjs';

const CX = 960, CY = 560, RX = 640, RY = 330;
const STATIONS = [
  { k: 'capture', n: 'I', name: 'Capture', deg: 162, pt: 2, lines: ['Onboarding call — "walk me through the last time"', 'Contradictions resolved into conditions', 'Expert confirms, edits or rejects each rule'] },
  { k: 'compile', n: 'II', name: 'Compile', deg: 234, pt: 3, lines: ['SKILL.md · rules.yaml · evidence.yaml', 'provenance.json · evals/ · CHANGELOG.md', 'Owner, steward and approver named'] },
  { k: 'apply', n: 'III', name: 'Apply', deg: 306, pt: 4, lines: ['Deterministic engine reads the evidence', 'Recommend · Requires approval · Must escalate · Blocked', 'Named humans only; no model input'] },
  { k: 'learn', n: 'IV', name: 'Learn', deg: 18, pt: 6, lines: ['Feedback → Review → Diff → Validate', 'Shadow → Approve → Release', 'Author ≠ steward ≠ approver; history append-only'] },
  { k: 'reuse', n: 'V', name: 'Reuse', deg: 90, pt: 7, lines: ['Ships as a CodeBuddy skill', 'Runs as a Tencent Cloud ADP agent', 'Lives in the platform · registry across assets'] },
];
const pos = (deg) => [CX + RX * Math.cos((deg * Math.PI) / 180), CY + RY * Math.sin((deg * Math.PI) / 180)];
const S_ZOOM = 1.55;

export default {
  label: 'How it builds together',
  lead: 0.7,
  beat: 0.6,
  tail: 1.5,
  minDuration: 26,
  fallbackDuration: 26,
  keystonAt: 1.2,
  css: () => `
        #root .world { position: absolute; inset: 0; transform-origin: 50% 50%; will-change: transform; z-index: 2; }   /* the pill pops in FRONT of the fading name (scale-swap: incoming above outgoing) */
        #root .world svg.wires { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: visible; }
        #root .wire { fill: none; stroke: rgba(139,124,246,0.75); stroke-width: 3; stroke-linecap: round; }
        #root .token { fill: #f6f5fa; filter: drop-shadow(0 0 12px rgba(139,124,246,0.9)); opacity: 0; }
        #root .pill { position: absolute; left: ${CX - 190}px; top: ${CY - 118}px; width: 380px; padding: 22px 26px; border-radius: 16px; background: #f6f5fa; color: #1d1a2b;
          box-shadow: 0 30px 90px rgba(139,124,246,0.35); opacity: 0; will-change: transform; }
        #root .pill .pn { font-family: "IBM Plex Mono", monospace; font-size: 24px; font-weight: 700; }
        #root .pill .pv { font-family: "IBM Plex Mono", monospace; font-size: 16px; color: #6b6484; margin-top: 4px; }
        #root .pill .pf { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 6px; }
        #root .pill .pf span { font-family: "IBM Plex Mono", monospace; font-size: 14px; padding: 4px 8px; border-radius: 6px; background: #eeecf4; color: #2a2740; }
        #root .pill .po { margin-top: 12px; font-family: "IBM Plex Mono", monospace; font-size: 14px; color: #6b6484; }
        #root .station { position: absolute; width: 0; height: 0; }
        #root .node { position: absolute; left: -44px; top: -44px; width: 88px; height: 88px; border-radius: 50%; background: #15121f; border: 3px solid #8b7cf6;
          display: grid; place-items: center; font-family: "IBM Plex Mono", monospace; font-size: 30px; font-weight: 700; color: #f6f5fa; opacity: 0; will-change: transform; }
        #root .sname { position: absolute; left: 62px; top: -24px; font-weight: 900; font-size: 34px; letter-spacing: -0.02em; color: #f6f5fa; opacity: 0; white-space: nowrap; }
        #root .sname i { font-style: normal; font-family: "IBM Plex Mono", monospace; font-weight: 400; font-size: 16px; color: #9a93b5; margin-left: 10px; letter-spacing: 0.1em; }
        #root .callout { position: absolute; left: 62px; top: 24px; width: 420px; padding: 12px 16px; border-radius: 10px; background: rgba(14,12,22,0.9); border: 1px solid rgba(139,124,246,0.45);
          font-family: "IBM Plex Mono", monospace; font-size: 15px; line-height: 1.5; color: #e4e0f0; opacity: 0; transform-origin: 0 0; will-change: transform; }
        #root .callout .pt { display: inline-block; margin-right: 6px; width: 22px; height: 22px; border-radius: 50%; background: #8b7cf6; color: #15121f; font-weight: 700; font-size: 13px; text-align: center; line-height: 22px; }
        #root .station.left .sname { left: auto; right: 62px; }
        #root .station.left .callout { left: auto; right: 62px; transform-origin: 100% 0; }
        #root .station.below .callout { top: 54px; }
        #root .brand { position: absolute; left: 0; right: 0; top: 50%; height: 170px; margin-top: -85px; z-index: 1; }
        #root .rail { position: absolute; left: 120px; right: 120px; bottom: 54px; padding: 14px 22px; border-radius: 10px; background: rgba(139,124,246,0.14); border: 1px solid rgba(139,124,246,0.4);
          font-family: "IBM Plex Mono", monospace; font-size: 17px; letter-spacing: 0.04em; color: #e4e0f0; opacity: 0; display: flex; gap: 26px; align-items: center; }
        #root .rail .pt { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: #8b7cf6; color: #15121f; font-weight: 700; }
        #root .loopline { position: absolute; left: 0; right: 0; top: 96px; text-align: center; font-weight: 800; font-size: 30px; letter-spacing: 0.02em; color: #f6f5fa; }
        #root .loopline .w { display: inline-block; opacity: 0; margin: 0 0.3em; will-change: transform; }
        #root .loopline .w.arrow { color: #8b7cf6; }
  `,
  stage: () => {
    const pts = STATIONS.map((s) => pos(s.deg));
    const wires = STATIONS.map((s, i) => {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 5];
      const mx = (x1 + x2) / 2 + (CX - (x1 + x2) / 2) * -0.18, my = (y1 + y2) / 2 + (CY - (y1 + y2) / 2) * -0.18;
      return `<path class="wire" id="act-1b-w${i}" d="M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" />`;
    }).join('');
    const loopD = STATIONS.map((s, i) => {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 5];
      const mx = (x1 + x2) / 2 + (CX - (x1 + x2) / 2) * -0.18, my = (y1 + y2) / 2 + (CY - (y1 + y2) / 2) * -0.18;
      return `${i === 0 ? `M ${x1.toFixed(1)} ${y1.toFixed(1)} ` : ''}Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }).join(' ');
    const stations = STATIONS.map((s, i) => {
      const [x, y] = pts[i];
      const cls = ['station', x < CX - 100 ? 'left' : '', s.k === 'reuse' ? 'below' : ''].join(' ');
      return `
            <div class="${cls}" id="act-1b-s-${s.k}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px">
              <div class="node" id="act-1b-n-${s.k}">${s.n}</div>
              <div class="sname" id="act-1b-l-${s.k}">${s.name}<i>${s.pt === 6 ? 'IV · governed learning' : s.k === 'apply' ? 'III · supervised' : ''}</i></div>
              <div class="callout" id="act-1b-c-${s.k}"><span class="pt">${s.pt}</span>${s.lines.join('<br>')}</div>
            </div>`;
    }).join('');
    return `
          <div class="world" id="act-1b-world">
            <svg class="wires" viewBox="0 0 1920 1080">
              ${wires}
              <path id="act-1b-loop" d="${loopD}" fill="none" stroke="none" />
              <circle class="token" id="act-1b-token" r="11" cx="${pts[0][0].toFixed(1)}" cy="${pts[0][1].toFixed(1)}" />
            </svg>
            <div class="pill" id="act-1b-pill">
              <div class="pn">technical-services / chilled-water-leak</div>
              <div class="pv">v1.2.0 &middot; approved &middot; 13 rules &middot; 6 evals</div>
              <div class="pf"><span>SKILL.md</span><span>rules.yaml</span><span>evidence.yaml</span><span>provenance.json</span><span>evals/</span><span>CHANGELOG.md</span></div>
              <div class="po">owner Tan Wei Ming &middot; steward Hafiz &middot; approver named per pill</div>
            </div>
            ${stations}
          </div>
          ${brandLockup('act-1b', { mark: 150, word: 136 })}
          <p class="loopline" id="act-1b-line"><span class="w">capture</span><span class="w arrow">&rarr;</span><span class="w">compile</span><span class="w arrow">&rarr;</span><span class="w">apply</span><span class="w arrow">&rarr;</span><span class="w">learn</span><span class="w arrow">&rarr;</span><span class="w">reuse</span><span class="w arrow">&rarr;</span><span class="w">capture</span></p>
          <div class="rail" id="act-1b-rail"><span class="pt">8</span><span>Running today: Next.js on Vercel &middot; hy4-preview via Tencent TokenHub &middot; deterministic engine &middot; CodeBuddy skill (verified) &middot; ADP agent</span></div>
    `;
  },
  motion: (c) => {
    const pts = STATIONS.map((s) => pos(s.deg));
    const t0 = c.at(0) ?? 0.7;                 // "This is Keystone..." (12.9 s)
    const t1 = c.at(1) ?? (t0 + 13.5);         // "Five stages, one artifact..." (~10 s) or the unvoiced tour
    const tourStep = c.vo[1] ? (c.vo[1].seconds - 1.2) / 5 : 1.9;
    const pullBack = c.vo[1] ? c.end(1) - 0.4 : t1 + 5 * tourStep + 0.8;
    const camTargets = pts.map(([x, y]) => `{ x: ${(-(x - CX) * S_ZOOM).toFixed(1)}, y: ${(-(y - CY) * S_ZOOM).toFixed(1)} }`).join(', ');
    return `
        // viewport-change: one source of truth for the camera, composed in one place
        const world = q("#act-1b-world");
        const vcam = { x: 0, y: -20, s: 0.92 };
        const applyCam = () => { world.style.transform = "translate(" + vcam.x + "px, " + vcam.y + "px) scale(" + vcam.s + ")"; };
        applyCam();
        const TARGETS = [${camTargets}];
        // "This is Keystone." — the mark locks and the wordmark cascades (logo-assemble-lockup, parts-arrive build)
        brandIn("act-1b", ${(t0 + 0.05).toFixed(2)});
        // "...into an Intelligence Pill" — scale-swap-transition: the name shrinks away, the pill it produces pops in its place
        tl.to("#act-1b-brand", { scale: 0.72, opacity: 0, duration: 0.35, ease: "power2.in" }, ${(t0 + 3.35).toFixed(2)});
        tl.fromTo("#act-1b-pill", { opacity: 0, scale: 0.6, rotationY: -40, transformPerspective: 1200 }, { opacity: 1, scale: 1, rotationY: 0, duration: 0.9, ease: "back.out(1.4)" }, ${(t0 + 3.55).toFixed(2)});
        // the five stations arrive around it — spring-pop-entrance in ring order
        ${STATIONS.map((s, i) => `pop("#act-1b-n-${s.k}", ${(t0 + 5.2 + i * 0.22).toFixed(2)}); tl.fromTo("#act-1b-l-${s.k}", { opacity: 0, x: ${pts[i][0] < CX - 100 ? 16 : -16} }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }, ${(t0 + 5.45 + i * 0.22).toFixed(2)});`).join('\n        ')}
        // the loop closes: connectors draw ahead of the camera
        ${STATIONS.map((s, i) => `drawPath("#act-1b-w${i}", ${(t0 + 7.6 + i * 0.55).toFixed(2)}, 0.7, "power1.inOut");`).join('\n        ')}
        // the token starts riding the ring and never stops — path travel sampled from the loop itself
        const loop = q("#act-1b-loop"); const LEN = loop.getTotalLength();
        const tok = { p: 0 };
        tl.set("#act-1b-token", { opacity: 1 }, ${(t0 + 10.4).toFixed(2)});
        tl.to(tok, { p: 3, duration: ${(c.D - t0 - 10.4).toFixed(2)}, ease: "none", onUpdate() { const pt = loop.getPointAtLength((tok.p % 1) * LEN); const t = q("#act-1b-token"); if (t) { t.setAttribute("cx", pt.x); t.setAttribute("cy", pt.y); } } }, ${(t0 + 10.4).toFixed(2)});
        // the tour: multi-phase-camera — pan to each station, its callout springs from the node
        ${STATIONS.map((s, i) => `
        tl.to(vcam, { x: TARGETS[${i}].x, y: TARGETS[${i}].y, s: ${S_ZOOM}, duration: 0.8, ease: "power2.inOut", onUpdate: applyCam }, ${(t1 + i * tourStep).toFixed(2)});
        tl.fromTo("#act-1b-c-${s.k}", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)" }, ${(t1 + i * tourStep + 0.55).toFixed(2)});
        tl.to("#act-1b-n-${s.k}", { scale: 1.18, duration: 0.25, ease: "power2.out" }, ${(t1 + i * tourStep + 0.5).toFixed(2)});
        tl.to("#act-1b-n-${s.k}", { scale: 1, duration: 0.5, ease: "power2.inOut" }, ${(t1 + i * tourStep + 0.75).toFixed(2)});`).join('')}
        // pull back: one closed loop, the token still going, the Tencent Cloud rail beneath
        tl.to(vcam, { x: 0, y: -10, s: 0.9, duration: 1.1, ease: "power2.inOut", onUpdate: applyCam }, ${pullBack.toFixed(2)});
        tl.to(".callout", { opacity: 0.0, duration: 0.5 }, ${pullBack.toFixed(2)});
        waterfall("#act-1b-line", ${(pullBack + 0.6).toFixed(2)});
        tl.fromTo("#act-1b-rail", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${(pullBack + 1.3).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const t0 = c.at(0) ?? 0.7;
    const t1 = c.at(1) ?? (t0 + 13.5);
    const tourStep = c.vo[1] ? (c.vo[1].seconds - 1.2) / 5 : 1.9;
    return [
      { name: 'impact-bass-2', at: t0 + 0.86, vol: 0.32 },
      { name: 'pop', at: t0 + 3.55, vol: 0.3 },
      { name: 'sparkle', at: t0 + 7.6, vol: 0.22 },
      ...STATIONS.map((s, i) => ({ name: 'click', at: t1 + i * tourStep + 0.55, vol: 0.28 })),
    ];
  },
};
