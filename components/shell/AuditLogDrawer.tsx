'use client';

// Top-bar audit drawer: the governance store's append-only log, newest first.
// Lives in the shared AppShell so every screen can inspect who did what.

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useGovernanceStore } from '@/lib/governance/store';
import { roleLabel } from '@/lib/governance/access';

// Deterministic wall-clock in Singapore, identical on server and client.
// (en-GB renders 24-hour time by default.)
const SGT_DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'Asia/Singapore',
});

function formatAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : SGT_DATE_TIME.format(d);
}

function actionLabel(action: string): string {
  return action.replace(/_/g, ' ');
}

export function AuditLogDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const audit = useGovernanceStore((s) => s.audit);
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  const newestFirst = [...audit].reverse();

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Audit log"
        tabIndex={-1}
        className="relative flex h-full w-full max-w-lg flex-col border-l border-line bg-surface shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">Audit log</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Append-only. Who / when / pill version / action / outcome.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit log"
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-raised hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {newestFirst.length === 0 ? (
            <p className="text-sm text-ink-muted">No audit events yet.</p>
          ) : (
            <ol className="space-y-2">
              {newestFirst.map((e) => (
                <li key={e.id} className="rounded-lg border border-line bg-surface-raised/40 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-ink-muted">{e.id}</span>
                    <time dateTime={e.at} className="tabular-nums text-ink">
                      {formatAt(e.at)}
                    </time>
                    <span className="rounded bg-surface px-1.5 py-0.5 font-medium text-ink">
                      {actionLabel(e.action)}
                    </span>
                    {e.ruleId ? <span className="font-mono text-ink">{e.ruleId}</span> : null}
                    {e.pillId ? (
                      <span className="font-mono text-ink-muted">
                        {e.pillId}
                        {e.pillVersion ? `@${e.pillVersion}` : ''}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-ink">
                    {e.actor} <span className="text-ink-muted">({roleLabel(e.role)})</span>
                  </p>
                  <p className="mt-0.5 text-ink-muted">{e.detail}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}
