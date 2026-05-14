// src/app/api/waitlist/join/route.ts
// QDR-41.1: Virtual Waitlist - Join endpoint
// FR-5: Allow customers to join virtual waitlist

import { NextRequest, NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/apiAuth";
import { getCustomerByUserId } from "@/services/customerService";
import waitlistService from "@/services/waitlistService";

interface JoinWaitlistRequest {
  desired_date: string; // YYYY-MM-DD
  desired_time: string; // ISO string
  party_size: number;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get authenticated customer
    const auth = await requireCustomerApi(request);
    if (!auth.ok) return auth.response;

    // 2. Parse request body
    const body: JoinWaitlistRequest = await request.json();
    const { desired_date, desired_time, party_size } = body;

    // 3. Validate inputs
    if (!desired_date || !desired_time || !party_size) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: desired_date, desired_time, party_size",
        },
        { status: 400 },
      );
    }

    if (party_size < 1 || party_size > 12) {
      return NextResponse.json(
        { error: "Party size must be between 1 and 12" },
        { status: 400 },
      );
    }

    // 4. Get customer record from user_id
    const customer = await getCustomerByUserId(auth.user.id);

    if (!customer) {
      return NextResponse.json(
        { error: "Customer profile not found" },
        { status: 404 },
      );
    }

    const customerId = customer.id;

    // 5. Check if customer already has a waiting entry for this timeslot
    const { createServiceSupabaseClient } = await import("@/lib/supabaseAdmin");
    const adminClient = createServiceSupabaseClient();
    const { data: existingEntries } = await adminClient
      .from("waitlist")
      .select("*")
      .eq("customer_id", customerId)
      .eq("desired_date", desired_date)
      .eq("party_size", party_size)
      .in("status", ["waiting", "offered"]);

    if (existingEntries && existingEntries.length > 0) {
      return NextResponse.json(
        {
          error:
            "You already have a waitlist entry for this date and party size",
          position: existingEntries[0].position,
        },
        { status: 409 },
      );
    }

    // 6. Join the waitlist via service
    const waitlistEntry = await waitlistService.joinWaitlist(
      customerId,
      desired_date,
      desired_time,
      party_size,
    );

    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        message: `You have been added to the waitlist. Position: ${waitlistEntry.position}`,
        waitlist_entry: {
          id: waitlistEntry.id,
          position: waitlistEntry.position,
          status: waitlistEntry.status,
          created_at: waitlistEntry.created_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error joining waitlist:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to join waitlist",
      },
      { status: 500 },
    );
  }
}
