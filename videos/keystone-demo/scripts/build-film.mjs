// Generate the film from the script.
//
// Every act composition and the main timeline are written from script.json
// (the words), narration.json (their measured durations) and film.config.mjs
// (the pictures). Nothing is hand-timed: a rewritten line changes its clip's
// length, and re-running this moves everything after it. The script and the
// film cannot drift, which is the only way a 13-act piece stays honest about
// what it says.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MOOD, PALETTE, SHOTS } from './film.config.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const script = JSON.parse(readFileSync(join(ROOT, 'script.json'), 'utf8'));
const narration = JSON.parse(readFileSync(join(ROOT, 'narration.json'), 'utf8'));

const FPS = 30;
const BEAT = 0.62;        // the held pause between VO groups
const CARD_IN = 0.5;      // a quote card lands just after the act opens
const CARD_HOLD = 2.9;
const TAIL = 0.9;         // breath before the cut
const r2 = (n) => Math.round(n * 100) / 100;

const clipsByAct = {};
for (const c of narration.clips) (clipsByAct[c.act] ??= []).push(c);

/** Where every VO group sits inside its act, and how long the act runs. */
function layout(act) {
  const clips = (clipsByAct[act.id] ?? []).sort((a, b) => a.index - b.index);
  let t = act.card ? CARD_IN + CARD_HOLD * 0.45 : 0.35;
  const placed = clips.map((c, i) => {
    const at = r2(t);
    t += c.seconds + (i < clips.length - 1 ? BEAT : 0);
    return { ...c, at, end: r2(at + c.seconds) };
  });
  return { placed, duration: r2(t + TAIL) };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// Keyston, the mascot — the product's own component, redrawn as inline SVG so
// the film and the app show the same character rather than two drawings of it.
// ---------------------------------------------------------------------------
const PUPILS = {
  idle: [0, 0, 0], listening: [0.6, 0.6, -0.4], thinking: [-1.1, -1.1, -1],
  found: [0, 0, -0.8], puzzled: [-1.4, 1.4, 0], blocked: [0, 0, 0.5], pleased: [0, 0, 0],
};
const LID = { idle: 0, listening: 0, thinking: 0.45, found: 0, puzzled: 0.2, blocked: 0.1, pleased: 0.6 };
const MOUTH = {
  idle: 'M26 29 h8', listening: 'M26 29 h8', thinking: 'M27 29 h5',
  found: 'M26 27.5 q4 5 8 0 q-4 2 -8 0', puzzled: 'M26 30 q4 -4 8 1',
  blocked: 'M25 30 h10', pleased: 'M25 27.5 q5 5 10 0',
};

function mascot(mood, id) {
  const [lx, rx, py] = PUPILS[mood] ?? PUPILS.idle;
  const lid = LID[mood] ?? 0;
  const ry = (3.2 * (1 - lid)).toFixed(2);
  const stone = mood === 'blocked' ? PALETTE.blocked : PALETTE.cream;
  const ink = mood === 'blocked' ? PALETTE.blocked : '#1d1a2b';
  return `
      <svg id="${id}" class="mascot" viewBox="0 0 60 50" aria-hidden="true">
        <g fill="rgba(139,124,246,0.16)" stroke="rgba(246,245,250,0.3)" stroke-width="1.1" stroke-linejoin="round">
          <path d="M18.6 13.4 L8 21.5 L10.5 38 H21 Z" />
          <path d="M41.4 13.4 L52 21.5 L49.5 38 H39 Z" />
        </g>
        <g class="mascot-body">
          <path d="M18 11 H42 L39.5 42 H20.5 Z" fill="${stone}" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M20 15 h20" stroke="${ink}" stroke-width="0.9" opacity="0.22" />
          <ellipse cx="25" cy="23" rx="3.2" ry="${ry}" fill="#fff" stroke="${ink}" stroke-width="0.9" />
          <ellipse cx="35" cy="23" rx="3.2" ry="${ry}" fill="#fff" stroke="${ink}" stroke-width="0.9" />
          <circle cx="${25 + lx}" cy="${23 + py}" r="1.5" fill="${ink}" />
          <circle cx="${35 + rx}" cy="${23 + py}" r="1.5" fill="${ink}" />
          <path d="${MOUTH[mood] ?? MOUTH.idle}" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" />
        </g>
        <rect x="4" y="38" width="52" height="7" rx="1" fill="rgba(139,124,246,0.2)" stroke="rgba(246,245,250,0.28)" stroke-width="1.1" />
      </svg>`;
}

// ---------------------------------------------------------------------------
// Per-act picture
// ---------------------------------------------------------------------------
function stage(act, shot, duration) {
  const id = act.id;
  if (shot.kind === 'footage') {
    const second = shot.second
      ? `
        <div class="shotwrap stacked" id="${id}-wrap2">
          <video id="${id}-vid2" class="shot" src="assets/footage/${shot.second.source}" muted
                 data-start="${r2(duration * shot.second.at)}" data-duration="${r2(duration * (1 - shot.second.at))}"
                 data-media-start="${shot.second.from}"></video>
        </div>`
      : '';
    const firstDur = shot.second ? r2(duration * shot.second.at) : duration;
    return `
        <div class="shotwrap" id="${id}-wrap">
          <video id="${id}-vid" class="shot" src="assets/footage/${shot.source}" muted
                 data-start="0" data-duration="${firstDur}" data-media-start="${shot.from}"></video>
        </div>${second}`;
  }
  if (shot.kind === 'stills') {
    const each = r2(duration / shot.stills.length);
    return shot.stills.map((file, i) => `
        <div class="shotwrap still clip" id="${id}-still-${i}" data-layout-allow-overflow="true" data-start="${r2(i * each)}" data-duration="${r2(each + 0.05)}">
          <img src="assets/stills/${file}" alt="" />
        </div>`).join('');
  }
  if (shot.kind === 'coldopen') {
    return `
        <div class="coldopen" id="${id}-cold">
          <div class="co-chrome">assistant</div>
          <p class="co-q">After a chilled water leak, who must approve re-energising?</p>
          <div class="co-a">
            <p id="${id}-a1">The Duty Engineer must approve re-energisation.</p>
            <p id="${id}-a2">This is governed by rule <span class="co-mark" id="${id}-m1">TS-07</span>, pill version <span class="co-mark" id="${id}-m2">2.1</span>.</p>
          </div>
          <div class="co-meta"><span id="${id}-timer">0.0s</span></div>
          <div class="co-stamp" id="${id}-stamp">nothing here is checkable</div>
        </div>`;
  }
  if (shot.kind === 'knowledge-drain') {
    const N = 7;
    const x = (i) => 250 + i * 232;
    const docs = Array.from({ length: N }, (_, i) => `
            <g id="${id}-doc-${i}">
              <rect x="${x(i)}" y="610" width="168" height="214" rx="8" fill="#f6f5fa" />
              <rect x="${x(i) + 20}" y="644" width="112" height="9" rx="4" fill="#bdb7cf" />
              <rect x="${x(i) + 20}" y="668" width="128" height="9" rx="4" fill="#d6d2e4" />
              <rect x="${x(i) + 20}" y="692" width="96" height="9" rx="4" fill="#d6d2e4" />
              <rect x="${x(i) + 20}" y="716" width="124" height="9" rx="4" fill="#d6d2e4" />
            </g>`).join('');
    // The threads are the judgement BETWEEN the procedures. They are what leaves.
    const threads = Array.from({ length: N - 1 }, (_, i) => `<path id="${id}-th-${i}" class="thread" d="M${x(i) + 84} 610 C ${x(i) + 150} 430, ${x(i + 1) + 18} 430, ${x(i + 1) + 84} 610" />`).join('');
    return `
        <div class="drain" id="${id}-drain">
          <svg viewBox="0 0 1920 900" preserveAspectRatio="xMidYMid meet">
            <g class="threads">${threads}</g>
            <g class="docs">${docs}</g>
          </svg>
          <p class="drain-caption" id="${id}-cap"><span>The procedures stay.</span><em>What joined them does not.</em></p>
          <div class="drain-figure" id="${id}-figure"></div>
        </div>`;
  }
  // close
  return `
      <div class="closing" id="${id}-close">
        <div class="pill-art" id="${id}-pill">
          <p class="pill-name">chilled-water-leak</p>
          <p class="pill-ver">v1.2.0 &middot; approved</p>
          <ul class="pill-rules">
            <li>TS-07 &mdash; no re-energisation without LEW sign-off</li>
            <li>TS-02 &mdash; branch sub-valve before the riser</li>
            <li>TS-01 &mdash; water near electrical: evacuate, escalate</li>
          </ul>
          <p class="pill-foot">13 rules &middot; 6 evals &middot; owner, steward, approver</p>
        </div>
        <div class="dests">
          <span id="${id}-d0">skill</span><span id="${id}-d1">agent</span><span id="${id}-d2">platform</span>
        </div>
      </div>`;
}

function motionFor(act, shot, duration, placed) {
  const id = act.id;
  const L = [];
  L.push(`const tl = gsap.timeline({ paused: true });`);
  L.push(`const q = (s) => document.querySelector(s);`);

  if (shot.kind === 'footage') {
    // A slow push-in on the inner wrapper, never on the timed clip itself.
    L.push(`tl.fromTo("#${id}-wrap", { scale: 1.015, yPercent: 0.4 }, { scale: 1.075, yPercent: -0.8, duration: ${r2(duration)}, ease: "none" }, 0);`);
    if (shot.second) {
      const at = r2(duration * shot.second.at);
      // Crossfade, because both wrappers occupy the same box and the second one
      // is opaque: without this it covers the first for the whole act.
      L.push(`tl.fromTo("#${id}-wrap2", { opacity: 0, scale: 1.02 }, { opacity: 1, duration: 0.5, ease: "power2.inOut" }, ${r2(at - 0.25)});`);
      L.push(`tl.to("#${id}-wrap2", { scale: 1.07, duration: ${r2(duration * (1 - shot.second.at))}, ease: "none" }, ${at});`);
      L.push(`tl.to("#${id}-wrap", { opacity: 0, duration: 0.5, ease: "power2.inOut" }, ${r2(at - 0.25)});`);
    }
  }
  if (shot.kind === 'stills') {
    const each = duration / shot.stills.length;
    shot.stills.forEach((_, i) => {
      L.push(`tl.fromTo("#${id}-still-${i} img", { scale: 1.02, xPercent: ${i % 2 ? 0.6 : -0.6} }, { scale: 1.09, xPercent: ${i % 2 ? -0.6 : 0.6}, duration: ${r2(each)}, ease: "none" }, ${r2(i * each)});`);
    });
  }
  if (shot.kind === 'coldopen') {
    L.push(`tl.fromTo("#${id}-cold", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0);`);
    L.push(`tl.fromTo("#${id}-a1", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.55);`);
    L.push(`tl.fromTo("#${id}-a2", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.0);`);
    L.push(`tl.to("#${id}-timer", { duration: 2.0, ease: "none", onUpdate() { const el = q("#${id}-timer"); if (el) el.textContent = (this.progress() * 2).toFixed(1) + "s"; } }, 0.1);`);
    L.push(`tl.fromTo(["#${id}-m1", "#${id}-m2"], { boxShadow: "0 0 0 0 rgba(215,154,58,0)" }, { boxShadow: "0 0 0 3px rgba(215,154,58,0.85)", duration: 0.45, stagger: 0.22, ease: "power2.out" }, 2.4);`);
    L.push(`tl.fromTo("#${id}-stamp", { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, 3.6);`);
  }
  if (shot.kind === 'knowledge-drain') {
    const leaves = r2(Math.max(3.2, duration * 0.42));
    L.push(`for (let i = 0; i < 7; i++) { tl.fromTo("#${id}-doc-" + i, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" }, 0.2 + i * 0.1); }`);
    L.push(`for (let i = 0; i < 6; i++) { const el = q("#${id}-th-" + i); if (el) { const len = el.getTotalLength(); gsap.set(el, { strokeDasharray: len, strokeDashoffset: len }); tl.to(el, { strokeDashoffset: 0, duration: 0.9, ease: "power1.inOut" }, 1.3 + i * 0.12); } }`);
    L.push(`tl.fromTo("#${id}-cap span", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 2.4);`);
    L.push(`tl.fromTo("#${id}-figure", { xPercent: 0, opacity: 1 }, { xPercent: 900, opacity: 0, duration: 3.4, ease: "power1.in" }, ${leaves});`);
    L.push(`for (let i = 0; i < 6; i++) { const el = q("#${id}-th-" + i); if (el) { const len = el.getTotalLength(); tl.to(el, { strokeDashoffset: len, opacity: 0.2, duration: 1.2, ease: "power1.in" }, ${leaves} + 0.5 + i * 0.12); } }`);
    L.push(`tl.fromTo("#${id}-cap em", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, ${leaves} + 2.1);`);
  }
  if (shot.kind === 'close') {
    L.push(`tl.fromTo("#${id}-pill", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.6)" }, 0.2);`);
    L.push(`["0","1","2"].forEach((n, i) => { tl.fromTo("#${id}-d" + n, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 1.4 + i * 0.3); });`);
  }

  // Chrome: the act label, and the quote card.
  L.push(`tl.fromTo("#${id}-label", { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 0.15);`);
  L.push(`tl.to("#${id}-label", { opacity: 0, duration: 0.5 }, ${r2(Math.min(4.2, duration - 0.8))});`);
  if (act.card) {
    L.push(`tl.fromTo("#${id}-card", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, ${CARD_IN});`);
    L.push(`tl.to("#${id}-card", { opacity: 0, y: -12, duration: 0.5, ease: "power2.in" }, ${r2(CARD_IN + CARD_HOLD)});`);
  }
  // Keyston breathes, and reacts once on the act's own beat.
  L.push(`tl.fromTo("#${id}-keyston", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.4)" }, 0.5);`);
  L.push(`tl.to("#${id}-keyston .mascot-body", { y: -5, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: ${Math.max(1, Math.floor(duration / 3.2))} }, 1.1);`);
  L.push(`tl.to("#${id}-keyston", { opacity: 0, duration: 0.45 }, ${r2(duration - 0.55)});`);

  L.push(`window.__timelines["${id}"] = tl;`);
  return L.join('\n        ');
}

function composition(act, shot, duration, placed) {
  const id = act.id;
  const label = shot.label ?? act.title.replace(/^[—-]\s*/, '');
  const number = id === 'close' ? '' : `${Number(id.slice(4))}`;
  const card = act.card
    ? `<figure class="card" id="${id}-card"><blockquote>&ldquo;${esc(act.card)}&rdquo;</blockquote><figcaption>Keppel &middot; AI HARVEST briefing</figcaption></figure>`
    : '';
  return `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        #root { position: absolute; inset: 0; overflow: hidden; background: ${PALETTE.nightDeep};
                font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: ${PALETTE.cream}; }
        #root .bg { position: absolute; inset: 0;
          background:
            radial-gradient(120% 80% at 50% -10%, rgba(139,124,246,0.22), transparent 62%),
            radial-gradient(90% 70% at 50% 110%, rgba(139,124,246,0.10), transparent 60%),
            ${PALETTE.night}; }
        #root .grain { position: absolute; inset: 0; opacity: 0.045; mix-blend-mode: overlay;
          background-image: radial-gradient(rgba(255,255,255,0.8) 0.5px, transparent 0.6px);
          background-size: 3px 3px; }
        #root .shotwrap.stacked { opacity: 0; }
        #root .shotwrap { position: absolute; left: 96px; right: 96px; top: 108px; bottom: 150px;
          border-radius: 16px; overflow: hidden; border: 1px solid rgba(246,245,250,0.16);
          box-shadow: 0 40px 110px rgba(0,0,0,0.62), 0 0 0 1px rgba(139,124,246,0.14); background: ${PALETTE.night}; }
        #root .shot, #root .shotwrap img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
        #root .label { position: absolute; left: 96px; top: 54px; display: flex; align-items: baseline; gap: 14px;
          font-family: ui-monospace, monospace; font-size: 20px; letter-spacing: 0.14em;
          text-transform: uppercase; color: ${PALETTE.muted}; }
        #root .label b { color: ${PALETTE.lavender}; font-weight: 600; }
        #root .card { position: absolute; left: 96px; right: 420px; bottom: 54px; margin: 0;
          padding: 26px 32px; border-radius: 14px; background: rgba(14,12,22,0.86);
          border: 1px solid rgba(139,124,246,0.34); backdrop-filter: blur(6px); }
        #root .card blockquote { margin: 0; font-family: ui-serif, Georgia, serif; font-size: 36px; line-height: 1.26; color: ${PALETTE.cream}; }
        #root .card figcaption { margin-top: 12px; font-family: ui-monospace, monospace;
          font-size: 16px; letter-spacing: 0.1em; text-transform: uppercase; color: ${PALETTE.muted}; }
        #root .keyston { position: absolute; right: 92px; bottom: 18px; width: 150px; height: 125px; }
        #root .mascot { width: 100%; height: 100%; display: block;
          filter: drop-shadow(0 14px 30px rgba(0,0,0,0.5)); }
        #root .coldopen { position: absolute; left: 50%; top: 50%; width: 1420px; margin-left: -710px; margin-top: -290px;
          background: #ffffff; color: #15121f; border-radius: 18px; padding: 54px 60px 66px;
          box-shadow: 0 50px 130px rgba(0,0,0,0.6); }
        #root .co-chrome { font-family: ui-monospace, monospace; font-size: 17px; letter-spacing: 0.16em;
          text-transform: uppercase; color: #9a93b5; }
        #root .co-q { margin: 26px 0 34px; font-size: 46px; font-weight: 600; line-height: 1.22; }
        #root .co-a p { font-size: 37px; line-height: 1.42; margin-bottom: 10px; color: #2a2740; }
        #root .co-mark { display: inline-block; border-radius: 6px; padding: 0 6px; }
        #root .co-meta { position: absolute; right: 48px; top: 42px; font-family: ui-monospace, monospace;
          font-size: 22px; color: #9a93b5; }
        #root .co-stamp { position: absolute; left: 60px; bottom: -74px; font-family: ui-monospace, monospace;
          font-size: 27px; letter-spacing: 0.08em; color: ${PALETTE.approval};
          background: rgba(14,12,22,0.92); border: 1px solid ${PALETTE.approval}; border-radius: 8px; padding: 10px 18px; }
        #root .drain { position: absolute; inset: 0; }
        #root .drain svg { position: absolute; left: 0; right: 0; bottom: 150px; width: 100%; height: 820px; }
        #root .threads path { fill: none; stroke: ${PALETTE.lavender}; stroke-width: 4; opacity: 0.9;
          filter: drop-shadow(0 0 10px rgba(139,124,246,0.55)); }
        #root .drain-caption { position: absolute; left: 0; right: 0; top: 150px; margin: 0; text-align: center;
          font-family: ui-serif, Georgia, serif; font-size: 52px; line-height: 1.3; }
        #root .drain-caption span { display: block; color: ${PALETTE.cream}; }
        #root .drain-caption em { display: block; margin-top: 10px; font-style: normal; color: ${PALETTE.lavender}; }
        #root .drain-figure { position: absolute; left: 120px; bottom: 182px; width: 74px; height: 196px;
          border-radius: 37px 37px 6px 6px;
          background: linear-gradient(180deg, ${PALETTE.approval} 0 52px, #332f4d 52px); }
        #root .closing { position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 56px; }
        #root .pill-art { width: 760px; border-radius: 20px; background: ${PALETTE.cream}; color: #1d1a2b;
          padding: 36px 42px; text-align: left; box-shadow: 0 44px 130px rgba(139,124,246,0.42); }
        #root .pill-name { font-family: ui-monospace, monospace; font-size: 34px; font-weight: 600; }
        #root .pill-ver { margin-top: 6px; font-family: ui-monospace, monospace; font-size: 22px; color: #6b6484; }
        #root .pill-rules { margin: 24px 0 0; padding: 0; list-style: none; }
        #root .pill-rules li { font-size: 25px; line-height: 1.55; color: #2a2740;
          padding-left: 20px; border-left: 3px solid ${PALETTE.lavender}; margin-bottom: 12px; }
        #root .pill-foot { margin-top: 24px; font-family: ui-monospace, monospace; font-size: 20px; color: #6b6484; }
        #root .dests { display: flex; gap: 64px; font-family: ui-monospace, monospace;
          font-size: 34px; letter-spacing: 0.12em; text-transform: uppercase; color: ${PALETTE.lavender}; }
        #root .still { opacity: 1; }
      </style>

      <div id="root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${duration}">
        <div class="bg"></div>
${stage(act, shot, duration)}
        <div class="grain"></div>
        <div class="label" id="${id}-label">${number ? `<b>Act ${number}</b>` : '<b>Keystone</b>'}<span>${esc(label)}</span></div>
        ${card}
        <div class="keyston" id="${id}-keyston">${mascot(MOOD[id] ?? 'idle', `${id}-mascot`)}</div>
      </div>

      <script>
        ${motionFor(act, shot, duration, placed)}
      </script>
    </template>
  </body>
</html>
`;
}

// ---------------------------------------------------------------------------
let cursor = 0;
const hosts = [];
const audio = [];
const timings = [];

for (const act of script.acts) {
  const shot = SHOTS[act.id];
  if (!shot) throw new Error(`no shot configured for ${act.id}`);
  const { placed, duration } = layout(act);
  writeFileSync(join(ROOT, `compositions/${act.id}.html`), composition(act, shot, duration, placed));

  hosts.push(`      <div
        id="host-${act.id}"
        class="clip"
        data-composition-id="${act.id}"
        data-composition-src="compositions/${act.id}.html"
        data-start="${r2(cursor)}"
        data-duration="${duration}"
        data-track-index="0"
        data-width="1920"
        data-height="1080"
      ></div>`);

  for (const p of placed) {
    audio.push(`      <audio id="vo-${act.id}-${p.index}" src="${p.file}" data-start="${r2(cursor + p.at)}" data-duration="${r2(p.seconds)}" data-track-index="1" data-volume="1"></audio>`);
  }
  timings.push({ id: act.id, start: r2(cursor), duration, words: act.words });
  cursor = r2(cursor + duration);
}

const total = r2(cursor);
const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"><\/script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: ${PALETTE.nightDeep}; }
      #root { width: 100%; height: 100%; position: relative; overflow: hidden; background: ${PALETTE.nightDeep}; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-fps="${FPS}" data-duration="${total}">
${hosts.join('\n')}

${audio.join('\n')}
    </div>

    <script>
      // The main timeline holds the film's length; every act registers its own
      // and the runtime nests them. Nothing is animated here.
      const tl = gsap.timeline({ paused: true });
      tl.to({}, { duration: ${total} });
      window.__timelines["main"] = tl;
    <\/script>
  </body>
</html>
`;
writeFileSync(join(ROOT, 'index.html'), index);
writeFileSync(join(ROOT, 'timings.json'), JSON.stringify({ fps: FPS, total, acts: timings }, null, 2) + '\n');

const mm = Math.floor(total / 60), ss = Math.round(total % 60);
console.log(`${script.acts.length} acts · ${audio.length} VO clips · ${mm}:${String(ss).padStart(2, '0')}`);
for (const t of timings) console.log(`  ${t.id.padEnd(8)} ${String(t.start).padStart(7)}s  +${t.duration}s`);
