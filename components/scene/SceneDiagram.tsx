// A described situation, drawn.
//
// This component decides nothing. lib/scene/schema says what a situation may
// contain, lib/scene/layout says where each part goes, and everything here is
// a <line> or a <text> at coordinates that were already computed. That is the
// whole safety story for "a model drew this": the model never drew anything,
// it filled in fields, and a rejected field means no picture rather than a
// surprising one.
//
// It mirrors the hand-drawn chilled-water figure (components/teach/ScenarioStage)
// on purpose, down to the canvas size, so an authored situation and a described
// one sit side by side without one of them looking like a draft.

import { sceneLayout, VIEW_H, VIEW_W } from '@/lib/scene/layout';
import type { Scene } from '@/lib/scene/schema';
import { cn } from '@/lib/ui/cn';

export interface SceneDiagramProps {
  scene: Scene;
  /** Unique per instance: two figures on one page must not share element ids. */
  idPrefix: string;
  className?: string;
}

export function SceneDiagram({ scene, idPrefix, className }: SceneDiagramProps) {
  const layout = sceneLayout(scene);
  const titleId = `${idPrefix}-title`;
  const descId = `${idPrefix}-desc`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn('w-full rounded-xl border border-line bg-cream-paper', className)}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
    >
      <title id={titleId}>{scene.title}</title>
      {/* The captions are the described situation in words; the drawing is the
          same thing, so the description reads them out rather than inventing
          an account of a picture. */}
      <desc id={descId}>{scene.captions.join(' ')}</desc>

      {/* Floors. */}
      <g className="text-line-strong" stroke="currentColor" strokeWidth="1.5">
        {layout.slabs.map((slab) => (
          <path key={slab.y} d={`M20 ${slab.y} H380`} />
        ))}
      </g>
      <g className="fill-ink-muted font-mono" fontSize="9">
        {layout.slabs.map((slab) => (
          <text key={slab.y} x="26" y={slab.y - 6}>
            {slab.text}
          </text>
        ))}
      </g>

      {/* The void or space the trouble starts in. */}
      {layout.void && (
        <>
          <rect {...layout.void} className="fill-dew-drop" opacity="0.6" />
          <text x="374" y={layout.void.y + 9} textAnchor="end" className="fill-ink-muted font-mono" fontSize="7">
            {layout.origin.place}
          </text>
        </>
      )}

      {/* What failed. */}
      <g>
        <path
          d={`M60 ${layout.origin.y + 8} H${layout.origin.x}`}
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className="text-sticker-blue"
        />
        <rect
          x={layout.origin.x}
          y={layout.origin.y + 3}
          width="10"
          height="10"
          rx="1.5"
          className="fill-blocked-tint stroke-blocked stroke-[1.4]"
        />
        {/* Right-aligned at the failure, not left-aligned at the margin: the
            floor label starts there, and a long one ("Roof · plant room") ran
            straight through this. */}
        <text
          x={layout.origin.x - 4}
          y={layout.origin.y - 2}
          textAnchor="end"
          className="fill-ink-muted font-mono"
          fontSize="7"
        >
          {layout.origin.label}
        </text>
      </g>

      {/* Where it goes. */}
      {layout.fall && (
        <g className="fill-sticker-blue">
          {[0, 1, 2].map((step) => (
            <ellipse
              key={step}
              cx={layout.fall!.x}
              cy={layout.fall!.from + ((layout.fall!.to - layout.fall!.from) / 3) * step}
              rx="1.8"
              ry="2.6"
              opacity={0.85 - step * 0.2}
            />
          ))}
        </g>
      )}

      {/* What carries it, and how far. */}
      {layout.travel && (
        <>
          <path
            d={`M${layout.travel.x1} ${layout.travel.y} H${layout.travel.x2}`}
            stroke="currentColor"
            strokeWidth="3"
            className="text-ink-muted"
            opacity="0.45"
          />
          <path
            d={`M${layout.travel.x1} ${layout.travel.y} H${layout.travel.x2}`}
            className="fill-none stroke-sticker-blue"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text x={layout.travel.x1 + 8} y={layout.travel.y + 13} className="fill-ink-muted font-mono" fontSize="7">
            {layout.travel.label}
          </text>
        </>
      )}

      {/* What is at risk. */}
      {layout.threat && (
        <g>
          <rect
            x={layout.threat.x}
            y={layout.threat.y}
            width={layout.threat.w}
            height={layout.threat.h}
            rx="2"
            className="fill-blocked-tint stroke-blocked stroke-[1.5]"
          />
          <text
            x={layout.threat.x + layout.threat.w / 2}
            y={layout.threat.y + 26}
            textAnchor="middle"
            className="fill-ink font-mono"
            fontSize={layout.threat.tagSize}
          >
            {layout.threat.tag}
          </text>
          {layout.threat.state && (
            <text
              x={layout.threat.x + layout.threat.w / 2}
              y={layout.threat.y + 40}
              textAnchor="middle"
              className="fill-blocked font-mono"
              fontSize={layout.threat.stateSize}
            >
              {layout.threat.state}
            </text>
          )}
          {/* Outside the box: at 7px a label of more than seven characters is
              wider than the box it would sit in. */}
          <text
            x={layout.threat.x + layout.threat.w / 2}
            y={layout.threat.y + layout.threat.h + 12}
            textAnchor="middle"
            className="fill-ink-muted font-mono"
            fontSize={layout.threat.labelSize}
          >
            {layout.threat.label}
          </text>
        </g>
      )}

      {/* The measure nobody has settled. Drawn without a number, because the
          number is what a teaching session is for. */}
      {layout.measure && (
        <g className="text-marker" stroke="currentColor" strokeWidth="1.2">
          <path d={`M${layout.measure.x1} ${layout.measure.y} H${layout.measure.x2}`} strokeDasharray="3 3" />
          <path d={`M${layout.measure.x1} ${layout.measure.y - 4} V${layout.measure.y + 4}`} />
          <path d={`M${layout.measure.x2} ${layout.measure.y - 4} V${layout.measure.y + 4}`} />
          <text
            x={(layout.measure.x1 + layout.measure.x2) / 2}
            y={layout.measure.y + 15}
            textAnchor="middle"
            className="fill-marker font-mono"
            fontSize="8"
            stroke="none"
          >
            {layout.measure.label}
          </text>
        </g>
      )}
    </svg>
  );
}
