/**
 * layout.tsx (customer)
 * ----------------------
 * Shared layout for all customer pages (/customer/dashboard, etc.).
 *
 * Purpose:
 *   Renders the customer navigation header with sign-out and navigation links.
 *   Applies consistent styling across all customer-facing pages.
 *
 * I export `dynamic = 'force-dynamic'` so middleware RBAC enforcement fires
 * on every request. Without this, Next.js may serve a cached static response
 * before the middleware redirect, allowing unauthenticated access (SEC-1 / QDR-50).
 */

import Link from "next/link";
import React from "react";

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/authGuards";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getServerAuthContext();

  if (!user) {
    redirect("/auth/login?next=/customer/dashboard");
  }

  if (profile?.role === "admin") {
    redirect("/admin/dashboard");
  }

  if (profile?.role !== "customer") {
    redirect("/auth/login?next=/customer/dashboard");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.1),transparent_35%),linear-gradient(180deg,#0e0e13_0%,#14141b_45%,#171720_100%)] text-zinc-100">
      {/* Header Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/customer/dashboard" className="text-lg font-semibold text-white sm:text-xl">
              Gordon Ramsay
            </Link>
            <nav className="hidden gap-3 md:flex">
              <Link
                href="/customer/dashboard"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-amber-300/40 hover:bg-white/10"
              >
                My Reservations
              </Link>
              <Link
                href="/"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-amber-300/40 hover:bg-white/10"
              >
                New Booking
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {/* Placeholder for user menu / sign-out */}
            <span className="text-xs text-zinc-300">
              Customer Menu
            </span>
          </div>
          <nav className="flex w-full gap-2 overflow-x-auto pb-1 md:hidden">
            <Link
              href="/customer/dashboard"
              className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200"
            >
              My Reservations
            </Link>
            <Link
              href="/"
              className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200"
            >
              New Booking
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
