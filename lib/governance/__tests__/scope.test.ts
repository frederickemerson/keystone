// Server-side redaction: what each role's page props contain once scoped on
// the server (lib/governance/scope), over the real demo data in data/.

import { describe, expect, it } from "vitest";
import {
  loadAiProposalFixture,
  loadAllTimelines,
  loadAssets,
  loadIncidents,
  loadTenantMessageFixture,
} from "@/lib/data";
import { ROLES, canSee } from "../access";
import {
  scopeAssets,
  scopeIncidents,
  scopeTenantMessageFixture,
  scopeTimeline,
} from "../scope";

const TENANT = "Straits Meridian Bank";

/** Every string leaf, raw (not JSON-escaped), joined — what a client could read. */
function text(value: unknown): string {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(value);
  return out.join("\u0001");
}

/** Everything the incident room, pulse, approvals and learning pages ship, scoped for `role`. */
function pageProps(role: string) {
  const incidents = loadIncidents();
  return {
    incidents: scopeIncidents(incidents, role),
    assets: scopeAssets(loadAssets(), role),
    timelines: loadAllTimelines().map((t) => scopeTimeline(t, role)),
    tenantMessages: incidents.flatMap((i) => {
      const f = loadTenantMessageFixture(i.id);
      return f ? [scopeTenantMessageFixture(f, role)] : [];
    }),
    aiProposals: incidents.flatMap((i) => loadAiProposalFixture(i.id) ?? []),
  };
}

/** Free text of every record the data labels tenant_pii / commercial (and the asset fields classified so). */
function labelledText(level: "tenant_pii" | "commercial"): string[] {
  const out: string[] = [];
  for (const t of loadAllTimelines()) for (const e of t.events) if (e.sensitivity === level) out.push(e.text);
  for (const i of loadIncidents()) {
    if (i.affected_tenant?.sensitivity === level) out.push(i.affected_tenant.name);
    if (i.affected_client?.sensitivity === level) out.push(i.affected_client.name, i.affected_client.sla_credit_trigger);
  }
  for (const a of loadAssets()) {
    if (level === "tenant_pii" && a.anchor_tenant) out.push(a.anchor_tenant.name, a.anchor_tenant.critical_period);
    if (level === "commercial" && a.anchor_tenant) out.push(a.anchor_tenant.lease_termination_clause);
  }
  for (const i of loadIncidents()) {
    for (const d of loadTenantMessageFixture(i.id)?.drafts ?? []) if (d.sensitivity === level) out.push(d.body, ...d.recipients);
  }
  return out.filter((s) => s.length > 12);
}

describe("server-side redaction of page props", () => {
  it("a technician's props never contain the tenant's name or any tenant-PII / commercial text", () => {
    const json = text(pageProps("technician"));
    expect(json).not.toContain(TENANT);
    expect(json).not.toContain("Meridian");
    for (const text of [...labelledText("tenant_pii"), ...labelledText("commercial")]) expect(json).not.toContain(text);
    expect(json).toContain("[masked: tenant PII]");
  });

  for (const r of ROLES) {
    it(`${r.label}: tenant PII ${canSee(r.role, "tenant_pii") ? "present" : "absent"}, commercial ${canSee(r.role, "commercial") ? "present" : "absent"}`, () => {
      const json = text(pageProps(r.role));
      expect(json.includes(TENANT)).toBe(canSee(r.role, "tenant_pii"));
      for (const text of labelledText("tenant_pii")) expect(json.includes(text)).toBe(canSee(r.role, "tenant_pii"));
      for (const text of labelledText("commercial")) expect(json.includes(text)).toBe(canSee(r.role, "commercial"));
    });
  }

  it("the unresolved role (no session) gets public data only", () => {
    const json = text(pageProps("unresolved"));
    expect(json).not.toContain(TENANT);
  });

  it("the engine's evidence facts are identical for every role, so gates do not depend on the viewer", () => {
    const facts = (role: string) =>
      loadAllTimelines().map((t) =>
        scopeTimeline(t, role).events.map((e) =>
          Object.entries(e.evidence_updates).map(([k, u]) => [k, u.value, u.confirmed]),
        ),
      );
    const executive = facts("executive");
    for (const r of ROLES) expect(facts(r.role)).toEqual(executive);
  });

  it("an event above clearance keeps its metadata so the timeline still renders", () => {
    const t = loadAllTimelines().find((x) => x.events.some((e) => e.sensitivity === "tenant_pii"))!;
    const scoped = scopeTimeline(t, "technician");
    t.events.forEach((e, i) => {
      expect(scoped.events[i]).toMatchObject({ id: e.id, at: e.at, source: e.source, type: e.type, sensitivity: e.sensitivity });
      if (e.sensitivity === "tenant_pii") expect(scoped.events[i].text).toBe("[masked: tenant PII]");
      else expect(scoped.events[i].text).toBe(e.text);
    });
  });

  it("asset SLA notice windows stay visible (operational), the tenant identity does not", () => {
    const hf1 = scopeAssets(loadAssets(), "technician").find((a) => a.anchor_tenant)!;
    expect(hf1.anchor_tenant!.name).toBe("[masked: tenant PII]");
    expect(typeof hf1.anchor_tenant!.sla_first_notice_min).toBe("number");
  });

  it("a masked tenant-message draft keeps its SLA timing (operational) so the deadline still computes", () => {
    const fixture = loadTenantMessageFixture("INC-2026-1011")!;
    const [draft] = scopeTenantMessageFixture(fixture, "technician").drafts;
    const [source] = fixture.drafts;
    expect(draft.body).toBe("[masked: tenant PII]");
    expect(draft.recipients).toEqual(["[masked: tenant PII]"]);
    expect(draft.sla_first_notice_deadline).toBe(source.sla_first_notice_deadline);
    expect(draft.sla_first_notice_clock_start).toBe(source.sla_first_notice_clock_start);
    expect(draft.sla_first_notice_deadline_min).toBe(source.sla_first_notice_deadline_min);
    expect(Number.isNaN(Date.parse(draft.sla_first_notice_deadline))).toBe(false);
  });

  it("scoping is idempotent", () => {
    for (const role of ["technician", "asset_operations_manager", "dc_critical_facilities_manager"]) {
      const once = pageProps(role);
      expect(scopeIncidents(once.incidents, role)).toEqual(once.incidents);
      expect(scopeAssets(once.assets, role)).toEqual(once.assets);
      expect(once.timelines.map((t) => scopeTimeline(t, role))).toEqual(once.timelines);
    }
  });
});
