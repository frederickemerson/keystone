'use client';

import { useId, useState } from 'react';
import { Check, X, ArrowUpRight, FileQuestion, Stamp } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { ActionDecisionRecord, ActionOutcome } from '@/lib/governance/store';
import { roleLabel } from '@/lib/governance/access';
import type { ActionPermissions, ButtonGate } from './permissions';
import { formatClock } from './labels';

const BASE = 'btn-pill text-xs';
/**
 * Decision buttons carry long, per-asset labels ("Escalate to Rahul Menon ·
 * Duty Licensed Electrical Worker"). btn-pill is nowrap, so let these wrap
 * inside their card instead of overflowing it.
 */
export const WRAPPING_PILL = 'max-w-full whitespace-normal text-balance py-1.5 text-left leading-tight';

function GateButton({
  gate,
  onClick,
  icon,
  children,
  describedBy,
}: {
  gate: ButtonGate;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  describedBy: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!gate.enabled}
      title={gate.reason}
      aria-describedby={gate.enabled ? undefined : describedBy}
      className={cn(BASE, WRAPPING_PILL)}
    >
      {icon}
      {children}
    </button>
  );
}

const OUTCOME_TONE: Record<ActionOutcome, string> = {
  approved: 'border-recommend/35 bg-recommend-tint text-recommend',
  rejected: 'border-line bg-na-tint text-ink',
  escalated: 'border-escalate-mark/40 bg-escalate-tint text-escalate',
  evidence_requested: 'border-approval/35 bg-approval-tint text-approval',
};

const OUTCOME_LABEL: Record<ActionOutcome, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  escalated: 'Escalated',
  evidence_requested: 'Evidence requested',
};

/** Outcomes decided with one click; evidence requests also carry the chosen keys. */
export type DirectOutcome = Exclude<ActionOutcome, 'evidence_requested'>;

/** A missing-evidence item the human can ask for (label from the pill's evidence catalogue). */
export interface MissingEvidenceOption {
  key: string;
  label: string;
}

export function DecisionStamp({ record }: { record: ActionDecisionRecord }) {
  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-lg border px-3 py-2 text-xs',
        OUTCOME_TONE[record.outcome],
      )}
    >
      <Stamp className="size-3.5" aria-hidden="true" />
      <span className="font-semibold">{OUTCOME_LABEL[record.outcome]}</span>
      <span>
        by {record.actor.name} ({roleLabel(record.actor.role)}) · {formatClock(record.at)}
      </span>
      {record.note ? <span className="w-full text-[11px] opacity-80">{record.note}</span> : null}
    </p>
  );
}

/** Approve / Reject / Escalate / Ask for evidence, gated by role + engine status. */
export function DecisionButtons({
  permissions,
  escalateLabel,
  missingEvidence,
  onDecide,
  onRequestEvidence,
}: {
  permissions: ActionPermissions;
  escalateLabel: string;
  /** The action's missing evidence — the keys an evidence request can name. */
  missingEvidence: readonly MissingEvidenceOption[];
  onDecide: (outcome: DirectOutcome) => void;
  onRequestEvidence: (keys: string[]) => void;
}) {
  const reasonId = useId();
  const pickerId = useId();
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);

  const openPicker = () => {
    setChosen(missingEvidence.map((m) => m.key));
    setPicking(true);
  };
  const toggle = (key: string) =>
    setChosen((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const sendRequest = () => {
    // Keep catalogue order regardless of click order.
    onRequestEvidence(missingEvidence.map((m) => m.key).filter((k) => chosen.includes(k)));
    setPicking(false);
  };
  const reasons = [
    permissions.approve,
    permissions.reject,
    permissions.escalate,
    permissions.askEvidence,
  ]
    .map((g) => g.reason)
    .filter((r): r is string => Boolean(r));
  const uniqueReasons = [...new Set(reasons)];

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <GateButton
          gate={permissions.approve}
          onClick={() => onDecide('approved')}
          icon={<Check className="size-3.5 text-recommend" aria-hidden="true" />}
          describedBy={reasonId}
        >
          Approve
        </GateButton>
        <GateButton
          gate={permissions.reject}
          onClick={() => onDecide('rejected')}
          icon={<X className="size-3.5 text-ink-muted" aria-hidden="true" />}
          describedBy={reasonId}
        >
          Reject
        </GateButton>
        <GateButton
          gate={permissions.escalate}
          onClick={() => onDecide('escalated')}
          icon={<ArrowUpRight className="size-3.5 text-escalate" aria-hidden="true" />}
          describedBy={reasonId}
        >
          {escalateLabel}
        </GateButton>
        <GateButton
          gate={permissions.askEvidence}
          onClick={picking ? () => setPicking(false) : openPicker}
          icon={<FileQuestion className="size-3.5 text-approval" aria-hidden="true" />}
          describedBy={reasonId}
        >
          Ask for evidence
        </GateButton>
      </div>
      {picking ? (
        <fieldset id={pickerId} className="rounded-lg border border-line bg-surface p-3">
          <legend className="px-1 text-[11px] font-medium text-ink">Request which evidence?</legend>
          <ul className="space-y-1">
            {missingEvidence.map((m) => (
              <li key={m.key}>
                <label className="flex items-center gap-2 text-xs text-ink">
                  <input type="checkbox" checked={chosen.includes(m.key)} onChange={() => toggle(m.key)} />
                  {m.label} <span className="font-mono text-[10px] text-ink-muted">{m.key}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={sendRequest}
              disabled={chosen.length === 0}
              className={BASE}
            >
              Send request ({chosen.length})
            </button>
            <button
              type="button"
              onClick={() => setPicking(false)}
              className={cn(BASE, 'border-line-strong/50 shadow-none')}
            >
              Cancel
            </button>
          </div>
        </fieldset>
      ) : null}
      {uniqueReasons.length > 0 ? (
        <ul id={reasonId} className="space-y-0.5 text-[11px] leading-snug text-ink-muted">
          {uniqueReasons.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
