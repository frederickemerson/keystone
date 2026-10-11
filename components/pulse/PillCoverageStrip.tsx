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
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
            <th className="px-4 py-2.5 font-medium">Asset type</th>
            {coverage.map((c) => (
              <th key={c.id} className="px-4 py-2.5 font-medium">
                <span className="font-mono text-[11px] normal-case text-ink">{c.id}</span>
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
                        <span className="inline-flex items-center gap-1 rounded-full border border-recommend/30 bg-recommend/10 px-2 py-0.5 text-[11px] font-medium text-recommend">
                          <Check className="size-3" aria-hidden="true" /> Covered
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border border-line bg-surface-raised px-2 py-0.5 text-[11px] text-ink-muted',
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
