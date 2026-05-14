/**
 * layout.tsx (admin)
 * Shared layout for all admin pages.
 *
 * I export `dynamic = 'force-dynamic'` so Next.js never prerendering admin pages
 * as static HTML. Without this, middleware cannot intercept the request for
 * unauthenticated users -- the static file is served before the middleware redirect
 * can fire, bypassing RBAC enforcement (SEC-1 / QDR-50).
 */

import Link from "next/link";
import Image from "next/image";
import React from "react";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/authGuards";

export const dynamic = "force-dynamic";

// Centralized navigation config makes it easy to add/remove links
const ADMIN_NAV_LINKS = [
  { href: "/admin/dashboard", label: "Floor Plan" },
  { href: "/admin/reservations", label: "Reservations" },
  { href: "/admin/crm", label: "Guests" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/waitlist", label: "Waitlist" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getServerAuthContext();

  if (!user) {
    redirect("/auth/login?next=/admin/dashboard");
  }

  if (profile?.role !== "admin") {
    redirect("/customer/dashboard");
  }

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_38%),linear-gradient(180deg,#0d0d11_0%,#13131a_50%,#15151d_100%)] text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Image
              src="/admin/GRRM-LOGO.svg"
              alt="GRRM Logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-sm"
            />
            <Link href="/admin" className="text-lg font-semibold font-heading text-white sm:text-xl">
              GRRM Admin Portal
            </Link>

            {/* Navigation Loop */}
            <nav className="hidden gap-2 md:flex">
              {ADMIN_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs transition hover:border-amber-300/40 hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <nav className="flex w-full gap-2 overflow-x-auto pb-1 md:hidden">
            {ADMIN_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-amber-300/40 hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="w-full px-2 pb-8 pt-4 sm:px-4 lg:px-6">{children}</main>
    </div>
  );
}
