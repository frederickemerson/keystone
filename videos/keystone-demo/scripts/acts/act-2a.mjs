// ACT 2A — "What would you like to teach today?" The chooser, and the thing
// nobody has drawn yet. Real footage of the local production build; the
// eighteen-second wait for the model is cut with a splice on the same source.
//
// Blueprint: prompt-type-submit-generate (a real product input, sub-shape B).
// Rules/registry: yt-camera-move (punch to the card), yt-feather-highlight
// (the drawing and its badge), waterfall-entry (lower third), svg-path-draw.
// Edit: creator-editing-recipes → split/splice (two <video> ranges, one file).
const SRC = 'assets/footage/teach-chooser.webm';
const A_FROM = 0.8, A_LEN = 12.9;   // chooser → describe → typed → Draw this situation → "Drawing…"
const B_FROM = 29.4;                // the drawing lands

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
        #root .type { position: absolute; left: 120px; bottom: 56px; font-weight: 700; font-size: 34px; letter-spacing: -0.01em; color: #f6f5fa; }
        #root .type .w { display: inline-block; opacity: 0; margin-right: 0.26em; will-change: transform; }
        #root .type em { font-style: normal; color: #8b7cf6; }
        #root .type small { display: block; margin-top: 6px; font-family: "IBM Plex Mono", monospace; font-weight: 400; font-size: 18px; letter-spacing: 0.08em; text-transform: uppercase; color: #9a93b5; }
        #root .type small .w { margin-right: 0.5em; }
  `,
  stage: (c) => {
    const bLen = Math.min(c.D - (0.7 + A_LEN) + 0.3, 10.4).toFixed(2);
    return `
          <div class="frame" id="act-2a-frame">
            <div class="edge"></div>
            <div class="cam" id="act-2a-cam" data-layout-allow-overflow="true">
              <video id="act-2a-vid-a" class="shot" src="${SRC}" muted data-start="0.3" data-duration="${(A_LEN + 0.4).toFixed(2)}" data-media-start="${A_FROM}" data-hf-media-start-basis="local"></video>
            </div>
            <div class="cam shotb" id="act-2a-cam-b" data-layout-allow-overflow="true">
              <video id="act-2a-vid-b" class="shot" src="${SRC}" muted data-start="${(0.7 + A_LEN).toFixed(2)}" data-duration="${bLen}" data-media-start="${B_FROM}" data-hf-media-start-basis="local"></video>
            </div>
            <div class="yt-hl" id="act-2a-hl"></div>
          </div>
          <p class="type" id="act-2a-t1"><span class="w">Teach</span><span class="w">the</span><span class="w">chilled-water</span><span class="w">leak</span><span class="w">—</span><span class="w">or</span><span class="w"><em>describe</em></span><span class="w"><em>a</em></span><span class="w"><em>situation</em></span><span class="w">nobody</span><span class="w">has</span><span class="w">drawn.</span></p>
          <p class="type" id="act-2a-t2"><span class="w">A</span><span class="w">model</span><span class="w">fills</span><span class="w">a</span><span class="w">fixed</span><span class="w">scene</span><span class="w">schema;</span><span class="w">a</span><span class="w">deterministic</span><span class="w">renderer</span><span class="w">draws</span><span class="w">it.</span><small><span class="w">the</span><span class="w">badge</span><span class="w">names</span><span class="w">who</span><span class="w">answered</span><span class="w">·</span><span class="w">a</span><span class="w">drawing,</span><span class="w">not</span><span class="w">a</span><span class="w">rule</span><span class="w">·</span><span class="w">no</span><span class="w">gate</span><span class="w">reads</span><span class="w">it</span></small></p>
    `;
  },
  motion: (c) => {
    const cutAt = 0.7 + A_LEN;              // the splice: Drawing… → drawn
    const typeAt = 0.7 + (10.9 - A_FROM) - 4.6 + 0.3;  // the typing starts ~6.6 s into the source
    const t1 = c.voiced ? c.at(1) : cutAt + 0.6;        // "Type what happened..."
    const t2At = t1 + 0.2;
    // The first caption has to be gone before the second lands. It used to
    // clear off the splice, which was always after it while this act was
    // unvoiced; once the lines were voiced t2 arrived first and the two sat on
    // top of each other for six seconds. Whichever comes first now wins, and
    // clearLower's own stagger (0.3s + 0.02 per word) gets room to finish.
    const clearT1 = Math.min(cutAt - 0.4, t2At - 0.75);
    return `
        frameIn("#act-2a-frame", 0.15);
        // hold wide on the two cards; punch in on Describe a situation as the typing starts (yt-camera-move)
        cam("#act-2a-cam", ${typeAt.toFixed(2)}, { zoom: 0.32, slideX: 360, slideY: 40, dur: 1.1 });
        // the splice: a whip of blur covers the eighteen seconds the model took — honest cut, same source
        tl.to("#act-2a-cam", { filter: "blur(10px)", opacity: 0, duration: 0.25, ease: "power2.in" }, ${(cutAt - 0.1).toFixed(2)});
        tl.fromTo("#act-2a-cam-b", { opacity: 0, filter: "blur(10px)", scale: 1.28, x: 360, y: 40 }, { opacity: 1, filter: "blur(0px)", duration: 0.35, ease: "power2.out" }, ${(cutAt + 0.1).toFixed(2)});
        // settle onto the drawing and its badge: Live · hy4-preview via TokenHub
        tl.to("#act-2a-cam-b", { scale: 1.42, x: 470, y: -120, duration: 1.4, ease: "power2.inOut" }, ${(cutAt + 1.6).toFixed(2)});
        hlIn("#act-2a-hl", ${(cutAt + 3.0).toFixed(2)}, { x: "34%", y: "72%", rx: "26%", ry: "18%" });
        hlOut("#act-2a-hl", ${(cutAt + 6.4).toFixed(2)});
        tl.to("#act-2a-cam-b", { scale: 1.18, x: 230, y: -40, duration: 1.4, ease: "power2.inOut" }, ${(cutAt + 6.2).toFixed(2)});
        waterfall("#act-2a-t1", ${(c.voiced ? c.at(0) + 0.3 : 1.2).toFixed(2)});
        clearLower("#act-2a-t1", ${clearT1.toFixed(2)});
        waterfall("#act-2a-t2", ${t2At.toFixed(2)});
    `;
  },
  sfx: () => [
    { name: 'typing', at: 0.7 + (10.9 - A_FROM) - 4.3, vol: 0.28 },
    { name: 'whoosh-short', at: 0.7 + A_LEN - 0.1, vol: 0.3 },
    { name: 'pop', at: 0.7 + A_LEN + 0.5, vol: 0.32 },
    { name: 'sparkle', at: 0.7 + A_LEN + 3.0, vol: 0.22 },
  ],
};
