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
 */
export async function createPendingReservationLock(
  input: CreateReservationLockInput
): Promise<ReservationLockResult> {
  const supabase = await createServerSupabaseClient();

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
