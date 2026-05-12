/**
 * layout.tsx (customer)
 * Shared layout for all customer pages.
 */

import Link from 'next/link';
import React from 'react';

const CUSTOMER_NAV_LINKS = [
  { href: '/customer/dashboard', label: 'My Reservations' },
  { href: '/', label: 'New Booking' },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="border-b bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          
          <div className="flex items-center gap-8">
            <Link href="/customer/dashboard" className="text-xl font-bold">
              Gordon Ramsay
            </Link>
            
            <nav className="hidden gap-6 md:flex">
              {CUSTOMER_NAV_LINKS.map((link) => (
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

          <div className="flex items-center gap-4">
            {/* TO-DO: Replace with a <UserAvatarMenu /> component later */}
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Profile
            </span>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}