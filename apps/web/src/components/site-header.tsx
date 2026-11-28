'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MemberPicker } from './member-picker';
import { cn } from './ui/cn';

const LINKS = [
  { href: '/', label: 'Planning' },
  { href: '/rooms', label: 'Salles' },
  { href: '/my-bookings', label: 'Mes réservations' },
] as const;

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:h-header lg:flex-nowrap lg:py-0">
        <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-control">
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-control bg-primary text-primary-ink shadow-card"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M3 20V10l9-6 9 6v10M3 14h18M9 20v-6M15 20v-6M12 4v16" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block font-semibold tracking-tight">La Verrière</span>
            <span className="block text-xs text-ink-muted">Réservations</span>
          </span>
        </Link>

        <div className="ml-auto lg:order-last">
          <MemberPicker />
        </div>

        <nav aria-label="Navigation principale" className="-mx-1 w-full overflow-x-auto lg:mx-0 lg:w-auto">
          <ul className="flex gap-1">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'focus-ring inline-flex h-9 items-center rounded-control px-3 text-sm font-medium whitespace-nowrap transition-colors',
                      active ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
