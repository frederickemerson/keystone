// Keystone demo auth — the persona list on /sign-in, derived from
// data/roles.json grants and sensitivity levels (no hand-written copy).

import { capabilities, canEscalate, ROLES, type GovernanceCapability } from "@/lib/governance/access";

const CAPABILITY_PHRASE: Record<GovernanceCapability, string> = {
  approve_requires_approval_actions: "approves incident actions",
  approve_tenant_message: "approves tenant notices",
  promote_pill_version: "promotes pill versions",
  rollback_pill: "rolls back pills",
};

const MASKED_PHRASE: Record<string, string> = {
  tenant_pii: "tenant PII",
  commercial: "commercial terms",
};

export interface PersonaOption {
  role: string;
  name: string;
  label: string;
  /** One line: what this persona may do and what is masked for them. */
  summary: string;
}

function sentence(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

export function personaSummary(role: string): string {
  const def = ROLES.find((r) => r.role === role);
  if (!def) return "";
  const grants = capabilities(role).map((c) => CAPABILITY_PHRASE[c]);
  const does = grants.length > 0 ? sentence(grants) : canEscalate(role) ? "escalates; no approval grants" : "no approval grants";
  const masked = def.sensitivity_levels_masked.map((l) => MASKED_PHRASE[l] ?? l);
  const sees = masked.length > 0 ? `${sentence(masked)} masked` : "sees all data";
  return `${does.charAt(0).toUpperCase()}${does.slice(1)} · ${sees}`;
}

export function personaOptions(): PersonaOption[] {
  return ROLES.map((r) => ({ role: r.role, name: r.person, label: r.label, summary: personaSummary(r.role) }));
}
