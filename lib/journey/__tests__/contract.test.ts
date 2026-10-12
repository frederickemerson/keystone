import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { isKnownRole, pillEditAuthority } from '@/lib/governance/access';
import { peerConfirmAuthority } from '@/lib/capture';
import { DEMO_PATH, GLOSSARY, ROUTE_PATTERNS, STAGES, routes, suggestHandoff } from '..';

const APP = path.join(process.cwd(), 'app');

/** "/incident/[id]/record" -> app/incident/[id]/record/page.tsx exists. */
function pageExists(pattern: string): boolean {
  return existsSync(path.join(APP, ...pattern.split('/').filter(Boolean), 'page.tsx'));
}

/** Match a concrete href (no query/hash) to a route pattern. */
function patternFor(href: string): string | undefined {
  const p = href.split(/[?#]/)[0].split('/').filter(Boolean);
  return ROUTE_PATTERNS.find((pat) => {
    const q = pat.split('/').filter(Boolean);
    return q.length === p.length && q.every((seg, i) => seg.startsWith('[') || seg === p[i]);
  });
}

const CWL_POLICY = {
  owner: 'chief_engineer',
  steward: 'asset_operations_manager',
  approver: 'head_technical_services',
  access: {
    roles_allowed: ['chief_engineer', 'asset_operations_manager', 'head_technical_services', 'technical_services_lead'],
    roles_read_only: ['technician', 'senior_technician'],
    roles_peer_confirm: ['technician', 'senior_technician'],
  },
};

describe('journey contract', () => {
  it('every route helper produces a known pattern', () => {
    const hrefs = [
      routes.pulse(), routes.capture('00:14:32'), routes.canvas('p', 'TS-07'), routes.registry(), routes.pill('p', 'TS-07'),
      routes.incidents(), routes.incident('INC-1', 10), routes.incidentRecord('INC-1'), routes.approvals(),
      routes.learning('p', 'INC-1'), routes.equipment(), routes.asset('AHU-23-01'), routes.connectors(), routes.signIn(),
    ];
    for (const href of hrefs) expect(patternFor(href), href).toBeDefined();
    expect(routes.pill('p', 'TS-07')).toBe('/registry/p#rule-TS-07');
    expect(routes.capture('00:14:32')).toBe('/capture?at=00%3A14%3A32');
  });

  // Fails until every builder has shipped its pages: the merge gate.
  it('every route pattern has a page', () => {
    const missing = ROUTE_PATTERNS.filter((p) => !pageExists(p));
    expect(missing).toEqual([]);
  });

  it('the demo path covers every stage in order, with known personas and real routes', () => {
    expect(DEMO_PATH.length).toBeGreaterThanOrEqual(6);
    for (const step of DEMO_PATH) {
      expect(isKnownRole(step.role), step.role).toBe(true);
      expect(patternFor(step.href), step.href).toBeDefined();
      expect(step.title, 'sentence case').toMatch(/^[A-Z][a-z0-9 ,'-]*$/);
    }
    const order = STAGES.map((s) => s.id);
    const seen = DEMO_PATH.map((s) => order.indexOf(s.stage));
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
    expect(new Set(DEMO_PATH.map((s) => s.stage))).toEqual(new Set(order));
    // No hard-coded future version in demo copy.
    for (const step of DEMO_PATH) expect(`${step.doThis} ${step.notice}`).not.toMatch(/v?\d+\.\d+\.\d+/);
  });

  it('glossary entries are plain and complete', () => {
    for (const e of Object.values(GLOSSARY)) {
      expect(e.term.length).toBeGreaterThan(1);
      expect(e.meaning.length).toBeGreaterThan(30);
    }
  });

  it('handoff uses the real authority check and never hands to yourself', () => {
    const tech = { name: 'Rajesh Kumar', role: 'technician' };
    const editor = suggestHandoff((a) => pillEditAuthority(a.role, CWL_POLICY).allowed, tech);
    expect(editor).toEqual({ name: 'Tan Wei Ming', role: 'chief_engineer' });
    const proposer = { name: 'Tan Wei Ming' };
    const peer = suggestHandoff((a) => peerConfirmAuthority(a, tech, CWL_POLICY, proposer).allowed, { name: 'Tan Wei Ming', role: 'chief_engineer' });
    expect(peer?.name).not.toBe('Rajesh Kumar');
    expect(peer?.name).not.toBe('Tan Wei Ming');
    expect(suggestHandoff(() => false)).toBeUndefined();
  });
});
