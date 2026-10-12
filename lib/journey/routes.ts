// The one place that builds in-app links. Every screen links through these
// helpers, so a route change is one edit and a test can prove every target
// exists (lib/journey/__tests__/contract.test.ts).

export const DEMO_INCIDENT_ID = 'INC-2026-1011';
export const DEMO_PILL_ID = 'technical-services-chilled-water-leak';
/** The incident step where TS-07 blocks re-energising (the demo's turning point). */
export const DEMO_GATE_STEP = 10;
/** Where the expert states TS-07 in the onboarding call. */
export const DEMO_EXPERT_TIMESTAMP = '00:14:32';

function withQuery(path: string, query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params.set(k, String(v));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

const enc = encodeURIComponent;

/** DOM id of a rule's anchor on any page that lists rules (registry hub, canvas). */
export function ruleAnchorId(ruleId: string): string {
  return `rule-${ruleId}`;
}

/**
 * DOM ids the guided demo deep-links to (`href#id`). The screens that own
 * these elements render exactly these ids; the shell's hash scroll brings
 * them into view below the sticky header.
 */
export const GUIDE_ANCHORS = {
  /** Incident room: the blocked gate banner (TS-07 at the demo's gate step). */
  blockedGate: 'blocked-gate',
  /** Incident room: the open "Tell us why" capture task card. */
  captureTask: 'capture-task',
  /** Decision canvas: "Drafts from frontline notes". */
  noteDrafts: 'note-drafts',
} as const;

/** `href` with its fragment set to `anchorId` (any existing fragment replaced). */
export function withAnchor(href: string, anchorId: string): string {
  return `${href.split('#')[0]}#${anchorId}`;
}

export const routes = {
  pulse: (): string => '/pulse',
  /** Expert onboarding call; `at` = "HH:MM:SS" seeks the call to that moment. */
  capture: (at?: string): string => withQuery('/capture', { at }),
  /** Decision canvas for a pill; `rule` scrolls to and highlights that rule's tile. */
  canvas: (pillId: string, rule?: string): string => withQuery(`/canvas/${enc(pillId)}`, { rule }),
  registry: (): string => '/registry',
  /** The pill hub: rules, versions, provenance, where it was applied, export. */
  pill: (pillId: string, rule?: string): string =>
    `/registry/${enc(pillId)}${rule ? `#${ruleAnchorId(rule)}` : ''}`,
  incidents: (): string => '/incidents',
  incident: (id: string, step?: number): string => withQuery(`/incident/${enc(id)}`, { step }),
  /** Printable decision record of an incident (with JSON export). */
  incidentRecord: (id: string): string => `/incident/${enc(id)}/record`,
  approvals: (): string => '/approvals',
  /** Learning loop of a pill, closing the loop on one incident. */
  learning: (pillId: string, incident?: string): string => withQuery(`/learning/${enc(pillId)}`, { incident }),
  /** Equipment index (QR landing pages). */
  equipment: (): string => '/c',
  asset: (assetId: string): string => `/c/${enc(assetId)}`,
  /** Printable QR label for an asset's teach page. */
  assetQr: (assetId: string): string => `/c/${enc(assetId)}/qr`,
  connectors: (): string => '/connectors',
  signIn: (): string => '/sign-in',
} as const;

/** Every app route pattern the helpers can produce (Next.js app/ directory form). */
export const ROUTE_PATTERNS = [
  '/pulse',
  '/capture',
  '/canvas/[pillId]',
  '/registry',
  '/registry/[pillId]',
  '/incidents',
  '/incident/[id]',
  '/incident/[id]/record',
  '/approvals',
  '/learning/[pillId]',
  '/c',
  '/c/[assetId]',
  '/c/[assetId]/qr',
  '/connectors',
  '/sign-in',
] as const;
