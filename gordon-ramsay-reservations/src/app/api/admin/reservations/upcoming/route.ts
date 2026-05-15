import { NextResponse } from 'next/server';
import supabase from '@/lib/authClient';

/**
 * GET /api/admin/reservations/upcoming
 * Fetches upcoming confirmed/seated reservations for real-time display on floor plan
 * Used by FloorPlanManager to show "Upcoming Reservations" widget
 * 
 * Returns:
 * - reservations: array of confirmed/seated reservations with customer details
 * - customers: map of customer_id -> { full_name }
 * 
 * Requirements:
 * - FR-1: Account Management
 * - QDR-59: Reservation display on customer & admin dashboards
 */
export async function GET(request: Request) {
  try {
    // Get current time for "upcoming" filtering
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch confirmed and seated reservations for the next 7 days
    const { data: reservations, error: reservationError } = await supabase
      .from('reservations')
      .select('id, customer_id, start_time, end_time, party_size, status, reservation_date')
      .in('status', ['confirmed', 'seated'])
      .gte('start_time', now.toISOString())
      .lte('start_time', oneWeekFromNow.toISOString())
      .order('start_time', { ascending: true });

    if (reservationError) {
      throw new Error(`Failed to fetch reservations: ${reservationError.message}`);
    }

    if (!reservations || reservations.length === 0) {
      return NextResponse.json(
        {
          reservations: [],
          customers: {},
        },
        { status: 200 }
      );
    }

    // Get unique customer IDs
    const customerIds = [...new Set(reservations.map((r) => r.customer_id))];

    // Fetch customer details (full name)
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, user_id')
      .in('id', customerIds);

    if (customerError) {
      console.error('Failed to fetch customer details:', customerError);
      // Continue anyway, use fallback names
    }

    // Create customer map for quick lookup
    const customerMap: Record<string, { full_name: string }> = {};
    customers?.forEach((customer) => {
      customerMap[customer.id] = { full_name: customer.full_name };
    });

    return NextResponse.json(
      {
        reservations,
        customers: customerMap,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch upcoming reservations';
    console.error('Error fetching upcoming reservations:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
