/**
 * layout.tsx (customer)
 * ----------------------
 * Shared layout for all customer pages (/customer/dashboard, etc.).
 *
 * Purpose:
 *   Renders the customer navigation header with sign-out and navigation links.
 *   Applies consistent styling across all customer-facing pages.
 */

import Link from 'next/link';
import React from 'react';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header Navigation */}
      <header className="border-b bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/customer/dashboard" className="text-xl font-bold">
              Gordon Ramsay
            </Link>
            <nav className="hidden gap-6 md:flex">
              <Link
                href="/customer/dashboard"
                className="text-sm hover:text-blue-600 dark:hover:text-blue-400"
              >
                My Reservations
              </Link>
              <Link
                href="/"
                className="text-sm hover:text-blue-600 dark:hover:text-blue-400"
              >
                New Booking
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {/* Placeholder for user menu / sign-out */}
            <span className="text-sm text-slate-600 dark:text-slate-400">Customer Menu</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
