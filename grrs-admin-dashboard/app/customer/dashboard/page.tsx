'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut } from '@/lib/authClient';

export default function CustomerDashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Data Fetching Logic
  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser();
        if (!user) return router.push('/auth/login');
        setUserEmail(user.email || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user.');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  // 2. Handlers
  async function handleSignOut() {
    try {
      await signOut();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-out failed.');
    }
  }

  // 3. Early Returns for UI States
  if (loading) {
    return <div className="flex justify-center py-10 text-slate-600">Loading your dashboard...</div>;
  }

  if (error) {
    return <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>;
  }

  // 4. Clean Main UI Render
  return (
    <div className="space-y-8">
      <WelcomeHeader email={userEmail} />
      <ReservationList />
      <AccountActions onSignOut={handleSignOut} onNewReservation={() => router.push('/')} />
    </div>
  );
}

// --- SUB-COMPONENTS (Could be moved to their own files later) ---

function WelcomeHeader({ email }: { email: string | null }) {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Welcome to Your Account</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Email: <span className="font-semibold">{email}</span>
      </p>
    </section>
  );
}

function ReservationList() {
  return (
    <section className="space-y-4 rounded-lg border bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h2 className="text-xl font-bold">My Reservations</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        QDR-59: Upcoming and past reservations will be displayed here.
      </p>
      <div className="rounded-md bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-700 dark:text-slate-400">
        No reservations yet.
      </div>
    </section>
  );
}

function AccountActions({ onSignOut, onNewReservation }: { onSignOut: () => void; onNewReservation: () => void }) {
  return (
    <section className="space-y-3">
      <button
        onClick={onNewReservation}
        className="w-full rounded-md bg-blue-600 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-700"
      >
        Make a New Reservation
      </button>
      <button
        onClick={onSignOut}
        className="w-full rounded-md border border-slate-300 py-2 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
      >
        Sign Out
      </button>
      <button
        disabled
        className="w-full rounded-md border border-red-300 py-2 text-red-600 opacity-50 cursor-not-allowed dark:border-red-700 dark:text-red-400"
      >
        Delete Account (QDR-61)
      </button>
    </section>
  );
}
