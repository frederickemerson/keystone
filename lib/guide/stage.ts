// Which loop stage (Capture · Compile · Apply · Learn · Reuse) a screen belongs
// to. Keyed by the contract's ROUTE_PATTERNS, so every route is classified
// once and a test fails when a new route is added without a stage decision.

import { DEMO_PATH, ROUTE_PATTERNS, STAGES, type DemoStep, type StageId } from '@/lib/journey';

type RoutePattern = (typeof ROUTE_PATTERNS)[number];

/** `null` = outside the loop (overview and sign-in screens). */
export const STAGE_BY_ROUTE: Readonly<Record<RoutePattern, StageId | null>> = {
  '/pulse': null,
  '/capture': 'capture',
  '/c': 'capture',
  '/c/[assetId]': 'capture',
  '/c/[assetId]/qr': 'capture',
  '/canvas/[pillId]': 'compile',
  '/incidents': 'apply',
  '/incident/[id]': 'apply',
  '/incident/[id]/record': 'apply',
  '/connectors': 'apply',
  '/approvals': 'learn',
  '/learning/[pillId]': 'learn',
  '/registry': 'reuse',
  '/registry/[pillId]': 'reuse',
  '/sign-in': null,
};

function segments(path: string): string[] {
  return path.split(/[?#]/)[0].split('/').filter(Boolean);
}

/** The route pattern a concrete path (query and hash ignored) belongs to. */
export function routePatternFor(path: string): RoutePattern | undefined {
  const p = segments(path);
  return ROUTE_PATTERNS.find((pattern) => {
    const q = segments(pattern);
    return q.length === p.length && q.every((seg, i) => seg.startsWith('[') || seg === p[i]);
  });
}

/** Stage of a screen from its path alone. */
export function stageForPath(path: string): StageId | null {
  const pattern = routePatternFor(path);
  return pattern ? STAGE_BY_ROUTE[pattern] : null;
}

/** True when `pathname` is the screen a step's href opens (query and hash ignored). */
export function isOnStep(step: DemoStep, pathname: string): boolean {
  return segments(step.href).join('/') === segments(pathname).join('/');
}

/**
 * The stage to highlight. While the guided demo is on a step and the user is
 * on that step's screen, the step's stage wins (the incident room is "Learn"
 * during teach-back); otherwise the route decides.
 */
export function currentStage(pathname: string, activeStep?: DemoStep): StageId | null {
  if (activeStep && isOnStep(activeStep, pathname)) return activeStep.stage;
  return stageForPath(pathname);
}

/** Where a stage link goes: the first demo step of that stage (the story's screen for it). */
export function stageHref(stage: StageId): string {
  const step = DEMO_PATH.find((s) => s.stage === stage);
  if (!step) throw new Error(`No demo step for stage "${stage}"`);
  return step.href;
}

export function stageLabel(stage: StageId): string {
  return STAGES.find((s) => s.id === stage)?.label ?? stage;
}
