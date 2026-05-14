import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/apiAuth";
import { updateAdminCrmCustomer } from "@/services/customerService";

interface UpdateCrmBody {
  dietary_restrictions?: string | null;
  allergies?: string | null;
  staff_notes?: string | null;
  vip_status?: boolean;
}

/**
 * PATCH /api/admin/crm/[customerId]
 * Updates admin-editable CRM fields for a customer.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  try {
    const auth = await requireAdminApi(request);
    if (!auth.ok) return auth.response;

    const { customerId } = await params;
    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as UpdateCrmBody;

    const updatedCustomer = await updateAdminCrmCustomer(customerId, {
      dietary_restrictions: body.dietary_restrictions,
      allergies: body.allergies,
      staff_notes: body.staff_notes,
      vip_status: body.vip_status,
    });

    return NextResponse.json({ customer: updatedCustomer }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update CRM customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
