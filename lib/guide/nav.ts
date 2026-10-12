// The app's navigation, grouped by what people do (operate, know, capture,
// govern, integrate). Section pages only: pill- and incident-scoped screens
// are reached from their hubs, and every href comes from the routes contract.

import { routes, ROUTE_PATTERNS } from '@/lib/journey';
import { routePatternFor } from './stage';

type RoutePattern = (typeof ROUTE_PATTERNS)[number];

export interface NavItem {
  href: string;
  label: string;
  purpose: string;
  /** Route patterns that light this item up (its own screen and the screens under it). */
  covers: readonly RoutePattern[];
}

export interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Operate',
    items: [
      { href: routes.pulse(), label: 'Portfolio pulse', purpose: 'Portfolio posture and your next step', covers: ['/pulse'] },
      {
        href: routes.incidents(),
        label: 'Incidents',
        purpose: 'Every incident, its room and its decision record',
        covers: ['/incidents', '/incident/[id]', '/incident/[id]/record'],
      },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      {
        href: routes.registry(),
        label: 'Pills',
        purpose: 'Versioned expert rules: canvas, learning and versions per pill',
        covers: ['/registry', '/registry/[pillId]', '/canvas/[pillId]', '/learning/[pillId]'],
      },
    ],
  },
  {
    label: 'Capture',
    items: [
      { href: routes.capture(), label: 'Expert call', purpose: 'An onboarding interview turned into rules', covers: ['/capture'] },
      { href: routes.equipment(), label: 'Equipment', purpose: 'Teach a rule from a piece of equipment', covers: ['/c', '/c/[assetId]', '/c/[assetId]/qr'] },
    ],
  },
  {
    label: 'Govern',
    items: [{ href: routes.approvals(), label: 'Approvals', purpose: 'Decisions waiting on a named person', covers: ['/approvals'] }],
  },
  {
    label: 'Integrate',
    items: [{ href: routes.connectors(), label: 'Connectors', purpose: 'Where incident evidence comes from', covers: ['/connectors'] }],
  },
];

export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function isNavActive(item: NavItem, pathname: string): boolean {
  const pattern = routePatternFor(pathname);
  return pattern !== undefined && item.covers.includes(pattern);
}

export interface Crumb {
  label: string;
  /** Absent on the last crumb (the current screen). */
  href?: string;
}

/** Display names for ids in paths, resolved on the server from the data. */
export interface CrumbNames {
  /** Pill id -> display name. Equipment and incident ids are shown as-is (they are the tags people use). */
  pills: Readonly<Record<string, string>>;
}

function param(pathname: string, index: number): string {
  const seg = pathname.split(/[?#]/)[0].split('/').filter(Boolean)[index] ?? '';
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

/** Breadcrumbs for object-scoped screens; empty on section pages. */
export function breadcrumbs(pathname: string, names: CrumbNames): Crumb[] {
  const pattern = routePatternFor(pathname);
  const pills = { label: 'Pills', href: routes.registry() };
  const incidents = { label: 'Incidents', href: routes.incidents() };
  switch (pattern) {
    case '/registry/[pillId]': {
      const id = param(pathname, 1);
      return [pills, { label: names.pills[id] ?? id }];
    }
    case '/canvas/[pillId]':
    case '/learning/[pillId]': {
      const id = param(pathname, 1);
      const screen = pattern === '/canvas/[pillId]' ? 'Decision canvas' : 'Learning';
      return [pills, { label: names.pills[id] ?? id, href: routes.pill(id) }, { label: screen }];
    }
    case '/incident/[id]':
      return [incidents, { label: param(pathname, 1) }];
    case '/incident/[id]/record': {
      const id = param(pathname, 1);
      return [incidents, { label: id, href: routes.incident(id) }, { label: 'Decision record' }];
    }
    case '/c/[assetId]':
      return [{ label: 'Equipment', href: routes.equipment() }, { label: param(pathname, 1) }];
    default:
      return [];
  }
}
