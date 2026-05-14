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
import { redirect } from "next/navigation";
import React from "react";
import { createServiceSupabaseClient } from "@/lib/supabaseAdmin";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

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
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/admin/dashboard");
  }

  const adminClient = createServiceSupabaseClient();
  const { data: userRow } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userRow?.role !== "admin") {
    redirect("/customer/dashboard");
  }

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
