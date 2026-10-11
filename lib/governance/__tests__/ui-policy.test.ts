// The UI buttons and the store must enforce one policy: whatever the UI
// enables, the store accepts; whatever the store refuses, the UI disables.
// Also: redaction fails closed for the unresolved (SSR) role.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { ActionDecision } from "@/lib/engine/types";
import { actionPermissions, tenantMessagePermission } from "@/components/incident/permissions";
import { defaultOutcome } from "@/components/learning/learning-utils";
import { loadIncident } from "@/lib/data";
import { decisionAuthority, redact, redactText, ROLES, UNRESOLVED_ROLE, canSee } from "../access";

const ROLE_IDS = ROLES.map((r) => r.role);

const needsApproval = {
  ruleId: "TS-03",
  status: "needs_approval",
  missingEvidence: [],
} as unknown as ActionDecision;

describe("UI permissions agree with the store policy", () => {
  it("approve / reject / escalate buttons match decisionAuthority for every role", () => {
    for (const role of [...ROLE_IDS, UNRESOLVED_ROLE, "intruder"]) {
      const p = actionPermissions(needsApproval, role, "duty_lew");
      expect(p.approve.enabled).toBe(decisionAuthority(role, "approved").allowed);
      expect(p.reject.enabled).toBe(decisionAuthority(role, "rejected").allowed);
      expect(p.escalate.enabled).toBe(decisionAuthority(role, "escalated").allowed);
    }
  });

  it("tenant-message approval matches decisionAuthority for any (role, named approver)", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ROLE_IDS, UNRESOLVED_ROLE), fc.constantFrom(...ROLE_IDS, "nobody"), (role, approver) => {
        expect(tenantMessagePermission(role, approver).enabled).toBe(
          decisionAuthority(role, "approved", { kind: "tenant_message", approverRole: approver }).allowed,
        );
      }),
    );
  });
});

describe("redaction", () => {
  const incident = loadIncident("INC-2026-1011")!;
  const tenant = incident.affected_tenant!;

  it("the unresolved (server-render) role sees public data only", () => {
    expect(canSee(UNRESOLVED_ROLE, "internal")).toBe(false);
    expect(redactText(tenant.name, UNRESOLVED_ROLE, "tenant_pii")).not.toContain(tenant.name);
    expect(JSON.stringify(redact(incident, UNRESOLVED_ROLE))).not.toContain(tenant.name);
  });

  it("no role without the grant ever sees a tenant_pii / commercial value", () => {
    for (const role of ROLE_IDS) {
      const out = JSON.stringify(redact(incident, role));
      expect(out.includes(tenant.name)).toBe(canSee(role, "tenant_pii"));
    }
  });

  it("the learning outcome prefill never carries the tenant's name (it is shown to roles without tenant_pii)", () => {
    expect(defaultOutcome(incident).tenantImpact).not.toContain(tenant.name);
  });
});
