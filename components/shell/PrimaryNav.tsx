'use client';

// Primary navigation, grouped by what people do (lib/guide/nav). The sidebar
// sits on night like the hero; phones get one scrolling row of the same items.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS, NAV_ITEMS, isNavActive } from '@/lib/guide/nav';
import { cn } from '@/lib/ui/cn';

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mt-5 first:mt-0">
          <p className="px-3 pb-1.5 text-[11.5px] font-medium tracking-[0.02em] text-white/60">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isNavActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.purpose}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex min-h-10 items-center rounded-lg px-3 text-[14.5px] transition-colors duration-150 focus-visible:outline-lavender-on-night',
                      active ? 'bg-white/[0.09] font-medium text-white' : 'text-white/75 hover:bg-white/[0.06] hover:text-white',
                    )}
                  >
                    {active ? (
                      <span aria-hidden="true" className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-lavender" />
                    ) : null}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="border-t border-white/10 bg-night md:hidden">
      <ul className="flex gap-1 overflow-x-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-9 items-center rounded-full px-3 text-[13px]',
                  active ? 'bg-white font-medium text-night' : 'text-white/80 hover:text-white',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
