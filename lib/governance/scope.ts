// Keystone governance — server-side scoping of page data to the signed-in role.
//
// Server components call these before handing props to client components, so a
// record above the role's clearance never reaches the browser (HTML or RSC
// payload). Classification comes from the data's own `sensitivity` labels
// (incidents, timeline events, tenant-message drafts) via `redact`; the one
// unlabelled shape — an asset's tenant / client sub-records — is classified
// field by field in ASSET_FIELD_SENSITIVITY below.
//
// Pure and client-safe; idempotent (scoping scoped data changes nothing), so
// client components may still call redact/redactText for display.

import type { AssetRecord, IncidentRecord, TenantMessageFixture, Timeline, TimelineEvent } from "@/lib/data/schemas";
import type { SensitivityLevel } from "@/lib/data/schemas";
import { canSee, maskPlaceholder, redact } from "./access";

/**
 * Runtime contract of `redact`, typed as the input: string leaves stay strings;
 * a non-string leaf inside a record above clearance becomes a mask string.
 * Every consumer of such a field already redacts it for display.
 */
function redactAs<T>(value: T, role: string): T {
  return redact(value, role) as T;
}

/** An incident record; `affected_tenant` / `affected_client` carry their own labels. */
export function scopeIncident(incident: IncidentRecord, role: string): IncidentRecord {
  return redactAs(incident, role);
}

export function scopeIncidents(incidents: readonly IncidentRecord[], role: string): IncidentRecord[] {
  return incidents.map((i) => scopeIncident(i, role));
}

/**
 * Timeline events are labelled one by one. An event above clearance keeps its
 * metadata (id/at/source/type/sensitivity) and its evidence keys + confirmed
 * flags; its narrative text is masked. Boolean evidence values are the
 * deterministic engine's input facts — they name no one and must be identical
 * for every viewer so gates do not depend on who is looking — so they ship;
 * any other value type is masked (fails closed for the engine too).
 */
export function scopeTimelineEvent(event: TimelineEvent, role: string): TimelineEvent {
  if (canSee(role, event.sensitivity)) return event;
  const mask = maskPlaceholder(event.sensitivity);
  return {
    id: event.id,
    at: event.at,
    source: event.source,
    type: event.type,
    sensitivity: event.sensitivity,
    text: mask,
    evidence_updates: Object.fromEntries(
      Object.entries(event.evidence_updates).map(([key, update]) => [
        key,
        { value: typeof update.value === "boolean" ? update.value : mask, confirmed: update.confirmed },
      ]),
    ),
  };
}

export function scopeTimeline(timeline: Timeline, role: string): Timeline {
  return { ...timeline, events: timeline.events.map((e) => scopeTimelineEvent(e, role)) };
}

/**
 * Sensitivity of the fields of an asset's tenant / client sub-records, which
 * assets.json does not label. Fields not listed are operational (internal):
 * the SLA notice windows and tier drive the incident-room gates for everyone.
 */
export const ASSET_FIELD_SENSITIVITY = {
  anchor_tenant: {
    name: "tenant_pii",
    floors: "tenant_pii",
    critical_period: "tenant_pii",
    lease_termination_clause: "commercial",
  },
  clients: {
    name: "commercial",
    sla_credit_trigger: "commercial",
  },
} as const satisfies Record<string, Record<string, SensitivityLevel>>;

function maskFields<T extends object>(record: T, fields: Readonly<Record<string, SensitivityLevel>>, role: string): T {
  const out = { ...record } as Record<string, unknown>;
  for (const [field, level] of Object.entries(fields)) {
    if (field in out && !canSee(role, level)) out[field] = maskPlaceholder(level);
  }
  return out as T;
}

export function scopeAsset(asset: AssetRecord, role: string): AssetRecord {
  return {
    ...asset,
    ...(asset.anchor_tenant
      ? { anchor_tenant: maskFields(asset.anchor_tenant, ASSET_FIELD_SENSITIVITY.anchor_tenant, role) }
      : {}),
    ...(asset.clients ? { clients: asset.clients.map((c) => maskFields(c, ASSET_FIELD_SENSITIVITY.clients, role)) } : {}),
  };
}

export function scopeAssets(assets: readonly AssetRecord[], role: string): AssetRecord[] {
  return assets.map((a) => scopeAsset(a, role));
}

/**
 * Tenant-message fixture: each draft carries its own label. The fixture's
 * free-text description summarises those drafts, so it is shown only to a role
 * cleared for every one of them.
 */
export function scopeTenantMessageFixture(fixture: TenantMessageFixture, role: string): TenantMessageFixture {
  const hidden = fixture.drafts.find((d) => !canSee(role, d.sensitivity));
  return {
    ...fixture,
    description: hidden ? maskPlaceholder(hidden.sensitivity) : fixture.description,
    drafts: fixture.drafts.map((d) => redactAs(d, role)),
  };
}
