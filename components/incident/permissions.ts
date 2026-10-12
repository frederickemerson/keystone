// Which human-decision buttons a role may use on an engine action, and why
// not when it may not. Authority comes from lib/governance/access (roles.json);
// gate state comes from the engine's ActionStatus.

import type { ActionDecision } from '@/lib/engine/types';
import { decisionAuthority } from '@/lib/governance/access';
import { humanizeKey } from './labels';

export interface ButtonGate {
  enabled: boolean;
  /** Why the button is disabled (shown to the user). */
  reason?: string;
}

export interface ActionPermissions {
  approve: ButtonGate;
  reject: ButtonGate;
  escalate: ButtonGate;
  askEvidence: ButtonGate;
}

const ALLOW: ButtonGate = { enabled: true };

function missingLabel(action: ActionDecision): string {
  return action.missingEvidence.map(humanizeKey).join(', ');
}

export function actionPermissions(
  action: ActionDecision,
  role: string,
  escalateTarget: string | null,
): ActionPermissions {
  // Role authority comes from the same policy the governance store enforces.
  const approveAuthority = decisionAuthority(role, 'approved');
  const mayApprove = approveAuthority.allowed;
  const escalateAuthority = decisionAuthority(role, 'escalated');

  let approve: ButtonGate;
  if (action.status === 'blocked') {
    approve = { enabled: false, reason: `Gate ${action.ruleId} blocks this until confirmed: ${missingLabel(action)}.` };
  } else if (action.status === 'escalate') {
    approve = {
      enabled: false,
      reason: 'Must-escalate actions are never approved in place — they route to a named human.',
    };
  } else if (!mayApprove) {
    approve = { enabled: false, reason: approveAuthority.reason };
  } else {
    approve = ALLOW;
  }

  // Rejecting carries the same authority as approving, on an open decision.
  const reject: ButtonGate =
    action.status === 'needs_approval'
      ? mayApprove
        ? ALLOW
        : { enabled: false, reason: approveAuthority.reason }
      : { enabled: false, reason: 'Only requires-approval actions can be rejected.' };

  const escalate: ButtonGate = !escalateAuthority.allowed
    ? { enabled: false, reason: escalateAuthority.reason }
    : !escalateTarget
      ? { enabled: false, reason: 'Rule names no escalation target.' }
      : ALLOW;

  // Anyone working the incident may ask for evidence the gate is waiting on.
  const askEvidence: ButtonGate =
    action.missingEvidence.length > 0
      ? ALLOW
      : { enabled: false, reason: 'No missing evidence to request.' };

  return { approve, reject, escalate, askEvidence };
}

/** Tenant-message drafts: only the draft's named approver role, holding the grant. */
export function tenantMessagePermission(role: string, approverRole: string): ButtonGate {
  const authority = decisionAuthority(role, 'approved', { kind: 'tenant_message', approverRole });
  return authority.allowed ? ALLOW : { enabled: false, reason: authority.reason };
}

/**
 * Fold the latest recorded decision into the gates: once an action has been
 * escalated, escalating it again is disabled (with who/when as the reason),
 * so a repeat click can never log a duplicate escalation.
 */
export function withRecordedDecision(
  permissions: ActionPermissions,
  record: { outcome: string; actor: { name: string }; at: string } | undefined,
  formatAt: (iso: string) => string,
): ActionPermissions {
  if (record?.outcome !== 'escalated') return permissions;
  return {
    ...permissions,
    escalate: { enabled: false, reason: `Already escalated by ${record.actor.name} at ${formatAt(record.at)}` },
  };
}
