import type { ReactNode } from 'react';
import {
  Activity,
  Wrench,
  Phone,
  HardHat,
  Truck,
  Zap,
  Lock,
  Check,
  AlertCircle,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { TimelineEvent, TimelineSource } from './types';
import { humanizeKey } from '@/components/incident/labels';

const SOURCE_MAP: Record<string, { icon: LucideIcon; label: string }> = {
  iBMS: { icon: Activity, label: 'iBMS' },
  CMMS: { icon: Wrench, label: 'CMMS' },
  tenant: { icon: Phone, label: 'Tenant' },
  technician: { icon: HardHat, label: 'Technician' },
  contractor: { icon: Truck, label: 'Contractor' },
  LEW: { icon: Zap, label: 'LEW' },
};

function sourceIcon(source: TimelineSource): { icon: LucideIcon; label: string } {
  return SOURCE_MAP[source] ?? { icon: FileText, label: source };
}

// Deterministic wall-clock time in Singapore, identical on server and client —
// never use toLocaleTimeString, which depends on the viewer's timezone.
const SGT_TIME = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Asia/Singapore',
});

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return SGT_TIME.format(d);
}

const SENSITIVE = new Set(['tenant_pii', 'commercial']);

export function EvidenceTimeline({
  events,
  highlightId,
  className,
  renderExtra,
}: {
  events: TimelineEvent[];
  /** Event id to highlight as newest. Defaults to the last event in the list. */
  highlightId?: string;
  className?: string;
  /** Optional content rendered inside an event's card, below its evidence updates. */
  renderExtra?: (event: TimelineEvent) => ReactNode;
}) {
  if (events.length === 0) {
    return (
      <p className={cn('text-sm text-ink-muted', className)}>No timeline events yet.</p>
    );
  }

  const newestId = highlightId ?? events[events.length - 1]?.id;

  return (
    <ol className={cn('relative space-y-4', className)} aria-label="Evidence timeline">
      {events.map((event, i) => {
        const { icon: Icon, label } = sourceIcon(event.source);
        const isNewest = event.id === newestId;
        const sensitive = event.sensitivity ? SENSITIVE.has(event.sensitivity) : false;
        const updates = event.evidence_updates ?? {};

        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-full border',
                  isNewest
                    ? 'border-line-strong bg-ink text-canvas'
                    : 'border-line bg-dew-drop text-ink-muted',
                )}
                aria-hidden="true"
              >
                <Icon className="size-4" />
              </span>
              {i < events.length - 1 ? <span className="mt-1 w-px flex-1 bg-line" aria-hidden="true" /> : null}
            </div>

            <div
              className={cn(
                'flex-1 rounded-xl border px-4 py-3',
                isNewest ? 'border-line-strong bg-surface shadow-card' : 'border-line bg-surface',
              )}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <time className="font-mono font-medium tabular-nums text-ink" dateTime={event.at}>
                  {formatTime(event.at)}
                </time>
                <span className="rounded-full border border-line bg-dew-drop px-2 py-0.5 font-medium text-ink">
                  {label}
                </span>
                {event.type ? (
                  <span className="text-ink-muted">{humanizeKey(event.type)}</span>
                ) : null}
                {isNewest ? (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-canvas">
                    Newest
                  </span>
                ) : null}
                {sensitive ? (
                  <span title={`Sensitivity: ${event.sensitivity}`} className="inline-flex">
                    <Lock
                      className="size-3.5 text-ink-muted"
                      role="img"
                      aria-label={`Sensitivity: ${event.sensitivity} (masked by role)`}
                    />
                  </span>
                ) : null}
              </div>

              <p className="mt-1.5 text-[14px] leading-normal text-ink">{event.text}</p>

              {Object.keys(updates).length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Evidence updates">
                  {Object.entries(updates).map(([key, upd]) => (
                    <span
                      key={key}
                      title={`${key}: ${String(upd.value)} (${upd.confirmed ? 'confirmed' : 'unconfirmed'})`}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        upd.confirmed
                          ? 'border-recommend/40 bg-recommend-tint text-recommend'
                          : 'border-line bg-dew-drop text-ink-muted',
                      )}
                    >
                      {upd.confirmed ? (
                        <Check className="size-3" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="size-3" aria-hidden="true" />
                      )}
                      <span className="font-mono">{key}</span>
                      <span className="sr-only">
                        {upd.confirmed ? 'confirmed' : 'unconfirmed'}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}
              {renderExtra?.(event)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
