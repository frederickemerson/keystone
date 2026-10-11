import { Plus, Minus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { DiffItem, DiffKind } from './types';

function kindOf(item: DiffItem): DiffKind {
  if (item.kind) return item.kind;
  if (item.before && item.after) return 'change';
  return item.after ? 'add' : 'remove';
}

export function DiffView({ changes, className }: { changes: DiffItem[]; className?: string }) {
  return (
    <ul className={cn('space-y-2', className)} aria-label="Version diff">
      {changes.map((item, i) => {
        const kind = kindOf(item);
        const Icon = kind === 'add' ? Plus : kind === 'remove' ? Minus : ArrowRight;
        const tone =
          kind === 'add'
            ? 'text-recommend'
            : kind === 'remove'
              ? 'text-blocked'
              : 'text-approval';

        return (
          <li key={i} className="rounded-xl border border-line-strong bg-surface p-3 shadow-card">
            <div className={cn('flex items-center gap-1.5 font-mono text-xs font-medium', tone)}>
              <Icon className="size-3.5" aria-hidden="true" />
              <span>{item.label}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[13px] leading-snug">
              {item.before ? (
                <div className="rounded-lg border border-blocked/30 bg-blocked-tint px-2.5 py-2">
                  <span className="sr-only">Before:</span>
                  <span className="text-blocked line-through decoration-blocked/50">
                    {item.before}
                  </span>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-line bg-dew-drop/60 px-2.5 py-2 text-ink-muted">
                  <span className="sr-only">Before:</span>—
                </div>
              )}
              {item.after ? (
                <div className="rounded-lg border border-recommend/30 bg-recommend-tint px-2.5 py-2">
                  <span className="sr-only">After:</span>
                  <span className="text-recommend">{item.after}</span>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-line bg-dew-drop/60 px-2.5 py-2 text-ink-muted">
                  <span className="sr-only">After:</span>—
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
