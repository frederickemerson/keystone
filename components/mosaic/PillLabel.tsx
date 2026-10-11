import type { ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

/**
 * The name-label sticker from a school exercise book, repurposed as a pill's
 * identity card. In the app everything is typeset (Fraunces name, Geist fields,
 * Geist Mono version). The landing page may opt in to `variant="handwritten"`,
 * where the name and the owner/approver signatures are marginalia.
 * Structured as a description list so assistive tech
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
  variant = 'typeset',
  className,
}: {
  /** Pill name, e.g. "chilled-water leak". */
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
  /** Element used for the name (use h2/h3 when it is the card title). */
  nameAs?: 'p' | 'h2' | 'h3';
  nameId?: string;
  /** `typeset` (default, all app screens) or `handwritten` (landing page only). */
  variant?: 'typeset' | 'handwritten';
  className?: string;
}) {
  const hand = variant === 'handwritten';
  const v = /^\d/.test(version) ? `v${version}` : version;
  const nameSize = hand
    ? { sm: 'text-[22px]', md: 'text-[27px]', lg: 'text-[36px]' }[size]
    : { sm: 'text-[17px]', md: 'text-[21px]', lg: 'text-[28px]' }[size];
  const nameFont = hand
    ? 'font-hand font-semibold leading-[1.05]'
    : 'font-display-soft font-semibold leading-[1.15] tracking-[-0.005em]';
  const signature = hand
    ? cn('font-hand font-semibold leading-[1.05] text-marker-ink', size === 'lg' ? 'text-[22px]' : 'text-[19px]')
    : 'text-[13px] font-medium leading-snug text-ink';

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
                className={cn(nameFont, 'text-ink [overflow-wrap:anywhere]', nameSize)}
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
                <span className={signature}>
                  {owner}
                </span>
              </Cell>
            ) : null}
            {approver ? (
              <Cell label="Approver" divided={Boolean(owner)}>
                <span className={signature}>
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
