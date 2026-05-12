import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { deleteCustomerAccount } from '@/services/customerService';

/**
 * POST /api/customer/delete-account
 *
 * Deletes the currently authenticated account and relies on the database
 * cascade chain to remove the linked profile and reservation data.
 */
export async function POST(req: Request) {
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

    await deleteCustomerAccount(user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error while deleting account.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}