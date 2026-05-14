import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/apiAuth";
import {
  getReservationsByDateRange,
  getBlockedDatesForMonth,
} from "@/services/reservationService";

/**
 * GET /api/admin/reservations/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Fetches reservations and blocked dates for a date range.
 * Used by `/admin/reservations` calendar to populate events.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate query parameters are required" },
        { status: 400 },
      );
    }

    // Extract year and month from startDate for blocked dates query
    const [year, month] = startDate.split("-").slice(0, 2);

    const [reservations, blockedDates] = await Promise.all([
      getReservationsByDateRange(startDate, endDate),
      getBlockedDatesForMonth(parseInt(year), parseInt(month)),
    ]);

    return NextResponse.json(
      {
        reservations,
        blockedDates,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch calendar data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
