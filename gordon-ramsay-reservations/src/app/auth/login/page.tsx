'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from '@/lib/authClient';

/**
 * Login page for returning customers.
 *
 * Purpose:
 *   Accepts email and password, then authenticates against Supabase Auth.
 *   On success, redirects to the customer dashboard.
 *   On error, displays an error message.
 *
 * Design:
 *   Minimal form with email, password, and submit button.
 *   Implements defensive programming with early validation and try/catch.
 */

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const nextPath =
    nextParam && nextParam.startsWith('/') ? nextParam : '/customer/dashboard';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Validate input early
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);

    try {
      await signIn({ email, password });
      router.push(nextPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-black/35 p-8 text-zinc-100 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-sm text-zinc-300">
          Welcome back to Gordon Ramsay Restaurant
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-md border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="you@example.com"
            className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200/20 disabled:opacity-60"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="••••••••"
            className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200/20 disabled:opacity-60"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-amber-400 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Footer */}
      <div className="text-center text-sm">
        <p className="text-zinc-300">
          Don&apos;t have an account?{' '}
          <Link
            href={nextParam ? `/auth/register?next=${encodeURIComponent(nextParam)}` : '/auth/register'}
            className="font-semibold text-amber-300 hover:underline"
          >
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
