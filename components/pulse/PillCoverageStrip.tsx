import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import type { AssetRecord } from '@/lib/data';
import type { PillBundle } from '@/lib/pills/load';
import { pillCovers } from '@/lib/governance/coverage';
import { routes } from '@/lib/journey';
import { humanizeKey } from '@/components/incident/labels';
import { assetTypeMeta } from './assetMeta';

/** "chilled-water-leak" → "Chilled water leak". */
export function pillDisplayName(bundle: PillBundle): string {
  return humanizeKey(bundle.pill.manifest.name.replace(/-/g, '_'));
}

// Coverage is the pill's authored scope (lib/governance/coverage), the same
// test the closed-incident outcomes use, so the two tables cannot disagree.
export function PillCoverageStrip({
  pills,
  assets,
}: {
  pills: PillBundle[];
  assets: AssetRecord[];
}) {
  const assetTypes = Array.from(new Set(assets.map((a) => a.type)));

  return (
    // `relative`: containing block for any absolutely positioned descendant, so
    // nothing escapes the horizontal scroll box (see ActiveIncidentsTable).
    <div className="card-paper relative overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[13px] text-ink-muted">
            <th className="px-4 py-3 font-normal">Asset type</th>
            {pills.map((p) => (
              <th key={p.id} className="px-4 py-3 font-normal">
                <Link href={routes.pill(p.id)} className="text-ink hover:underline">
                  {pillDisplayName(p)}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assetTypes.map((type) => {
            const meta = assetTypeMeta(type);
            return (
              <tr key={type} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 text-ink">
                    <meta.icon className="size-4 text-ink-muted" aria-hidden="true" />
                    {meta.label}
                  </span>
                </td>
                {pills.map((p) => (
                  <td key={p.id} className="px-4 py-3">
                    {pillCovers(p.pill, type) ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-recommend/40 bg-recommend-tint px-2.5 py-0.5 text-[11px] font-medium text-recommend">
                        <Check className="size-3" aria-hidden="true" /> Covered
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-na/35 bg-na-tint px-2.5 py-0.5 text-[11px] text-na"
                        title="This pill's scope does not include this asset type. Capture an expert to cover it."
                      >
                        <Minus className="size-3" aria-hidden="true" /> Gap
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
