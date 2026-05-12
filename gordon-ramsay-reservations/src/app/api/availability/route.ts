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

    // Normalize start/end times to full ISO timestamps (TIMESTAMPTZ)
    const normalize = (date?: string, time?: string) => {
      if (!date || !time) return undefined;
      if (time.includes('T')) return time;
      // Accept 'HH:MM' or 'HH:MM:SS' and append seconds/zulu as needed
      let t = time;
      if (/^\d{2}:\d{2}$/.test(time)) t = `${time}:00`;
      return `${date}T${t}Z`;
    };

    const startIso = normalize(reservationDate, startTime)!;
    const endIso = normalize(reservationDate, endTime)!;

    const options = await findAvailableTableOptions({
      reservationDate,
      startTime: startIso,
      endTime: endIso,
      partySize,
    });

    return NextResponse.json({ options }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error while querying availability.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
