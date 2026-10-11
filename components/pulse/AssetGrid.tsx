import Link from 'next/link';
import { cn } from '@/lib/ui/cn';
import type { AssetRecord, IncidentRecord } from '@/lib/data';
import { assetTypeMeta } from './assetMeta';

function attributeChips(asset: AssetRecord): { label: string; tone?: string }[] {
  const cert = asset.green_certification;
  const chips: { label: string; tone?: string }[] = [
    { label: `Green Mark ${cert.rating}`, tone: 'text-recommend' },
  ];
  if (typeof cert.pue === 'number') {
    chips.push({ label: `PUE ${cert.pue}` });
  }
  if (typeof cert.eui_kwh_per_sqm_per_year === 'number') {
    chips.push({ label: `EUI ${cert.eui_kwh_per_sqm_per_year} kWh/m²·yr` });
  }
  if (asset.operating_model) {
    chips.push({ label: asset.operating_model });
  }
  if (asset.anchor_tenant) {
    chips.push({ label: `Anchor: ${asset.anchor_tenant.name}` });
  }
  return chips;
}

const SEVERITY_TONE: Record<string, string> = {
  high: 'border-escalate/40 bg-escalate/15 text-escalate',
  medium: 'border-approval/30 bg-approval/10 text-approval',
  low: 'border-recommend/30 bg-recommend/10 text-recommend',
};

export function AssetGrid({
  assets,
  incidents,
}: {
  assets: AssetRecord[];
  incidents: IncidentRecord[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {assets.map((asset) => {
        const meta = assetTypeMeta(asset.type);
        const Icon = meta.icon;
        const open = incidents.find(
          (i) => i.asset_id === asset.id && i.status !== 'closed',
        );
        return (
          <article
            key={asset.id}
            className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-raised text-ink-muted">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-ink">{asset.name}</h3>
                  <p className="text-[11px] uppercase tracking-wide text-ink-muted">
                    {meta.label}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-ink-muted">{asset.location}</p>

            <div className="flex flex-wrap gap-1.5">
              {attributeChips(asset).map((chip) => (
                <span
                  key={chip.label}
                  className={cn(
                    'rounded border border-line bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-ink',
                    chip.tone,
                  )}
                >
                  {chip.label}
                </span>
              ))}
            </div>

            <div className="mt-auto">
              {open ? (
                <Link
                  href={`/incident/${open.id}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                    SEVERITY_TONE[open.severity] ?? 'border-line bg-surface-raised text-ink',
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                  {open.severity} incident · {open.id}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-raised px-2.5 py-1 text-xs text-ink-muted">
                  No active incident
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
