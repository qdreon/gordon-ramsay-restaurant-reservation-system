import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getCustomerByUserId, getReservationsForCustomer } from '@/services/customerService';

/**
 * GET /api/customer/reservations
 *
 * Returns all reservations for the currently authenticated customer.
 */
export async function GET(req: Request) {
  try {
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

    const reservations = await getReservationsForCustomer(customer.id);
    return NextResponse.json({ reservations }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error while fetching reservations.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
