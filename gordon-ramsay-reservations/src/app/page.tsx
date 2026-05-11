'use client';

import { FormEvent, useState } from 'react';

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
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AvailabilityOption[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOptions([]);
    setHasSearched(false);

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

    const endLocal = new Date(
      startLocal.getTime() + DEFAULT_RESERVATION_HOURS * ONE_HOUR_IN_MS
    );

    setLoading(true);
    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationDate,
          startTime: startLocal.toISOString(),
          endTime: endLocal.toISOString(),
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Gordon Ramsay Restaurant Reservations</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Search table availability by date, time, and party size.
        </p>
      </header>

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

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-xl font-semibold">Availability Results</h2>

        {!hasSearched && (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Submit a search to view available table options.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!error && options.length === 0 && hasSearched && (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">No available options found.</p>
        )}

        {!error && options.length > 0 && (
          <ul className="space-y-2">
            {options.map((option) => (
              <li key={option.table_ids.join('-')} className="rounded border p-3 text-sm">
                <p>
                  <span className="font-medium">Tables:</span> {option.table_numbers.join(', ')}
                </p>
                <p>
                  <span className="font-medium">Total Capacity:</span> {option.total_capacity}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
