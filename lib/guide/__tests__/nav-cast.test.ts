import { describe, expect, it } from 'vitest';
import { DEMO_PATH, DEMO_INCIDENT_ID, DEMO_PILL_ID, ROUTE_PATTERNS, routes } from '@/lib/journey';
import { NAV_GROUPS, NAV_ITEMS, breadcrumbs, isNavActive } from '../nav';
import { splitCast, storyLine, storyRoles } from '../cast';

describe('navigation', () => {
  it('never pins one pill or one incident', () => {
    for (const item of NAV_ITEMS) {
      expect(item.href).not.toContain(DEMO_PILL_ID);
      expect(item.href).not.toContain(DEMO_INCIDENT_ID);
    }
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['Operate', 'Knowledge', 'Capture', 'Govern', 'Integrate']);
  });

  it('lights exactly one item for every app screen', () => {
    for (const pattern of ROUTE_PATTERNS.filter((p) => p !== '/sign-in')) {
      const path = pattern.replace(/\[[^\]]+\]/g, 'x');
      expect(NAV_ITEMS.filter((i) => isNavActive(i, path)).length, pattern).toBe(1);
    }
  });

  it('builds breadcrumbs with names from the data', () => {
    const names = { pills: { p1: 'Chilled water leak' } };
    expect(breadcrumbs(routes.canvas('p1', 'TS-07'), names)).toEqual([
      { label: 'Pills', href: routes.registry() },
      { label: 'Chilled water leak', href: routes.pill('p1') },
      { label: 'Decision canvas' },
    ]);
    expect(breadcrumbs(routes.incidentRecord('INC-9'), names).map((c) => c.label)).toEqual(['Incidents', 'INC-9', 'Decision record']);
    expect(breadcrumbs(routes.pill('unknown'), names).at(-1)).toEqual({ label: 'unknown' });
    expect(breadcrumbs(routes.pulse(), names)).toEqual([]);
  });
});

describe('demo cast', () => {
  it('derives the cast and each part from the demo path', () => {
    expect(storyRoles()[0]).toBe(DEMO_PATH[0].role);
    expect(storyLine('chief_engineer')).toBe('Hear the expert, confirm the rule and propose it as a new version');
    expect(storyLine('nobody')).toBe('');
  });

  it('puts the cast first in story order and keeps everyone', () => {
    const personas = [{ role: 'zzz_other' }, ...[...storyRoles()].reverse().map((role) => ({ role }))];
    const { cast, others } = splitCast(personas);
    expect(cast.map((p) => p.role)).toEqual(storyRoles());
    expect(others).toEqual([{ role: 'zzz_other' }]);
  });
});
