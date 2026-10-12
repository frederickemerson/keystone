'use client';

// "Next:" for a version in review: the step it needs, and either "you can do
// it here" or a hand-off to the person whose authority check allows it.

import { ArrowRight } from 'lucide-react';
import { HandoffButton } from '@/components/journey/HandoffButton';
import { suggestHandoff, type Persona } from '@/lib/journey/handoff';
import { routes } from '@/lib/journey/routes';
import type { ApprovalStep } from './nextStep';

export function NextStepPanel({ step, currentActor }: { step: ApprovalStep; currentActor: Persona }) {
  const canAct = step.isAllowed(currentActor);
  const to = canAct ? undefined : suggestHandoff(step.isAllowed, currentActor);
  return (
    <div className="rounded-lg border border-line bg-dew-drop/60 px-3 py-2.5" role="status">
      <p className="flex items-start gap-1.5 text-[13px] text-ink">
        <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        <span>
          <span className="font-semibold">Next:</span> {step.label}
          {canAct ? ' You can do this here.' : ''}
        </span>
      </p>
      {to ? (
        <HandoffButton
          to={to}
          href={routes.approvals()}
          action={step.action}
          reason={`${currentActor.name} cannot ${step.action}.`}
          className="mt-2"
        />
      ) : !canAct ? (
        <p className="mt-1.5 text-[12px] text-ink-muted">No one in the demo roles can {step.action} right now.</p>
      ) : null}
    </div>
  );
}
