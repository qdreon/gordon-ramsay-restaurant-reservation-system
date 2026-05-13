/**
 * layout.tsx (admin)
 * Shared layout for all admin pages.
 */

import Link from 'next/link';
import React from 'react';

// Centralized navigation config makes it easy to add/remove links
const ADMIN_NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Floor Plan' },
  { href: '/admin/reservations', label: 'Reservations' },
  { href: '/admin/crm', label: 'Guests' },
  { href: '/admin/menu', label: 'Menu' },
  { href: '/admin/waitlist', label: 'Waitlist' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900">
      <header className="border-b bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">

        <div className="flex w-full items-center justify-between px-6 py-4">
          
          <div className="flex items-center gap-8">
           <Link href="/admin" className="text-xl font-bold font-heading">
          GRRM Admin Portal
          </Link>
            
            {/* Navigation Loop */}
            <nav className="hidden gap-6 md:flex">
              {ADMIN_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm transition-colors hover:text-[var(--muted)] dark:hover:text-[var(--grey-400)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="w-full">{children}</main>
    </div>
  );
}
