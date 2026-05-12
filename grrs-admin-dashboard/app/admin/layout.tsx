/**
 * layout.tsx (admin)
 * Shared layout for all admin pages.
 */

import Link from 'next/link';
import React from 'react';

// Centralized navigation config makes it easy to add/remove links
const ADMIN_NAV_LINKS = [
  { href: '/admin/floorplan', label: 'Floor Plan' },
  { href: '/admin/reservations', label: 'Reservations' },
  { href: '/admin/crm', label: 'Guests' },
  { href: '/admin/menu', label: 'Menu' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="border-b bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          
          <div className="flex items-center gap-8">
            <Link href="/admin/floorplan" className="text-xl font-bold">
              Gordon Ramsay - Admin
            </Link>
            
            {/* Navigation Loop */}
            <nav className="hidden gap-6 md:flex">
              {ADMIN_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
