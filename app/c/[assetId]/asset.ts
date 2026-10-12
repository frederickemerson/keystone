// Server helpers for the QR tap-to-teach pages: resolve a scanned id against
// the asset register (lib/capture resolveAssetRef) and find the pills whose
// scope covers the site's type.

import 'server-only';
import { headers } from 'next/headers';
import { ASSET_REGISTER, resolveAssetRef } from '@/lib/capture';
import { loadAllPills } from '@/lib/pills/load';
import { pillTitle } from '@/components/mosaic/pillTitle';
import { assetTypeLabel } from '@/components/incident/labels';
import type { ProposablePill } from '@/components/capture/DraftFromNoteTile';

export interface AssetView {
  assetId: string;
  site: { id: string; name: string; type: string; address: string };
  equipment: { id: string; type: string; location: string; servesFloors?: string; cmmsCode?: string } | null;
  pills: (ProposablePill & { version: string; pill: ReturnType<typeof loadAllPills>[number]['pill'] })[];
}

export function resolveAssetView(rawId: string): AssetView | null {
  const assetId = decodeURIComponent(rawId);
  const ref = resolveAssetRef(assetId);
  if (!ref) return null;
  const site = ASSET_REGISTER.find((s) => s.id === ref.siteId);
  if (!site) return null;
  const eq = ref.equipmentId ? site.equipment.find((e) => e.id === ref.equipmentId) ?? null : null;
  const pills = loadAllPills()
    .filter((b) => b.pill.manifest.scope.asset_types?.includes(site.type))
    .map((b) => {
      const m = b.pill.manifest;
      return {
        id: b.id,
        name: pillTitle(b),
        version: m.version,
        ruleIds: b.pill.rules.map((r) => r.id),
        policy: { owner: m.owner, steward: m.steward, approver: m.approver, access: m.access },
        pill: b.pill,
      };
    });
  const e = eq as (typeof site.equipment)[number] & { serves_floors?: string; cmms_asset_code?: string } | null;
  return {
    assetId,
    site: { id: site.id, name: site.name, type: site.type, address: site.address },
    equipment: e ? { id: e.id, type: e.type, location: e.location, servesFloors: e.serves_floors, cmmsCode: e.cmms_asset_code } : null,
    pills,
  };
}

/** This deployment's origin, for the URL a printed QR code carries. */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** Site types via the shared label table; equipment types ("Air_Handling_Unit") as sentence case. */
export function humanType(type: string): string {
  return assetTypeLabel(type.toLowerCase());
}
