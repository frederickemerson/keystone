import { describe, expect, it } from "vitest";
import timeline from "@/data/timelines/INC-2026-1011.json";
import {
  approvableActionClasses,
  capabilities,
  personaLabel,
  redact,
  redactText,
  roleLabel,
  visibleSensitivities,
} from "../access";
import { DEMO_PERSONAS } from "../store";

const tenantEvent = timeline.events.find((e) => e.sensitivity === "tenant_pii");
const internalEvent = timeline.events.find((e) => e.sensitivity === "internal");

const incidentLike = {
  id: "INC-2026-1011",
  location: "L23 ceiling void",
  affected_tenant: { name: "Straits Meridian Bank", floors: "20-26", sensitivity: "tenant_pii" },
  affected_client: { name: "hyperscale client", sla_credit_trigger: "outage > 15 min", sensitivity: "commercial" },
};

describe("access policy from roles.json", () => {
  it("maps roles to visible sensitivity levels", () => {
    expect(visibleSensitivities("technician")).toEqual(["public", "internal"]);
    expect(visibleSensitivities("executive")).toContain("commercial");
    expect(visibleSensitivities("not_a_role")).toEqual(["public"]);
  });

  it("maps can_approve grants to capabilities and action classes", () => {
    expect(approvableActionClasses("asset_operations_manager")).toEqual(["requires_approval"]);
    expect(approvableActionClasses("technician")).toEqual([]);
    expect(capabilities("executive")).toEqual(expect.arrayContaining(["promote_pill_version", "rollback_pill"]));
  });
});

describe("redact", () => {
  it("technician: tenant PII and commercial masked, operational evidence intact", () => {
    const r = redact(incidentLike, "technician");
    expect(r.location).toBe("L23 ceiling void");
    expect(r.affected_tenant.name).toBe("[masked: tenant PII]");
    expect(r.affected_tenant.floors).toBe("[masked: tenant PII]");
    expect(r.affected_tenant.sensitivity).toBe("tenant_pii");
    expect(r.affected_client.name).toBe("[masked: commercial]");
  });

  it("tenant experience / AOM see tenant PII but not commercial", () => {
    for (const role of ["tenant_experience_manager", "asset_operations_manager"]) {
      const r = redact(incidentLike, role);
      expect(r.affected_tenant.name).toBe("Straits Meridian Bank");
      expect(r.affected_client.sla_credit_trigger).toBe("[masked: commercial]");
    }
  });

  it("executive sees everything", () => {
    expect(redact(incidentLike, "executive")).toEqual(incidentLike);
  });

  it("masks a tenant_pii timeline event for a technician but keeps its metadata", () => {
    expect(tenantEvent).toBeDefined();
    const r = redact(tenantEvent, "technician");
    expect(r?.id).toBe(tenantEvent?.id);
    expect(r?.at).toBe(tenantEvent?.at);
    expect(r?.text).toBe("[masked: tenant PII]");
    expect(JSON.stringify(r)).not.toContain("Straits Meridian");
    expect(redact(internalEvent, "technician")).toEqual(internalEvent);
  });

  it("redactText uses the caller-supplied label", () => {
    expect(redactText("Caller: Mr Tan +65 9123 4567", "technician", "tenant_pii")).toBe("[masked: tenant PII]");
    expect(redactText("Valve closed", "technician", "internal")).toBe("Valve closed");
  });
});

describe("personaLabel", () => {
  it("renders a role id as 'Person · Role label' from roles.json", () => {
    expect(personaLabel("technical_services_lead")).toBe(
      `${DEMO_PERSONAS.technical_services_lead} · ${roleLabel("technical_services_lead")}`,
    );
    expect(personaLabel("technical_services_lead")).not.toContain("_");
  });

  it("never throws for an unknown role", () => {
    expect(personaLabel("not_a_role")).toBe("not_a_role");
  });
});
