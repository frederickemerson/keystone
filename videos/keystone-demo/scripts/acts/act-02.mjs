// ACT 2 — capturing the judgement. The chilled-water session on /teach: the
// drawn situation, one wide question, the coverage board, the contradiction.
//
// Blueprint: panel-edit-live-sync (the account lands, the board ticks in the
// same beat) + cursor-ui-demo. Registry/rules: yt-camera-move (punch to the
// board, then to the amber panel), yt-feather-highlight, spring-pop-entrance
// (the two strings), waterfall-entry.
//
// Footage marks (assets/footage/teach-marks.json, source seconds): scenario
// 2.6 · question 13.6 · account given 15.9 · contradiction 29.8 · condition
// confirmed 35.4 · answers done 38.8 · tour 46.7 · end 62.4.
const SRC = 'assets/footage/act-02.webm';
const FROM = 1.5;
const RATE = 0.97;
const local = (mark) => (mark - FROM) / RATE;

export default {
  label: 'Teaching a skill',
  lead: 0.6,
  beat: 0.45,
  tail: 0.5,
  keystonAt: 1.0,
  reactAt: () => local(29.8) + 0.4,
  reactTilt: -10,
  css: () => `
        #root .frame { left: 120px; right: 120px; top: 112px; bottom: 150px; }
        #root .pair { position: absolute; left: 0; right: 0; bottom: 48px; display: flex; justify-content: center; align-items: center; gap: 22px; }
        #root .pair .chip { position: static; font-size: 26px; }
        #root .pair .neq { font-family: "IBM Plex Mono", monospace; font-size: 44px; color: #d79a3a; opacity: 0; }
        #root .pair .chip .k { color: #9a93b5; }
  `,
  stage: (c) => `
          <div class="frame" id="act-02-frame">
            <div class="edge"></div>
            <div class="cam" id="act-02-cam" data-layout-allow-overflow="true">
              <video id="act-02-vid" class="shot" src="${SRC}" muted data-start="0" data-duration="${c.D}" data-media-start="${FROM}" data-playback-rate="${RATE}"></video>
            </div>
            <div class="yt-hl" id="act-02-hl"></div>
          </div>
          <div class="pair" id="act-02-pair">
            <span class="chip" id="act-02-p1"><span class="k">isolate:</span> the whole riser</span>
            <span class="neq" id="act-02-neq">&ne;</span>
            <span class="chip amber" id="act-02-p2"><span class="k">isolate:</span> the branch sub-valve</span>
          </div>
          <p class="lower" id="act-02-low"><span class="w">two</span><span class="w">strings,</span><span class="w">compared</span><span class="w">—</span><span class="w"><em>nothing</em></span><span class="w"><em>to</em></span><span class="w"><em>hallucinate</em></span></p>
  `,
  motion: (c) => {
    const g1 = c.at(1) ?? 8.1, g3 = c.at(3) ?? 33.1, g5 = c.at(5) ?? 47.6;
    const board = Math.max(g1 + 8.6, local(15.9) + 1.2);   // "Those are the fields of an actual rule"
    const contra = local(29.8);
    return `
        frameIn("#act-02-frame", 0.15);
        // the drawn situation first: a slow push while the stages play
        tl.to("#act-02-cam", { scale: 1.08, y: -30, duration: ${(board - 1.2).toFixed(2)}, ease: "none" }, 0.9);
        // "that panel isn't progress through a script" — punch to the coverage board, spotlight the grey
        cam("#act-02-cam", ${board.toFixed(2)}, { zoom: 0.42, slideX: -520, slideY: 170, dur: 1.1 });
        hlIn("#act-02-hl", ${(board + 0.9).toFixed(2)}, { x: "82%", y: "40%", rx: "22%", ry: "30%" });
        hlOut("#act-02-hl", ${(board + 5.2).toFixed(2)});
        // back wide for the question cards
        camReset("#act-02-cam", ${(board + 5.4).toFixed(2)}, 1.1);
        // "and it catches him" — the amber panel, held
        cam("#act-02-cam", ${(contra + 0.3).toFixed(2)}, { zoom: 0.34, slideX: 250, slideY: 200, dur: 1.0 });
        hlIn("#act-02-hl", ${(contra + 1.1).toFixed(2)}, { x: "30%", y: "34%", rx: "30%", ry: "22%" });
        hlOut("#act-02-hl", ${Math.max(contra + 7.5, g3 + 3.0).toFixed(2)});
        camReset("#act-02-cam", ${Math.max(contra + 8.2, g3 + 3.4).toFixed(2)}, 1.2);
        // the draft: a gentle drift while it is read
        tl.to("#act-02-cam", { scale: 1.06, y: -24, duration: ${(c.D - local(46.7) - 1).toFixed(2)}, ease: "none" }, ${(local(46.7) + 0.5).toFixed(2)});
        // "the code compares two strings" — the two values, side by side, as strings
        chip("#act-02-p1", ${(g5 + 5.6).toFixed(2)});
        tl.fromTo("#act-02-neq", { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, ${(g5 + 6.1).toFixed(2)});
        chip("#act-02-p2", ${(g5 + 6.4).toFixed(2)});
        waterfall("#act-02-low", ${(g5 + 9.6).toFixed(2)});
    `;
  },
  sfx: (c) => {
    const g5 = c.at(5) ?? 47.6;
    return [
      { name: 'ping', at: local(29.8) + 0.3, vol: 0.3 },
      { name: 'pop', at: g5 + 5.6, vol: 0.3 },
      { name: 'pop', at: g5 + 6.4, vol: 0.3 },
    ];
  },
};
