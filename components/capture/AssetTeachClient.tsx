'use client';

// /c/[assetId] client side: open an asset_qr capture task for the signed-in
// role (the store keeps one open task per asset and role, so an open one is
// reused), list the open tasks on this site, and record against the task
// with VoiceCapture.

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { findOpenCaptureTask, resolveAssetRef } from '@/lib/capture';
import type { Pill } from '@/lib/engine';
import { roleLabel, UNRESOLVED_ROLE } from '@/lib/governance/access';
import { getGovernanceStore, useGovernanceStore } from '@/lib/governance/store';
import { useMounted } from '@/components/mosaic/useMounted';
import type { ProposablePill } from './DraftFromNoteTile';
import { newCaptureId, VoiceCapture } from './VoiceCapture';

export interface AssetTeachClientProps {
  assetId: string;
  /** "AHU-23-01" or the site name, for the task prompt. */
  assetLabel: string;
  pills: readonly (ProposablePill & { pill: Pill })[];
}

export function AssetTeachClient({ assetId, assetLabel, pills }: AssetTeachClientProps) {
  const mounted = useMounted();
  const actor = useGovernanceStore((s) => s.currentActor);
  const seedPills = useGovernanceStore((s) => s.seedPills);
  const tasks = useGovernanceStore((s) => s.captureTasks);
  const [taskError, setTaskError] = useState<string | null>(null);
  /** The task this visit answers; kept after it is answered so the result stays on screen. */
  const [bound, setBound] = useState<{ role: string; taskId: string } | null>(null);
  const signedIn = mounted && actor.role !== UNRESOLVED_ROLE;

  // Proposals need the pills in the governance store (no-op when already seeded).
  useEffect(() => {
    seedPills(pills.map((p) => ({ id: p.id, pill: p.pill })));
  }, [pills, seedPills]);

  // Open questions on any asset of this site.
  const siteId = resolveAssetRef(assetId)?.siteId;
  const open = useMemo(
    () => (mounted ? Object.values(tasks).filter((t) => t.status === 'open' && resolveAssetRef(t.assetId)?.siteId === siteId) : []),
    [mounted, tasks, siteId],
  );

  // The scan itself raises the question, addressed to whoever scanned.
  useEffect(() => {
    if (!signedIn || bound?.role === actor.role) return;
    const state = getGovernanceStore().getState();
    const ask = { kind: 'asset_qr' as const, assetId, createdFor: actor.role };
    const existing = findOpenCaptureTask(state.captureTasks, ask);
    try {
      const task =
        existing ??
        state.createCaptureTask({
          id: newCaptureId('CT'),
          ...ask,
          createdAt: new Date().toISOString(),
          prompt: `What should the next person know about ${assetLabel}?`,
        });
      setBound({ role: actor.role, taskId: task.id });
      setTaskError(null);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Could not open a capture task.');
    }
  }, [signedIn, bound, assetId, assetLabel, actor.role]);
  const taskId = bound?.role === actor.role ? bound.taskId : undefined;

  return (
    <div className="space-y-6">
      <section aria-labelledby="open-tasks" className="space-y-2">
        <h2 id="open-tasks" className="flex items-center gap-2 text-[15px] font-semibold text-heading">
          <ClipboardList aria-hidden className="size-4" /> Open questions on this site
        </h2>
        {taskError ? (
          <p role="alert" className="text-sm text-blocked">
            {taskError}
          </p>
        ) : null}
        {open.length === 0 ? (
          <p className="text-sm text-ink-muted">{signedIn ? 'None open.' : 'Sign in to see the questions for your role.'}</p>
        ) : (
          <ul className="space-y-2">
            {open.map((t) => (
              <li key={t.id} className="rounded-lg border border-line bg-surface px-3 py-2.5">
                <p className="text-[15px] text-ink">{t.prompt}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  For {roleLabel(t.createdFor)} · <span className="font-mono">{t.assetId}</span> · <span className="font-mono">{t.id}</span>
                  {t.id === taskId ? ' · answer it below' : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {signedIn && !taskId && !taskError ? null : (
        <VoiceCapture key={actor.role} assetId={assetId} taskId={taskId} pills={pills} />
      )}
    </div>
  );
}
