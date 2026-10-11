import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/ui/cn';
import { CHIP_BASE, TONE_CHIP, type Tone } from '@/components/mosaic';
import type { AssetRecord, IncidentRecord } from '@/lib/data';
import { RoleRedacted } from '@/components/mosaic/RoleRedacted';
import { assetTypeMeta } from './assetMeta';

function attributeChips(asset: AssetRecord): { key: string; label: ReactNode; tone?: Tone }[] {
  const cert = asset.green_certification;
  const chips: { key: string; label: ReactNode; tone?: Tone }[] = [
    { key: 'green-mark', label: `Green Mark ${cert.rating}`, tone: 'recommend' },
  ];
  if (typeof cert.pue === 'number') {
    chips.push({ key: 'pue', label: `PUE ${cert.pue}` });
  }
  if (typeof cert.eui_kwh_per_sqm_per_year === 'number') {
    chips.push({ key: 'eui', label: `EUI ${cert.eui_kwh_per_sqm_per_year} kWh/m²·yr` });
  }
  if (asset.operating_model) {
    chips.push({ key: 'operating-model', label: asset.operating_model });
  }
  if (asset.anchor_tenant) {
    // The anchor tenant's identity is tenant PII (as in the incident room).
    chips.push({
      key: 'anchor',
      label: (
        <>
          Anchor: <RoleRedacted text={asset.anchor_tenant.name} sensitivity="tenant_pii" />
        </>
      ),
    });
  }
  return chips;
}

// Severity is a danger axis, not an escalation: high = blocked ink (brick red),
// medium = requires-approval ochre, low = recommend green.
const SEVERITY_TONE: Record<string, Tone> = {
  high: 'blocked',
  medium: 'approval',
  low: 'recommend',
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
            className="card-paper flex flex-col gap-3 p-6"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-raised text-ink-muted">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-ink">{asset.name}</h3>
                  <p className="text-[13px] text-ink-muted">{meta.label}</p>
                </div>
              </div>
            </div>

            <p className="text-[13px] text-ink-muted">{asset.location}</p>

            <div className="flex flex-wrap gap-1.5">
              {attributeChips(asset).map((chip) => (
                <span
                  key={chip.key}
                  className={cn(
                    CHIP_BASE,
                    chip.tone ? TONE_CHIP[chip.tone] : TONE_CHIP.neutral,
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
                  className={cn(CHIP_BASE, TONE_CHIP[SEVERITY_TONE[open.severity] ?? 'neutral'])}
                >
                  <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                  {open.severity} incident · {open.id}
                </Link>
              ) : (
                <span className={cn(CHIP_BASE, TONE_CHIP.neutral)}>No active incident</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
