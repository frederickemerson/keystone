import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { AssetRecord } from '@/lib/data';
import type { PillBundle } from '@/lib/pills/load';
import { assetTypeMeta } from './assetMeta';

export function PillCoverageStrip({
  pills,
  assets,
}: {
  pills: PillBundle[];
  assets: AssetRecord[];
}) {
  const assetTypes = Array.from(new Set(assets.map((a) => a.type)));
  const coverage = pills.map((p) => ({
    id: p.id,
    name: p.pill.manifest.name,
    // Coverage is the authored SKILL.md `scope.asset_types` list.
    types: p.pill.manifest.scope.asset_types ?? [],
  }));

  return (
    // `relative`: containing block for any absolutely positioned descendant, so
    // nothing escapes the horizontal scroll box (see ActiveIncidentsTable).
    <div className="card-paper relative overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[13px] text-ink-muted">
            <th className="px-4 py-3 font-normal">Asset type</th>
            {coverage.map((c) => (
              <th key={c.id} className="px-4 py-3 font-normal">
                <span className="font-mono text-[11px] text-ink">{c.id}</span>
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
                {coverage.map((c) => {
                  const covered = c.types.includes(type);
                  return (
                    <td key={c.id} className="px-4 py-3">
                      {covered ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-recommend/40 bg-recommend-tint px-2.5 py-0.5 text-[11px] font-medium text-recommend">
                          <Check className="size-3" aria-hidden="true" /> Covered
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border border-na/35 bg-na-tint px-2.5 py-0.5 text-[11px] text-na',
                          )}
                        >
                          <Minus className="size-3" aria-hidden="true" /> Gap
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
