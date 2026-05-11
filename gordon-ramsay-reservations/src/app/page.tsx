'use client';

import { FormEvent, useMemo, useState } from 'react';

type AvailabilityOption = {
  table_ids: string[];
  table_numbers: number[];
  total_capacity: number;
};

export default function Home() {
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AvailabilityOption[]>([]);

  const hasSearched = useMemo(
    () => options.length > 0 || error !== null,
    [options.length, error]
  );

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOptions([]);

    if (!reservationDate || !reservationTime) {
      setError('Please select both date and time.');
      return;
    }

    const startLocal = new Date(`${reservationDate}T${reservationTime}:00`);
    if (Number.isNaN(startLocal.getTime())) {
      setError('Invalid date/time selection.');
      return;
    }

    const endLocal = new Date(startLocal.getTime() + 2 * 60 * 60 * 1000);

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

      setOptions(payload.options ?? []);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Unexpected error occurred.';
      setError(message);
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
