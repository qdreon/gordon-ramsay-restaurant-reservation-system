import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/apiAuth";
import { deleteCustomerAccount } from "@/services/customerService";

/**
 * POST /api/customer/delete-account
 *
 * Deletes the currently authenticated account and relies on the database
 * cascade chain to remove the linked profile and reservation data.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireCustomerApi(req);
    if (!auth.ok) return auth.response;

    await deleteCustomerAccount(auth.user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while deleting account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
