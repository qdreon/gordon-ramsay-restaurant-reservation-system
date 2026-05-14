import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/apiAuth";
import {
  getCustomerByUserId,
  getReservationsForCustomer,
} from "@/services/customerService";

/**
 * GET /api/customer/reservations
 *
 * Returns all reservations for the currently authenticated customer.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireCustomerApi(req);
    if (!auth.ok) return auth.response;

    const customer = await getCustomerByUserId(auth.user.id);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer profile not found." },
        { status: 404 },
      );
    }

    const reservations = await getReservationsForCustomer(customer.id);
    return NextResponse.json({ reservations }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while fetching reservations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
