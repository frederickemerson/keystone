// The film's shared chrome: one stylesheet and one set of timeline helpers
// stamped into every act, so the acts differ in what they show, never in how
// the frame is built.
//
// Motion vocabulary cited from hyperframes-animation:
//   transitions/css-push.md, css-dissolve.md, css-scale.md (enter/exit stage)
//   rules/spring-pop-entrance.md         pop()
//   rules/waterfall-entry.md             waterfall()
//   rules/svg-path-draw.md               drawPath()
//   rules/css-marker-patterns.md         ring()  (circle mode, drawn as SVG)
//   rules/sine-wave-loop.md              breathe()
//   rules/ambient-glow-bloom.md          the .glow layers
//   registry: yt-camera-move             cam() / camReset()
//   registry: yt-feather-highlight       hlIn() / hlTo() / hlOut()
//   registry: headline-slam (signature)  stamp()
import { PALETTE } from '../film.config.mjs';

export const SHARED_CSS = `
        #root { position: absolute; inset: 0; overflow: hidden; background: transparent;
                font-family: "Montserrat", sans-serif; color: ${PALETTE.cream}; }
        #root .stage { position: absolute; inset: 0; overflow: hidden; background: ${PALETTE.night}; will-change: transform; }
        #root .bg { position: absolute; inset: 0;
          background: radial-gradient(120% 80% at 50% -10%, rgba(139,124,246,0.20), rgba(139,124,246,0) 62%), ${PALETTE.night}; }
        #root .glow { position: absolute; width: 1100px; height: 1100px; border-radius: 50%; opacity: 0.22;
          background: radial-gradient(circle, rgba(139,124,246,0.55) 0%, rgba(139,124,246,0) 62%); will-change: transform; }
        #root .glow-a { left: -380px; top: -420px; }
        #root .glow-b { right: -420px; bottom: -520px; background: radial-gradient(circle, rgba(215,154,58,0.35) 0%, rgba(215,154,58,0) 62%); }
        #root .gridlines { position: absolute; inset: 0; opacity: 0.07;
          background-image: linear-gradient(rgba(246,245,250,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(246,245,250,0.6) 1px, transparent 1px);
          background-size: 120px 120px; background-position: 60px 60px; }
        #root .ghost { position: absolute; right: -40px; top: -140px; width: 1000px; height: 1000px; overflow: visible; will-change: transform; }
        #root .ghost text { font-family: "Montserrat", sans-serif; font-weight: 900; font-size: 980px; letter-spacing: -0.06em; fill: rgba(139,124,246,0.07); }
        #root .grain { position: absolute; inset: 0; opacity: 0.045; mix-blend-mode: overlay; pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.8) 0.5px, transparent 0.6px); background-size: 3px 3px; }
        #root .label { position: absolute; left: 96px; top: 50px; display: flex; align-items: baseline; gap: 16px;
          font-family: "IBM Plex Mono", monospace; font-size: 20px; letter-spacing: 0.14em; text-transform: uppercase; color: ${PALETTE.muted}; }
        #root .label b { color: ${PALETTE.lavender}; font-weight: 700; }
        #root .label i { display: block; width: 44px; height: 2px; background: ${PALETTE.lavender}; transform-origin: left center; align-self: center; }
        #root .tag { position: absolute; right: 96px; top: 50px; font-family: "IBM Plex Mono", monospace; font-size: 20px;
          letter-spacing: 0.16em; text-transform: uppercase; color: ${PALETTE.muted}; padding: 8px 16px;
          border: 1px solid rgba(154,147,181,0.35); border-radius: 999px; }
        #root .card { position: absolute; left: 96px; right: 440px; bottom: 60px; margin: 0; padding: 28px 34px 26px 40px;
          border-radius: 14px; background: rgba(14,12,22,0.86); border: 1px solid rgba(139,124,246,0.30); backdrop-filter: blur(8px); }
        #root .card .bar { position: absolute; left: 0; top: 22px; bottom: 22px; width: 4px; border-radius: 2px; background: ${PALETTE.approval}; transform-origin: top center; }
        #root .card blockquote { margin: 0; font-family: "EB Garamond", serif; font-size: 38px; line-height: 1.24; color: ${PALETTE.cream}; }
        #root .card figcaption { margin-top: 12px; font-family: "IBM Plex Mono", monospace; font-size: 16px; letter-spacing: 0.1em; text-transform: uppercase; color: ${PALETTE.muted}; }
        #root .keyston { position: absolute; right: 92px; bottom: 18px; width: 150px; height: 125px; will-change: transform; }
        #root .mascot { width: 100%; height: 100%; display: block; filter: drop-shadow(0 14px 30px rgba(0,0,0,0.5)); }
        #root .frame { position: absolute; left: 120px; right: 120px; top: 112px; bottom: 118px; border-radius: 14px; overflow: hidden;
          background: ${PALETTE.nightDeep}; box-shadow: 0 50px 120px rgba(0,0,0,0.62), 0 0 0 1px rgba(139,124,246,0.22); will-change: transform; }
        #root .frame .edge { position: absolute; left: 0; right: 0; top: 0; height: 2px; z-index: 3;
          background: linear-gradient(90deg, rgba(139,124,246,0) 0%, rgba(139,124,246,0.95) 50%, rgba(139,124,246,0) 100%); transform-origin: center; }
        #root .cam { position: absolute; inset: 0; will-change: transform; }
        #root .frame .cam { contain: paint; }
        #root .shot { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
        #root .yt-hl { --yt-hl-x: 50%; --yt-hl-y: 50%; --yt-hl-rx: 22%; --yt-hl-ry: 26%; --yt-hl-dim: 0.62;
          position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 2; background: rgba(8,6,14,var(--yt-hl-dim));
          -webkit-mask-image: radial-gradient(ellipse var(--yt-hl-rx) var(--yt-hl-ry) at var(--yt-hl-x) var(--yt-hl-y), transparent 0%, transparent 52%, black 88%);
          mask-image: radial-gradient(ellipse var(--yt-hl-rx) var(--yt-hl-ry) at var(--yt-hl-x) var(--yt-hl-y), transparent 0%, transparent 52%, black 88%); }
        #root .chip { position: absolute; display: inline-block; padding: 12px 20px; border-radius: 10px; font-family: "IBM Plex Mono", monospace;
          font-size: 24px; letter-spacing: 0.02em; color: ${PALETTE.cream}; background: rgba(14,12,22,0.9); border: 1px solid rgba(139,124,246,0.5);
          box-shadow: 0 18px 50px rgba(0,0,0,0.5); white-space: nowrap; opacity: 0; will-change: transform; }
        #root .chip.amber { border-color: ${PALETTE.approval}; color: ${PALETTE.approval}; }
        #root .chip.red { border-color: ${PALETTE.blocked}; color: ${PALETTE.blocked}; }
        #root .chip.green { border-color: ${PALETTE.grounded}; color: ${PALETTE.grounded}; }
        #root .lower { position: absolute; left: 120px; bottom: 150px; font-weight: 700; font-size: 44px; letter-spacing: -0.02em; line-height: 1.1; color: ${PALETTE.cream}; }
        #root .lower .w { display: inline-block; opacity: 0; margin-right: 0.28em; will-change: transform; }
        #root .lower em { font-style: normal; color: ${PALETTE.lavender}; }
        #root .stamp { position: absolute; font-family: "IBM Plex Mono", monospace; font-weight: 700; font-size: 30px; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 12px 22px; border-radius: 8px; border: 2px solid currentColor; background: rgba(14,12,22,0.92);
          opacity: 0; will-change: transform; }
        #root .mark { position: relative; display: inline-block; padding: 0 6px; }
        #root .ring { position: absolute; left: -14px; right: -14px; top: -10px; bottom: -10px; width: calc(100% + 28px); height: calc(100% + 20px);
          pointer-events: none; overflow: visible; }
        #root .ring path { fill: none; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; }
        #root .disclosure { position: absolute; left: 0; right: 0; bottom: 26px; text-align: center; font-family: "IBM Plex Mono", monospace;
          font-size: 19px; letter-spacing: 0.04em; color: ${PALETTE.muted}; opacity: 0; }
`;

// --- scene transitions (hyperframes-animation/transitions: push, dissolve, scale) ---
// Both halves run at the same T: the incoming act enters while the outgoing exits.
// Emitted per act at build time, so each composition carries exactly one entrance
// and one exit tween on its stage.
export function enterStageJS(kind) {
  switch (kind) {
    case 'push': return `tl.fromTo(S, { x: 1920 }, { x: 0, duration: 0.5, ease: "power3.inOut" }, 0);`;
    case 'whip': return `tl.fromTo(S, { x: 520, filter: "blur(22px)" }, { x: 0, filter: "blur(0px)", duration: 0.32, ease: "power3.out" }, 0);`;
    case 'zoom': return `tl.fromTo(S, { scale: 0.76, opacity: 0, filter: "blur(18px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.55, ease: "expo.out" }, 0);`;
    case 'blur': return `tl.fromTo(S, { opacity: 0, filter: "blur(14px)", scale: 0.97 }, { opacity: 1, filter: "blur(0px)", scale: 1, duration: 0.5, ease: "power2.inOut" }, 0.1);`;
    case 'dip': return `tl.fromTo(S, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, 0.22);`;
    default: return `tl.fromTo(S, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: "power1.out" }, 0);`;
  }
}
export function exitStageJS(kind, at) {
  switch (kind) {
    case 'push': return `tl.to(S, { x: -1920, duration: 0.5, ease: "power3.inOut" }, ${at});`;
    case 'whip': return `tl.to(S, { x: -520, filter: "blur(22px)", duration: 0.32, ease: "power3.in" }, ${at});`;
    case 'zoom': return `tl.to(S, { scale: 1.22, filter: "blur(18px)", opacity: 0, duration: 0.55, ease: "power3.in" }, ${at});`;
    case 'blur': return `tl.to(S, { filter: "blur(12px)", scale: 1.03, opacity: 0, duration: 0.6, ease: "power2.inOut" }, ${at});`;
    case 'dip': return `tl.to(S, { opacity: 0, duration: 0.22, ease: "power2.in" }, ${at});`;
    default: return `tl.to(S, { opacity: 0, duration: 1.2, ease: "power1.inOut" }, ${at});`;
  }
}

/** Wrap each word of a line in a span, for waterfall entries. */
export const words = (text) => text.split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');

export function sharedScript(id) {
  return `
        const tl = gsap.timeline({ paused: true });
        const ID = "${id}";
        const S = "#${id}-stage";
        const q = (s) => document.querySelector(s);
        const qa = (s) => Array.from(document.querySelectorAll(s));
        // --- rules/spring-pop-entrance: scale 0 → 1 with back.out overshoot, fromTo so t=0 is right under seek ---
        function pop(sel, at, stagger, dur) {
          tl.fromTo(sel, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: dur || 0.5, ease: "back.out(1.7)", stagger: stagger || 0 }, at);
        }
        // --- rules/waterfall-entry: words whip in from below, binary opacity, overlapping, power4.out ---
        function waterfall(sel, at) {
          const ws = qa(sel + " .w");
          let t = at;
          ws.forEach((w, i) => {
            const last = i === ws.length - 1;
            const dur = last ? 0.2 : 0.15;
            tl.set(w, { opacity: 1, y: last ? 70 : 46 }, t);
            tl.to(w, { y: 0, duration: dur, ease: "power4.out" }, t);
            t += dur - 0.035;
          });
        }
        function clearLower(sel, at) { tl.to(sel + " .w", { opacity: 0, y: -18, duration: 0.3, ease: "power2.in", stagger: 0.02 }, at); }
        // --- rules/svg-path-draw: measured dash, offset to 0 ---
        function drawPath(sel, at, dur, ease) {
          qa(sel).forEach((p) => {
            const len = p.getTotalLength();
            gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
            tl.to(p, { strokeDashoffset: 0, duration: dur || 0.6, ease: ease || "power2.out" }, at);
          });
        }
        function undrawPath(sel, at, dur) {
          qa(sel).forEach((p) => { const len = p.getTotalLength(); tl.to(p, { strokeDashoffset: len, duration: dur || 0.8, ease: "power1.in" }, at); });
        }
        // --- rules/css-marker-patterns (circle mode) as a hand-drawn SVG ellipse that draws on ---
        // The svg sits INSIDE the marked span (inset negative), viewBox 200x100 stretched to the
        // span's box — the anisotropic stretch gives the ink its hand-swiped weight, as the
        // registry's marker-highlight does. No DOM measurement: the span sizes the ring.
        function ring(sel, at, color) {
          qa(sel).forEach((el) => {
            const d = "M 184 36 C 196 62, 150 96, 92 95 C 24 94, -4 70, 8 42 C 20 12, 90 2, 140 8 C 176 12, 198 28, 190 52";
            el.innerHTML = '<path d="' + d + '" stroke="' + color + '" />';
          });
          drawPath(sel + " path", at, 0.55, "power2.inOut");
        }
        // --- registry: headline-slam's signature — scale 1.6 → 1 on expo.out, then a three-frame landing shake ---
        function stamp(sel, at) {
          tl.fromTo(sel, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.42, ease: "expo.out" }, at);
          const F = 1 / 30;
          tl.to(sel, { x: 8, y: -4, duration: F, ease: "power2.out" }, at + 0.3);
          tl.to(sel, { x: -5, y: 3, duration: F, ease: "power2.out" }, at + 0.3 + F);
          tl.to(sel, { x: 0, y: 0, duration: F, ease: "power2.out" }, at + 0.3 + 2 * F);
        }
        // --- registry: yt-camera-move — punch-in / slide on an inner wrapper, never on the timed clip ---
        function cam(target, at, o) {
          o = o || {};
          gsap.set(target, { transformPerspective: 1200, transformOrigin: o.origin || "50% 50%" });
          tl.to(target, { scale: 1 + (o.zoom === undefined ? 0.11 : o.zoom), x: o.slideX || 0, y: o.slideY || 0,
            rotationX: o.tilt || 0, rotationY: o.pan || 0, duration: o.dur === undefined ? 1.2 : o.dur, ease: o.ease || "power2.inOut" }, at);
        }
        function camReset(target, at, dur) {
          tl.to(target, { scale: 1, x: 0, y: 0, rotationX: 0, rotationY: 0, duration: dur === undefined ? 1.2 : dur, ease: "power2.inOut" }, at);
        }
        // --- registry: yt-feather-highlight — dim the frame except a feathered ellipse; the hole is CSS vars ---
        function hlIn(target, at, o) {
          o = o || {};
          gsap.set(target, { "--yt-hl-x": o.x || "50%", "--yt-hl-y": o.y || "50%", "--yt-hl-rx": o.rx || "22%", "--yt-hl-ry": o.ry || "26%" });
          tl.to(target, { opacity: 1, duration: 0.5, ease: "power2.out" }, at);
        }
        function hlTo(target, at, o, dur) {
          const v = { duration: dur === undefined ? 0.8 : dur, ease: "power2.inOut" };
          if (o.x !== undefined) v["--yt-hl-x"] = o.x; if (o.y !== undefined) v["--yt-hl-y"] = o.y;
          if (o.rx !== undefined) v["--yt-hl-rx"] = o.rx; if (o.ry !== undefined) v["--yt-hl-ry"] = o.ry;
          tl.to(target, v, at);
        }
        function hlOut(target, at) { tl.to(target, { opacity: 0, duration: 0.4, ease: "power2.in" }, at); }
        // --- the footage frame arrives with a little depth: 3D tilt → flat, settles ---
        function frameIn(sel, at) {
          tl.fromTo(sel, { opacity: 0, y: 44, rotationY: -7, transformPerspective: 1400 },
            { opacity: 1, y: 0, rotationY: 0, duration: 0.9, ease: "power3.out" }, at);
          tl.fromTo(sel + " .edge", { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "power2.out" }, at + 0.35);
        }
        // --- rules/sine-wave-loop: finite yoyo breathe ---
        function breathe(sel, at, dur, amount, total) {
          const cycles = Math.max(1, Math.floor((total - at) / (dur * 2)));
          tl.to(sel, { y: amount, duration: dur, ease: "sine.inOut", yoyo: true, repeat: cycles * 2 - 1 }, at);
        }
        // --- a chip arriving: lands from below, holds, leaves up ---
        function chip(sel, at, hold) {
          tl.fromTo(sel, { opacity: 0, y: 26, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.6)" }, at);
          if (hold) tl.to(sel, { opacity: 0, y: -14, duration: 0.3, ease: "power2.in" }, at + hold);
        }
        // --- Keyston reacts: a hop and a tilt on the act's own beat ---
        function react(at, tilt) {
          tl.to("#" + ID + "-keyston .mascot-body", { y: -16, duration: 0.18, ease: "power2.out" }, at);
          tl.to("#" + ID + "-keyston .mascot-body", { y: 0, duration: 0.42, ease: "bounce.out" }, at + 0.18);
          tl.to("#" + ID + "-mascot", { rotation: tilt || 0, duration: 0.3, ease: "power2.out" }, at);
          tl.to("#" + ID + "-mascot", { rotation: 0, duration: 0.6, ease: "power2.inOut" }, at + 1.6);
        }
`;
}

/** The chrome every act shares: label, stage tag, quote card, glows, ghost, Keyston. */
export function chromeMotion({ id, D, card, cardAt, keystonAt, reactAt, reactTilt, ghostDrift }) {
  const L = [];
  L.push(`tl.fromTo("#${id}-label", { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 0.25);`);
  L.push(`tl.fromTo("#${id}-label i", { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.out" }, 0.45);`);
  L.push(`tl.to("#${id}-label", { opacity: 0, x: -10, duration: 0.4, ease: "power2.in" }, ${Math.min(4.6, D - 1).toFixed(2)});`);
  L.push(`tl.fromTo("#${id}-tag", { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 0.4);`);
  L.push(`tl.fromTo("#${id}-glow-a", { scale: 0.9 }, { scale: 1.15, duration: ${(D / 2).toFixed(2)}, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);`);
  L.push(`tl.fromTo("#${id}-glow-b", { scale: 1.1 }, { scale: 0.88, duration: ${(D / 2).toFixed(2)}, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);`);
  L.push(`tl.fromTo("#${id}-ghost", { x: ${ghostDrift ? -60 : 0}, y: 0 }, { x: ${ghostDrift ? 60 : 0}, y: 30, duration: ${D.toFixed(2)}, ease: "none" }, 0);`);
  if (card) {
    L.push(`tl.fromTo("#${id}-card", { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${cardAt});`);
    L.push(`tl.fromTo("#${id}-card .bar", { scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: "power3.out" }, ${cardAt + 0.15});`);
    L.push(`tl.to("#${id}-card", { opacity: 0, y: -16, duration: 0.45, ease: "power2.in" }, ${(cardAt + 3.6).toFixed(2)});`);
  }
  L.push(`tl.fromTo("#${id}-keyston", { opacity: 0, y: 26, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, ${keystonAt});`);
  L.push(`breathe("#${id}-keyston .mascot-body", ${keystonAt + 0.7}, 1.6, -5, ${D.toFixed(2)});`);
  if (reactAt !== undefined) L.push(`react(${reactAt}, ${reactTilt || 0});`);
  return L.join('\n        ');
}

// ---------------------------------------------------------------------------
// Camera arithmetic, at build time. Footage is 1920×1080, object-fit: cover,
// top-centre, inside a frame of W×H; the camera is `scale(S) translate(dx,dy)`
// on the .cam wrapper (transform-origin centre). Authored constants, never
// measured at tween time (hyperframes-animation: pre-calculated layout).
// ---------------------------------------------------------------------------
export const FRAME = { W: 1680, H: 818 };

/** Frame pixel of a source fraction (sx, sy) before any camera move. */
function framePx(sx, sy, frame) {
  const k = Math.max(frame.W / 1920, frame.H / 1080);
  return { fx: (frame.W - 1920 * k) / 2 + sx * 1920 * k, fy: sy * 1080 * k };
}

/** The slide that centres source point (sx, sy) at zoom S. */
export function focus(sx, sy, S, frame = FRAME) {
  const { fx, fy } = framePx(sx, sy, frame);
  return { zoom: S - 1, slideX: Math.round(-(fx - frame.W / 2) * S), slideY: Math.round(-(fy - frame.H / 2) * S) };
}

/** Where source point (sx, sy) lands, as frame percentages, under zoom S and slide (dx, dy). */
export function view(sx, sy, S, dx, dy, frame = FRAME) {
  const { fx, fy } = framePx(sx, sy, frame);
  const px = frame.W / 2 + (fx - frame.W / 2) * S + dx;
  const py = frame.H / 2 + (fy - frame.H / 2) * S + dy;
  return { x: `${Math.round((px / frame.W) * 100)}%`, y: `${Math.round((py / frame.H) * 100)}%` };
}
