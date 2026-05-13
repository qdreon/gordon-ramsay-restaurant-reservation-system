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

export interface AdminCrmCustomer {
  id: string;
  user_id: string;
  dietary_restrictions: string | null;
  allergies: string | null;
  vip_status: boolean;
  total_visits: number;
  total_no_shows: number;
  staff_notes: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string;
  };
}

export interface CustomerAccountProfile {
  customerId: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  dietaryRestrictions: string | null;
  allergies: string | null;
  vipStatus: boolean;
  totalVisits: number;
  totalNoShows: number;
}

export interface UpdateCustomerAccountInput {
  fullName: string;
  phone: string | null;
  dietaryRestrictions: string | null;
  allergies: string | null;
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
 * Fetches the linked auth user and customer profile for the current account.
 */
export async function getCustomerAccountByUserId(
  userId: string
): Promise<CustomerAccountProfile | null> {
  const supabase = createServiceSupabaseClient();

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name, phone')
    .eq('id', userId)
    .single();

  if (userError) {
    if (userError.code === 'PGRST116') return null;
    throw new Error(`[Customer Service] Failed to fetch user account: ${userError.message}`);
  }

  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('id, user_id, dietary_restrictions, allergies, vip_status, total_visits, total_no_shows')
    .eq('user_id', userId)
    .single();

  if (customerError) {
    if (customerError.code === 'PGRST116') return null;
    throw new Error(`[Customer Service] Failed to fetch customer profile: ${customerError.message}`);
  }

  return {
    customerId: customerData.id,
    userId: userData.id,
    email: userData.email,
    fullName: userData.full_name,
    phone: userData.phone,
    dietaryRestrictions: customerData.dietary_restrictions,
    allergies: customerData.allergies,
    vipStatus: customerData.vip_status,
    totalVisits: customerData.total_visits,
    totalNoShows: customerData.total_no_shows,
  };
}

/**
 * Updates the customer-facing profile data for the signed-in account.
 */
export async function updateCustomerAccountByUserId(
  userId: string,
  input: UpdateCustomerAccountInput
): Promise<CustomerAccountProfile> {
  const supabase = createServiceSupabaseClient();

  const { error: userError } = await supabase
    .from('users')
    .update({
      full_name: input.fullName,
      phone: input.phone,
    })
    .eq('id', userId);

  if (userError) {
    throw new Error(`[Customer Service] Failed to update contact details: ${userError.message}`);
  }

  const { error: customerError } = await supabase
    .from('customers')
    .update({
      dietary_restrictions: input.dietaryRestrictions,
      allergies: input.allergies,
    })
    .eq('user_id', userId);

  if (customerError) {
    throw new Error(`[Customer Service] Failed to update customer profile: ${customerError.message}`);
  }

  const updatedAccount = await getCustomerAccountByUserId(userId);
  if (!updatedAccount) {
    throw new Error('[Customer Service] Updated account could not be reloaded.');
  }

  return updatedAccount;
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
 * Constraint: The calling API route must verify ownership before invoking this helper.
 */
export async function cancelReservation(
  reservationId: string,
  customerId: string
): Promise<void> {
  const supabase = createServiceSupabaseClient();

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

/**
 * Fetches admin CRM rows (customers + linked user identity fields).
 * Supports optional text search and status filtering.
 */
export async function getAdminCrmCustomers(filters?: {
  search?: string;
  status?: 'all' | 'VIP' | 'Regular' | 'Blacklisted';
}): Promise<AdminCrmCustomer[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('customers')
    .select(
      'id, user_id, dietary_restrictions, allergies, vip_status, total_visits, total_no_shows, staff_notes, created_at, updated_at, users!inner(id, full_name, phone, email)'
    )
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`[Customer Service] Failed to fetch CRM customers: ${error.message}`);
  }

  const normalized = (data ?? []).map((row) => {
    const usersField = row.users as
      | { id: string; full_name: string; phone: string | null; email: string }
      | Array<{ id: string; full_name: string; phone: string | null; email: string }>;

    const user = Array.isArray(usersField) ? usersField[0] : usersField;

    return {
      id: row.id,
      user_id: row.user_id,
      dietary_restrictions: row.dietary_restrictions,
      allergies: row.allergies,
      vip_status: row.vip_status,
      total_visits: row.total_visits,
      total_no_shows: row.total_no_shows,
      staff_notes: row.staff_notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user,
    } as AdminCrmCustomer;
  });

  const search = filters?.search?.trim().toLowerCase();
  const status = filters?.status ?? 'all';

  return normalized.filter((customer) => {
    const isBlacklisted = customer.staff_notes?.toLowerCase().includes('blacklist') ?? false;
    const customerStatus = isBlacklisted ? 'Blacklisted' : customer.vip_status ? 'VIP' : 'Regular';

    const matchesStatus = status === 'all' || customerStatus === status;
    if (!matchesStatus) return false;

    if (!search) return true;

    return (
      customer.user.full_name.toLowerCase().includes(search) ||
      customer.user.email.toLowerCase().includes(search) ||
      (customer.user.phone ?? '').includes(search)
    );
  });
}

export interface UpdateAdminCrmCustomerInput {
  dietary_restrictions?: string | null;
  allergies?: string | null;
  staff_notes?: string | null;
  vip_status?: boolean;
}

/**
 * Updates admin-editable CRM fields for a customer profile.
 */
export async function updateAdminCrmCustomer(
  customerId: string,
  input: UpdateAdminCrmCustomerInput
): Promise<AdminCrmCustomer> {
  const supabase = createServiceSupabaseClient();

  const payload: UpdateAdminCrmCustomerInput = {};

  if (input.dietary_restrictions !== undefined) {
    payload.dietary_restrictions = input.dietary_restrictions?.trim()
      ? input.dietary_restrictions.trim()
      : null;
  }

  if (input.allergies !== undefined) {
    payload.allergies = input.allergies?.trim() ? input.allergies.trim() : null;
  }

  if (input.staff_notes !== undefined) {
    payload.staff_notes = input.staff_notes?.trim() ? input.staff_notes.trim() : null;
  }

  if (input.vip_status !== undefined) {
    payload.vip_status = input.vip_status;
  }

  const { error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', customerId);

  if (error) {
    throw new Error(`[Customer Service] Failed to update CRM customer: ${error.message}`);
  }

  const customers = await getAdminCrmCustomers();
  const updated = customers.find((customer) => customer.id === customerId);

  if (!updated) {
    throw new Error('[Customer Service] Updated CRM customer could not be reloaded.');
  }

  return updated;
}
