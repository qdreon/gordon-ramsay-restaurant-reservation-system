import { NextResponse } from 'next/server';
import { createPendingReservationLock } from '@/services/reservationService';

interface LockReservationRequestBody {
  customerId?: string;
  tableIds?: string[];
  reservationDate?: string;
  startTime?: string;
  endTime?: string;
  partySize?: number;
  specialRequests?: string;
  createdBy?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LockReservationRequestBody;
    const { customerId, tableIds, reservationDate, startTime, endTime, partySize } = body;

    if (
      !customerId ||
      !tableIds ||
      tableIds.length === 0 ||
      !reservationDate ||
      !startTime ||
      !endTime ||
      !partySize
    ) {
      return NextResponse.json(
        {
          error:
            'customerId, tableIds, reservationDate, startTime, endTime, and partySize are required.',
        },
        { status: 400 }
      );
    }

    const lockResult = await createPendingReservationLock({
      customerId,
      tableIds,
      reservationDate,
      startTime,
      endTime,
      partySize,
      specialRequests: body.specialRequests,
      createdBy: body.createdBy,
    });

    return NextResponse.json({ reservation: lockResult }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error while creating reservation lock.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
