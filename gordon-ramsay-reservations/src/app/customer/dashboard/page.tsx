'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut } from '@/lib/authClient';
import Link from 'next/link';

/**
 * Customer Dashboard page (/customer/dashboard).
 *
 * Purpose:
 *   Displays the authenticated customer's reservations and account information.
 *   Provides access to the booking system and account settings.
 *
 * Status (QDR-59):
 *   Stub for Phase 3. Full implementation includes:
 *   - Viewing upcoming/past reservations (QDR-59)
 *   - Cancel button for reservations (QDR-60, disabled within 2 hours)
 *   - Delete account button (QDR-61, LEG-1 Right to Erasure)
 *   - Dietary restrictions and preferences
 */

export default function CustomerDashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }
        setUserEmail(user.email || null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load user.';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  async function handleSignOut() {
    try {
      await signOut();
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-out failed.';
      setError(message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Welcome to Your Account</h1>
      </section>

      {/* Reservations Section */}
      <section className="space-y-4 rounded-lg border bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex gap-2">
          <h2 className="text-xl font-bold mt-0.5 mb-0.5">My Reservations</h2>
          <Link href="/customer/booking">
            <p className="border rounded-md border-black bg-blue-500 text-white px-1">Book Reservation</p>
          </Link>
        </div>

        <div>
          <p className="font-bold text-slate-500">UPCOMING</p>
          <div className="border rounded-md bg-slate-100 max-w-full py-5">
            <ul id="UpcomingReservationsList">
            </ul>
          </div>
        </div>

        <div>
          <p className="font-bold text-slate-500">PAST / CANCELLED</p>
          <div className="border rounded-md bg-slate-100 max-w-full py-5">
            <ul id="PastCancelledList"></ul>
          </div>
        </div>
      </section>

      {/* Account Actions */}
      <section className="space-y-3">
        <button
          onClick={() => router.push('/')}
          className="w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          Make a New Reservation
        </button>
        <button
          onClick={handleSignOut}
          className="w-full rounded-md border border-slate-300 py-2 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Sign Out
        </button>
        <button
          disabled
          className="w-full rounded-md border border-red-300 py-2 text-red-600 disabled:opacity-50 dark:border-red-700 dark:text-red-400"
          title="QDR-61: Delete account feature coming soon"
        >
          Delete Account (QDR-61)
        </button>
      </section>
    </div>
  );
}
