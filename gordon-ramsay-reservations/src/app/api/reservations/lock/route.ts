import { NextResponse } from 'next/server';
import { createPendingReservationLock } from '@/services/reservationService';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { sendBookingConfirmation } from '@/services/notificationService';

interface LockReservationRequestBody {
  customerId?: string;
  tableIds?: string[];
  reservationDate?: string;
  startTime?: string;
  endTime?: string;
  partySize?: number;
  paymentToken?: string;
  specialRequests?: string;
  createdBy?: string;
}

function formatTimeFromIso(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LockReservationRequestBody;
    const { customerId, tableIds, reservationDate, startTime, endTime, partySize } = body;
    const authHeader = req.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

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
      paymentToken: body.paymentToken,
      specialRequests: body.specialRequests,
      createdBy: body.createdBy,
    });

    let emailSent = false;
    let emailErrorMessage: string | null = null;

    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken ?? undefined);

      if (authError || !user || !user.email) {
        throw new Error('Unable to resolve authenticated user for booking notification.');
      }

      const guestName =
        (user.user_metadata as { full_name?: string } | null)?.full_name || user.email || 'Guest';
      const guestEmail = user.email;

      await sendBookingConfirmation({
        reservationId: lockResult.reservation_id,
        guestName,
        guestEmail,
        partySize,
        reservationDate,
        reservationTime: formatTimeFromIso(startTime),
        reservationEndTime: formatTimeFromIso(endTime),
        restaurantName: process.env.RESTAURANT_NAME ?? 'Gordon Ramsay Restaurant',
        restaurantAddress:
          process.env.RESTAURANT_ADDRESS ??
          'Gordon Ramsay Restaurant, Lapu-Lapu City, Cebu, Philippines',
        restaurantLocation:
          process.env.RESTAURANT_LOCATION ?? 'Lapu-Lapu City, Cebu, Philippines',
        operatingHours:
          process.env.RESTAURANT_OPERATING_HOURS ?? 'Open daily from 11:00 to 23:00',
        specialRequests: body.specialRequests ?? null,
        confirmationURL:
          `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/customer/dashboard?booking=confirmed`,
      });
      emailSent = true;
    } catch (emailError) {
      console.error('[Reservation Notification] Failed to send booking confirmation:', emailError);
      emailErrorMessage =
        emailError instanceof Error ? emailError.message : 'Failed to send booking confirmation email.';
    }

    return NextResponse.json(
      {
        reservation: lockResult,
        email: {
          sent: emailSent,
          ...(emailErrorMessage ? { error: emailErrorMessage } : {}),
        },
      },
      { status: emailSent ? 200 : 202 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error while creating reservation lock.';
    console.error('[Lock API] Error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
