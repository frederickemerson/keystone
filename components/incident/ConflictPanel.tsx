'use client';

// Cross-pill coordination, in the room.
//
// The board already shows both pills' decisions side by side. Side by side is
// co-location: it never says that TE-04's 30-minute clock and TS-07's LEW gate
// cannot both be honoured. This panel is where that is said, who has to settle
// it, and — when the gate clears — that there is nothing left to settle.
//
// Every number and name here is computed by lib/coordination from the two
// pills' rules, the deterministic engine's gating set and data/roles.json. The
// panel adds no judgement of its own and never shows a status it did not get
// from the detector.
//
// Clearance: each face is masked on its own rule's `sensitivity` with the
// existing canSee() — TE-04 is commercial, and most roles in the room (the
// shared steward among them) cannot read it. The shared narrative describes
// both faces, so it needs clearance for both.

import { useMemo } from 'react';
import { CheckCircle2, Clock, EyeOff, Gavel, Link2, Scale, Siren } from 'lucide-react';
import { ActionClassChip, CHIP_BASE, StatusBadge, TONE_CHIP, TONE_PANEL, pillDisplayName } from '@/components/mosaic';
import { coordinate, COORDINATION_POLICY, type ConflictFace, type CoordinationCheck } from '@/lib/coordination';
import { canSee, maskPlaceholder, personaLabel } from '@/lib/governance/access';
import { cn } from '@/lib/ui/cn';
import { toEngineAsset, toEngineEvidence, toEngineIncident, type EvidenceState } from './engineInputs';
import { RuleIdLink } from './RuleLinks';
import type { ApprovedPill, IncidentScenario } from './types';

function Face({
  face,
  role,
  caption,
}: {
  face: ConflictFace;
  role: string;
  /** What this side of the conflict is: the clock, or the gate. */
  caption: string;
}) {
  const cleared = canSee(role, face.sensitivity);
  return (
    <div className="min-w-0 rounded-lg border border-line bg-surface p-2.5 text-xs">
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">{caption}</p>
      <p className="mt-1 text-ink-muted">
        {pillDisplayName(face.pillName)} v{face.pillVersion} ·{' '}
        <RuleIdLink pillId={face.pillId} ruleId={face.ruleId} className="text-ink" />
      </p>
      {cleared ? (
        <>
          <p className="mt-1 font-medium text-ink">{face.ruleTitle}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <ActionClassChip actionClass={face.actionClass} />
            <StatusBadge status={face.status} />
            {face.deadlineMinutes === null ? null : (
              <span className={cn(CHIP_BASE, TONE_CHIP.escalate)}>
                <Clock className="size-3.5" aria-hidden="true" />
                Within {face.deadlineMinutes} min
              </span>
            )}
          </div>
          <p className="mt-1.5 text-ink-muted">
            Owner {personaLabel(face.ownerRole)} · escalates to {personaLabel(face.escalateToRole)}
          </p>
        </>
      ) : (
        <p className="mt-1 flex items-start gap-1.5 text-ink-muted">
          <EyeOff className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {maskPlaceholder(face.sensitivity)} — this rule is {face.sensitivity.replace(/_/g, ' ')} and your role is not
            cleared to read it.
          </span>
        </p>
      )}
    </div>
  );
}

function ConflictBody({
  check,
  role,
}: {
  check: CoordinationCheck & { obligation: ConflictFace; gate: ConflictFace };
  role: string;
}) {
  // The reason, the dependency and the gating keys all describe BOTH rules, so
  // they need clearance for both faces — a per-face check would leak the
  // commercial side through the shared narrative.
  const narrative = canSee(role, check.obligation.sensitivity) && canSee(role, check.gate.sensitivity);
  const chosen = check.adjudication?.chosen ?? null;

  return (
    <>
      {narrative ? (
        <p className="mt-2 text-[13px] font-medium text-ink">{check.reason}</p>
      ) : (
        <p className="mt-2 text-[13px] text-ink-muted">
          The two rules in conflict are named below. The detail is masked for your role.
        </p>
      )}

      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        <Face face={check.obligation} role={role} caption="On the clock" />
        <Face face={check.gate} role={role} caption="Gate that answers it" />
      </div>

      {narrative ? (
        <>
          <p className="mt-2.5 flex items-start gap-1.5 text-xs text-ink-muted">
            <Link2 className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span>{check.dependency}</span>
          </p>
          <div className="mt-2.5">
            <p className="text-[11px] uppercase tracking-wide text-ink-muted">
              {check.gate.ruleId} unresolved until
            </p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {check.gate.gatingSet.map((key) => {
                const outstanding = check.gate.outstanding.includes(key);
                return (
                  <li key={key} className={cn(CHIP_BASE, outstanding ? TONE_CHIP.blocked : TONE_CHIP.recommend)}>
                    {outstanding ? (
                      <Clock className="size-3.5" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    )}
                    {check.gate.gatingLabels[key] ?? key}
                    <span className="sr-only">{outstanding ? ' — outstanding' : ' — confirmed'}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}

      <div className="mt-2.5 rounded-lg border border-line bg-surface p-2.5 text-xs">
        <p className="flex items-start gap-1.5">
          <Gavel className="mt-px size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
          {chosen === null ? (
            <span className="text-ink">
              No role is accountable for both pills and cleared for both sides, so this has to be routed by hand.
            </span>
          ) : (
            <span className="text-ink">
              <span className="font-medium">Adjudication: {personaLabel(chosen.role)}</span> — the {chosen.basis} both
              pills name in their SKILL.md.
            </span>
          )}
        </p>
        {(check.adjudication?.skipped ?? []).map((skipped) => (
          <p key={skipped.role} className="mt-1 pl-5 text-ink-muted">
            {personaLabel(skipped.role)} is the pills&rsquo; shared {skipped.basis} but {skipped.reason}.
          </p>
        ))}
      </div>
    </>
  );
}

export function ConflictPanel({
  pills,
  scenario,
  evidence,
  role,
}: {
  pills: readonly ApprovedPill[];
  scenario: IncidentScenario;
  evidence: EvidenceState;
  role: string;
}) {
  // Re-coordinated only when the pills, the scenario or the evidence change —
  // the same memoisation the room gives its engine passes.
  const checks = useMemo(
    () =>
      coordinate(COORDINATION_POLICY, {
        pills: pills.map((entry) => ({ pillId: entry.bundle.id, pillVersion: entry.version, pill: entry.pill })),
        asset: toEngineAsset(scenario.asset),
        incident: toEngineIncident(scenario.incident),
        evidence: toEngineEvidence(evidence),
      }),
    [pills, scenario, evidence],
  );

  const conflicts = checks.filter((c) => c.inConflict);
  const clear = checks.filter((c) => !c.inConflict);

  return (
    <section
      aria-label="Cross-pill coordination"
      className={cn('rounded-xl border p-4', conflicts.length > 0 ? TONE_PANEL.escalate : 'border-line bg-surface')}
    >
      <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[19px] font-semibold leading-tight">
        {conflicts.length > 0 ? (
          <Siren className="size-4 self-center text-escalate" aria-hidden="true" />
        ) : (
          <Scale className="size-4 self-center text-ink-muted" aria-hidden="true" />
        )}
        <span className={conflicts.length > 0 ? 'text-escalate' : undefined}>
          {conflicts.length > 0 ? 'Cross-pill conflict' : 'Cross-pill check'}
        </span>
        <span className="rounded-full border border-line bg-dew-drop px-2 py-px font-sans text-xs font-medium tabular-nums text-ink-muted">
          {conflicts.length} of {checks.length}
        </span>
      </h2>

      {conflicts.map((check) => (
        <div key={check.conflictId} className="mt-2">
          <p className="text-xs text-ink-muted">
            <span className="font-mono text-ink">{check.conflictId}</span> · {check.classLabel}
          </p>
          {check.obligation !== null && check.gate !== null ? (
            <ConflictBody check={{ ...check, obligation: check.obligation, gate: check.gate }} role={role} />
          ) : null}
        </div>
      ))}

      {clear.map((check) => (
        <p key={check.conflictId} className="mt-1.5 text-xs text-ink-muted">
          <span className="font-mono text-ink">{check.conflictId}</span> · {check.reason}
        </p>
      ))}

      <p className="mt-3 border-t border-line pt-2 text-[11px] text-ink-muted">
        Computed from both pills&rsquo; rules, the engine&rsquo;s gating set and data/roles.json — the link between the
        two domains is authored in data/coordination.yaml. No model input, and nothing here changes a gate.
      </p>
    </section>
  );
}
