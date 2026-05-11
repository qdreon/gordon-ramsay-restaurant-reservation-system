import { NextResponse } from 'next/server';
import { findAvailableTableOptions } from '@/services/tableService';

interface AvailabilityRequestBody {
  reservationDate?: string;
  startTime?: string;
  endTime?: string;
  partySize?: number;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AvailabilityRequestBody;
    const { reservationDate, startTime, endTime, partySize } = body;

    if (!reservationDate || !startTime || !endTime || !partySize) {
      return NextResponse.json(
        { error: 'reservationDate, startTime, endTime, and partySize are required.' },
        { status: 400 }
      );
    }

    const options = await findAvailableTableOptions({
      reservationDate,
      startTime,
      endTime,
      partySize,
    });

    return NextResponse.json({ options }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error while querying availability.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
