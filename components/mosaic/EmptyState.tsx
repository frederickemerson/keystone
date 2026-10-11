import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { ReactNode } from 'react';
import { Sticker, type StickerKind } from './Sticker';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  sticker,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Optional decorative sticker shown instead of the icon (empty states only). */
  sticker?: StickerKind;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed border-line bg-surface/60 px-6 py-10 text-center',
        className,
      )}
    >
      {sticker ? (
        <Sticker kind={sticker} size={44} rotate={-6} />
      ) : (
        <span className="grid size-10 place-items-center rounded-full border border-line bg-dew-drop text-ink-muted">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}
      <div>
        <p className="text-[15px] font-medium text-ink">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-[52ch] text-[13px] text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
