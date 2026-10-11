// Which human-decision buttons a role may use on an engine action, and why
// not when it may not. Authority comes from lib/governance/access (roles.json);
// gate state comes from the engine's ActionStatus.

import type { ActionDecision } from '@/lib/engine/types';
import { approvableActionClasses, canEscalate, hasCapability, roleLabel } from '@/lib/governance/access';
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
  const who = roleLabel(role);
  const mayApprove = approvableActionClasses(role).includes('requires_approval');

  let approve: ButtonGate;
  if (action.status === 'blocked') {
    approve = { enabled: false, reason: `Gate ${action.ruleId} blocks this until confirmed: ${missingLabel(action)}.` };
  } else if (action.status === 'escalate') {
    approve = {
      enabled: false,
      reason: 'Must-escalate actions are never approved in place — they route to a named human.',
    };
  } else if (!mayApprove) {
    approve = { enabled: false, reason: `${who} has no approval grant for requires-approval actions.` };
  } else {
    approve = ALLOW;
  }

  // Rejecting carries the same authority as approving, on an open decision.
  const reject: ButtonGate =
    action.status === 'needs_approval'
      ? mayApprove
        ? ALLOW
        : { enabled: false, reason: `${who} cannot reject — no approval grant.` }
      : { enabled: false, reason: 'Only requires-approval actions can be rejected.' };

  const escalate: ButtonGate = !canEscalate(role)
    ? { enabled: false, reason: `${who} cannot escalate.` }
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
  if (role !== approverRole) {
    return { enabled: false, reason: `Requires ${roleLabel(approverRole)} approval — you are ${roleLabel(role)}.` };
  }
  if (!hasCapability(role, 'approve_tenant_message')) {
    return { enabled: false, reason: `${roleLabel(role)} has no tenant-message approval grant.` };
  }
  return ALLOW;
}
