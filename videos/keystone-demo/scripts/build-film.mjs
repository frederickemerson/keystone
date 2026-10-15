// Generate the film from the script.
//
// Every act composition and the main timeline are written from script.json
// (the words), narration.json (their measured durations), film.config.mjs
// (order, moods, transitions) and scripts/acts/<id>.mjs (each act's own
// picture and motion). Nothing is hand-timed: a rewritten line changes its
// clip's length, and re-running this moves everything after it.
//
// Acts overlap by the length of their transition, so the outgoing act's exit
// and the incoming act's entrance run at the same instant — the transition IS
// the handoff, per hyperframes-animation/transitions/overview.md.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CUT, MOOD, NUMERAL, OVERLAP, PALETTE, STAGE, TRANSITION_IN } from './film.config.mjs';
import { mascot } from './lib/mascot.mjs';
import { SHARED_CSS, chromeMotion, enterStageJS, exitStageJS, sharedScript } from './lib/chrome.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const script = JSON.parse(readFileSync(join(ROOT, 'script.json'), 'utf8'));
const narration = JSON.parse(readFileSync(join(ROOT, 'narration.json'), 'utf8'));

const FPS = 30;
const r2 = (n) => Math.round(n * 100) / 100;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const clipsByAct = {};
for (const c of narration.clips) {
  if (existsSync(join(ROOT, c.file))) (clipsByAct[c.act] ??= []).push(c);
}

/** Where every VO group sits inside its act, and how long the act's content runs. */
function layout(act, mod) {
  const clips = (clipsByAct[act.id] ?? []).sort((a, b) => a.index - b.index);
  const lead = mod.lead ?? (act.card ? 1.5 : 0.7);
  const beat = mod.beat ?? 0.5;
  const tail = mod.tail ?? 0.7;
  let t = lead;
  const vo = clips.map((c, i) => {
    const at = r2(t);
    t += c.seconds + (i < clips.length - 1 ? beat : 0);
    return { ...c, at, end: r2(at + c.seconds) };
  });
  // An act whose lines are not voiced yet carries itself on type and music.
  const content = clips.length ? r2(t + tail) : (mod.fallbackDuration ?? 20);
  return { vo, content: r2(Math.max(content, mod.minDuration ?? 0)) };
}

const order = script.acts.map((a) => a.id);
const acts = [];
for (const act of script.acts) {
  if (CUT.has(act.id)) continue;
  const mod = (await import(`./acts/${act.id}.mjs`)).default;
  const { vo, content } = layout(act, mod);
  acts.push({ act, mod, vo, content });
}

let cursor = 0;
const hosts = [];
const audio = [];
const sfx = [];
const timings = [];
const starts = {};

for (let i = 0; i < acts.length; i++) {
  const { act, mod, vo, content } = acts[i];
  const id = act.id;
  const next = acts[i + 1];
  const inKind = TRANSITION_IN[id] ?? 'push';
  const outKind = next ? (TRANSITION_IN[next.act.id] ?? 'push') : 'black';
  const ovOut = next ? (OVERLAP[outKind] ?? 0.5) : 0;
  const D = r2(content + ovOut);
  const exitAt = r2(content);

  const ctx = {
    id, D, content, vo, exitAt, outKind, inKind,
    at: (k) => vo[k]?.at,
    end: (k) => vo[k]?.end,
    voiced: vo.length > 0,
    card: act.card,
    r2,
  };

  const number = id === 'close' ? '' : id.slice(4).toUpperCase();
  const label = mod.label ?? act.title.replace(/^[—-]\s*/, '');
  const card = act.card
    ? `<figure class="card" id="${id}-card"><span class="bar"></span><blockquote>&ldquo;${esc(act.card)}&rdquo;</blockquote><figcaption>Keppel &middot; AI HARVEST briefing</figcaption></figure>`
    : '';
  const tag = STAGE[id] ? `<div class="tag" id="${id}-tag">${esc(STAGE[id])}</div>` : `<div class="tag" id="${id}-tag" style="opacity:0"></div>`;
  const ghost = `<svg class="ghost" id="${id}-ghost" viewBox="0 0 1000 1000" aria-hidden="true" data-layout-ignore="true" data-layout-allow-overflow="true" data-layout-allow-occlusion="true"><text x="1000" y="860" text-anchor="end">${NUMERAL[id] ?? ''}</text></svg>`;

  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>${SHARED_CSS}${mod.css ? mod.css(ctx) : ''}
      </style>

      <div id="root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${D}">
        <div class="stage" id="${id}-stage">
          <div class="bg"></div>
          <div class="glow glow-a" id="${id}-glow-a" data-layout-allow-overflow="true"></div>
          <div class="glow glow-b" id="${id}-glow-b" data-layout-allow-overflow="true"></div>
          <div class="gridlines"></div>
          ${ghost}
${mod.stage(ctx)}
          <div class="grain"></div>
          <div class="label" id="${id}-label">${number ? `<b>Act ${number}</b><i></i>` : '<b>Keystone</b><i></i>'}<span>${esc(label)}</span></div>
          ${tag}
          ${card}
          <div class="keyston" id="${id}-keyston">${mascot(MOOD[id] ?? 'idle', `${id}-mascot`)}</div>
        </div>
      </div>

      <script>
${sharedScript(id)}
        // ---- ${id} ----
        ${mod.motion(ctx)}
        // ---- chrome ----
        ${chromeMotion({ id, D, card: !!act.card, cardAt: mod.cardAt ?? 0.55, keystonAt: mod.keystonAt ?? 0.9, reactAt: mod.reactAt?.(ctx), reactTilt: mod.reactTilt, ghostDrift: true })}
        ${enterStageJS(inKind)}
        ${exitStageJS(outKind, exitAt)}
        window.__timelines["${id}"] = tl;
      </script>
    </template>
  </body>
</html>
`;
  writeFileSync(join(ROOT, `compositions/${id}.html`), html);

  starts[id] = r2(cursor);
  hosts.push(`      <div
        id="host-${id}"
        class="clip"
        data-composition-id="${id}"
        data-composition-src="compositions/${id}.html"
        data-start="${r2(cursor)}"
        data-duration="${D}"
        data-track-index="0"
        data-width="1920"
        data-height="1080"
      ></div>`);

  for (const p of vo) {
    audio.push(`      <audio id="vo-${id}-${p.index}" src="${p.file}" data-audio-group="voiceover" data-start="${r2(cursor + p.at)}" data-duration="${r2(p.seconds)}" data-track-index="1" data-volume="1"></audio>`);
  }
  for (const [k, s] of (mod.sfx ? mod.sfx(ctx) : []).entries()) {
    if (s.at === undefined || Number.isNaN(s.at)) continue;
    sfx.push(`      <audio id="sfx-${id}-${k}" src="assets/sfx/${s.name}.mp3" data-audio-group="sfx" data-start="${r2(cursor + s.at)}" data-track-index="${10 + sfx.length}" data-volume="${s.vol ?? 0.35}"></audio>`);
  }
  timings.push({ id, start: r2(cursor), duration: D, content, words: act.words, voiced: vo.length > 0 });
  cursor = r2(cursor + content);
}

const total = r2(cursor);

// ---------------------------------------------------------------------------
// The bed. "Beauty Flow" is 7:13; the film is longer, so it plays twice with a
// short crossfade at the start of the build reflection, where it is quiet
// anyway. The volume lane carries the film's dynamics (the duck on "here it
// stops", the lift on the turn, the drop under the reflection); carve.mjs then
// adds the per-word room for the narration on top of it.
// ---------------------------------------------------------------------------
const BED = 'assets/music/beauty-flow.mp3';
const BED_LEN = 433.39;
const cut = starts['act-11'] ?? Math.min(total, BED_LEN - 10);
const stopAt = acts.find((a) => a.act.id === 'act-04');
const gateAt = stopAt ? r2(starts['act-04'] + (stopAt.vo[1]?.at ?? 6) + 6.2) : null;

const S = (id) => starts[id] ?? starts['act-09'];
const lanePoints = [
  { t: 0, v: 0 }, { t: 0.35, v: 0.62 },
  { t: starts['act-01'], v: 0.62 }, { t: starts['act-01'] + 1, v: 0.5 },
  { t: starts['act-1b'], v: 0.5 }, { t: starts['act-1b'] + 1, v: 0.56 },
  { t: starts['act-2a'], v: 0.56 }, { t: starts['act-2a'] + 1, v: 0.46 },
];
if (gateAt) lanePoints.push({ t: gateAt - 0.1, v: 0.46 }, { t: gateAt + 0.15, v: 0.1 }, { t: gateAt + 3.5, v: 0.1 }, { t: gateAt + 5.5, v: 0.34 });
lanePoints.push(
  { t: starts['act-05'], v: 0.34 }, { t: starts['act-05'] + 0.6, v: 0.66 },
  { t: starts['act-06'], v: 0.66 }, { t: starts['act-06'] + 1, v: 0.5 },
  { t: starts['act-07'], v: 0.5 }, { t: starts['act-07'] + 0.5, v: 0.58 },
  { t: S('act-08'), v: 0.58 }, { t: S('act-08') + 1, v: 0.46 },
  { t: cut - 1.5, v: 0.46 }, { t: cut + 1.5, v: 0 },
);
const laneA = { version: 1, lanes: [{ target: 'volume', points: lanePoints.filter((p) => p.t <= cut + 1.5).map((p) => ({ t: r2(p.t), v: p.v })) }] };
const bStart = r2(cut - 1.5);
const laneB = { version: 1, lanes: [{ target: 'volume', points: [
  { t: 0, v: 0 }, { t: 3, v: 0.28 },
  { t: r2(starts['act-12'] - bStart), v: 0.28 }, { t: r2(starts['act-12'] - bStart + 1.2), v: 0.42 },
  { t: r2(starts['close'] - bStart), v: 0.42 }, { t: r2(starts['close'] - bStart + 1), v: 0.5 },
  { t: r2(total - bStart - 2.6), v: 0.5 }, { t: r2(total - bStart - 0.1), v: 0 },
] }] };
const attr = (o) => JSON.stringify(o).replace(/"/g, '&quot;');
const bed = [
  `      <audio id="music-bed-a" src="${BED}" data-audio-group="music" data-start="0" data-duration="${r2(cut + 1.5)}" data-media-start="0" data-track-index="2" data-volume="1" data-automation="${attr(laneA)}"></audio>`,
  `      <audio id="music-bed-b" src="${BED}" data-audio-group="music" data-start="${bStart}" data-duration="${r2(total - bStart)}" data-media-start="0" data-track-index="3" data-volume="1" data-automation="${attr(laneB)}"></audio>`,
];
const master = attr({ version: 1, nodes: [{ type: 'truepeak', id: 'm1', label: 'Delivery ceiling', params: { ceiling: -1.5, lookahead: 3, release: 80 } }] });

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
      #root > .clip { position: absolute; inset: 0; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-fps="${FPS}" data-duration="${total}" data-fx-chain="${master}">
${hosts.join('\n')}

${audio.join('\n')}

${bed.join('\n')}

${sfx.join('\n')}
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
console.log(`${acts.length} acts · ${audio.length} VO clips · ${sfx.length} sfx · ${mm}:${String(ss).padStart(2, '0')}`);
for (const t of timings) console.log(`  ${t.id.padEnd(8)} ${String(t.start).padStart(7)}s  +${String(t.content).padStart(6)}s${t.voiced ? '' : '   (unvoiced: type + music)'}`);
