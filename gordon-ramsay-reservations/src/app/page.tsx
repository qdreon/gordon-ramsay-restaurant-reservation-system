'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import CheckoutModal from '@/components/CheckoutModal';
import MenuDisplay from '@/components/MenuDisplay';
import { validateReservationTime, OPERATING_HOURS } from '@/lib/config';

/**
 * Home page -- Customer availability search and booking entry point.
 *
 * Purpose:
 *   1. Accepts Date, Time, and Party Size inputs.
 *   2. Queries /api/availability to retrieve available table options (FR-2).
 *   3. Allows the customer to select a table option, which opens the
 *      CheckoutModal with a 5-minute countdown (FR-3 / QDR-39).
 *   4. On confirmed payment token, posts to /api/reservations/lock to
 *      create a pending_payment reservation row (FR-3 / QDR-65).
 */

const DEFAULT_RESERVATION_HOURS = 2;
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

type AvailabilityOption = {
  table_ids: string[];
  table_numbers: number[];
  total_capacity: number;
};

function isAvailabilityOptionArray(value: unknown): value is AvailabilityOption[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<AvailabilityOption>;
    return (
      Array.isArray(candidate.table_ids) &&
      Array.isArray(candidate.table_numbers) &&
      typeof candidate.total_capacity === 'number'
    );
  });
}

export default function Home() {
  const router = useRouter();

  // Search form state
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AvailabilityOption[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Stores the ISO start/end times calculated during search for reuse in the lock call.
  const [startTimeISO, setStartTimeISO] = useState('');
  const [endTimeISO, setEndTimeISO] = useState('');

  // Checkout modal state
  const [selectedOption, setSelectedOption] = useState<AvailabilityOption | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  /** Bumps on each open so the modal remounts with a fresh countdown (avoids effect setState reset). */
  const [checkoutModalKey, setCheckoutModalKey] = useState(0);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Waitlist state (Phase 5.1 / QDR-66)
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistCapacity, setWaitlistCapacity] = useState<number>(0);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBookingError(null);
    setOptions([]);
    setHasSearched(false);
    setSelectedOption(null);

    if (!reservationDate || !reservationTime) {
      setError('Please select both date and time.');
      return;
    }

    const dateParts = reservationDate.split('-');
    const timeParts = reservationTime.split(':');

    if (dateParts.length !== 3 || timeParts.length !== 2) {
      setError('Invalid date/time format.');
      return;
    }

    const [year, month, day] = dateParts.map(Number);
    const [hour, minute] = timeParts.map(Number);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      !Number.isFinite(hour) ||
      !Number.isFinite(minute)
    ) {
      setError('Invalid date/time value.');
      return;
    }

    const startLocal = new Date(year, month - 1, day, hour, minute, 0);
    if (Number.isNaN(startLocal.getTime())) {
      setError('Invalid date/time selection.');
      return;
    }

    // Validate reservation time is within operating hours (FR-8 / QDR-74)
    const timeValidation = validateReservationTime(hour, DEFAULT_RESERVATION_HOURS);
    if (!timeValidation.valid) {
      setError(timeValidation.error || 'Reservation time is outside operating hours.');
      return;
    }

    const endLocal = new Date(startLocal.getTime() + DEFAULT_RESERVATION_HOURS * ONE_HOUR_IN_MS);
    const startISO = startLocal.toISOString();
    const endISO = endLocal.toISOString();

    // Cache times for the subsequent lock call.
    setStartTimeISO(startISO);
    setEndTimeISO(endISO);

    setLoading(true);
    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationDate,
          startTime: startISO,
          endTime: endISO,
          partySize,
        }),
      });

      const payload = (await response.json()) as {
        options?: AvailabilityOption[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to search availability.');
      }

      if (payload.options !== undefined && !isAvailabilityOptionArray(payload.options)) {
        throw new Error('Unexpected response structure for availability options.');
      }

      setOptions(payload.options ?? []);
      setHasSearched(true);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Unexpected error occurred.';
      setError(message);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Opens the checkout modal for a selected table option.
   * Requires the user to be authenticated; redirects to login if not.
   */
  function handleSelectOption(option: AvailabilityOption) {
    setBookingError(null);
    setSelectedOption(option);
    setCheckoutModalKey((k) => k + 1);
    setIsModalOpen(true);
  }

  /**
   * Called by CheckoutModal on user confirmation.
   *
   * Flow:
   *   1. Fetch the current session to get the auth user ID.
   *   2. Resolve the customer_id from the users table via /api/customer/me.
   *   3. POST to /api/reservations/lock with the full booking payload.
   *   4. On success, redirect to /customer/dashboard.
   *   5. On lock conflict (55P03), display a 'Table already reserved' error.
   *   6. Keep modal open on error so user can try again.
   */
  async function handleCheckoutConfirm(paymentToken: string) {
    if (!selectedOption) return;

    try {
      // Resolve the current user's auth session client-side.
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        // Not logged in -- close modal and redirect to login.
        setIsModalOpen(false);
        router.push('/auth/login');
        return;
      }

      const authUserId = sessionData.session.user.id;

      // Resolve customer_id from /api/customer/me, which looks up the
      // public.customers row for the current auth user.
      const customerRes = await fetch('/api/customer/me', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });
      const customerPayload = (await customerRes.json()) as {
        customerId?: string;
        error?: string;
      };

      if (!customerRes.ok || !customerPayload.customerId) {
        throw new Error(
          customerPayload.error ?? 'Could not resolve your customer account. Please try again.'
        );
      }

      // POST the lock request to the booking engine.
      const lockRes = await fetch('/api/reservations/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          customerId: customerPayload.customerId,
          tableIds: selectedOption.table_ids,
          reservationDate,
          startTime: startTimeISO,
          endTime: endTimeISO,
          partySize,
          paymentToken,
          createdBy: authUserId,
        }),
      });

      const lockPayload = (await lockRes.json()) as {
        reservation?: { reservation_id: string; locked_until: string };
        error?: string;
      };

      if (!lockRes.ok) {
        // Map the 55P03 lock-conflict to a user-readable message (FR-3).
        const msg = lockPayload.error ?? 'Reservation failed.';
        const isConflict =
          msg.includes('no longer available') || msg.includes('lock') || msg.includes('55P03');
        throw new Error(
          isConflict
            ? 'This table was just reserved by someone else. Please select another option.'
            : msg
        );
      }

      // Success -- navigate to the dashboard.
      setIsModalOpen(false);
      router.push('/customer/dashboard?booking=confirmed');
    } catch (err) {
      // Error is caught by the modal's error handler
      const message = err instanceof Error ? err.message : 'Checkout failed. Please try again.';
      setBookingError(message);
      // Modal stays open for user to retry or cancel
      throw err; // Re-throw so modal can catch and display in its error state
    }
  }

  function handleModalClose() {
    setIsModalOpen(false);
    setSelectedOption(null);
    setBookingError(null);
  }

  /**
   * Check waitlist capacity for the selected date/time/party size (QDR-66 / FR-5)
   * Fetch current queue count; cap at ~50 parties per timeslot
   */
  async function checkWaitlistCapacity(): Promise<number> {
    try {
      // In a full implementation, would query /api/waitlist/capacity
      // For MVP, assume we can query the waitlist count for the selected timeslot
      const response = await fetch(
        `/api/waitlist/capacity?date=${reservationDate}&time=${reservationTime}&party_size=${partySize}`
      );
      const data = await response.json();
      return data.count ?? 0;
    } catch {
      // Default to 0 if query fails
      return 0;
    }
  }

  /**
   * Handle "Join Waitlist" button click (QDR-66 / FR-5)
   */
  async function handleJoinWaitlist() {
    setWaitlistError(null);
    setWaitlistLoading(true);

    try {
      // Check current capacity
      const currentCapacity = await checkWaitlistCapacity();
      setWaitlistCapacity(currentCapacity);

      // Hard cap: ~50 parties max per timeslot (FR-5)
      if (currentCapacity >= 50) {
        setWaitlistError('Waitlist is currently full for this time slot. Please try another time.');
        return;
      }

      // Open modal to confirm waitlist entry
      setIsWaitlistModalOpen(true);
    } catch (err) {
      setWaitlistError(
        err instanceof Error ? err.message : 'Failed to check waitlist capacity'
      );
    } finally {
      setWaitlistLoading(false);
    }
  }

  /**
   * Confirm joining the waitlist (QDR-66 / FR-5)
   */
  async function handleConfirmWaitlist() {
    setWaitlistError(null);
    setWaitlistLoading(true);

    try {
      // Get authenticated user
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setIsWaitlistModalOpen(false);
        router.push('/auth/login');
        return;
      }

      // Call /api/waitlist/join endpoint
      const response = await fetch('/api/waitlist/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          desired_date: reservationDate,
          desired_time: startTimeISO,
          party_size: partySize,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to join waitlist');
      }

      // Success -- show confirmation and close modal
      alert(
        `Success! You've been added to the waitlist at position ${data.waitlist_entry.position}. ` +
        `We'll notify you when a table becomes available.`
      );
      setIsWaitlistModalOpen(false);
    } catch (err) {
      setWaitlistError(err instanceof Error ? err.message : 'Failed to join waitlist');
    } finally {
      setWaitlistLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Gordon Ramsay Restaurant Reservations</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Search table availability by date, time, and party size.
        </p>
      </header>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="grid gap-4 rounded-lg border p-4 md:grid-cols-4">
        <label className="flex flex-col gap-2 text-sm">
          Date
          <input
            type="date"
            value={reservationDate}
            onChange={(event) => setReservationDate(event.target.value)}
            className="rounded border px-3 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Time
          <input
            type="time"
            value={reservationTime}
            onChange={(event) => setReservationTime(event.target.value)}
            className="rounded border px-3 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          Party Size
          <input
            type="number"
            min={1}
            max={12}
            value={partySize}
            onChange={(event) => setPartySize(Number(event.target.value))}
            className="rounded border px-3 py-2"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 md:self-end"
        >
          {loading ? 'Searching...' : 'Search Availability'}
        </button>
      </form>

      {/* Booking-level error (lock conflict etc.) */}
      {bookingError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {bookingError}
        </div>
      )}

      {/* Results + Menu Section */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-lg border p-4">
          <h2 className="mb-3 text-xl font-semibold">Availability Results</h2>

          {!hasSearched && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Submit a search to view available table options.
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {!error && options.length === 0 && hasSearched && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">No available options found.</p>
              {/* Phase 5.1: Waitlist UI (QDR-66 / FR-5) */}
              {waitlistError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {waitlistError}
                </div>
              )}
              <button
                type="button"
                onClick={handleJoinWaitlist}
                disabled={waitlistLoading || waitlistCapacity >= 50}
                className="w-full rounded bg-amber-600 px-4 py-2 text-white disabled:opacity-50 hover:bg-amber-700"
              >
                {waitlistCapacity >= 50
                  ? 'Waitlist Full'
                  : waitlistLoading
                  ? 'Checking capacity...'
                  : 'Join Virtual Waitlist'}
              </button>
            </div>
          )}

          {!error && options.length > 0 && (
            <ul className="space-y-2">
              {options.map((option) => (
                <li key={option.table_ids.join('-')}>
                  <button
                    type="button"
                    onClick={() => handleSelectOption(option)}
                    className="w-full rounded border p-3 text-left text-sm transition-colors hover:border-black hover:bg-zinc-50 dark:hover:border-zinc-400 dark:hover:bg-zinc-800"
                  >
                    <p>
                      <span className="font-medium">
                        {option.table_numbers.length > 1 ? 'Tables:' : 'Table:'}
                      </span>{' '}
                      {option.table_numbers.join(' + ')}
                    </p>
                    <p>
                      <span className="font-medium">Seats up to:</span> {option.total_capacity} guests
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Click to reserve this option
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <MenuDisplay className="self-start" />
      </div>

      {/* Checkout Modal (FR-3 / QDR-39) */}
      <CheckoutModal
        key={checkoutModalKey}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onConfirm={handleCheckoutConfirm}
        reservationDetails={
          selectedOption
            ? {
                date: reservationDate,
                time: reservationTime,
                party_size: partySize,
                table_id: selectedOption.table_ids[0],
              }
            : undefined
        }
      />

      {/* Waitlist Modal (Phase 5.1 / QDR-66 / FR-5) */}
      {isWaitlistModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
            <h2 className="text-xl font-semibold mb-4">Join the Virtual Waitlist</h2>

            <div className="mb-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <p>
                <span className="font-medium">Date:</span> {reservationDate}
              </p>
              <p>
                <span className="font-medium">Time:</span> {reservationTime}
              </p>
              <p>
                <span className="font-medium">Party Size:</span> {partySize} guests
              </p>
              <p className="text-xs mt-3 text-amber-600 dark:text-amber-400">
                We'll notify you when a table becomes available. Your spot will expire if you don't accept within 10 minutes.
              </p>
            </div>

            {waitlistError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {waitlistError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsWaitlistModalOpen(false)}
                className="flex-1 rounded border px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWaitlist}
                disabled={waitlistLoading}
                className="flex-1 rounded bg-amber-600 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-amber-700"
              >
                {waitlistLoading ? 'Joining...' : 'Join Waitlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
