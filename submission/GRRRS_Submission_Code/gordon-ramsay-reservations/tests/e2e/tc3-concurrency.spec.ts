/**
 * tc3-concurrency.spec.ts
 * ------------------------
 * QDR-49 / TC-3.2: Real-Time Concurrency Lock Resolution (FR-3, PR-2)
 *
 * I verify that when two customers attempt to book the same table at the
 * same time, PostgreSQL row-level locking (SELECT ... FOR UPDATE) ensures
 * exactly one succeeds and the other receives a "Table already reserved"
 * error. The conflict must resolve within 1 second (PR-2).
 *
 * Strategy:
 *   - Use the live /api/availability endpoint to find a genuinely available slot.
 *   - Resolve the seeded test customer from Supabase using the service-role key.
 *   - Fire two identical POST /api/reservations/lock requests at the same time.
 *   - Assert exactly one succeeds and the other returns the lock conflict error.
 *   - Measure the wall-clock time from fire to resolution (PR-2 DB lock target = 1s; <15s tolerance for full HTTP/browser e2e overhead).
 *
 * Jira: QDR-49 / Subtask 7.3
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";

const CUSTOMER_EMAIL = "test-customer@example.com";

// Search parameters -- a far-future date to avoid conflicts with existing data.
// NOTE: Updated to 2030-01-15 (from 2027-06-15) after TC-3.2 was skipped on
// 2026-05-13 because the earlier date returned no available slots.
// If this date also returns no options, verify that the `tables` seed data
// contains at least one table with capacity >= 2 and that no reservation or
// lock exists for this slot.  (See Documents/defects_log.md DEF-005)
const SEARCH_DATE = "2030-01-15";
const SEARCH_TIME = "19:00";
const SEARCH_PARTY = "2";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  "http://localhost:3000";
function loadDotEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  const fileText = readFileSync(envPath, "utf8");
  for (const line of fileText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...rest] = trimmed.split("=");
    if (process.env[key]) {
      continue;
    }

    let value = rest.join("=");
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadDotEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables for TC-3.2.");
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildReservationRange(
  reservationDate: string,
  reservationTime: string,
) {
  const [year, month, day] = reservationDate.split("-").map(Number);
  const [hour, minute] = reservationTime.split(":").map(Number);
  const startLocal = new Date(year, month - 1, day, hour, minute, 0);
  const endLocal = new Date(startLocal.getTime() + 2 * 60 * 60 * 1000);

  return {
    startTime: startLocal.toISOString(),
    endTime: endLocal.toISOString(),
  };
}

async function getCustomerId(email: string): Promise<string> {
  const { data: userRow, error: userError } = await adminSupabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (userError || !userRow) {
    throw new Error(
      `Unable to resolve user row for ${email}: ${userError?.message ?? "not found"}`,
    );
  }

  const { data: customerRow, error: customerError } = await adminSupabase
    .from("customers")
    .select("id")
    .eq("user_id", userRow.id)
    .single();

  if (customerError || !customerRow) {
    throw new Error(
      `Unable to resolve customer row for ${email}: ${customerError?.message ?? "not found"}`,
    );
  }

  return customerRow.id;
}

async function getAvailabilityOption() {
  const { startTime, endTime } = buildReservationRange(
    SEARCH_DATE,
    SEARCH_TIME,
  );

  const response = await fetch(`${BASE_URL}/api/availability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reservationDate: SEARCH_DATE,
      startTime,
      endTime,
      partySize: Number(SEARCH_PARTY),
    }),
  });

  const payload = (await response.json()) as {
    options?: Array<{
      table_ids: string[];
      table_numbers: number[];
      total_capacity: number;
    }>;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to fetch availability options.");
  }

  const options = payload.options ?? [];
  if (options.length === 0) {
    return null;
  }

  return {
    option: options[0],
    startTime,
    endTime,
  };
}

async function postLockReservation(body: {
  customerId: string;
  tableIds: string[];
  reservationDate: string;
  startTime: string;
  endTime: string;
  partySize: number;
  paymentToken: string;
}) {
  const response = await fetch(`${BASE_URL}/api/reservations/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as {
    error?: string;
    reservation?: unknown;
  };
  return { response, payload };
}

// ---------------------------------------------------------------------------
// TC-3.2: Concurrency lock conflict test
// ---------------------------------------------------------------------------

test.describe("TC-3.2 Concurrency Lock Resolution (FR-3, PR-2) [QDR-49]", () => {
  test("two simultaneous bookings: one must succeed, one must receive a lock conflict error", async () => {
    const customerId = await getCustomerId(CUSTOMER_EMAIL);
    const availability = await getAvailabilityOption();

    if (!availability) {
      test.skip(
        true,
        `No table options available for ${SEARCH_DATE} ${SEARCH_TIME} party=${SEARCH_PARTY}. ` +
          "Seed a future available slot or change the search date to run this test.",
      );
      return;
    }

    const paymentToken = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const requestBody = {
      customerId,
      tableIds: availability.option.table_ids,
      reservationDate: SEARCH_DATE,
      startTime: availability.startTime,
      endTime: availability.endTime,
      partySize: Number(SEARCH_PARTY),
      paymentToken,
    };

    const startMs = Date.now();
    const [firstAttempt, secondAttempt] = await Promise.all([
      postLockReservation(requestBody),
      postLockReservation(requestBody),
    ]);
    const elapsedMs = Date.now() - startMs;

    console.log(`[TC-3.2] Lock resolution wall-clock time: ${elapsedMs}ms`);

    expect(
      elapsedMs,
      `Lock conflict must resolve within 15 000ms total round-trip (PR-2 DB lock target = 1s). Got ${elapsedMs}ms`,
    ).toBeLessThan(15000);

    const outcomes = [firstAttempt, secondAttempt];
    const successCount = outcomes.filter(({ response }) => response.ok).length;
    const conflictAttempt = outcomes.find(({ response }) => !response.ok);

    expect(successCount, "Exactly one booking request must succeed").toBe(1);
    expect(
      conflictAttempt,
      "One booking request must fail with a lock conflict",
    ).toBeDefined();
    expect(conflictAttempt?.payload.error ?? "").toMatch(
      /reserved|lock|55P03/i,
    );
  });
});
