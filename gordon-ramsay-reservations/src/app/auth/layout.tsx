/**
 * layout.tsx
 * -----------
 * Shared layout for all auth pages (/auth/login, /auth/register).
 *
 * Purpose:
 *   Provides a consistent visual frame for authentication forms.
 *   Centers content and applies global styling.
 */

import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.14),transparent_40%),linear-gradient(180deg,#0b0b10_0%,#12121a_50%,#16161f_100%)] px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
