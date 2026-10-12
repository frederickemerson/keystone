'use client';

import type { ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Quote,
  ShieldAlert,
  Square,
} from 'lucide-react';
import { ActionClassChip, ExpertQuote, StatusBadge } from '@/components/mosaic';
import { roleLabel } from '@/lib/governance/access';
import type { ActionDecision, CounterfactualResult, Rule } from '@/lib/engine/types';
import { cn } from '@/lib/ui/cn';
import { Drawer } from './Drawer';
import type { EvidenceState } from './engineInputs';
import type { ExpertQuote as ExpertQuoteSource } from './provenance';
import { humanizeKey } from './labels';
import type { ExpertVoiceState } from './useExpertVoice';
import { sourceLabel } from '@/lib/connectors/registry';

function Section({ icon, heading, children }: { icon: ReactNode; heading: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
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
      <p className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
        <span
          className={cn('size-1.5 rounded-full', voice.speaking ? 'animate-pulse bg-marker' : 'bg-ink-muted')}
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
  pillName,
  evidence,
  evidenceKeys,
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
  /** Human pill name ("Chilled water leak"); the id is shown without it. */
  pillName?: string;
  evidence: EvidenceState;
  /** Evidence keys the rule reads here (engineInputs.evidenceKeysForRule). */
  evidenceKeys: string[];
  expert: ExpertQuoteSource | null;
  expertName: string;
  counterfactual: CounterfactualResult | null;
  voice: ExpertVoiceState;
  onHear: (text: string) => void;
  onStopHearing: () => void;
  /** Escalation / approval controls. */
  footer?: ReactNode;
}) {
  const keys = evidenceKeys;
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
          <span className="text-[12px] text-ink-muted">
            {pillName ? `${pillName} v${action.pillVersion}` : `${action.pillId}@${action.pillVersion}`}
          </span>
        </div>

        {action.status === 'blocked' ? (
          <p className="flex items-start gap-2 rounded-lg border border-blocked/45 bg-blocked-tint px-3.5 py-2.5 text-sm font-semibold text-blocked">
            <Ban className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Rule <span className="font-mono">{rule.id}</span> v{pillVersion} —{' '}
              {action.missingEvidence.map(humanizeKey).join(', ')} missing
            </span>
          </p>
        ) : null}

        <Section icon={<Quote className="size-4 text-ink-muted" aria-hidden="true" />} heading="Expert source">
          {expert ? (
            <>
              <ExpertQuote
                quote={expert.quote}
                expert={expertName}
                role={roleLabel(rule.owner)}
                timestamp={`${expert.start}${expert.end ? `–${expert.end}` : ''}`}
                onPlay={playingThis ? undefined : () => onHear(expert.quote)}
                action={
                  playingThis ? (
                    <button type="button" onClick={onStopHearing} className="btn-pill text-xs">
                      <Square className="size-3.5" aria-hidden="true" />
                      Stop
                    </button>
                  ) : undefined
                }
              />
              <p className="mt-2 pl-[18px] font-mono text-[11px] text-ink-muted">
                {expert.source}
                {expert.confirmedBy ? ` · confirmed by ${expert.confirmedBy}` : ''}
              </p>
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
                    {e ? ` · ${JSON.stringify(e.value)} · ${sourceLabel(e.source)}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section icon={<AlertCircle className="size-4 text-blocked" aria-hidden="true" />} heading="Missing evidence">
          {action.missingEvidence.length === 0 ? (
            <p className="text-xs text-recommend">None — all required evidence confirmed.</p>
          ) : (
            <ul className="space-y-1">
              {action.missingEvidence.map((key) => (
                <li key={key} className="flex items-center gap-2 text-xs text-blocked">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  <span className="font-mono">{key}</span>
                  <span className="text-ink-muted">{humanizeKey(key)}</span>
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
          icon={<ShieldAlert className="size-4 text-blocked" aria-hidden="true" />}
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
