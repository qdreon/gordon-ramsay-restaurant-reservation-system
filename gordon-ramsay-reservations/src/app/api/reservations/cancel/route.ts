import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import {
  cancelReservation,
  getCustomerByUserId,
  getReservationForCustomer,
} from '@/services/customerService';

interface CancelReservationBody {
  reservationId?: string;
}

const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;

/**
 * POST /api/reservations/cancel
 *
 * Cancels an upcoming reservation for the signed-in customer.
 * FR-10: cancellation is disallowed within 2 hours of start time.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CancelReservationBody;
    if (!body.reservationId) {
      return NextResponse.json({ error: 'reservationId is required.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const authHeader = req.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken ?? undefined);

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const customer = await getCustomerByUserId(user.id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer profile not found.' }, { status: 404 });
    }

    const reservation = await getReservationForCustomer(body.reservationId, customer.id);
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found.' }, { status: 404 });
    }

    const cancellableStatuses = ['pending_payment', 'confirmed'];
    if (!cancellableStatuses.includes(reservation.status)) {
      return NextResponse.json(
        { error: `Reservation with status '${reservation.status}' cannot be cancelled.` },
        { status: 400 }
      );
    }

    const timeUntilStart = new Date(reservation.start_time).getTime() - Date.now();
    if (timeUntilStart < TWO_HOURS_IN_MS) {
      return NextResponse.json(
        { error: 'Cancellation is only allowed at least 2 hours before reservation time.' },
        { status: 400 }
      );
    }

    await cancelReservation(reservation.id, customer.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error while cancelling reservation.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
