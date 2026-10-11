'use client';

import type { ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Quote,
  ShieldAlert,
  Square,
  Volume2,
} from 'lucide-react';
import { ActionClassChip, StatusBadge } from '@/components/mosaic';
import type { ActionDecision, CounterfactualResult, Rule } from '@/lib/engine/types';
import { cn } from '@/lib/ui/cn';
import { Drawer } from './Drawer';
import type { EvidenceState } from './engineInputs';
import { evidenceKeysForRule } from './engineInputs';
import type { ExpertQuote } from './provenance';
import { humanizeKey } from './labels';
import type { ExpertVoiceState } from './useExpertVoice';

function Section({ icon, heading, children }: { icon: ReactNode; heading: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {icon}
        {heading}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Captions({ voice }: { voice: ExpertVoiceState }) {
  if (!voice.text) return null;
  const spoken = voice.text.slice(0, voice.spokenTo);
  const rest = voice.text.slice(voice.spokenTo);
  return (
    <div className="mt-3 rounded-lg border border-line bg-canvas p-3">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
        <span
          className={cn('size-1.5 rounded-full', voice.speaking ? 'animate-pulse bg-escalate' : 'bg-ink-muted')}
          aria-hidden="true"
        />
        Captions {voice.speaking ? '· speaking' : voice.supported ? '· finished' : '· speech unavailable in this browser'}
      </p>
      <p className="text-sm leading-relaxed" aria-hidden="true">
        <span className="text-ink">{spoken}</span>
        <span className="text-ink-muted/60">{rest}</span>
      </p>
    </div>
  );
}

export function RuleWhyDrawer({
  open,
  onClose,
  action,
  rule,
  pillVersion,
  evidence,
  expert,
  expertName,
  counterfactual,
  voice,
  onHear,
  onStopHearing,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  action: ActionDecision;
  rule: Rule;
  pillVersion: string;
  evidence: EvidenceState;
  expert: ExpertQuote | null;
  expertName: string;
  counterfactual: CounterfactualResult | null;
  voice: ExpertVoiceState;
  onHear: (text: string) => void;
  onStopHearing: () => void;
  /** Escalation / approval controls. */
  footer?: ReactNode;
}) {
  const keys = evidenceKeysForRule(rule);
  const playingThis = voice.speaking && expert !== null && voice.text === expert.quote;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Why: ${rule.id} v${pillVersion}`}
      subtitle={rule.title}
      widthClass="max-w-xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={action.status} />
          <ActionClassChip actionClass={action.actionClass} />
          <span className="font-mono text-[11px] text-ink-muted">
            {action.pillId}@{action.pillVersion}
          </span>
        </div>

        {action.status === 'blocked' ? (
          <p className="rounded-lg border-2 border-escalate bg-escalate/10 px-3 py-2 text-sm font-semibold text-escalate">
            Rule {rule.id} v{pillVersion} — {action.missingEvidence.map(humanizeKey).join(', ')} missing
          </p>
        ) : null}

        <Section icon={<Quote className="size-4 text-accent" aria-hidden="true" />} heading="Expert source">
          {expert ? (
            <>
              <blockquote className="border-l-2 border-accent/50 pl-3 text-sm italic leading-relaxed text-ink">
                “{expert.quote}”
              </blockquote>
              <p className="mt-2 font-mono text-[11px] text-ink-muted">
                {expertName} · {expert.source} · {expert.start}
                {expert.end ? `–${expert.end}` : ''}
                {expert.confirmedBy ? ` · confirmed by ${expert.confirmedBy}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {playingThis ? (
                  <button
                    type="button"
                    onClick={onStopHearing}
                    className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent"
                  >
                    <Square className="size-3.5" aria-hidden="true" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onHear(expert.quote)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:opacity-90"
                  >
                    <Volume2 className="size-3.5" aria-hidden="true" />
                    Hear the expert
                  </button>
                )}
              </div>
              {voice.text === expert.quote ? <Captions voice={voice} /> : null}
            </>
          ) : (
            <p className="text-xs text-ink-muted">
              No transcript quote recorded for this rule ({rule.provenance.join(', ') || 'no provenance ref'}).
            </p>
          )}
        </Section>

        <Section
          icon={<CheckCircle2 className="size-4 text-recommend" aria-hidden="true" />}
          heading="Evidence used"
        >
          <ul className="space-y-1">
            {keys.map((key) => {
              const e = evidence[key];
              const state = !e ? 'absent' : e.confirmed ? 'confirmed' : 'unconfirmed';
              return (
                <li key={key} className="flex flex-wrap items-center gap-2 text-xs">
                  {state === 'confirmed' ? (
                    <CheckCircle2 className="size-3.5 text-recommend" aria-hidden="true" />
                  ) : state === 'unconfirmed' ? (
                    <AlertCircle className="size-3.5 text-approval" aria-hidden="true" />
                  ) : (
                    <CircleDashed className="size-3.5 text-ink-muted" aria-hidden="true" />
                  )}
                  <span className="font-mono text-ink">{key}</span>
                  <span className="text-ink-muted">
                    {state}
                    {e ? ` · ${JSON.stringify(e.value)} · ${e.source}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section icon={<AlertCircle className="size-4 text-escalate" aria-hidden="true" />} heading="Missing evidence">
          {action.missingEvidence.length === 0 ? (
            <p className="text-xs text-recommend">None — all required evidence confirmed.</p>
          ) : (
            <ul className="space-y-1">
              {action.missingEvidence.map((key) => (
                <li key={key} className="flex items-center gap-2 text-xs text-escalate">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  <span className="font-mono">{key}</span>
                  <span className="text-escalate/80">{humanizeKey(key)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          icon={<AlertTriangle className="size-4 text-approval" aria-hidden="true" />}
          heading="What would change the decision?"
        >
          {counterfactual ? (
            <>
              <p className="text-sm text-ink">{counterfactual.summary}</p>
              {counterfactual.ifEvidence.length > 0 ? (
                <p className="mt-1 text-xs text-ink-muted">
                  Status would move from <span className="font-mono">{counterfactual.currentStatus}</span> to{' '}
                  <span className="font-mono">{counterfactual.flipsTo}</span> — still with a named human in the loop.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-ink-muted">No counterfactual available.</p>
          )}
        </Section>

        <Section
          icon={<ShieldAlert className="size-4 text-escalate" aria-hidden="true" />}
          heading="Risk if ignored — forbidden actions"
        >
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-ink">
            {action.forbiddenActions.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Section>

        {footer ? <div className="border-t border-line pt-4">{footer}</div> : null}
      </div>
    </Drawer>
  );
}
