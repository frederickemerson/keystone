import { describe, expect, it } from 'vitest';
import { DEMO_PATH, ROUTE_PATTERNS, STAGES, routes } from '@/lib/journey';
import { STAGE_BY_ROUTE, currentStage, routePatternFor, stageForPath, stageHref } from '../stage';

describe('stage from route', () => {
  it('classifies every route pattern in the contract', () => {
    expect(Object.keys(STAGE_BY_ROUTE).sort()).toEqual([...ROUTE_PATTERNS].sort());
  });

  it('maps screens to their loop stage, ignoring query and hash', () => {
    expect(stageForPath(routes.capture('00:14:32'))).toBe('capture');
    expect(stageForPath(routes.canvas('p', 'TS-07'))).toBe('compile');
    expect(stageForPath(routes.incident('INC-1', 10))).toBe('apply');
    expect(stageForPath(routes.incidentRecord('INC-1'))).toBe('apply');
    expect(stageForPath(routes.learning('p', 'INC-1'))).toBe('learn');
    expect(stageForPath(routes.approvals())).toBe('learn');
    expect(stageForPath(routes.pill('p', 'TS-07'))).toBe('reuse');
    expect(stageForPath(routes.asset('AHU-23-01'))).toBe('capture');
    expect(stageForPath(routes.pulse())).toBeNull();
    expect(stageForPath('/no/such/screen')).toBeNull();
  });

  it('distinguishes an incident from its record', () => {
    expect(routePatternFor('/incident/INC-1')).toBe('/incident/[id]');
    expect(routePatternFor('/incident/INC-1/record')).toBe('/incident/[id]/record');
  });

  it('lets the active guide step decide the stage on its own screen only', () => {
    const teachBack = DEMO_PATH.find((s) => s.id === 'teach-back');
    expect(teachBack?.stage).toBe('learn');
    if (!teachBack) return;
    expect(currentStage(teachBack.href.split('?')[0], teachBack)).toBe('learn');
    expect(currentStage(routes.incident('INC-1'), undefined)).toBe('apply');
    expect(currentStage(routes.capture(), teachBack)).toBe('capture');
  });

  it('links every stage to a screen in the story', () => {
    for (const s of STAGES) expect(routePatternFor(stageHref(s.id)), s.id).toBeDefined();
  });
});
