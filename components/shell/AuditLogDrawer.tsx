'use client';

// Top-bar audit drawer: the governance store's append-only log, newest first.
// Lives in the shared AppShell so every screen can inspect who did what.

import { useRef } from 'react';
import { X } from 'lucide-react';
import { useGovernanceStore } from '@/lib/governance/store';
import { roleLabel } from '@/lib/governance/access';
import { useModalDialog } from '@/components/mosaic/useModalDialog';

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

/**
 * Modal dialog: focus moves into the panel on open, Tab / Shift+Tab cycle
 * inside it, Escape closes, and focus returns to whatever opened it.
 */
export function AuditLogDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const audit = useGovernanceStore((s) => s.audit);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useModalDialog({ open, onClose, panelRef, initialFocusRef: closeRef });

  if (!open) return null;

  const newestFirst = [...audit].reverse();

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div className="absolute inset-0 bg-cocoa-ink/30" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-log-title"
        tabIndex={-1}
        className="relative flex h-full w-full max-w-lg flex-col border-l border-line-strong bg-canvas shadow-lift outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <h2 id="audit-log-title" className="text-[22px] font-semibold leading-tight">
              Audit log
            </h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              Append-only. Who / when / pill version / action / outcome.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close audit log"
            className="grid size-10 shrink-0 place-items-center rounded-full border-[1.5px] border-ink text-ink transition-[background-color,scale] duration-150 hover:bg-dew-drop active:scale-[0.96]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 py-5 outline-offset-[-2px]"
          tabIndex={0}
          role="region"
          aria-label={`Audit events, newest first (${newestFirst.length})`}
        >
          {newestFirst.length === 0 ? (
            <p className="text-sm text-ink-muted">No audit events yet.</p>
          ) : (
            <ol className="space-y-2">
              {newestFirst.map((e) =>
                e.action === 'demo_reset' ? (
                  // A reset starts a new run: draw it as a divider so the
                  // events below it read as the previous run, not this one.
                  <li
                    key={e.id}
                    className="flex items-center gap-3 py-2 text-xs"
                  >
                    <span className="h-px flex-1 bg-marker-ink/40" aria-hidden="true" />
                    <span className="rounded-full border border-marker-ink/40 bg-surface px-3 py-1 text-center font-medium text-marker-ink">
                      Demo reset · {e.actor} ·{' '}
                      <time dateTime={e.at} className="font-mono tabular-nums">
                        {formatAt(e.at)}
                      </time>
                      <span className="block text-[11px] font-normal text-ink-muted">Earlier runs below</span>
                    </span>
                    <span className="h-px flex-1 bg-marker-ink/40" aria-hidden="true" />
                  </li>
                ) : (
                  <li key={e.id} className="rounded-xl border border-line bg-surface px-4 py-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-ink-muted">{e.id}</span>
                      <time dateTime={e.at} className="font-mono tabular-nums text-ink">
                        {formatAt(e.at)}
                      </time>
                      <span className="rounded-full border border-line bg-dew-drop px-2 py-0.5 font-medium text-ink">
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
                    <p className="mt-1.5 text-[13px] text-ink">
                      {e.actor} <span className="text-ink-muted">({roleLabel(e.role)})</span>
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{e.detail}</p>
                  </li>
                ),
              )}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
