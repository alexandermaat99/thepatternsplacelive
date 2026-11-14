'use client';

import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NavMenuItem = { href: string; label: string; icon: LucideIcon; render?: (className: string, children: React.ReactNode) => React.ReactNode };

const TOP_CLASS =
  'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

/** Plain top-level nav link, styled to match NavHoverMenu. */
export function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link href={href} className={TOP_CLASS}>
      <Icon className="hidden lg:block h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

const ITEM_CLASS =
  'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground';

/**
 * Top-level nav link that goes to its page on click and shows a small menu on
 * hover (or keyboard focus). Touch devices use the hamburger menu instead.
 */
export function NavHoverMenu({
  href,
  label,
  icon: Icon,
  items,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  items: NavMenuItem[];
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        aria-haspopup="true"
        className={TOP_CLASS}
      >
        <Icon className="hidden lg:block h-4 w-4" />
        <span>{label}</span>
      </Link>
      {/* pt-1 keeps the hover alive while the pointer moves down into the menu */}
      <div className="invisible absolute left-0 top-full z-50 pt-1 opacity-0 transition-opacity duration-100 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {items.map(item => {
            const children = (
              <>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </>
            );
            return (
              <div key={item.href}>
                {item.render ? (
                  item.render(ITEM_CLASS, children)
                ) : (
                  <Link href={item.href} className={cn(ITEM_CLASS)}>
                    {children}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
