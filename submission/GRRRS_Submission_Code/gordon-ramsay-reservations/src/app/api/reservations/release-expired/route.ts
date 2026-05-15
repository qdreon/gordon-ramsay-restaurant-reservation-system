import { NextResponse } from 'next/server';
import { releaseExpiredPendingReservations } from '@/services/reservationService';

export async function POST() {
  try {
    const releasedCount = await releaseExpiredPendingReservations();
    return NextResponse.json({ releasedCount }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected error while releasing expired reservations.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
