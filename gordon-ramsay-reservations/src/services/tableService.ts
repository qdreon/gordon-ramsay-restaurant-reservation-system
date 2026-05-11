/**
 * tableService.ts
 * ----------------
 * Repository Pattern: Model Layer
 *
 * Purpose:
 *   Abstracts all database queries related to restaurant Tables
 *   (floor plan data, status updates, availability checks).
 *
 * Design Pattern: Repository Pattern (Data Access Layer)
 * Principle: Single Responsibility -- this file ONLY handles Table data.
 */

import { createServerSupabaseClient } from '@/lib/supabaseServer';

export interface AvailabilitySearchInput {
  reservationDate: string;
  startTime: string;
  endTime: string;
  partySize: number;
}

export interface AvailableTableOption {
  table_ids: string[];
  table_numbers: number[];
  total_capacity: number;
}

/**
 * Queries available table options for a specific date/time and party size.
 * Uses the Phase 2 RPC to include adjacent table combination logic (FR-4).
 */
export async function findAvailableTableOptions(
  input: AvailabilitySearchInput
): Promise<AvailableTableOption[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc('find_available_table_options', {
    p_reservation_date: input.reservationDate,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_party_size: input.partySize,
  });

  if (error) {
    throw new Error(`[Table Service] Failed to query availability: ${error.message}`);
  }

  return (data ?? []) as AvailableTableOption[];
}
