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
                href="/customer/booking"
                className="text-sm hover:text-blue-600 dark:hover:text-blue-400"
              >
                New Booking
              </Link>
            </nav>
          </div>
          <div className="relative group inline-block">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer">
              <img src="/avatar.png" alt="" />
            </div>

            <div className="absolute right-0 w-48 bg-white border border-gray-200 rounded-md shadow-lg hidden group-hover:block transition-all duration-300 z-50">
              <div className="py-2">
                <a href="/customer/profile" className="block px-4 py-2 hover:bg-gray-100">Profile</a>
                <hr className="my-1" />
                <button className="block w-full text-left px-4 py-2 hover:big-red-50 text-sm -text-red-600 hover:bg-gray-100">Sign Out</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
