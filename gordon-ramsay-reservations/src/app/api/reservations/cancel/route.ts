import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { sendWaitlistInvite } from '@/services/notificationService';
import {
  cancelReservation,
  getCustomerByUserId,
  getReservationForCustomer,
} from '@/services/customerService';
import { createServiceSupabaseClient } from '@/lib/supabaseAdmin';

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

    // Phase 5.3: if the cancellation caused the waitlist trigger to offer a spot,
    // send the waitlist invitation email to the newly offered customer.
    try {
      const adminSupabase = createServiceSupabaseClient();
      const { data: offeredWaitlist, error: waitlistError } = await adminSupabase
        .from('waitlist')
        .select('id, customer_id, desired_date, desired_time, party_size, position')
        .eq('desired_date', reservation.reservation_date)
        .eq('party_size', reservation.party_size)
        .eq('status', 'offered')
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!waitlistError && offeredWaitlist) {
        const { data: waitlistCustomer, error: customerLookupError } = await adminSupabase
          .from('customers')
          .select('id, user_id, users!inner(email, full_name)')
          .eq('id', offeredWaitlist.customer_id)
          .single();

        if (!customerLookupError && waitlistCustomer) {
          const userRecord = waitlistCustomer.users as
            | { email?: string | null; full_name?: string | null }
            | undefined;

          if (userRecord?.email) {
            await sendWaitlistInvite({
              inviteId: offeredWaitlist.id,
              guestName: userRecord.full_name || userRecord.email,
              guestEmail: userRecord.email,
              partySize: offeredWaitlist.party_size,
              requestedDate: offeredWaitlist.desired_date,
              requestedTime: new Date(offeredWaitlist.desired_time).toISOString().slice(11, 16),
              restaurantName: process.env.RESTAURANT_NAME ?? 'Gordon Ramsay Restaurant',
              restaurantAddress:
                  process.env.RESTAURANT_ADDRESS ?? 'Gordon Ramsay Restaurant, Cebu City, Philippines',
              waitlistPosition: offeredWaitlist.position,
              confirmationURL:
                `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/customer/dashboard?waitlist=offered`,
            });
          }
        }
      }
    } catch (emailError) {
      console.error('[Cancellation Notification] Failed to send waitlist invitation:', emailError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error while cancelling reservation.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
