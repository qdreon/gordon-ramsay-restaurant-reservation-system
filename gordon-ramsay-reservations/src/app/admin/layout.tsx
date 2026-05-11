/**
 * layout.tsx (admin)
 * --------------------
 * Shared layout for all admin pages (/admin/floorplan, etc.).
 *
 * Purpose:
 *   Renders the admin navigation header with role-based access indicators.
 *   Applies consistent styling and navigation structure across admin pages.
 */

import Link from 'next/link';
import React from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Admin Header Navigation */}
      <header className="border-b bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin/floorplan" className="text-xl font-bold">
              Gordon Ramsay - Admin
            </Link>
            <nav className="hidden gap-6 md:flex">
              <Link
                href="/admin/floorplan"
                className="text-sm hover:text-blue-600 dark:hover:text-blue-400"
              >
                Floor Plan
              </Link>
              <Link
                href="/admin/reservations"
                className="text-sm hover:text-blue-600 dark:hover:text-blue-400"
              >
                Reservations
              </Link>
              <Link
                href="/admin/crm"
                className="text-sm hover:text-blue-600 dark:hover:text-blue-400"
              >
                Guests
              </Link>
              <Link
                href="/admin/menu"
                className="text-sm hover:text-blue-600 dark:hover:text-blue-400"
              >
                Menu
              </Link>
              <Link
                href="/admin/waitlist"
                className="text-sm hover:text-blue-600 dark:hover:text-blue-400"
              >
                Waitlist
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
