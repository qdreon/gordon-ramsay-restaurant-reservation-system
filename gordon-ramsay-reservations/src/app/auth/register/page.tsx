'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUp, signIn } from '@/lib/authClient';

/**
 * Registration page for new customers.
 *
 * Purpose:
 *   Accepts email, password, full name, phone, and a mandatory RA 10173 consent checkbox.
 *   Enforces that consent must be checked before registration (LEG-1).
 *   On success, redirects to the customer dashboard; on error, displays an error message.
 *
 * Constraint (LEG-1 - RA 10173):
 *   Renders a mandatory checkbox for Data Privacy Act consent.
 *   The submit button is disabled until this checkbox is checked.
 *   Registration is not allowed without explicit consent.
 *
 * Design:
 *   Simple form layout following KISS principle.
 *   Uses defensive programming: input validation and error handling.
 */

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Validate all required fields early
    if (!email || !password || !confirmPassword || !fullName) {
      setError('Email, password, and full name are required.');
      return;
    }

    // Enforce password confirmation match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Enforce minimum password length (defensive programming)
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    // Enforce RA 10173 consent (LEG-1): form cannot submit without this
    if (!consentGiven) {
      setError('You must agree to the Data Privacy Act terms to register.');
      return;
    }

    setLoading(true);

    try {
      await signUp({
        email,
        password,
        fullName,
        phone: phone || undefined,
        consentGiven: true,
      });
      
      // Auto-login the user immediately after account creation
      await signIn({ email, password });
      
      // Redirect to customer dashboard on successful registration
      router.push('/customer/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-black/35 p-8 text-zinc-100 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-sm text-zinc-300">
          Join Gordon Ramsay Restaurant for exclusive reservations
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-md border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            placeholder="John Doe"
            className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200/20 disabled:opacity-60"
            required
          />
        </div>

        {/* Email Address */}
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

        {/* Phone Number (Optional) */}
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone Number <span className="text-xs text-zinc-400">(Optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            placeholder="+1 (555) 123-4567"
            className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200/20 disabled:opacity-60"
          />
        </div>

        {/* Password */}
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
          <p className="text-xs text-zinc-400">At least 8 characters</p>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            placeholder="••••••••"
            className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200/20 disabled:opacity-60"
            required
          />
        </div>

        {/* Data Privacy Consent Checkbox (LEG-1) */}
        <div className="space-y-3 rounded-md border border-amber-300/20 bg-amber-500/10 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              disabled={loading}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-300 focus:ring-2 focus:ring-amber-200/40 dark:border-slate-600"
              required
            />
            <span className="text-sm text-zinc-200">
              I agree to the{' '}
              <strong>Republic Act 10173 (Data Privacy Act of the Philippines)</strong> terms
              and consent to the collection, use, and processing of my personal data as outlined
              in Gordon Ramsay Restaurant&apos;s Privacy Policy. I understand I can request account
              deletion at any time.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !consentGiven}
          className="w-full rounded-md bg-amber-400 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {/* Footer */}
      <div className="text-center text-sm text-zinc-200">
        <p className="text-zinc-300">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-amber-300 hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
