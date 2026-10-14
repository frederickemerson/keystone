'use client';

// "Is this a new skill?" — solved problems no approved rule accounts for.
//
// The finding itself is computed on the server by lib/learning/uncovered.ts
// from the engine's own replay. This screen does two things with it: says what
// was found, in a sentence carrying its own denominator, and turns it into the
// one question worth asking — how did you know where to look?
//
// It deliberately does NOT draft a rule. Keystone has an outcome and no
// reasoning; a rule written from an outcome would be a guess wearing a rule's
// clothes. The reasoning has to come from the person, be attributed to them,
// and go through the same approval as anything else.

import { useState } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import type { UncoveredReport } from '@/lib/learning/uncovered';
import { uncoveredSentence } from '@/lib/learning/uncovered';
import { buildNewSkillTask } from '@/components/incident/captureTasks';
import { findOpenCaptureTask } from '@/lib/capture/contract';
import { roleLabel } from '@/lib/governance/access';
import { useGovernanceStore } from '@/lib/governance/store';
import { routes } from '@/lib/journey/routes';
import Link from 'next/link';

/** What a candidate needs to be readable: already role-scoped on the server. */
export interface CandidateView {
  incidentId: string;
  assetId: string;
  assetName: string;
  type: string;
  description: string;
  outcome: string;
}

export function NewSkillPanel({
  report,
  candidates,
  roles,
}: {
  report: UncoveredReport;
  candidates: readonly CandidateView[];
  /** Roles that could explain how it was solved. */
  roles: readonly string[];
}) {
  return (
    <div className="card-paper space-y-3 p-5">
      <p className="flex items-start gap-1.5 max-w-[80ch] text-[13px] leading-snug text-ink">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        <span>{uncoveredSentence(report)}</span>
      </p>
      {candidates.length === 0 ? (
        <p className="text-[13px] text-ink-muted">
          Nothing to ask about in the records you can see.
        </p>
      ) : (
        <ul className="space-y-3">
          {candidates.map((candidate) => (
            <Candidate key={candidate.incidentId} candidate={candidate} roles={roles} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Candidate({ candidate, roles }: { candidate: CandidateView; roles: readonly string[] }) {
  const createCaptureTask = useGovernanceStore((s) => s.createCaptureTask);
  const tasks = useGovernanceStore((s) => s.captureTasks);
  const [role, setRole] = useState(roles[0] ?? '');
  const [raised, setRaised] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // An open question about this incident already exists for this role: show it
  // rather than offering to ask the same thing twice (the store would refuse).
  const existing = findOpenCaptureTask(tasks, {
    kind: 'new_skill_candidate',
    incidentId: candidate.incidentId,
    assetId: candidate.assetId,
    ruleId: undefined,
    createdFor: role,
  });

  function ask() {
    setError(null);
    try {
      const task = createCaptureTask(
        buildNewSkillTask({
          incidentId: candidate.incidentId,
          assetId: candidate.assetId,
          role,
          at: new Date().toISOString(),
        }),
      );
      setRaised(task.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The question could not be raised.');
    }
  }

  const asked = raised ?? existing?.id ?? null;
  return (
    <li className="space-y-2 rounded-lg border border-line bg-surface p-3">
      <div className="space-y-1">
        <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-ink-muted">
          <Link
            href={routes.incident(candidate.incidentId)}
            className="font-mono text-ink underline-offset-2 hover:underline"
          >
            {candidate.incidentId}
          </Link>
          <span aria-hidden="true">·</span>
          <span>{candidate.assetName}</span>
          <span aria-hidden="true">·</span>
          <span>{candidate.type.replace(/_/g, ' ')}</span>
        </p>
        <p className="max-w-[80ch] text-[13px] leading-snug text-ink">{candidate.description}</p>
        <p className="flex items-start gap-1.5 max-w-[80ch] text-[13px] leading-snug text-ink-muted">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-medium text-ink">Solved: </span>
            {candidate.outcome}
          </span>
        </p>
      </div>

      {asked ? (
        <p className="text-[12px] leading-snug text-ink-muted">
          Asked as <span className="font-mono text-ink">{asked}</span>, waiting for {roleLabel(role)}. Their answer
          becomes a draft the approver reviews — the same path as any other rule, because an answer nobody approved is
          not a skill yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          <p className="max-w-[80ch] text-[12px] leading-snug text-ink-muted">
            This does not write a rule. The record has the outcome and not the reasoning, so the only honest next step
            is to ask the person who has it.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[12px] text-ink-muted">
              <span className="sr-only">Who should explain it</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-input border border-line bg-canvas px-2 py-1 text-[12px] text-ink"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    Ask {roleLabel(r)}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={ask} disabled={!role} className="btn-pill btn-pill-primary">
              How did you solve it?
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-[12px] text-blocked">
          {error}
        </p>
      ) : null}
    </li>
  );
}
