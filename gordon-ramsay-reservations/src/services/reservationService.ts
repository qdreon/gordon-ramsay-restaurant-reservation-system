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
 *
 * Dependencies:
 *   - Supabase client (@supabase/supabase-js)
 *   - Environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Related SDD Sections:
 *   - Phase 2.1 (Booking Engine): Availability RPC + Reservation Transaction
 *   - Phase 1.3 (RBAC & RLS): Policies enforced at DB layer
 */

import { createServerSupabaseClient } from '../lib/supabaseServer';

// -----------------------------------------------------------------------------
// Types (strict typing for RPC outputs)
// -----------------------------------------------------------------------------
export interface AvailabilityResult {
  status: 'ok' | 'no_availability' | 'error';
  table_ids: string[];
  total_capacity: number;
  message: string;
}

export interface ReservationResult {
  status: 'ok' | 'conflict' | 'no_availability' | 'error';
  reservation_id?: string;
  table_ids?: string[];
  total_capacity?: number;
  payment_token?: string;
  message?: string;
}

// -----------------------------------------------------------------------------
// Supabase Client (Server-side only)
// Uses the documented server-side authenticated client with RLS protection.
// All operations are subject to RLS policies via the anon key.
// -----------------------------------------------------------------------------

async function getSupabaseServerClient() {
  return await createServerSupabaseClient();
}

// -----------------------------------------------------------------------------
// Utility: Validate timestamp (UTC normalization)
// -----------------------------------------------------------------------------
function normalizeTimestamp(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid reservationTime ISO string.');
  }
  return d.toISOString(); // UTC normalized
}

// -----------------------------------------------------------------------------
// Public API (Repository Pattern)
// -----------------------------------------------------------------------------

/**
 * getAvailableTables
 * ------------------
 * Calls SQL function fn_get_available_tables to check availability.
 *
 * @param reservationTimeIso - ISO timestamp (UTC)
 * @param pax - Party size (1..12)
 * @returns AvailabilityResult
 */
export async function getAvailableTables(
  reservationTimeIso: string,
  pax: number
): Promise<AvailabilityResult> {
  const reservationTime = normalizeTimestamp(reservationTimeIso);
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc('fn_get_available_tables', {
    reservation_time: reservationTime,
    pax,
  });

  if (error) {
    console.error('getAvailableTables RPC error:', error);
    throw new Error('Failed to query availability.');
  }

  const result = typeof data === 'string' ? JSON.parse(data) : data;
  return result as AvailabilityResult;
}

/**
 * reserveTables
 * -------------
 * Calls SQL function fn_reserve_tables_transaction to create a reservation.
 *
 * @param reservationTimeIso - ISO timestamp (UTC)
 * @param pax - Party size (1..12)
 * @param customerId - UUID of customer
 * @param requestedBy - UUID of requesting user (auth.uid or admin)
 * @returns ReservationResult
 */
export async function reserveTables(
  reservationTimeIso: string,
  pax: number,
  customerId: string,
  requestedBy: string
): Promise<ReservationResult> {
  const reservationTime = normalizeTimestamp(reservationTimeIso);
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc('fn_reserve_tables_transaction', {
    reservation_time: reservationTime,
    pax,
    customer_id: customerId,
    requested_by: requestedBy,
  });

  if (error) {
    console.error('reserveTables RPC error:', error);
    throw new Error('Failed to create reservation.');
  }

  const result = typeof data === 'string' ? JSON.parse(data) : data;
  return result as ReservationResult;
}

export interface ReleaseExpiredReservationsResult {
  status: 'ok' | 'error';
  expired_count: number;
  expired_reservation_ids?: string[];
  message: string;
}

/**
 * releaseExpiredReservations
 * -------------------------
 * Calls SQL function fn_release_expired_pending_reservations to free expired locks.
 */
export async function releaseExpiredReservations(): Promise<ReleaseExpiredReservationsResult> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc('fn_release_expired_pending_reservations');

  if (error) {
    console.error('releaseExpiredReservations RPC error:', error);
    throw new Error('Failed to release expired reservations.');
  }

  const result = typeof data === 'string' ? JSON.parse(data) : data;
  return result as ReleaseExpiredReservationsResult;
}

