'use client';

// Keyston — the interviewer, given a face.
//
// On the mascot: the brief was a reel whose workflow is only handed out by DM
// ("Comment MASCOT and I'll send you the whole workflow"), so none of its
// steps were available to follow. This is designed from the product name
// instead, which turned out to be the better source: a keystone is the wedge
// at the apex of an arch, the one stone that stops the rest falling down, and
// doing nothing until it is in place is exactly what the gate does. So the
// mascot is a keystone block sitting in the gap at the top of an arch.
//
// Drawn as SVG rather than generated, for four reasons that all matter here:
// it is crisp at any size for the video, it animates by state instead of
// playing a clip, it costs nothing per render, and it works with the venue
// wifi down. TokenHub's hy-image-v3.5 could render an illustrated version
// later — see docs/DECISIONS.md — but nothing should depend on that.
//
// Every animation is wrapped in motion-reduce:animate-none, and the whole
// thing is aria-hidden: it carries mood, never information. Anything the
// mascot "says" is also written on screen as text.

import { cn } from '@/lib/ui/cn';

/**
 * What the mascot is doing. Mapped from the exercise's own state, never set by
 * hand, so it cannot say "listening" while nothing is being recorded.
 */
export type MascotMood =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'found'
  | 'puzzled'
  | 'blocked'
  | 'pleased';

const EYE: Record<MascotMood, { left: string; right: string; lid: number }> = {
  idle: { left: 'M0 0', right: 'M0 0', lid: 0 },
  listening: { left: 'M0 0', right: 'M0 0', lid: 0 },
  thinking: { left: 'M0 0', right: 'M0 0', lid: 0.45 },
  found: { left: 'M0 0', right: 'M0 0', lid: 0 },
  puzzled: { left: 'M0 0', right: 'M0 0', lid: 0.2 },
  blocked: { left: 'M0 0', right: 'M0 0', lid: 0.1 },
  pleased: { left: 'M0 0', right: 'M0 0', lid: 0.6 },
};

/** Where the pupils sit. Puzzled looks two ways at once — it has heard two answers. */
const PUPILS: Record<MascotMood, { lx: number; rx: number; y: number }> = {
  idle: { lx: 0, rx: 0, y: 0 },
  listening: { lx: 0.6, rx: 0.6, y: -0.4 },
  thinking: { lx: -1.1, rx: -1.1, y: -1 },
  found: { lx: 0, rx: 0, y: -0.8 },
  puzzled: { lx: -1.4, rx: 1.4, y: 0 },
  blocked: { lx: 0, rx: 0, y: 0.5 },
  pleased: { lx: 0, rx: 0, y: 0 },
};

const MOUTH: Record<MascotMood, string> = {
  // A short straight line: neutral, not smiling at you.
  idle: 'M26 40 h8',
  listening: 'M26 40 h8',
  thinking: 'M27 40 h5',
  // Open, because it has something to say.
  found: 'M26 38 q4 5 8 0 q-4 2 -8 0',
  puzzled: 'M26 41 q4 -4 8 1',
  blocked: 'M25 41 h10',
  pleased: 'M25 38 q5 5 10 0',
};

export interface MascotProps {
  mood: MascotMood;
  /** 1 is the inline size used beside a question; 2 is the stage size. */
  scale?: 1 | 2;
  className?: string;
}

export function Mascot({ mood, scale = 1, className }: MascotProps) {
  const lid = EYE[mood].lid;
  const pupil = PUPILS[mood];
  const size = scale === 2 ? 96 : 56;

  return (
    <span
      className={cn('relative inline-block shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes keyston-breathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes keyston-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          96% { transform: scaleY(0.1); }
        }
        @keyframes keyston-tilt {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-5deg); }
        }
        @keyframes keyston-settle {
          0% { transform: translateY(-7px); }
          60% { transform: translateY(1px); }
          100% { transform: translateY(0); }
        }
        @keyframes keyston-pulse {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.12); }
        }
        .keyston-body { animation: keyston-breathe 4s ease-in-out infinite; transform-origin: 30px 36px; }
        .keyston-body--settle { animation: keyston-settle 0.55s cubic-bezier(0.2, 1.4, 0.4, 1) both; }
        .keyston-body--tilt { animation: keyston-tilt 2.4s ease-in-out infinite; transform-origin: 30px 48px; }
        .keyston-eyes { animation: keyston-blink 6s ease-in-out infinite; transform-origin: 30px 30px; }
        .keyston-halo { animation: keyston-pulse 1.6s ease-in-out infinite; transform-origin: 30px 34px; }
        @media (prefers-reduced-motion: reduce) {
          .keyston-body, .keyston-body--settle, .keyston-body--tilt, .keyston-eyes, .keyston-halo {
            animation: none;
          }
        }
      `}</style>
      <svg viewBox="0 0 60 60" width={size} height={size} role="presentation">
        {/* The arch he completes. Drawn faint: the point is the gap he sits in. */}
        <path
          d="M8 56 V34 a22 22 0 0 1 44 0 V56"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          className="text-line-strong"
          opacity="0.38"
        />
        {/* Voussoir joints, so it reads as masonry rather than a doorway. */}
        <g stroke="currentColor" strokeWidth="1" className="text-line-strong" opacity="0.26">
          <path d="M11 38 l6 2" />
          <path d="M49 38 l-6 2" />
          <path d="M8 50 h7" />
          <path d="M52 50 h-7" />
        </g>

        {(mood === 'listening' || mood === 'found') && (
          <circle cx="30" cy="34" r="20" className="keyston-halo fill-marker" opacity="0.25" />
        )}

        <g
          className={cn(
            'keyston-body',
            mood === 'found' && 'keyston-body--settle',
            mood === 'puzzled' && 'keyston-body--tilt',
          )}
        >
          {/* The keystone itself: a wedge, wider at the top, as a real one is. */}
          <path
            d="M17 20 h26 l-4 28 h-18 Z"
            className={cn(
              'stroke-[1.5]',
              mood === 'blocked' ? 'fill-blocked-tint stroke-blocked' : 'fill-cream-paper stroke-charcoal',
            )}
            strokeLinejoin="round"
          />
          {/* A chamfer line, to give the face a brow. */}
          <path d="M19.5 25 h21" stroke="currentColor" strokeWidth="1" className="text-charcoal" opacity="0.25" />

          <g className={mood === 'thinking' || mood === 'blocked' ? undefined : 'keyston-eyes'}>
            <ellipse cx="25" cy="33" rx="3.1" ry={3.1 * (1 - lid)} className="fill-surface stroke-charcoal" strokeWidth="1" />
            <ellipse cx="35" cy="33" rx="3.1" ry={3.1 * (1 - lid)} className="fill-surface stroke-charcoal" strokeWidth="1" />
            <circle cx={25 + pupil.lx} cy={33 + pupil.y} r="1.5" className="fill-charcoal" />
            <circle cx={35 + pupil.rx} cy={33 + pupil.y} r="1.5" className="fill-charcoal" />
          </g>

          <path
            d={MOUTH[mood]}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className={mood === 'blocked' ? 'text-blocked' : 'text-charcoal'}
          />
        </g>

        {/* Thinking: three dots climbing out of the top, in marker orange. */}
        {mood === 'thinking' && (
          <g className="fill-marker">
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={44 + i * 4} cy={18 - i * 3} r={1.6 - i * 0.25} opacity={0.8 - i * 0.2} />
            ))}
          </g>
        )}

        {/* Blocked: a padlock, not a spinner. The gate is a decision, not a delay. */}
        {mood === 'blocked' && (
          <g className="stroke-blocked" strokeWidth="1.6" fill="none">
            <rect x="40" y="18" width="11" height="8" rx="1.5" className="fill-blocked-tint" />
            <path d="M43 18 v-2.5 a2.5 2.5 0 0 1 5 0 V18" />
          </g>
        )}
      </svg>
    </span>
  );
}

/** The mood that matches what the exercise is doing, so the two cannot disagree. */
export function moodFor(state: {
  recording: boolean;
  working: boolean;
  contradiction: boolean;
  justCaptured: boolean;
  finished: boolean;
}): MascotMood {
  if (state.contradiction) return 'puzzled';
  if (state.working) return 'thinking';
  if (state.recording) return 'listening';
  if (state.justCaptured) return 'found';
  if (state.finished) return 'pleased';
  return 'idle';
}
