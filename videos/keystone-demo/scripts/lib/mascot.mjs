// Keyston, the mascot — the product's own component (components/teach/Mascot.tsx),
// redrawn as inline SVG so the film and the app show the same character.
import { PALETTE } from '../film.config.mjs';

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

export function mascot(mood, id) {
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
          <circle class="pupil" cx="${25 + lx}" cy="${23 + py}" r="1.5" fill="${ink}" />
          <circle class="pupil" cx="${35 + rx}" cy="${23 + py}" r="1.5" fill="${ink}" />
          <path d="${MOUTH[mood] ?? MOUTH.idle}" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" />
        </g>
        <rect x="4" y="38" width="52" height="7" rx="1" fill="rgba(139,124,246,0.2)" stroke="rgba(246,245,250,0.28)" stroke-width="1.1" />
      </svg>`;
}
