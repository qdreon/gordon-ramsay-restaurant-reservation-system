import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import {
  getCustomerAccountByUserId,
  getCustomerByUserId,
  updateCustomerAccountByUserId,
} from '@/services/customerService';

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
    const account = await getCustomerAccountByUserId(user.id);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer profile not found. Please complete registration.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        customerId: customer.id,
        profile: account
          ? {
              fullName: account.fullName,
              phone: account.phone,
              dietaryRestrictions: account.dietaryRestrictions,
              allergies: account.allergies,
              vipStatus: account.vipStatus,
              totalVisits: account.totalVisits,
              totalNoShows: account.totalNoShows,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error resolving customer profile.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
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

    const body = (await req.json()) as {
      fullName?: string;
      phone?: string | null;
      dietaryRestrictions?: string | null;
      allergies?: string | null;
    };

    const fullName = body.fullName?.trim();
    if (!fullName) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    const updatedAccount = await updateCustomerAccountByUserId(user.id, {
      fullName,
      phone: body.phone?.trim() ? body.phone.trim() : null,
      dietaryRestrictions: body.dietaryRestrictions?.trim() ? body.dietaryRestrictions.trim() : null,
      allergies: body.allergies?.trim() ? body.allergies.trim() : null,
    });

    return NextResponse.json(
      {
        success: true,
        profile: {
          fullName: updatedAccount.fullName,
          phone: updatedAccount.phone,
          dietaryRestrictions: updatedAccount.dietaryRestrictions,
          allergies: updatedAccount.allergies,
          vipStatus: updatedAccount.vipStatus,
          totalVisits: updatedAccount.totalVisits,
          totalNoShows: updatedAccount.totalNoShows,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error while updating customer profile.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
