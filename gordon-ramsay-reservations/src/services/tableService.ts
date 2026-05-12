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
import { createServiceSupabaseClient } from '@/lib/supabaseAdmin';

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

  // If the anonymous/authenticated server client lacks permission to execute
  // the RPC, fall back to a server-only service_role client if available.
  if (error) {
    const msg = String(error.message ?? error);
    if (msg.toLowerCase().includes('permission denied') && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = createServiceSupabaseClient();
        const { data: adminData, error: adminError } = await admin.rpc('find_available_table_options', {
          p_reservation_date: input.reservationDate,
          p_start_time: input.startTime,
          p_end_time: input.endTime,
          p_party_size: input.partySize,
        });

        if (adminError) {
          console.error('[Table Service] admin RPC error details:', adminError);
          throw new Error(`[Table Service] Failed to query availability (admin): ${adminError.message}`);
        }

        return (adminData ?? []) as AvailableTableOption[];
      } catch (e) {
        throw new Error(`[Table Service] Failed to query availability: ${String(e)}`);
      }
    }

    throw new Error(`[Table Service] Failed to query availability: ${error.message}`);
  }

  return (data ?? []) as AvailableTableOption[];
}
