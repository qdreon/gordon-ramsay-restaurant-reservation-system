/**
 * reservationService.ts
 * ---------------------
 * Repository Pattern: Model Layer
 *
 * Purpose:
 *   Abstracts all database queries related to Reservations.
 *   UI components MUST NOT write raw Supabase queries directly.
 *   Instead, they call functions from this service module.
 *
 * Design Pattern: Repository Pattern (Data Access Layer)
 * Principle: Single Responsibility -- this file ONLY handles Reservation data.
 */

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createServiceSupabaseClient } from '@/lib/supabaseAdmin';

export interface CreateReservationLockInput {
  customerId: string;
  tableIds: string[];
  reservationDate: string;
  startTime: string;
  endTime: string;
  partySize: number;
  paymentToken?: string;
  specialRequests?: string;
  createdBy?: string;
}

export interface ReservationLockResult {
  reservation_id: string;
  locked_until: string;
}

/**
 * Creates a pending reservation and acquires row-level locks (PR-2).
 * The lock automatically expires after 5 minutes unless payment is confirmed.
 *
 * Uses service-role client to bypass RLS (admin-level operation).
 */
export async function createPendingReservationLock(
  input: CreateReservationLockInput
): Promise<ReservationLockResult> {
  // Use service-role client for admin-level RPC call
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase.rpc('create_pending_reservation_lock', {
    p_customer_id: input.customerId,
    p_table_ids: input.tableIds,
    p_reservation_date: input.reservationDate,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_party_size: input.partySize,
    p_payment_token: input.paymentToken ?? null,
    p_special_requests: input.specialRequests ?? null,
    p_created_by: input.createdBy ?? null,
  });

  if (error) {
    throw new Error(`[Reservation Service] Failed to lock reservation: ${error.message}`);
  }

  const firstRow = (data as ReservationLockResult[] | null)?.[0];
  if (!firstRow) {
    throw new Error('[Reservation Service] Reservation lock RPC returned no result.');
  }

  return firstRow;
}

/**
 * Releases all expired pending-payment reservations and frees table locks.
 * Intended for periodic invocation via scheduler/cron.
 */
export async function releaseExpiredPendingReservations(): Promise<number> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc('release_expired_pending_reservations');
  if (error) {
    throw new Error(`[Reservation Service] Failed to release expired locks: ${error.message}`);
  }

  return Number(data ?? 0);
}

/**
 * Fetches all reservations within a date range for the admin calendar.
 * Used by `/admin/reservations` to display the Master Calendar.
 */
export async function getReservationsByDateRange(
  startDate: string,
  endDate: string
): Promise<any[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('reservations')
    .select('id, customer_id, reservation_date, start_time, end_time, party_size, status, special_requests, locked_until')
    .gte('reservation_date', startDate)
    .lte('reservation_date', endDate)
    .order('reservation_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(`[Reservation Service] Failed to fetch reservations: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Creates a blocked date entry to prevent online bookings.
 * Used by admin to block holidays, private events, etc.
 */
export async function createBlockedDate(
  blockedDate: string,
  reason: string
): Promise<string> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('blocked_dates')
    .insert({
      blocked_date: blockedDate,
      reason,
      created_by: 'system',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`[Reservation Service] Failed to create blocked date: ${error.message}`);
  }

  return data?.id ?? '';
}

/**
 * Fetches all blocked dates for a given month.
 * Used to display visual indicators on the admin calendar.
 */
export async function getBlockedDatesForMonth(
  year: number,
  month: number
): Promise<string[]> {
  const supabase = createServiceSupabaseClient();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const { data, error } = await supabase
    .from('blocked_dates')
    .select('blocked_date')
    .gte('blocked_date', startDate)
    .lte('blocked_date', endDate);

  if (error) {
    throw new Error(`[Reservation Service] Failed to fetch blocked dates: ${error.message}`);
  }

  return (data ?? []).map((row: any) => row.blocked_date);
}
