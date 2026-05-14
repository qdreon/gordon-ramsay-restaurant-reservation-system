"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CheckoutModal from "@/components/CheckoutModal";
import MenuDisplay from "@/components/MenuDisplay";
import { validateReservationTime } from "@/lib/config";

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

function isAvailabilityOptionArray(
  value: unknown,
): value is AvailabilityOption[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<AvailabilityOption>;
    return (
      Array.isArray(candidate.table_ids) &&
      Array.isArray(candidate.table_numbers) &&
      typeof candidate.total_capacity === "number"
    );
  });
}

export default function Home() {
  const router = useRouter();

  // Search form state
  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AvailabilityOption[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Stores the ISO start/end times calculated during search for reuse in the lock call.
  const [startTimeISO, setStartTimeISO] = useState("");
  const [endTimeISO, setEndTimeISO] = useState("");

  // Checkout modal state
  const [selectedOption, setSelectedOption] =
    useState<AvailabilityOption | null>(null);
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
      setError("Please select both date and time.");
      return;
    }

    const dateParts = reservationDate.split("-");
    const timeParts = reservationTime.split(":");

    if (dateParts.length !== 3 || timeParts.length !== 2) {
      setError("Invalid date/time format.");
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
      setError("Invalid date/time value.");
      return;
    }

    const startLocal = new Date(year, month - 1, day, hour, minute, 0);
    if (Number.isNaN(startLocal.getTime())) {
      setError("Invalid date/time selection.");
      return;
    }

    // Validate reservation time is within operating hours (FR-8 / QDR-74)
    const timeValidation = validateReservationTime(
      hour,
      DEFAULT_RESERVATION_HOURS,
    );
    if (!timeValidation.valid) {
      setError(
        timeValidation.error || "Reservation time is outside operating hours.",
      );
      return;
    }

    const endLocal = new Date(
      startLocal.getTime() + DEFAULT_RESERVATION_HOURS * ONE_HOUR_IN_MS,
    );
    const startISO = startLocal.toISOString();
    const endISO = endLocal.toISOString();

    // Cache times for the subsequent lock call.
    setStartTimeISO(startISO);
    setEndTimeISO(endISO);

    setLoading(true);
    try {
      const response = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        throw new Error(payload.error ?? "Failed to search availability.");
      }

      if (
        payload.options !== undefined &&
        !isAvailabilityOptionArray(payload.options)
      ) {
        throw new Error(
          "Unexpected response structure for availability options.",
        );
      }

      setOptions(payload.options ?? []);
      setHasSearched(true);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unexpected error occurred.";
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
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        // Not logged in -- close modal and redirect to login.
        setIsModalOpen(false);
        router.push("/auth/login");
        return;
      }

      // POST the lock request to the booking engine. The server resolves
      // customerId and createdBy from the authenticated session, not from
      // browser-provided IDs.
      const lockRes = await fetch("/api/reservations/lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          tableIds: selectedOption.table_ids,
          reservationDate,
          startTime: startTimeISO,
          endTime: endTimeISO,
          partySize,
          paymentToken,
        }),
      });

      const lockPayload = (await lockRes.json()) as {
        reservation?: { reservation_id: string; locked_until: string };
        error?: string;
      };

      if (!lockRes.ok) {
        // Map the 55P03 lock-conflict to a user-readable message (FR-3).
        const msg = lockPayload.error ?? "Reservation failed.";
        const isConflict =
          msg.includes("no longer available") ||
          msg.includes("lock") ||
          msg.includes("55P03");
        throw new Error(
          isConflict
            ? "This table was just reserved by someone else. Please select another option."
            : msg,
        );
      }

      // Success -- navigate to the dashboard.
      setIsModalOpen(false);
      router.push("/customer/dashboard?booking=confirmed");
    } catch (err) {
      // Error is caught by the modal's error handler
      const message =
        err instanceof Error
          ? err.message
          : "Checkout failed. Please try again.";
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
        `/api/waitlist/capacity?date=${reservationDate}&time=${reservationTime}&party_size=${partySize}`,
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
        setWaitlistError(
          "Waitlist is currently full for this time slot. Please try another time.",
        );
        return;
      }

      // Open modal to confirm waitlist entry
      setIsWaitlistModalOpen(true);
    } catch (err) {
      setWaitlistError(
        err instanceof Error
          ? err.message
          : "Failed to check waitlist capacity",
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
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setIsWaitlistModalOpen(false);
        router.push("/auth/login");
        return;
      }

      // Call /api/waitlist/join endpoint
      const response = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desired_date: reservationDate,
          desired_time: startTimeISO,
          party_size: partySize,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to join waitlist");
      }

      // Success -- show confirmation and close modal
      alert(
        `Success! You've been added to the waitlist at position ${data.waitlist_entry.position}. ` +
          `We'll notify you when a table becomes available.`,
      );
      setIsWaitlistModalOpen(false);
    } catch (err) {
      setWaitlistError(
        err instanceof Error ? err.message : "Failed to join waitlist",
      );
    } finally {
      setWaitlistLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(180,83,9,0.16),_transparent_35%),linear-gradient(180deg,_#fff7ed_0%,_#ffffff_42%,_#fafafa_100%)] text-zinc-950 dark:bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_35%),linear-gradient(180deg,_#0c0a09_0%,_#111827_52%,_#020617_100%)] dark:text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 rounded-full border border-amber-200/70 bg-white/80 px-5 py-3 shadow-sm backdrop-blur dark:border-amber-500/20 dark:bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-sm font-black tracking-tight text-amber-300 dark:bg-amber-400 dark:text-zinc-950">
              GR
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-zinc-900 dark:text-white">
                Gordon Ramsay
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Restaurant Reservations
              </p>
            </div>
          </div>

          <a
            href="#reservation-menu"
            className="hidden rounded-full bg-zinc-950 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-zinc-950/10 transition hover:-translate-y-0.5 hover:bg-amber-700 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300 sm:inline-flex"
          >
            Reserve Now
          </a>
        </header>

        <section className="grid items-center gap-10 py-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:py-14">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-100/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              Fine Dining • Live Availability • Instant Booking
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-6xl lg:text-7xl">
                Gordon Ramsay Restaurant Reservations
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
                Book your table with real-time availability, explore the menu,
                and secure your reservation with a fast simulated checkout.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="#reservation-menu"
                className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-7 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-xl shadow-zinc-950/15 transition hover:-translate-y-0.5 hover:bg-amber-700 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
              >
                Go to Reservation Menu
              </a>
              <a
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white/80 px-7 py-4 text-sm font-bold uppercase tracking-[0.18em] text-zinc-900 transition hover:-translate-y-0.5 hover:border-amber-500 hover:text-amber-700 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-amber-300 dark:hover:text-amber-200"
              >
                Customer Login
              </a>
            </div>

            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ["Live tables", "Realtime availability checks"],
                ["5-min lock", "Checkout window protection"],
                ["Waitlist", "Join when fully booked"],
              ].map(([title, subtitle]) => (
                <div
                  key={title}
                  className="rounded-3xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
                >
                  <p className="text-sm font-bold text-zinc-950 dark:text-white">
                    {title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {subtitle}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-amber-200 bg-zinc-950 p-6 text-white shadow-2xl shadow-amber-950/20 dark:border-amber-400/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(245,158,11,0.35),_transparent_30%),radial-gradient(circle_at_80%_0%,_rgba(251,191,36,0.2),_transparent_28%)]" />
            <div className="relative space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
                  Tonight&apos;s Experience
                </p>
                <h2 className="mt-3 text-3xl font-black">Chef&apos;s Table</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Reserve prime seating, review menu highlights, and manage your
                  booking from your customer dashboard.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 text-zinc-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Open Slots
                  </p>
                  <p className="mt-2 text-3xl font-black">Live</p>
                </div>
                <div className="rounded-2xl bg-amber-300 p-4 text-zinc-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-900">
                    Max Pax
                  </p>
                  <p className="mt-2 text-3xl font-black">12</p>
                </div>
              </div>

              <a
                href="#reservation-menu"
                className="flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-zinc-950 transition hover:bg-amber-300"
              >
                Start Reservation
              </a>
            </div>
          </div>
        </section>

        <section
          id="reservation-menu"
          className="scroll-mt-8 space-y-6 rounded-[2rem] border border-zinc-200 bg-white/90 p-5 shadow-xl shadow-zinc-950/5 backdrop-blur dark:border-white/10 dark:bg-zinc-950/80 sm:p-7"
        >
          <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-white/10 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">
                Reservation Menu
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Find your table and browse the menu
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Choose a date, time, and party size. If no table is available,
                you can join the virtual waitlist.
              </p>
            </div>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="grid gap-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5 md:grid-cols-4"
          >
            <label className="flex flex-col gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Date
              <input
                type="date"
                value={reservationDate}
                onChange={(event) => setReservationDate(event.target.value)}
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Time
              <input
                type="time"
                value={reservationTime}
                onChange={(event) => setReservationTime(event.target.value)}
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Party Size
              <input
                type="number"
                min={1}
                max={12}
                value={partySize}
                onChange={(event) => setPartySize(Number(event.target.value))}
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300 md:self-end"
            >
              {loading ? "Searching..." : "Search Availability"}
            </button>
          </form>

          {/* Booking-level error (lock conflict etc.) */}
          {bookingError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {bookingError}
            </div>
          )}

          {/* Results + Menu Section */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
              <h2 className="mb-3 text-xl font-bold">Availability Results</h2>

              {!hasSearched && (
                <p className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                  Submit a search to view available table options.
                </p>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              {!error && options.length === 0 && hasSearched && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    No available options found.
                  </p>
                  {/* Phase 5.1: Waitlist UI (QDR-66 / FR-5) */}
                  {waitlistError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                      {waitlistError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleJoinWaitlist}
                    disabled={waitlistLoading || waitlistCapacity >= 50}
                    className="w-full rounded-2xl bg-amber-600 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-amber-700 disabled:opacity-50"
                  >
                    {waitlistCapacity >= 50
                      ? "Waitlist Full"
                      : waitlistLoading
                        ? "Checking capacity..."
                        : "Join Virtual Waitlist"}
                  </button>
                </div>
              )}

              {!error && options.length > 0 && (
                <ul className="space-y-3">
                  {options.map((option) => (
                    <li key={option.table_ids.join("-")}>
                      <button
                        type="button"
                        data-test="availability-item"
                        onClick={() => handleSelectOption(option)}
                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left text-sm transition hover:-translate-y-0.5 hover:border-amber-500 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-amber-300 dark:hover:bg-amber-400/10"
                      >
                        <p>
                          <span className="font-semibold">
                            {option.table_numbers.length > 1
                              ? "Tables:"
                              : "Table:"}
                          </span>{" "}
                          {option.table_numbers.join(" + ")}
                        </p>
                        <p>
                          <span className="font-semibold">Seats up to:</span>{" "}
                          {option.total_capacity} guests
                        </p>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
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
        </section>
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
            <h2 className="text-xl font-semibold mb-4">
              Join the Virtual Waitlist
            </h2>

            <div className="mb-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <p>
                <span className="font-medium">Date:</span> {reservationDate}
              </p>
              <p>
                <span className="font-medium">Time:</span> {reservationTime}
              </p>
              <p>
                <span className="font-medium">Party Size:</span> {partySize}{" "}
                guests
              </p>
              <p className="text-xs mt-3 text-amber-600 dark:text-amber-400">
                We&apos;ll notify you when a table becomes available. Your spot
                will expire if you don&apos;t accept within 10 minutes.
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
                {waitlistLoading ? "Joining..." : "Join Waitlist"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
