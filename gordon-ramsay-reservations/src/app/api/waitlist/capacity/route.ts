/**
 * GET /api/waitlist/capacity
 * 
 * Returns the current count of customers waiting for a specific date/time/party_size
 * combination. Used by the landing page to determine if the waitlist is full.
 * 
 * Query Parameters:
 *   - date: YYYY-MM-DD format
 *   - time: HH:MM format
 *   - party_size: number
 * 
 * Returns:
 *   { count: number, isFull: boolean }
 * 
 * QDR-66: Phase 5.1 - Waitlist UI
 * FR-5: Waitlist capacity cap at ~50 parties
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    const party_size = searchParams.get('party_size');

    // Validate inputs
    if (!date || !time || !party_size) {
      return NextResponse.json(
        { error: 'Missing required query parameters: date, time, party_size' },
        { status: 400 }
      );
    }

    // Get the Supabase client
    const supabase = await createServerSupabaseClient();

    // Query waitlist count for this date/party_size
    // Note: We use party_size as the grouping key since the RPC availability logic
    // groups by desired_date and party_size
    const { data, error, count } = await supabase
      .from('waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('desired_date', date)
      .eq('party_size', parseInt(party_size))
      .in('status', ['waiting', 'offered']);

    if (error) {
      console.error('Waitlist capacity query error:', error);
      return NextResponse.json(
        { error: 'Failed to check waitlist capacity' },
        { status: 500 }
      );
    }

    const waitlistCount = count || 0;
    const WAITLIST_CAPACITY_LIMIT = 50; // FR-5: ~50 parties cap

    return NextResponse.json({
      count: waitlistCount,
      isFull: waitlistCount >= WAITLIST_CAPACITY_LIMIT,
      capacity_limit: WAITLIST_CAPACITY_LIMIT,
    });
  } catch (error) {
    console.error('Waitlist capacity endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
