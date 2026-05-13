import { NextResponse, NextRequest } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabaseAdmin';

/**
 * POST /api/admin/tables/[id]/mark-dirty
 * 
 * Purpose: Mark a table as "dirty" and complete the associated reservation.
 * When an admin marks a table dirty, the system:
 * 1. Finds any active reservations for that table
 * 2. Updates the reservation status to 'completed'
 * 3. Triggers the table teardown (via DB trigger on migration 008)
 * 4. Returns success
 * 
 * QDR-69 (Phase 4.1): Table status transitions for dirty/completed
 * FR-7: Complete reservations when service finishes
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tableId } = await params;
    if (!tableId) {
      return NextResponse.json(
        { error: 'Table ID is required.' },
        { status: 400 }
      );
    }

    const adminClient = createServiceSupabaseClient();

    // Find the active reservation for this table
    // An "active" reservation is one with status in ['pending', 'confirmed', 'seated']
    const { data: reservations, error: findError } = await adminClient
      .from('reservations')
      .select('id, status, reservation_date, start_time, end_time, customer_id, table_ids')
      .eq('table_ids', [tableId])
      .in('status', ['pending', 'confirmed', 'seated']);

    if (findError) {
      return NextResponse.json(
        { error: `Failed to find reservation: ${findError.message}` },
        { status: 500 }
      );
    }

    // If no active reservation, just return success (table might already be clean)
    if (!reservations || reservations.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'Table marked as dirty (no active reservation found).',
          reservationId: null,
        },
        { status: 200 }
      );
    }

    // Complete the first active reservation
    const reservation = reservations[0];
    const { error: updateError } = await adminClient
      .from('reservations')
      .update({ status: 'completed' })
      .eq('id', reservation.id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to complete reservation: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Table marked as dirty and reservation completed.',
        reservationId: reservation.id,
        newStatus: 'completed',
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while marking table dirty.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
