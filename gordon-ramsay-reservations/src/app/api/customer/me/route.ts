import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getCustomerByUserId } from '@/services/customerService';

/**
 * GET /api/customer/me
 *
 * Purpose:
 *   Resolves the `public.customers.id` (customer_id) for the currently
 *   authenticated user. This is required by the booking lock RPC, which
 *   expects a `customer_id` UUID rather than the Supabase `auth.uid()`.
 *
 * Returns:
 *   { customerId: string } on success.
 *   { error: string } with appropriate status on failure.
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
      return NextResponse.json(
        { error: 'Customer profile not found. Please complete registration.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ customerId: customer.id }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error resolving customer profile.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
