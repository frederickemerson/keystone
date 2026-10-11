import type { ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

/**
 * The name-label sticker from a school exercise book, repurposed as a pill's
 * identity card: the name is handwritten (the expert's), everything the system
 * governs — class, roll no. (version) — is typeset; owner and approver appear
 * as small signatures. Structured as a description list so assistive tech
 * reads "Name / Class / Version / Owner / Approver" pairs.
 */
export function PillLabel({
  name,
  pillClass,
  version,
  owner,
  approver,
  status,
  rotate = 0,
  size = 'md',
  nameAs: NameTag = 'p',
  nameId,
  className,
}: {
  /** Handwritten pill name, e.g. "chilled-water leak". */
  name: string;
  /** The "class" field — the pill's domain, e.g. "Technical Services". */
  pillClass: string;
  /** The "roll no." field — the semantic version, e.g. "1.2.0" or "v1.2.0". */
  version: string;
  /** Owner name, shown as a signature. */
  owner?: string;
  /** Approver name, shown as a signature. */
  approver?: string;
  /** Optional slot beside the name (e.g. a lifecycle chip). */
  status?: ReactNode;
  /** Degrees; keep 0 in app screens, −3…3 for hero moments. */
  rotate?: number;
  size?: 'sm' | 'md' | 'lg';
  /** Element used for the handwritten name (use h2/h3 when it is the card title). */
  nameAs?: 'p' | 'h2' | 'h3';
  nameId?: string;
  className?: string;
}) {
  const v = /^\d/.test(version) ? `v${version}` : version;
  const nameSize = { sm: 'text-[22px]', md: 'text-[27px]', lg: 'text-[36px]' }[size];
  const signature = size === 'lg' ? 'text-[22px]' : 'text-[19px]';

  return (
    <div
      className={cn('rounded-lg border border-line-strong bg-surface p-[3px] shadow-sticker', className)}
      style={rotate ? { rotate: `${rotate}deg` } : undefined}
    >
      <dl className="@container overflow-hidden rounded-[5px] border border-line-strong/80">
        <div className="flex items-start gap-3 px-3 pb-2 pt-1.5">
          <div className="min-w-0 flex-1">
            <dt className="text-[11px] font-medium text-ink-muted">Name</dt>
            <dd>
              <NameTag
                id={nameId}
                className={cn('font-hand font-semibold leading-[1.05] text-ink [overflow-wrap:anywhere]', nameSize)}
              >
                {name}
              </NameTag>
            </dd>
          </div>
          {status ? <dd className="mt-1 shrink-0">{status}</dd> : null}
        </div>

        <div className="grid grid-cols-1 border-t border-line-strong/80 @[16rem]:grid-cols-[1fr_auto]">
          <Cell label="Class">
            <span className="text-[13px] font-medium leading-snug text-ink">{pillClass}</span>
          </Cell>
          <Cell label="Roll no." srSuffix=" (version)" divided>
            <span className="font-mono text-[13px] font-medium tabular-nums text-ink">{v}</span>
          </Cell>
        </div>

        {owner || approver ? (
          <div className="grid grid-cols-1 border-t border-line-strong/80 @[16rem]:grid-cols-2">
            {owner ? (
              <Cell label="Owner">
                <span className={cn('font-hand font-semibold leading-[1.05] text-marker-ink', signature)}>
                  {owner}
                </span>
              </Cell>
            ) : null}
            {approver ? (
              <Cell label="Approver" divided={Boolean(owner)}>
                <span className={cn('font-hand font-semibold leading-[1.05] text-marker-ink', signature)}>
                  {approver}
                </span>
              </Cell>
            ) : null}
          </div>
        ) : null}
      </dl>
    </div>
  );
}

/** One labelled field. `divided` draws the separator: a top rule when stacked, a left rule side-by-side. */
function Cell({
  label,
  srSuffix,
  divided = false,
  children,
}: {
  label: string;
  srSuffix?: string;
  divided?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-0.5 px-3 py-1.5 @[16rem]:flex-row @[16rem]:items-baseline @[16rem]:gap-2',
        divided && 'border-t border-line-strong/80 @[16rem]:border-l @[16rem]:border-t-0',
      )}
    >
      <dt className="shrink-0 text-[11px] font-medium leading-tight text-ink-muted">
        {label}
        {srSuffix ? <span className="sr-only">{srSuffix}</span> : null}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
