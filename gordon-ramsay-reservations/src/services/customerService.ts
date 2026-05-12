/**
 * customerService.ts
 * -------------------
 * Repository Pattern: Model Layer
 *
 * Purpose:
 *   Abstracts all database queries related to Customer profiles,
 *   CRM data, dietary restrictions, and account management
 *   (including Right to Erasure -- LEG-1 / RA 10173).
 *
 * Design Pattern: Repository Pattern (Data Access Layer)
 * Principle: Single Responsibility -- this file ONLY handles Customer data.
 */

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createServiceSupabaseClient } from '@/lib/supabaseAdmin';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CustomerProfile {
  id: string;
  user_id: string;
  dietary_restrictions: string | null;
  allergies: string | null;
  vip_status: boolean;
  total_visits: number;
  total_no_shows: number;
}

export interface ReservationRow {
  id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  status: string;
  special_requests: string | null;
  locked_until: string | null;
  created_at: string;
  tables: { table_number: number }[];
}

export type ReservationSummary = ReservationRow;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Resolves the `public.customers.id` (UUID) for the currently signed-in user.
 * Required before calling the reservation lock RPC, which expects `customer_id`.
 */
export async function getCustomerByUserId(userId: string): Promise<CustomerProfile | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('customers')
    .select('id, user_id, dietary_restrictions, allergies, vip_status, total_visits, total_no_shows')
    .eq('user_id', userId)
    .single();

  if (error) {
    // No customer row means the signup trigger has not yet created the profile.
    if (error.code === 'PGRST116') return null;
    throw new Error(`[Customer Service] Failed to fetch customer profile: ${error.message}`);
  }

  return data as CustomerProfile;
}

/**
 * Fetches all reservations for a given customer ID, ordered by date descending.
 * Joins `reservation_tables` to get the physical table numbers for display.
 */
export async function getReservationsForCustomer(customerId: string): Promise<ReservationRow[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('reservations')
    .select(`
      id,
      reservation_date,
      start_time,
      end_time,
      party_size,
      status,
      special_requests,
      locked_until,
      created_at,
      reservation_tables (
        tables ( table_number )
      )
    `)
    .eq('customer_id', customerId)
    .order('reservation_date', { ascending: false });

  if (error) {
    throw new Error(`[Customer Service] Failed to fetch reservations: ${error.message}`);
  }

  type TableRef = { table_number: number } | null;
  type ReservationTableJoin = { tables: TableRef | TableRef[] | null };
  type ReservationQueryRow = Omit<ReservationRow, 'tables'> & {
    reservation_tables: ReservationTableJoin[] | null;
  };

  function normalizeTables(t: TableRef | TableRef[] | null): TableRef[] {
    if (t === null) return [];
    return Array.isArray(t) ? t : [t];
  }

  return (data ?? []).map((row: ReservationQueryRow): ReservationRow => ({
    id: row.id,
    reservation_date: row.reservation_date,
    start_time: row.start_time,
    end_time: row.end_time,
    party_size: row.party_size,
    status: row.status,
    special_requests: row.special_requests,
    locked_until: row.locked_until,
    created_at: row.created_at,
    tables: (row.reservation_tables ?? [])
      .flatMap((rt) => normalizeTables(rt.tables))
      .filter((t): t is { table_number: number } => t !== null)
      .map((t) => ({ table_number: t.table_number || 0 })),
  }));
}

/**
 * Fetches a specific reservation owned by the customer.
 */
export async function getReservationForCustomer(
  reservationId: string,
  customerId: string
): Promise<ReservationSummary | null> {
  const reservations = await getReservationsForCustomer(customerId);
  return reservations.find((r) => r.id === reservationId) ?? null;
}

/**
 * Cancels a reservation by ID.
 *
 * Business Logic (FR-10):
 *   - Sets reservation status to 'cancelled'.
 *   - Reverts all associated tables to 'available'.
 *   - The waitlist notification trigger (FR-5) will be added in Phase 5.
 *
 * Constraint: Only cancels reservations belonging to the given customer (RLS enforced).
 */
export async function cancelReservation(
  reservationId: string,
  customerId: string
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Step 1: Mark the reservation as cancelled.
  const { error: cancelError } = await supabase
    .from('reservations')
    .update({ status: 'cancelled', locked_until: null })
    .eq('id', reservationId)
    .eq('customer_id', customerId);

  if (cancelError) {
    throw new Error(`[Customer Service] Failed to cancel reservation: ${cancelError.message}`);
  }

  // Step 2: Revert all tables linked to this reservation back to 'available'.
  const { data: linkedTables, error: linkError } = await supabase
    .from('reservation_tables')
    .select('table_id')
    .eq('reservation_id', reservationId);

  if (linkError) {
    throw new Error(`[Customer Service] Failed to fetch linked tables: ${linkError.message}`);
  }

  if (linkedTables && linkedTables.length > 0) {
    const tableIds = linkedTables.map((rt) => rt.table_id);
    const { error: tableError } = await supabase
      .from('tables')
      .update({ status: 'available' })
      .in('id', tableIds);

    if (tableError) {
      throw new Error(`[Customer Service] Failed to revert table status: ${tableError.message}`);
    }
  }
}

/**
 * Permanently deletes the customer's account and all associated PII.
 *
 * Constraint (LEG-1 / RA 10173 Right to Erasure):
 *   This function calls the Supabase Admin API to delete the auth.users record.
 *   The CASCADE delete chain then removes:
 *     auth.users -> public.users -> public.customers
 *       -> public.reservations -> public.reservation_tables
 *       -> public.waitlist
 *
 * Security: Requires the SERVICE_ROLE key, which must only be used server-side.
 */
export async function deleteCustomerAccount(userId: string): Promise<void> {
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`[Customer Service] Failed to delete account: ${error.message}`);
  }
}
