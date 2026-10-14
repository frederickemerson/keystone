'use client';

// The situation, drawn and animated, instead of described.
//
// This is what replaces the phone-call waveform. The old capture screen showed
// a pulsing bar and a timer while a synthetic voice read a transcript: nothing
// to look at, and nothing that told you what the job actually was. Judgement
// only shows up against a situation, so the situation goes on screen first.
//
// Animated in SVG rather than as a generated clip. TokenHub does list
// kling-video-v3 and minimax-video-h3-max, but its gateway answers
// "interface not exist" for /videos/generations and 402 for everything outside
// the dedicated endpoint, so no clip could be made. It is the better choice
// anyway: five stages that a narration can sit against, crisp at any
// resolution for the video, and no asset to ship.
//
// The whole figure is described once in a <desc> for screen readers and the
// stage captions are real text beside it, so nothing here is the only copy of
// anything.

import { cn } from '@/lib/ui/cn';
import { SCENARIO_STAGES, stageIndex, type ScenarioStageId } from '@/lib/teach/scenario';


export { SCENARIO_STAGES, stageIndex } from '@/lib/teach/scenario';
export type { ScenarioStageId } from '@/lib/teach/scenario';

export interface ScenarioStageProps {
  stage: ScenarioStageId;
  className?: string;
}

export function ScenarioStage({ stage, className }: ScenarioStageProps) {
  const at = stageIndex(stage);
  const leaking = at >= 1;
  const spreading = at >= 2;
  const tracking = at >= 3;
  const hazard = at >= 4;

  return (
    <figure className={cn('m-0', className)}>
      <style>{`
        @keyframes scn-drip {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(26px); opacity: 0; }
        }
        @keyframes scn-creep { to { stroke-dashoffset: 0; } }
        @keyframes scn-throb {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.9; }
        }
        @keyframes scn-ping {
          0% { r: 2; opacity: 0.9; }
          100% { r: 13; opacity: 0; }
        }
        .scn-drop { animation: scn-drip 1.5s linear infinite; }
        .scn-track {
          stroke-dasharray: 150;
          stroke-dashoffset: 150;
          animation: scn-creep 2.6s ease-out forwards;
        }
        .scn-throb { animation: scn-throb 1.1s ease-in-out infinite; }
        .scn-ping { animation: scn-ping 2s ease-out infinite; }
        .scn-stain { transition: opacity 900ms ease-out, transform 900ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .scn-drop, .scn-track, .scn-throb, .scn-ping { animation: none; }
          .scn-track { stroke-dashoffset: 0; }
          .scn-stain { transition: none; }
        }
      `}</style>

      <svg
        viewBox="0 0 400 220"
        className="w-full rounded-xl border border-line bg-cream-paper"
        role="img"
        aria-labelledby="scn-title scn-desc"
      >
        <title id="scn-title">Section through two floors of Harbourfront One</title>
        <desc id="scn-desc">
          A chilled-water pipe coupling in the Level 28 ceiling void has failed. Water passes through the
          void onto Level 27 and tracks along a conduit toward an electrical riser cupboard containing
          distribution board DB-27B.
        </desc>

        {/* Slab lines and floor labels. */}
        <g className="text-line-strong" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 46 H380" />
          <path d="M20 112 H380" />
          <path d="M20 178 H380" />
        </g>
        <g className="fill-ink-muted font-mono" fontSize="9">
          <text x="26" y="40">L28</text>
          <text x="26" y="106">L27 · bank tenant</text>
          <text x="26" y="172">L26</text>
        </g>

        {/* The ceiling void of L28, hatched. */}
        <rect x="20" y="46" width="360" height="12" className="fill-dew-drop" opacity="0.6" />
        <text x="330" y="56" className="fill-ink-muted font-mono" fontSize="7">
          ceiling void
        </text>

        {/* Chilled-water pipe with the coupling that fails. */}
        <g>
          <path d="M60 52 H200" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-sticker-blue" />
          <rect
            x="196"
            y="47"
            width="10"
            height="10"
            rx="1.5"
            className={cn('stroke-[1.4]', leaking ? 'fill-blocked-tint stroke-blocked' : 'fill-surface stroke-charcoal')}
          />
          <text x="150" y="44" className="fill-ink-muted font-mono" fontSize="7">
            chilled water
          </text>
        </g>

        {/* Leak detector, and its alarm ping. */}
        <g>
          <circle cx="232" cy="52" r="3" className={leaking ? 'fill-marker' : 'fill-na'} />
          {leaking && <circle cx="232" cy="52" className="scn-ping fill-none stroke-marker" strokeWidth="1.2" />}
          <text x="240" y="55" className="fill-ink-muted font-mono" fontSize="7">
            leak detector
          </text>
        </g>

        {/* Water leaving the coupling. */}
        {leaking && (
          <g className="fill-sticker-blue">
            {[0, 0.5, 1].map((delay) => (
              <ellipse
                key={delay}
                cx="201"
                cy="60"
                rx="1.8"
                ry="2.6"
                className="scn-drop"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </g>
        )}

        {/* The stain spreading across the L27 ceiling. */}
        <path
          d="M170 112 q14 -9 32 0 q16 9 34 0 q-18 12 -34 11 q-18 -1 -32 -11 Z"
          className={cn('scn-stain fill-sticker-blue')}
          opacity={spreading ? 0.45 : 0}
          style={{ transform: spreading ? 'scaleX(1)' : 'scaleX(0.4)', transformOrigin: '201px 118px' }}
        />
        {spreading && (
          <g className="fill-sticker-blue">
            {[0.2, 0.9].map((delay) => (
              <ellipse
                key={delay}
                cx="201"
                cy="124"
                rx="1.6"
                ry="2.4"
                className="scn-drop"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </g>
        )}

        {/* The conduit, and the water tracking along it. */}
        <path d="M201 122 H300" stroke="currentColor" strokeWidth="3" className="text-ink-muted" opacity="0.45" />
        <text x="226" y="135" className="fill-ink-muted font-mono" fontSize="7">
          conduit
        </text>
        {tracking && (
          <path
            d="M201 122 H300"
            className="scn-track fill-none stroke-sticker-blue"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {/* The riser cupboard and DB-27B. */}
        <g>
          <rect
            x="300"
            y="88"
            width="54"
            height="56"
            rx="2"
            className={cn('stroke-[1.5]', hazard ? 'fill-blocked-tint stroke-blocked' : 'fill-surface stroke-charcoal')}
          />
          {hazard && (
            <rect x="300" y="88" width="54" height="56" rx="2" className="scn-throb fill-blocked" opacity="0.35" />
          )}
          <text x="327" y="112" textAnchor="middle" className="fill-ink font-mono" fontSize="8">
            DB-27B
          </text>
          <text x="327" y="124" textAnchor="middle" className="fill-ink-muted font-mono" fontSize="7">
            riser cupboard
          </text>
          {hazard && (
            <text x="327" y="137" textAnchor="middle" className="fill-blocked font-mono" fontSize="7">
              live
            </text>
          )}
        </g>

        {/* The measure that becomes the rule. It appears last, unlabelled by a number:
            how close is too close is the question the exercise asks, not something
            the drawing should answer first. */}
        {hazard && (
          <g className="text-marker" stroke="currentColor" strokeWidth="1.2">
            <path d="M236 150 H298" strokeDasharray="3 3" />
            <path d="M236 146 V154" />
            <path d="M298 146 V154" />
            <text x="267" y="165" textAnchor="middle" className="fill-marker font-mono" fontSize="8" stroke="none">
              how close is too close?
            </text>
          </g>
        )}
      </svg>

      <figcaption className="mt-2 min-h-10 text-[14px] leading-snug text-ink">
        {SCENARIO_STAGES[at]?.caption}
      </figcaption>
    </figure>
  );
}
