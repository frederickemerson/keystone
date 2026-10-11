// Shared display metadata for asset types — icons + human labels.
// Used by the Portfolio Pulse asset grid and pill-coverage strip.

import { Building2, Server, Warehouse, Home, type LucideIcon } from 'lucide-react';

export const ASSET_TYPE_META: Record<string, { label: string; icon: LucideIcon }> = {
  grade_a_office: { label: 'Grade A office', icon: Building2 },
  data_centre: { label: 'Data centre', icon: Server },
  logistics: { label: 'Logistics', icon: Warehouse },
  residential: { label: 'Residential', icon: Home },
};

export function assetTypeMeta(type: string): { label: string; icon: LucideIcon } {
  return ASSET_TYPE_META[type] ?? { label: type, icon: Building2 };
}
