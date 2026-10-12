'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Quote, Check, Pencil, X, ArrowUpRight, ShieldAlert, CheckCircle2, Ban } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { Rule } from '@/lib/engine/types';
import { PersonaName } from './PersonaName';
import { ExpertQuote } from './ExpertQuote';
import { Disclosure } from './Disclosure';

export function RuleTile({
  rule,
  confirmed,
  provenance,
  onConfirm,
  onEdit,
  onReject,
  onShowProvenance,
  actionsDisabledReason,
  className,
}: {
  /** When set, Confirm / Edit / Reject are disabled and this reason is shown. */
  actionsDisabledReason?: string;
  rule: Rule;
  /** Confirmation state from the Decision Canvas: true=confirmed, false=rejected, undefined=pending. */
  confirmed?: boolean;
  /** `expert` (optional) is the attribution name; defaults to "onboarding interview". */
  provenance?: { quote: string; timestamp: string; expert?: string };
  onConfirm?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
  onShowProvenance?: () => void;
  className?: string;
}) {
  // The provenance quote opens on hover or keyboard focus of the quote button
  // (a preview), and a click pins it open. Escape or a click outside closes it.
  const [pinned, setPinned] = useState(false);
  const [peek, setPeek] = useState(false);
  const provOpen = pinned || peek;
  const popRef = useRef<HTMLDivElement>(null);
  const provId = `rule-${rule.id}-provenance`;

  useEffect(() => {
    if (!pinned) return;
    function onDown(event: MouseEvent) {
      if (popRef.current && !popRef.current.contains(event.target as Node)) {
        setPinned(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pinned]);

  const ring =
    confirmed === true
      ? 'border-recommend ring-2 ring-recommend/25'
      : confirmed === false
        ? 'border-blocked ring-2 ring-blocked/20'
        : 'border-line-strong';

  const conditionPaths = [
    ...rule.trigger.all.map((c) => c.path),
    ...rule.trigger.any.map((c) => c.path),
  ];

  return (
    <article
      className={cn('flex flex-col gap-3 rounded-xl border bg-surface p-4 shadow-card', ring, className)}
      aria-labelledby={`rule-${rule.id}-title`}
    >
      <div
        className="flex flex-col gap-3"
        onMouseEnter={() => setPeek(true)}
        onMouseLeave={() => setPeek(false)}
      >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs font-medium text-ink-muted">{rule.id}</p>
          <h3 id={`rule-${rule.id}-title`} className="mt-0.5 text-[15px] font-semibold leading-snug text-ink">
            {rule.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setPinned((v) => !v);
            onShowProvenance?.();
          }}
          onFocus={() => setPeek(true)}
          onBlur={() => setPeek(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setPinned(false);
              setPeek(false);
            }
          }}
          aria-expanded={provOpen}
          aria-controls={provenance ? provId : undefined}
          aria-label={`Show the expert's words for ${rule.id}`}
          title="The expert's words this rule came from"
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full border-[1.5px] border-ink text-ink transition-[background-color,scale] duration-150 hover:bg-dew-drop active:scale-[0.96]',
            provOpen && 'bg-dew-drop',
          )}
        >
          <Quote className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {provOpen && provenance ? (
        <div
          ref={popRef}
          id={provId}
          role="note"
          aria-label={`Provenance for ${rule.id}`}
          className="relative rounded-lg border border-line bg-dew-drop/70 px-3 pb-3 pt-4"
        >
          <ExpertQuote
            size="sm"
            quote={provenance.quote}
            expert={provenance.expert ?? 'onboarding interview'}
            timestamp={provenance.timestamp}
          />
        </div>
      ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-line bg-dew-drop px-2 py-0.5 font-mono text-xs text-ink">
          {rule.trigger.incident_type}
        </span>
        <span className="text-xs tabular-nums text-ink-muted">
          {[
            conditionPaths.length > 0 ? `${conditionPaths.length} condition(s)` : null,
            rule.required_evidence.length > 0
              ? `${rule.required_evidence.length} evidence key${rule.required_evidence.length === 1 ? '' : 's'}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>

      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-[13px]">
        <dt className="flex items-center gap-1.5 text-ink-muted">
          <ShieldAlert className="size-3.5" aria-hidden="true" /> Owner
        </dt>
        <dd className="min-w-0 text-ink">
          <PersonaName role={rule.owner} nameOnly />
        </dd>
        <dt className="flex items-center gap-1.5 text-ink-muted">
          <ArrowUpRight className="size-3.5 text-escalate-mark" aria-hidden="true" /> Escalate
        </dt>
        <dd className="min-w-0 text-ink">
          <PersonaName role={rule.escalate_to.role} nameOnly />
        </dd>
      </dl>

      <Disclosure
        label="Details"
        summary={[
          rule.allowed_actions.length ? `${rule.allowed_actions.length} allowed` : null,
          rule.forbidden_actions.length ? `${rule.forbidden_actions.length} forbidden` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      >
        <div className="flex flex-col gap-3">
          <Field label="Decision">
            <p className="text-pretty text-[14px] leading-relaxed text-ink">{rule.decision}</p>
          </Field>

          {rule.required_evidence.length > 0 ? (
            <Field label="Evidence">
              <div className="flex flex-wrap gap-1">
                {rule.required_evidence.map((key) => (
                  <span
                    key={key}
                    className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[11px] text-ink"
                  >
                    {key}
                  </span>
                ))}
              </div>
            </Field>
          ) : null}

          {rule.allowed_actions.length > 0 ? (
            <Field label="Allowed">
              <ul className="space-y-0.5">
                {rule.allowed_actions.map((a) => (
                  <li key={a} className="flex items-start gap-1.5 text-[13px] text-ink">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-recommend" aria-hidden="true" /> {a}
                  </li>
                ))}
              </ul>
            </Field>
          ) : null}

          {rule.forbidden_actions.length > 0 ? (
            <Field label="Forbidden">
              <ul className="space-y-0.5">
                {rule.forbidden_actions.map((a) => (
                  <li key={a} className="flex items-start gap-1.5 text-[13px] text-blocked">
                    <Ban className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {a}
                  </li>
                ))}
              </ul>
            </Field>
          ) : null}

          <Field label="People">
            <dl className="space-y-0.5 text-[13px] text-ink">
              <div>
                <dt className="inline text-ink-muted">Owner: </dt>
                <dd className="inline">
                  <PersonaName role={rule.owner} />
                </dd>
              </div>
              <div>
                <dt className="inline text-ink-muted">Escalate to: </dt>
                <dd className="inline">
                  <PersonaName role={rule.escalate_to.role} />
                </dd>
              </div>
              {rule.escalate_to.fallback ? (
                <div>
                  <dt className="inline text-ink-muted">Fallback: </dt>
                  <dd className="inline">
                    <PersonaName role={rule.escalate_to.fallback} />
                  </dd>
                </div>
              ) : null}
            </dl>
          </Field>
        </div>
      </Disclosure>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={Boolean(actionsDisabledReason)}
          title={actionsDisabledReason}
          className={cn('btn-pill text-xs', confirmed === true && 'border-recommend bg-recommend-tint text-recommend')}
        >
          <Check className="size-3.5" aria-hidden="true" /> Confirm
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={Boolean(actionsDisabledReason)}
          title={actionsDisabledReason}
          className="btn-pill text-xs"
        >
          <Pencil className="size-3.5" aria-hidden="true" /> Edit
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={Boolean(actionsDisabledReason)}
          title={actionsDisabledReason}
          className={cn('btn-pill text-xs', confirmed === false && 'border-blocked bg-blocked-tint text-blocked')}
        >
          <X className="size-3.5" aria-hidden="true" /> Reject
        </button>
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-ink-muted">{label}</p>
      {children}
    </div>
  );
}
