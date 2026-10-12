// Keystone governance — which pills cover an asset type. Pure + client-safe.
//
// Coverage is the pill's authored SKILL.md `scope.asset_types`. The Pulse
// coverage table and the closed-incident outcomes both read it through here,
// so an incident on an asset type no pill covers can never show a pill's
// eval verdict next to a "Gap" for the same type.

import type { Pill } from "@/lib/engine";

export interface CoveragePill {
  id: string;
  pill: Pill;
}

export function pillCovers(pill: Pill, assetType: string): boolean {
  return (pill.manifest.scope.asset_types ?? []).includes(assetType);
}

export function pillsCovering<T extends CoveragePill>(pills: readonly T[], assetType: string): T[] {
  return pills.filter((p) => pillCovers(p.pill, assetType));
}

/** The pill an incident's outcome belongs to: the one it records, if that pill covers its asset type. */
export function outcomePill<T extends CoveragePill & { domain: string; name: string }>(
  pills: readonly T[],
  pillApplied: string,
  assetType: string | undefined,
): T | undefined {
  if (!assetType) return undefined;
  return pillsCovering(pills, assetType).find((p) => `${p.domain}/${p.name}` === pillApplied);
}
