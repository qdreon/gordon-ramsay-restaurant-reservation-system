/**
 * layout.tsx
 * -----------
 * I create a shared layout for all auth pages (/auth/login, /auth/register).
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
