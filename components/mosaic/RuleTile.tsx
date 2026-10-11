'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Quote, Check, Pencil, X, ArrowUpRight, ShieldAlert, CheckCircle2, Ban } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { Rule } from '@/lib/engine/types';

export function RuleTile({
  rule,
  confirmed,
  provenance,
  onConfirm,
  onEdit,
  onReject,
  onShowProvenance,
  className,
}: {
  rule: Rule;
  /** Confirmation state from the Decision Canvas: true=confirmed, false=rejected, undefined=pending. */
  confirmed?: boolean;
  provenance?: { quote: string; timestamp: string };
  onConfirm?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
  onShowProvenance?: () => void;
  className?: string;
}) {
  const [provOpen, setProvOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!provOpen) return;
    function onDown(event: MouseEvent) {
      if (popRef.current && !popRef.current.contains(event.target as Node)) {
        setProvOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [provOpen]);

  const ring =
    confirmed === true
      ? 'ring-2 ring-recommend/40'
      : confirmed === false
        ? 'ring-2 ring-escalate/40'
        : 'ring-1 ring-line';

  const conditionPaths = [
    ...rule.trigger.all.map((c) => c.path),
    ...rule.trigger.any.map((c) => c.path),
  ];

  return (
    <article
      className={cn('flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 ring-inset', ring, className)}
      aria-labelledby={`rule-${rule.id}-title`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] text-ink-muted">{rule.id}</p>
          <h3 id={`rule-${rule.id}-title`} className="text-sm font-semibold leading-snug text-ink">
            {rule.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setProvOpen((v) => !v);
            onShowProvenance?.();
          }}
          aria-expanded={provOpen}
          aria-label="Show provenance"
          className="rounded-md border border-line bg-surface-raised p-1.5 text-ink-muted hover:border-accent hover:text-ink"
        >
          <Quote className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {provOpen && provenance ? (
        <div
          ref={popRef}
          role="note"
          className="relative rounded-lg border border-line bg-surface-raised p-2.5 text-xs"
        >
          <p className="font-mono text-[10px] text-ink-muted">Provenance</p>
          <blockquote className="mt-1 border-l-2 border-accent/40 pl-2 italic text-ink">
            “{provenance.quote}”
          </blockquote>
          <p className="mt-1 font-mono text-[11px] text-ink-muted">{provenance.timestamp}</p>
        </div>
      ) : null}

      <Field label="Trigger">
        <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-ink">
          {rule.trigger.incident_type}
        </span>
        {conditionPaths.length > 0 ? (
          <span className="text-ink-muted"> · {conditionPaths.length} condition(s)</span>
        ) : null}
      </Field>

      <Field label="Evidence">
        <div className="flex flex-wrap gap-1">
          {rule.required_evidence.map((key) => (
            <span
              key={key}
              className="rounded border border-line bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-ink"
            >
              {key}
            </span>
          ))}
        </div>
      </Field>

      <Field label="Decision">
        <p className="text-sm text-ink">{rule.decision}</p>
      </Field>

      {rule.allowed_actions.length > 0 ? (
        <Field label="Allowed">
          <ul className="space-y-0.5">
            {rule.allowed_actions.map((a) => (
              <li key={a} className="flex items-center gap-1.5 text-xs text-recommend">
                <CheckCircle2 className="size-3.5" aria-hidden="true" /> {a}
              </li>
            ))}
          </ul>
        </Field>
      ) : null}

      {rule.forbidden_actions.length > 0 ? (
        <Field label="Forbidden">
          <ul className="space-y-0.5">
            {rule.forbidden_actions.map((a) => (
              <li key={a} className="flex items-center gap-1.5 text-xs text-escalate">
                <Ban className="size-3.5" aria-hidden="true" /> {a}
              </li>
            ))}
          </ul>
        </Field>
      ) : null}

      <Field label="Escalation">
        <p className="flex items-center gap-1.5 text-xs text-ink">
          <ArrowUpRight className="size-3.5 text-approval" aria-hidden="true" />
          {rule.escalate_to.role}
          {rule.escalate_to.fallback ? (
            <span className="text-ink-muted"> → fallback: {rule.escalate_to.fallback}</span>
          ) : null}
        </p>
      </Field>

      <Field label="Owner">
        <p className="flex items-center gap-1.5 text-xs text-ink">
          <ShieldAlert className="size-3.5 text-ink-muted" aria-hidden="true" />
          {rule.owner}
        </p>
      </Field>

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-1.5 rounded-md bg-recommend/15 px-2.5 py-1.5 text-xs font-medium text-recommend hover:bg-recommend/25"
        >
          <Check className="size-3.5" aria-hidden="true" /> Confirm
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-ink hover:border-accent"
        >
          <Pencil className="size-3.5" aria-hidden="true" /> Edit
        </button>
        <button
          type="button"
          onClick={onReject}
          className="inline-flex items-center gap-1.5 rounded-md bg-escalate/15 px-2.5 py-1.5 text-xs font-medium text-escalate hover:bg-escalate/25"
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
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      {children}
    </div>
  );
}
