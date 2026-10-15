// ACT 2A — "What would you like to teach today?" The chooser, the thing
// nobody has drawn yet, and then the move back to the case the film is about.
// Real footage of the local production build; the eighteen-second wait for
// the model is cut with a splice on the same source.
//
// Blueprint: prompt-type-submit-generate (a real product input, sub-shape B).
// Rules/registry: yt-camera-move (punch to the card; the camera follows the
// drawing when it lands; pull back; punch into the chilled-water card),
// css-marker-patterns (circle — an amber ring draws around the badge, placed
// in footage coordinates so it rides the camera), waterfall-entry (lower
// thirds). No feather highlight: the drawing stays readable, the camera does
// the pointing. Exit: zoom-through the chilled-water card into Act 2.
// Edit: creator-editing-recipes → split/splice (three <video> ranges, one
// file; the third is the finished chooser held at half speed, so the pull-back
// never runs off the end of the source).
const SRC = 'assets/footage/teach-chooser.webm';
const SRC_LEN = 40.0;
const A_FROM = 0.8, A_LEN = 12.9;   // chooser → describe → typed → Draw this situation → "Drawing…"
const B_FROM = 29.4;                // the drawing lands
const C_FROM = 35.2, C_RATE = 0.5;  // the finished chooser, static — held at half speed

// Footage → frame: object-fit cover at k = 1680/1920, top-centre; a source
// fraction (sx, sy) sits at frame px (sx·1680, sy·945). The camera is
// scale(S) then translate(x, y) in screen px (yt-camera-move / focus()).
const K = 0.875, FW = 1680, FH = 818;
const fpx = (sx, sy) => ({ x: sx * 1920 * K, y: sy * 1080 * K });
const pose = (sx, sy, S) => { const p = fpx(sx, sy); return { s: S, x: Math.round((FW / 2 - p.x) * S), y: Math.round((FH / 2 - p.y) * S) }; };
const DRAW = pose(0.35, 0.53, 1.3);    // the generated drawing, its badge still in frame beneath it
const CARD = pose(0.643, 0.52, 1.4);   // as far right as the frame allows: the chilled-water card, whole
const BADGE = fpx(0.22, 0.818);        // "Live · hy4-preview via TokenHub · 18.4 s"
const RING_W = 290, RING_H = 50;

export default {
  label: 'What would you like to teach today?',
  lead: 0.7,
  beat: 0.5,
  tail: 0.8,
  minDuration: 20,
  fallbackDuration: 20,
  keystonAt: 1.0,
  reactAt: () => 0.7 + A_LEN + 0.9,
  reactTilt: -6,
  css: () => `
        #root .frame { left: 120px; right: 120px; top: 112px; bottom: 150px; }
        #root .shotb { opacity: 0; }
        #root .cam .shot.over { position: absolute; inset: 0; opacity: 0; }
        #root .cam .ring { position: absolute; right: auto; bottom: auto; z-index: 2; opacity: 0; }
        #root .type { position: absolute; left: 120px; bottom: 56px; font-weight: 700; font-size: 34px; letter-spacing: -0.01em; color: #f6f5fa; }
        #root .type .w { display: inline-block; opacity: 0; margin-right: 0.26em; will-change: transform; }
        #root .type em { font-style: normal; color: #8b7cf6; }
        #root .type small { display: block; margin-top: 6px; font-family: "IBM Plex Mono", monospace; font-weight: 400; font-size: 18px; letter-spacing: 0.08em; text-transform: uppercase; color: #9a93b5; }
        #root .type small .w { margin-right: 0.5em; }
  `,
  stage: (c) => {
    const cutAt = 0.7 + A_LEN;
    const bLen = Math.min(c.D - cutAt, SRC_LEN - B_FROM - 0.1).toFixed(2);
    const cStart = (cutAt + Number(bLen) - 0.7).toFixed(2);
    const cLen = (c.D - Number(cStart)).toFixed(2);
    return `
          <div class="frame" id="act-2a-frame">
            <div class="edge"></div>
            <div class="cam" id="act-2a-cam" data-layout-allow-overflow="true">
              <video id="act-2a-vid-a" class="shot" src="${SRC}" muted data-start="0.3" data-duration="${(A_LEN + 0.4).toFixed(2)}" data-media-start="${A_FROM}" data-hf-media-start-basis="local"></video>
            </div>
            <div class="cam shotb" id="act-2a-cam-b" data-layout-allow-overflow="true">
              <video id="act-2a-vid-b" class="shot" src="${SRC}" muted data-start="${cutAt.toFixed(2)}" data-duration="${bLen}" data-media-start="${B_FROM}" data-hf-media-start-basis="local"></video>
              <video id="act-2a-vid-c" class="shot over" src="${SRC}" muted data-start="${cStart}" data-duration="${cLen}" data-media-start="${C_FROM}" data-playback-rate="${C_RATE}" data-hf-media-start-basis="local"></video>
              <svg class="ring" id="act-2a-ring" viewBox="0 0 200 100" preserveAspectRatio="none" style="left:${Math.round(BADGE.x - RING_W / 2)}px;top:${Math.round(BADGE.y - RING_H / 2)}px;width:${RING_W}px;height:${RING_H}px"></svg>
            </div>
          </div>
          <p class="type" id="act-2a-t1"><span class="w">Teach</span><span class="w">the</span><span class="w">chilled-water</span><span class="w">leak</span><span class="w">—</span><span class="w">or</span><span class="w"><em>describe</em></span><span class="w"><em>a</em></span><span class="w"><em>situation</em></span><span class="w">nobody</span><span class="w">has</span><span class="w">drawn.</span></p>
          <p class="type" id="act-2a-t2"><span class="w">A</span><span class="w">model</span><span class="w">fills</span><span class="w">a</span><span class="w">fixed</span><span class="w">scene</span><span class="w">schema;</span><span class="w">a</span><span class="w">deterministic</span><span class="w">renderer</span><span class="w">draws</span><span class="w">it.</span><small><span class="w">the</span><span class="w">badge</span><span class="w">names</span><span class="w">who</span><span class="w">answered</span><span class="w">·</span><span class="w">a</span><span class="w">drawing,</span><span class="w">not</span><span class="w">a</span><span class="w">rule</span><span class="w">·</span><span class="w">no</span><span class="w">gate</span><span class="w">reads</span><span class="w">it</span></small></p>
    `;
  },
  motion: (c) => {
    const cutAt = 0.7 + A_LEN;                          // the splice: Drawing… → drawn
    const typeAt = 0.7 + (10.9 - A_FROM) - 4.6 + 0.3;   // the typing starts ~6.6 s into the source
    const t0 = c.at(0) ?? 0.7;
    const t1 = c.at(1) ?? cutAt + 0.6;                  // "Type what happened..."
    const t2 = c.at(2) ?? c.end(1) + 0.5;               // "So we leave that one as a drawing..."
    const t2At = t1 + 0.2;
    const badgeAt = Math.max(t1 + 11.6, cutAt + 3.2);   // "...and the badge names who actually answered"
    const cStart = cutAt + Math.min(c.D - cutAt, SRC_LEN - B_FROM - 0.1) - 0.7;
    // The first caption has to be gone before the second lands; whichever comes first wins.
    const clearT1 = Math.min(cutAt - 0.4, t2At - 0.75);
    const pullAt = t2 + 0.3, punchAt = t2 + 2.5;
    return `
        frameIn("#act-2a-frame", 0.15);
        // hold wide on the two cards; punch in on Describe a situation as the typing starts (yt-camera-move)
        cam("#act-2a-cam", ${typeAt.toFixed(2)}, { zoom: 0.32, slideX: 360, slideY: 40, dur: 1.1 });
        // the splice: a whip of blur covers the eighteen seconds the model took — honest cut, same source
        tl.to("#act-2a-cam", { filter: "blur(10px)", opacity: 0, duration: 0.25, ease: "power2.in" }, ${(cutAt - 0.1).toFixed(2)});
        tl.fromTo("#act-2a-cam-b", { opacity: 0, filter: "blur(10px)", scale: 1.28, x: 360, y: 40 }, { opacity: 1, filter: "blur(0px)", duration: 0.35, ease: "power2.out" }, ${(cutAt + 0.1).toFixed(2)});
        // the camera follows the drawing as it lands — the badge stays in frame beneath it
        tl.to("#act-2a-cam-b", { scale: ${DRAW.s}, x: ${DRAW.x}, y: ${DRAW.y}, duration: 1.3, ease: "power2.inOut" }, ${(cutAt + 1.4).toFixed(2)});
        tl.to("#act-2a-cam-b", { scale: ${(DRAW.s + 0.04).toFixed(2)}, y: ${DRAW.y - 14}, duration: ${(pullAt - cutAt - 2.8).toFixed(2)}, ease: "none" }, ${(cutAt + 2.8).toFixed(2)});
        // "the badge names who actually answered" — an amber ring draws around it (css-marker-patterns, circle)
        tl.set("#act-2a-ring", { opacity: 1 }, ${badgeAt.toFixed(2)});
        ring("#act-2a-ring", ${badgeAt.toFixed(2)}, "#d79a3a");
        tl.to("#act-2a-ring", { opacity: 0, duration: 0.3 }, ${(t2 - 0.3).toFixed(2)});
        // the finished chooser, held: dissolves in under the same camera before the source runs out
        tl.fromTo("#act-2a-vid-c", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "none" }, ${cStart.toFixed(2)});
        // "So we leave that one as a drawing" — pull back: both cards, the drawing on the left, the pill's case on the right
        camReset("#act-2a-cam-b", ${pullAt.toFixed(2)}, 1.3);
        // "we go with the chilled-water incident" — push into its card, and keep pushing through the exit into Act 2
        tl.to("#act-2a-cam-b", { scale: ${CARD.s}, x: ${CARD.x}, y: ${CARD.y}, duration: 1.3, ease: "power2.inOut" }, ${punchAt.toFixed(2)});
        tl.to("#act-2a-cam-b", { scale: ${(CARD.s + 0.14).toFixed(2)}, x: ${Math.round(CARD.x * 1.1)}, y: ${Math.round(CARD.y * 1.1)}, duration: ${(c.D - punchAt - 1.3).toFixed(2)}, ease: "power1.in" }, ${(punchAt + 1.3).toFixed(2)});
        waterfall("#act-2a-t1", ${(t0 + 0.3).toFixed(2)});
        clearLower("#act-2a-t1", ${clearT1.toFixed(2)});
        waterfall("#act-2a-t2", ${t2At.toFixed(2)});
        clearLower("#act-2a-t2", ${(t2 - 0.4).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const cutAt = 0.7 + A_LEN;
    const t1 = c.at(1) ?? cutAt + 0.6;
    const t2 = c.at(2) ?? c.end(1) + 0.5;
    const badgeAt = Math.max(t1 + 11.6, cutAt + 3.2);
    return [
      { name: 'typing', at: 0.7 + (10.9 - A_FROM) - 4.3, vol: 0.28 },
      { name: 'whoosh-short', at: cutAt - 0.1, vol: 0.3 },
      { name: 'pop', at: cutAt + 0.5, vol: 0.32 },
      { name: 'sparkle', at: cutAt + 3.0, vol: 0.22 },
      { name: 'ping', at: badgeAt, vol: 0.28 },
      { name: 'whoosh-short', at: t2 + 0.3, vol: 0.26 },
      { name: 'click', at: t2 + 2.5, vol: 0.26 },
    ];
  },
};
