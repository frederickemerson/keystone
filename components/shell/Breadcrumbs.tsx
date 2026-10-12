'use client';

// "Pills › Chilled water leak › Decision canvas" on object-scoped screens.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { breadcrumbs, type CrumbNames } from '@/lib/guide/nav';
import { cn } from '@/lib/ui/cn';

export function Breadcrumbs({ names, className }: { names: CrumbNames; className?: string }) {
  const pathname = usePathname();
  const crumbs = breadcrumbs(pathname, names);
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0 text-[13px]', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-ink-muted">
        {crumbs.map((crumb, i) => (
          <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3.5 text-ink-muted/60" aria-hidden="true" /> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="rounded underline-offset-4 hover:text-ink hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
