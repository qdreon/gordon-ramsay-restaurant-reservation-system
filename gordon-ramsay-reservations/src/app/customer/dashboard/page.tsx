'use client';

import { FormEvent, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentSession, getCurrentUser, signOut } from '@/lib/authClient';

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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const router = useRouter();

  const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;

  /** Wall-clock tick for filtering/cancel rules without calling Date.now() during render. */
  const [nowMs, setNowMs] = useState<number | null>(null);

  type ReservationItem = {
    id: string;
    reservation_date: string;
    start_time: string;
    end_time: string;
    party_size: number;
    status: string;
    special_requests: string | null;
    locked_until: string | null;
    created_at: string;
    tables: { table_number: number }[];
  };

  const loadReservations = useCallback(async (token: string) => {
    const response = await fetch('/api/customer/reservations', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = (await response.json()) as {
      reservations?: ReservationItem[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? 'Failed to load reservations.');
    }

    setReservations(payload.reservations ?? []);
  }, []);

  const loadProfile = useCallback(async (token: string) => {
    const response = await fetch('/api/customer/me', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = (await response.json()) as {
      customerId?: string;
      profile?: {
        fullName: string;
        phone: string | null;
        dietaryRestrictions: string | null;
        allergies: string | null;
        vipStatus: boolean;
        totalVisits: number;
        totalNoShows: number;
      } | null;
      error?: string;
    };

    if (!response.ok || !payload.customerId) {
      throw new Error(payload.error ?? 'Failed to load customer profile.');
    }

    if (payload.profile) {
      setFullName(payload.profile.fullName ?? '');
      setPhone(payload.profile.phone ?? '');
      setDietaryRestrictions(payload.profile.dietaryRestrictions ?? '');
      setAllergies(payload.profile.allergies ?? '');
    }
  }, []);

  useEffect(() => {
    function tick() {
      setNowMs(Date.now());
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const session = await getCurrentSession();
        const user = await getCurrentUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }

        if (!session?.access_token) {
          router.push('/auth/login');
          return;
        }

        setUserEmail(user.email || null);
        setAccessToken(session.access_token);

        const [profileResult, reservationsResult] = await Promise.allSettled([
          loadProfile(session.access_token),
          loadReservations(session.access_token),
        ]);

        if (profileResult.status === 'rejected') {
          setProfileError(
            profileResult.reason instanceof Error
              ? profileResult.reason.message
              : 'Failed to load customer profile.'
          );
        }

        if (reservationsResult.status === 'rejected') {
          throw reservationsResult.reason;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load user.';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router, loadReservations]);

  async function handleSignOut() {
    try {
      await signOut();
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-out failed.';
      setError(message);
    }
  }

  async function handleCancelReservation(reservationId: string) {
    setError(null);
    setActionMessage(null);
    setRefreshing(true);

    try {
      const response = await fetch('/api/reservations/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ reservationId }),
      });

      const payload = (await response.json()) as { error?: string; success?: boolean };
      if (!response.ok) {
        if (payload.error?.includes("cannot be cancelled")) {
          setActionMessage('This reservation was already cancelled. Refreshing your reservation list.');
          if (accessToken) {
            await loadReservations(accessToken);
          }
          return;
        }

        throw new Error(payload.error ?? 'Failed to cancel reservation.');
      }

      setActionMessage('Reservation cancelled successfully.');
      if (accessToken) {
        await loadReservations(accessToken);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cancellation failed.';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDeleteAccount() {
    if (!accessToken) {
      router.push('/auth/login');
      return;
    }

    const confirmed = window.confirm(
      'Delete your account and all reservation history? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setActionMessage(null);
    setDeletingAccount(true);

    try {
      const response = await fetch('/api/customer/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = (await response.json()) as { error?: string; success?: boolean };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete account.');
      }

      await signOut();
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Account deletion failed.';
      setError(message);
    } finally {
      setDeletingAccount(false);
    }
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setProfileError(null);
    setProfileMessage(null);

    if (!accessToken) {
      router.push('/auth/login');
      return;
    }

    if (!fullName.trim()) {
      setProfileError('Full name is required.');
      return;
    }

    setSavingProfile(true);

    try {
      const response = await fetch('/api/customer/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fullName,
          phone,
          dietaryRestrictions,
          allergies,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        profile?: {
          fullName: string;
          phone: string | null;
          dietaryRestrictions: string | null;
          allergies: string | null;
        };
      };

      if (!response.ok || !payload.profile) {
        throw new Error(payload.error ?? 'Failed to update customer profile.');
      }

      setFullName(payload.profile.fullName ?? '');
      setPhone(payload.profile.phone ?? '');
      setDietaryRestrictions(payload.profile.dietaryRestrictions ?? '');
      setAllergies(payload.profile.allergies ?? '');
      setProfileMessage('Profile updated successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile update failed.';
      setProfileError(message);
    } finally {
      setSavingProfile(false);
    }
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString();
  }

  function canCancel(reservation: ReservationItem, currentMs: number) {
    const cancellableStatuses = ['pending_payment', 'confirmed'];
    const msUntilStart = new Date(reservation.start_time).getTime() - currentMs;
    return cancellableStatuses.includes(reservation.status) && msUntilStart >= TWO_HOURS_IN_MS;
  }

  const effectiveNow = nowMs ?? 0;
  const upcoming = reservations.filter(
    (r) => new Date(r.start_time).getTime() >= effectiveNow && r.status !== 'cancelled'
  );
  const past = reservations.filter(
    (r) => new Date(r.start_time).getTime() < effectiveNow || r.status === 'cancelled'
  );

  if (loading || nowMs === null) {
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
        <p className="text-slate-600 dark:text-slate-400">
          Email: <span className="font-semibold">{userEmail}</span>
        </p>
      </section>

      {/* Profile Section */}
      <section className="space-y-4 rounded-lg border bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">My Profile</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Update your contact details and dining preferences.
          </p>
        </div>

        {profileMessage && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {profileMessage}
          </div>
        )}

        {profileError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {profileError}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={savingProfile}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={savingProfile}
                placeholder="+1 (555) 123-4567"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="dietaryRestrictions" className="text-sm font-medium">
                Dietary Restrictions
              </label>
              <textarea
                id="dietaryRestrictions"
                value={dietaryRestrictions}
                onChange={(e) => setDietaryRestrictions(e.target.value)}
                disabled={savingProfile}
                rows={4}
                placeholder="Vegetarian, halal, gluten-free, etc."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="allergies" className="text-sm font-medium">
                Allergies
              </label>
              <textarea
                id="allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                disabled={savingProfile}
                rows={4}
                placeholder="Peanuts, shellfish, dairy, etc."
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {savingProfile ? 'Saving Profile...' : 'Save Profile'}
          </button>
        </form>
      </section>

      {/* Reservations Section */}
      <section className="space-y-4 rounded-lg border bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-xl font-bold">My Reservations</h2>
        {actionMessage && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {actionMessage}
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Upcoming
          </h3>
          {upcoming.length === 0 ? (
            <div className="rounded-md bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-700 dark:text-slate-400">
              No upcoming reservations.
            </div>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((reservation) => (
                <li key={reservation.id} className="rounded-md border p-4 text-sm">
                  <p>
                    <span className="font-semibold">When:</span> {formatDateTime(reservation.start_time)}
                  </p>
                  <p>
                    <span className="font-semibold">Party:</span> {reservation.party_size}
                  </p>
                  <p>
                    <span className="font-semibold">Tables:</span>{' '}
                    {reservation.tables.map((t) => t.table_number).join(', ') || 'TBD'}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span> {reservation.status}
                  </p>
                  <div className="mt-3">
                    <button
                      onClick={() => handleCancelReservation(reservation.id)}
                      disabled={!canCancel(reservation, effectiveNow) || refreshing}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-red-700 disabled:opacity-50 dark:border-red-700 dark:text-red-400"
                    >
                      Cancel Booking
                    </button>
                    {!canCancel(reservation, effectiveNow) && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Cancellation allowed only for pending/confirmed reservations at least 2 hours before start.
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Past / Cancelled
          </h3>
          {past.length === 0 ? (
            <div className="rounded-md bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-700 dark:text-slate-400">
              No past reservations.
            </div>
          ) : (
            <ul className="space-y-3">
              {past.map((reservation) => (
                <li key={reservation.id} className="rounded-md border p-4 text-sm">
                  <p>
                    <span className="font-semibold">When:</span> {formatDateTime(reservation.start_time)}
                  </p>
                  <p>
                    <span className="font-semibold">Party:</span> {reservation.party_size}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span> {reservation.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
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
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
          className="w-full rounded-md border border-red-300 py-2 text-red-600 disabled:opacity-50 dark:border-red-700 dark:text-red-400"
          title="QDR-61: Delete account and all associated data"
        >
          {deletingAccount ? 'Deleting Account...' : 'Delete Account (QDR-61)'}
        </button>
      </section>
    </div>
  );
}
