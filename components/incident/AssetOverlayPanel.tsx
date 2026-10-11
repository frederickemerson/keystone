'use client';

import { ArrowRight, Building2, Server } from 'lucide-react';
import type { Pill, Rule } from '@/lib/engine/types';
import type { AssetRecord } from '@/lib/data/schemas';
import { redactText } from '@/lib/governance/access';
import { cn } from '@/lib/ui/cn';
import { assetTypeLabel, personLabel, type PersonRef } from './labels';

interface OverrideRow {
  ruleId: string;
  title: string;
  changes: { field: string; before: string; after: string }[];
  exceptionNotes: string[];
}

function overrideRows(pills: readonly Pill[], assetType: string, people: readonly PersonRef[]): OverrideRow[] {
  const rows: OverrideRow[] = [];
  for (const pill of pills) {
    for (const rule of pill.rules) {
      const o = rule.asset_overrides?.[assetType];
      const changes: OverrideRow['changes'] = [];
      if (o?.escalate_to) {
        changes.push({
          field: 'Escalate to',
          before: personLabel(rule.escalate_to.role, people),
          after: personLabel(o.escalate_to.role, people),
        });
      }
      if (o?.action_class) changes.push({ field: 'Action class', before: rule.action_class, after: o.action_class });
      if (o?.deadline_minutes !== undefined) {
        changes.push({
          field: 'Deadline',
          before: rule.deadline_minutes == null ? 'none' : `${rule.deadline_minutes} min`,
          after: o.deadline_minutes == null ? 'none' : `${o.deadline_minutes} min`,
        });
      }
      const exceptionNotes = assetExceptions(rule, assetType);
      if (changes.length > 0 || exceptionNotes.length > 0) {
        rows.push({ ruleId: rule.id, title: rule.title, changes, exceptionNotes });
      }
    }
  }
  return rows;
}

/** Exceptions whose condition is exactly "asset.type eq <assetType>". */
function assetExceptions(rule: Rule, assetType: string): string[] {
  return rule.exceptions
    .filter((ex) => ex.when.some((c) => c.path === 'asset.type' && c.op === 'eq' && c.value === assetType))
    .map((ex) => ex.note);
}

function slaGate(asset: AssetRecord, role: string): { label: string; minutes: number; party: string } | null {
  if (asset.anchor_tenant) {
    return {
      label: 'Tenant first notice',
      minutes: asset.anchor_tenant.sla_first_notice_min,
      party: redactText(asset.anchor_tenant.name, role, 'tenant_pii'),
    };
  }
  const client = asset.clients?.[0];
  if (client) {
    return {
      label: `Client SLA notification (${client.sla_tier})`,
      minutes: client.sla_notification_min,
      party: redactText(client.name, role, 'commercial'),
    };
  }
  return null;
}

export function AssetOverlayPanel({
  pills,
  baseAsset,
  overlayAsset,
  activeAssetId,
  role,
  triggeredDiff,
}: {
  pills: readonly Pill[];
  baseAsset: AssetRecord;
  overlayAsset: AssetRecord;
  activeAssetId: string;
  role: string;
  /** Rules triggered at end of timeline on one asset but not the other (engine output). */
  triggeredDiff: { onlyBase: string[]; onlyOverlay: string[] };
}) {
  const rows = overrideRows(pills, overlayAsset.type, overlayAsset.people);
  const baseSla = slaGate(baseAsset, role);
  const overlaySla = slaGate(overlayAsset, role);
  const overlayActive = activeAssetId === overlayAsset.id;

  return (
    <section
      aria-label="Asset overlay"
      className={cn(
        'rounded-xl border p-5',
        overlayActive ? 'border-line-strong bg-dew-drop' : 'border-line bg-surface',
      )}
    >
      <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
        <Building2 className="size-4 text-ink-muted" aria-hidden="true" />
        {baseAsset.name}
        <ArrowRight className="size-4 text-ink-muted" aria-hidden="true" />
        <Server className="size-4 text-ink-muted" aria-hidden="true" />
        {overlayAsset.name}
        <span className="text-xs font-normal text-ink-muted">
          Same pills, {assetTypeLabel(overlayAsset.type)} overrides
        </span>
      </h3>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[
          { asset: baseAsset, sla: baseSla },
          { asset: overlayAsset, sla: overlaySla },
        ].map(({ asset, sla }) => (
          <div
            key={asset.id}
            className={cn(
              'rounded-lg border p-2.5 text-xs',
              asset.id === activeAssetId ? 'border-accent/60 bg-surface' : 'border-line bg-surface-raised/40',
            )}
          >
            <p className="font-medium text-ink">{asset.name}</p>
            {sla ? (
              <p className="mt-1 text-ink-muted">
                SLA gate: <span className="font-semibold text-ink">{sla.label}</span> within{' '}
                <span className="font-semibold tabular-nums text-escalate">{sla.minutes} min</span> · {sla.party}
              </p>
            ) : (
              <p className="mt-1 text-ink-muted">No SLA gate on file.</p>
            )}
          </div>
        ))}
      </div>

      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.ruleId} className="rounded-lg border border-line bg-surface p-2.5 text-xs">
            <p className="font-medium text-ink">
              <span className="font-mono">{r.ruleId}</span> · {r.title}
            </p>
            {r.changes.map((c) => (
              <p key={c.field} className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-ink-muted">{c.field}:</span>
                <span className="text-ink-muted line-through">{c.before}</span>
                <ArrowRight className="size-3 text-ink-muted" aria-hidden="true" />
                <span className="font-semibold text-ink underline decoration-marker decoration-2 underline-offset-2">{c.after}</span>
              </p>
            ))}
            {r.exceptionNotes.map((n) => (
              <p key={n} className="mt-1 text-ink-muted">
                Exception for {assetTypeLabel(overlayAsset.type)}: <span className="text-ink">{n}</span>
              </p>
            ))}
          </li>
        ))}
      </ul>

      {triggeredDiff.onlyBase.length + triggeredDiff.onlyOverlay.length > 0 ? (
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <p className="rounded-lg border border-line p-2.5">
            <span className="text-ink-muted">Fires only on {baseAsset.name}: </span>
            <span className="font-mono text-ink">{triggeredDiff.onlyBase.join(', ') || '—'}</span>
          </p>
          <p className="rounded-lg border border-line p-2.5">
            <span className="text-ink-muted">Fires only on {overlayAsset.name}: </span>
            <span className="font-mono text-ink">{triggeredDiff.onlyOverlay.join(', ') || '—'}</span>
          </p>
        </div>
      ) : null}
    </section>
  );
}
