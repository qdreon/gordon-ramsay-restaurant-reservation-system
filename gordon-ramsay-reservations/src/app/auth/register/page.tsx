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
    <div className="space-y-6 rounded-lg border bg-white p-8 shadow-md dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Join Gordon Ramsay Restaurant for exclusive reservations
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
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
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
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
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            required
          />
        </div>

        {/* Phone Number (Optional) */}
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone Number <span className="text-xs text-slate-500">(Optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            placeholder="+1 (555) 123-4567"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
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
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            required
          />
          <p className="text-xs text-slate-500">At least 8 characters</p>
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
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            required
          />
        </div>

        {/* Data Privacy Consent Checkbox (LEG-1) */}
        <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              disabled={loading}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-slate-600"
              required
            />
            <span className="text-sm">
              I agree to the{' '}
              <strong>Republic Act 10173 (Data Privacy Act of the Philippines)</strong> terms
              and consent to the collection, use, and processing of my personal data as outlined
              in Gordon Ramsay Restaurant's Privacy Policy. I understand I can request account
              deletion at any time.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !consentGiven}
          className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {/* Footer */}
      <div className="text-center text-sm">
        <p className="text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
