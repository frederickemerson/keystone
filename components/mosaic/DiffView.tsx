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
              ? 'text-escalate'
              : 'text-approval';

        return (
          <li key={i} className="rounded-lg border border-line bg-surface p-2.5">
            <div className={cn('flex items-center gap-1.5 text-xs font-semibold', tone)}>
              <Icon className="size-3.5" aria-hidden="true" />
              <span>{item.label}</span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
              {item.before ? (
                <div className="rounded border border-escalate/30 bg-escalate/5 p-1.5">
                  <span className="sr-only">Before:</span>
                  <span className="text-escalate/90 line-through decoration-escalate/40">
                    {item.before}
                  </span>
                </div>
              ) : (
                <div className="rounded border border-line bg-surface-raised/50 p-1.5 text-ink-muted">
                  <span className="sr-only">Before:</span>—
                </div>
              )}
              {item.after ? (
                <div className="rounded border border-recommend/30 bg-recommend/5 p-1.5">
                  <span className="sr-only">After:</span>
                  <span className="text-recommend/90">{item.after}</span>
                </div>
              ) : (
                <div className="rounded border border-line bg-surface-raised/50 p-1.5 text-ink-muted">
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
