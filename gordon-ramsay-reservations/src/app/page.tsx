"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CheckoutModal from "@/components/CheckoutModal";
import MenuDisplay from "@/components/MenuDisplay";
import { validateReservationTime } from "@/lib/config";

const DEFAULT_RESERVATION_HOURS = 2;
const ONE_HOUR_IN_MS = 60 * 60 * 1000;
const RESERVATION_FLOW_STATE_KEY = "grrs-reservation-flow-state";

type AvailabilityOption = {
  table_ids: string[];
  table_numbers: number[];
  total_capacity: number;
};

type ToastKind = "success" | "error" | "info";

type ToastMessage = {
  id: number;
  title: string;
  description: string;
  kind: ToastKind;
};

type ReservationFlowState = {
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  startTimeISO: string;
  endTimeISO: string;
  options: AvailabilityOption[];
  selectedOption: AvailabilityOption | null;
  hasSearched: boolean;
  context: "checkout" | "waitlist";
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

  const reservationSectionRef = useRef<HTMLElement | null>(null);
  const toastIdRef = useRef(0);

  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AvailabilityOption[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [startTimeISO, setStartTimeISO] = useState("");
  const [endTimeISO, setEndTimeISO] = useState("");

  const [selectedOption, setSelectedOption] =
    useState<AvailabilityOption | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutModalKey, setCheckoutModalKey] = useState(0);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistCapacity, setWaitlistCapacity] = useState<number>(0);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const storedTheme = window.localStorage.getItem("theme");
    const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return storedTheme === "dark" || (!storedTheme && preferDark);
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(RESERVATION_FLOW_STATE_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as Partial<ReservationFlowState>;
      if (!saved.reservationDate || !saved.reservationTime || !saved.partySize) {
        return;
      }

      setReservationDate(saved.reservationDate);
      setReservationTime(saved.reservationTime);
      setPartySize(saved.partySize);
      setStartTimeISO(saved.startTimeISO ?? "");
      setEndTimeISO(saved.endTimeISO ?? "");
      setOptions(Array.isArray(saved.options) ? saved.options : []);
      setHasSearched(Boolean(saved.hasSearched));
      setSelectedOption(saved.selectedOption ?? null);

      if (saved.context === "checkout" && saved.selectedOption) {
        setCheckoutModalKey((key) => key + 1);
        setIsModalOpen(true);
      }
    } catch (restoreError) {
      console.error("[Reservation Flow] Failed to restore reservation state:", restoreError);
    } finally {
      window.sessionStorage.removeItem(RESERVATION_FLOW_STATE_KEY);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    window.localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  function pushToast(title: string, description: string, kind: ToastKind = "info") {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, title, description, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }

  function toggleTheme() {
    setIsDarkMode((prev) => !prev);
  }

  function scrollToReservation() {
    reservationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  }

  function persistReservationFlowState(context: "checkout" | "waitlist") {
    if (typeof window === "undefined") return;
    const payload: ReservationFlowState = {
      reservationDate,
      reservationTime,
      partySize,
      startTimeISO,
      endTimeISO,
      options,
      selectedOption,
      hasSearched,
      context,
    };
    window.sessionStorage.setItem(
      RESERVATION_FLOW_STATE_KEY,
      JSON.stringify(payload),
    );
  }

  function redirectToAuth(context: "checkout" | "waitlist") {
    persistReservationFlowState(context);
    const nextPath = "/?resumeReservation=1#reservation";
    router.push(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBookingError(null);
    setWaitlistError(null);
    setOptions([]);
    setHasSearched(false);
    setSelectedOption(null);

    if (!reservationDate || !reservationTime) {
      setError("Please select both date and time.");
      pushToast("Missing details", "Please select both date and time.", "error");
      return;
    }

    const dateParts = reservationDate.split("-");
    const timeParts = reservationTime.split(":");

    if (dateParts.length !== 3 || timeParts.length !== 2) {
      setError("Invalid date/time format.");
      pushToast("Invalid input", "Please use a valid date and time.", "error");
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
      pushToast("Invalid input", "Please correct your date and time selection.", "error");
      return;
    }

    const startLocal = new Date(year, month - 1, day, hour, minute, 0);
    if (Number.isNaN(startLocal.getTime())) {
      setError("Invalid date/time selection.");
      pushToast("Invalid selection", "Please choose a valid reservation slot.", "error");
      return;
    }

    const timeValidation = validateReservationTime(
      hour,
      DEFAULT_RESERVATION_HOURS,
    );
    if (!timeValidation.valid) {
      const message =
        timeValidation.error || "Reservation time is outside operating hours.";
      setError(message);
      pushToast("Outside operating hours", message, "error");
      return;
    }

    const endLocal = new Date(
      startLocal.getTime() + DEFAULT_RESERVATION_HOURS * ONE_HOUR_IN_MS,
    );
    const startISO = startLocal.toISOString();
    const endISO = endLocal.toISOString();

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

      const nextOptions = payload.options ?? [];
      setOptions(nextOptions);
      setHasSearched(true);

      if (nextOptions.length > 0) {
        pushToast(
          "Tables found",
          `${nextOptions.length} option${nextOptions.length > 1 ? "s" : ""} available for your request.`,
          "success",
        );
      } else {
        pushToast(
          "No tables available",
          "No instant availability found. You can join the virtual waitlist.",
          "info",
        );
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unexpected error occurred.";
      setError(message);
      setHasSearched(true);
      pushToast("Search failed", message, "error");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectOption(option: AvailabilityOption) {
    setBookingError(null);
    setSelectedOption(option);
    setCheckoutModalKey((k) => k + 1);
    setIsModalOpen(true);
  }

  async function handleCheckoutConfirm(paymentToken: string) {
    if (!selectedOption) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setIsModalOpen(false);
        redirectToAuth("checkout");
        return;
      }

      const authUserId = sessionData.session.user.id;

      const customerRes = await fetch("/api/customer/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });
      const customerPayload = (await customerRes.json()) as {
        customerId?: string;
        error?: string;
      };

      if (!customerRes.ok || !customerPayload.customerId) {
        throw new Error(
          customerPayload.error ??
            "Could not resolve your customer account. Please try again.",
        );
      }

      const lockRes = await fetch("/api/reservations/lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        email?: { sent: boolean; error?: string };
        error?: string;
      };

      if (!lockRes.ok) {
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

      setIsModalOpen(false);
      if (lockPayload.email && !lockPayload.email.sent) {
        pushToast(
          "Reservation confirmed",
          "Your reservation is confirmed, but email delivery failed. Please check your dashboard for details.",
          "info",
        );
      }
      pushToast("Reservation locked", "Your table has been reserved successfully.", "success");
      router.push("/customer/dashboard?booking=confirmed");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Checkout failed. Please try again.";
      setBookingError(message);
      pushToast("Reservation failed", message, "error");
      throw err;
    }
  }

  function handleModalClose() {
    setIsModalOpen(false);
    setSelectedOption(null);
    setBookingError(null);
  }

  async function checkWaitlistCapacity(): Promise<number> {
    try {
      const response = await fetch(
        `/api/waitlist/capacity?date=${reservationDate}&time=${reservationTime}&party_size=${partySize}`,
      );
      const data = await response.json();
      return data.count ?? 0;
    } catch {
      return 0;
    }
  }

  async function handleJoinWaitlist() {
    setWaitlistError(null);
    setWaitlistLoading(true);

    try {
      const currentCapacity = await checkWaitlistCapacity();
      setWaitlistCapacity(currentCapacity);

      if (currentCapacity >= 50) {
        const message =
          "Waitlist is currently full for this time slot. Please try another time.";
        setWaitlistError(message);
        pushToast("Waitlist full", message, "error");
        return;
      }

      setIsWaitlistModalOpen(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to check waitlist capacity";
      setWaitlistError(message);
      pushToast("Waitlist unavailable", message, "error");
    } finally {
      setWaitlistLoading(false);
    }
  }

  async function handleConfirmWaitlist() {
    setWaitlistError(null);
    setWaitlistLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setIsWaitlistModalOpen(false);
        redirectToAuth("waitlist");
        return;
      }

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

      pushToast(
        "Joined waitlist",
        `You are in position ${data.waitlist_entry.position}. We will notify you as soon as a table opens.`,
        "success",
      );
      setIsWaitlistModalOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join waitlist";
      setWaitlistError(message);
      pushToast("Waitlist join failed", message, "error");
    } finally {
      setWaitlistLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_38%),linear-gradient(180deg,#0b0b0f_0%,#15151d_45%,#17171f_100%)] text-zinc-100">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-left"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Fine Dining</p>
            <p className="font-semibold text-white">Gordon Ramsay</p>
          </button>

          <div className="hidden items-center gap-6 md:flex">
            <a href="#home" className="text-sm text-zinc-300 transition hover:text-white">Home</a>
            <a href="#dishes" className="text-sm text-zinc-300 transition hover:text-white">Featured</a>
            <a href="#restaurant-info" className="text-sm text-zinc-300 transition hover:text-white">Restaurant Info</a>
            <button
              type="button"
              onClick={scrollToReservation}
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-amber-300"
            >
              Reserve a Table
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="rounded-full border border-white/20 px-3 py-2 text-xs text-zinc-200 transition hover:border-white/50 hover:text-white"
            >
              {isDarkMode ? "Light" : "Dark"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="rounded-md border border-white/20 px-3 py-2 text-sm md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation"
          >
            Menu
          </button>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-nav" className="space-y-2 border-t border-white/10 px-4 py-4 md:hidden">
            <a href="#home" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-2 text-sm text-zinc-200 hover:bg-white/10">Home</a>
            <a href="#dishes" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-2 text-sm text-zinc-200 hover:bg-white/10">Featured Dishes</a>
            <a href="#restaurant-info" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-2 py-2 text-sm text-zinc-200 hover:bg-white/10">Restaurant Info</a>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={scrollToReservation}
                className="flex-1 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black"
              >
                Reserve a Table
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-zinc-100"
              >
                {isDarkMode ? "Light" : "Dark"}
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="mx-auto w-full max-w-7xl space-y-16 px-4 py-8 sm:px-6 lg:px-8 lg:py-14">
        <section id="home" className="grid gap-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:grid-cols-2 lg:p-10">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Michelin-level experience</p>
            <h1 className="font-heading text-4xl leading-tight sm:text-5xl">
              Reserve an unforgettable evening.
            </h1>
            <p className="max-w-xl text-zinc-300">
              Discover modern British fine dining with iconic Gordon Ramsay craftsmanship, curated tasting menus, and elegant hospitality.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={scrollToReservation}
                className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-amber-300"
              >
                Reserve a Table
              </button>
              <a
                href="#dishes"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:border-white/50 hover:bg-white/10"
              >
                Explore Menu Highlights
              </a>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="text-sm font-semibold text-amber-300">Open Daily</p>
                <p className="text-zinc-300">11:00 to 23:00</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="text-sm font-semibold text-amber-300">Location</p>
                <p className="text-zinc-300">Lapu-Lapu City, Cebu, Philippines</p>
              </div>
            </div>
          </div>

          <div className="relative min-h-[320px] rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,217,127,0.16),rgba(255,255,255,0.02)),radial-gradient(circle_at_80%_20%,rgba(255,208,102,0.32),transparent_45%),linear-gradient(145deg,#15151d,#0f0f14)] p-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-transparent to-white/10" />
            <div className="relative flex h-full flex-col justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-300">Tonight&apos;s Experience</p>
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur">
                  <p className="text-xs text-zinc-400">Chef&apos;s Signature</p>
                  <p className="text-lg font-semibold text-white">Beef Wellington</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur">
                  <p className="text-xs text-zinc-400">Seasonal Special</p>
                  <p className="text-lg font-semibold text-white">Lobster Risotto</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur">
                  <p className="text-xs text-zinc-400">Dessert</p>
                  <p className="text-lg font-semibold text-white">Sticky Toffee Soufflé</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="dishes" className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Featured dishes</p>
            <h2 className="font-heading text-3xl">Curated culinary highlights</h2>
            <p className="text-zinc-300">A modern menu blending precision, seasonal produce, and iconic flavor profiles.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Truffle Beef Wellington",
                note: "Prime filet, mushroom duxelles, red wine jus",
              },
              {
                name: "Butter-Poached Lobster",
                note: "Saffron bisque, charred leek, citrus oil",
              },
              {
                name: "Dark Chocolate Sphere",
                note: "Salted caramel core, warm ganache pour-over",
              },
            ].map((dish) => (
              <article key={dish.name} className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition duration-300 hover:-translate-y-1 hover:border-amber-300/40 hover:bg-white/10">
                <div className="mb-4 h-32 rounded-xl bg-[linear-gradient(130deg,rgba(255,214,124,0.38),rgba(255,255,255,0.04)),linear-gradient(160deg,#121218,#1c1c27)]" />
                <h3 className="text-lg font-semibold text-white">{dish.name}</h3>
                <p className="mt-2 text-sm text-zinc-300">{dish.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          ref={reservationSectionRef}
          id="reservation"
          className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:p-8"
        >
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Reservation</p>
              <h2 className="mt-2 font-heading text-3xl">Book your table</h2>
              <p className="mt-2 text-zinc-300">Search live availability and reserve instantly with secure checkout.</p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {["1. Find availability", "2. Select table", "3. Confirm reservation"].map((step) => (
                <span key={step} className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-zinc-200">
                  {step}
                </span>
              ))}
            </div>

            <form
              onSubmit={handleSearch}
              className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:grid-cols-2"
              aria-describedby="reservation-help"
            >
              <label htmlFor="reservation-date" className="flex flex-col gap-2 text-sm">
                Date
                <input
                  id="reservation-date"
                  type="date"
                  value={reservationDate}
                  onChange={(event) => setReservationDate(event.target.value)}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200/20"
                  required
                  aria-invalid={!!error && !reservationDate}
                />
              </label>

              <label htmlFor="reservation-time" className="flex flex-col gap-2 text-sm">
                Time
                <input
                  id="reservation-time"
                  type="time"
                  value={reservationTime}
                  onChange={(event) => setReservationTime(event.target.value)}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200/20"
                  required
                  aria-invalid={!!error && !reservationTime}
                />
              </label>

              <label htmlFor="party-size" className="flex flex-col gap-2 text-sm">
                Party Size
                <input
                  id="party-size"
                  type="number"
                  min={1}
                  max={12}
                  value={partySize}
                  onChange={(event) => setPartySize(Number(event.target.value))}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200/20"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:self-end"
              >
                {loading ? "Searching..." : "Search Availability"}
              </button>

              <p id="reservation-help" className="text-xs text-zinc-300 sm:col-span-2">
                Reservations are for {DEFAULT_RESERVATION_HOURS} hours and depend on real-time availability.
              </p>
            </form>

            {bookingError && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert">
                {bookingError}
              </div>
            )}

            <section className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-4" aria-live="polite">
              <h3 className="text-lg font-semibold text-white">Availability results</h3>

              {!hasSearched && (
                <p className="text-sm text-zinc-300">
                  Enter your details and run a search to view available tables.
                </p>
              )}

              {loading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-14 animate-pulse rounded-xl border border-white/10 bg-white/10" />
                  ))}
                </div>
              )}

              {error && !loading && <p className="text-sm text-red-300">{error}</p>}

              {!loading && !error && options.length === 0 && hasSearched && (
                <div className="space-y-4 rounded-xl border border-dashed border-white/20 bg-white/5 p-4">
                  <p className="text-sm text-zinc-200">No available options found for this slot.</p>
                  {waitlistError && (
                    <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                      {waitlistError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleJoinWaitlist}
                    disabled={waitlistLoading || waitlistCapacity >= 50}
                    className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {waitlistCapacity >= 50
                      ? "Waitlist Full"
                      : waitlistLoading
                        ? "Checking capacity..."
                        : "Join Virtual Waitlist"}
                  </button>
                </div>
              )}

              {!loading && !error && options.length > 0 && (
                <ul className="space-y-2">
                  {options.map((option) => (
                    <li key={option.table_ids.join("-")}>
                      <button
                        type="button"
                        onClick={() => handleSelectOption(option)}
                        className="w-full rounded-xl border border-white/15 bg-white/5 p-4 text-left text-sm transition hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-white/10"
                      >
                        <p>
                          <span className="font-medium text-zinc-100">
                            {option.table_numbers.length > 1 ? "Tables:" : "Table:"}
                          </span>{" "}
                          {option.table_numbers.join(" + ")}
                        </p>
                        <p className="mt-1 text-zinc-300">
                          <span className="font-medium text-zinc-100">Seats up to:</span>{" "}
                          {option.total_capacity} guests
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">Tap to reserve this option</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <MenuDisplay className="self-start rounded-2xl border border-white/10 bg-black/25 p-3" />
        </section>

        <section id="restaurant-info" className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Restaurant Info</p>
            <h2 className="font-heading text-3xl">Plan your visit</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                quote: "Lapu-Lapu City, Cebu, Philippines",
                author: "Location",
              },
              {
                quote: "Open daily from 11:00 to 23:00",
                author: "Operating Hours",
              },
              {
                quote: "reservations@gordonramsay.example",
                author: "Email Contact",
              },
            ].map((item) => (
              <blockquote key={item.author} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-200">
                <p>&ldquo;{item.quote}&rdquo;</p>
                <footer className="mt-3 text-xs uppercase tracking-wide text-amber-300">{item.author}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/30">
        <div className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-6 text-sm text-zinc-300 sm:px-6 lg:grid-cols-3 lg:px-8">
          <p><span className="font-semibold text-white">Gordon Ramsay Restaurant</span><br />Lapu-Lapu City, Cebu, Philippines</p>
          <p><span className="font-semibold text-white">Hours</span><br />Open Daily · 11:00–23:00</p>
          <p><span className="font-semibold text-white">Contact</span><br />reservations@gordonramsay.example</p>
        </div>
      </footer>

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

      {isWaitlistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-semibold">Join the Virtual Waitlist</h2>

            <div className="mb-4 space-y-2 text-sm text-zinc-300">
              <p>
                <span className="font-medium text-zinc-100">Date:</span> {reservationDate}
              </p>
              <p>
                <span className="font-medium text-zinc-100">Time:</span> {reservationTime}
              </p>
              <p>
                <span className="font-medium text-zinc-100">Party Size:</span> {partySize} guests
              </p>
              <p className="mt-3 text-xs text-amber-300">
                We&apos;ll notify you when a table becomes available. Your offer expires if not accepted in 10 minutes.
              </p>
            </div>

            {waitlistError && (
              <div className="mb-4 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                {waitlistError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsWaitlistModalOpen(false)}
                className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-sm transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWaitlist}
                disabled={waitlistLoading}
                className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
              >
                {waitlistLoading ? "Joining..." : "Join Waitlist"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border p-3 text-sm shadow-xl backdrop-blur ${
              toast.kind === "success"
                ? "border-emerald-300/30 bg-emerald-500/20 text-emerald-100"
                : toast.kind === "error"
                  ? "border-red-300/30 bg-red-500/20 text-red-100"
                  : "border-white/20 bg-black/40 text-zinc-100"
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold">{toast.title}</p>
            <p className="mt-1 text-xs opacity-90">{toast.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
