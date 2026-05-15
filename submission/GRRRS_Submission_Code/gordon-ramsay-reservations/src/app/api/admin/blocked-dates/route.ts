import { NextResponse } from 'next/server';
import { createBlockedDate } from '@/services/reservationService';

/**
 * POST /api/admin/blocked-dates
 * Creates a blocked date entry to prevent online bookings for holidays/events.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { blockedDate, reason } = body;

    if (!blockedDate || !reason) {
      return NextResponse.json(
        { error: 'blockedDate and reason are required' },
        { status: 400 }
      );
    }

    const id = await createBlockedDate(blockedDate, reason);

    return NextResponse.json(
      {
        success: true,
        id,
        blockedDate,
        reason,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create blocked date';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
