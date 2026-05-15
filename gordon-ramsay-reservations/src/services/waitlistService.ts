/**
 * waitlistService.ts
 * -------------------
 * Repository Pattern: Model Layer
 *
 * Purpose:
 *   Abstracts all database queries related to the Virtual Waitlist
 *   (joining, leaving, queue position, automated offers).
 *
 * Design Pattern: Repository Pattern (Data Access Layer)
 * Principle: Single Responsibility -- this file ONLY handles Waitlist data.
 *
 * QDR-41: Phase 5 - Virtual Waitlist System
 */

import { createServiceSupabaseClient } from '@/lib/supabaseAdmin';

export type WaitlistStatus = 'waiting' | 'offered' | 'accepted' | 'expired' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  customer_id: string;
  desired_date: string; // Date as string (YYYY-MM-DD)
  desired_time: string; // Time as TIMESTAMPTZ
  party_size: number;
  position: number;
  status: WaitlistStatus;
  offered_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface AdminWaitlistEntry extends WaitlistEntry {
  customer: {
    id: string;
    vip_status: boolean;
    total_visits: number;
    total_no_shows: number;
    staff_notes: string | null;
    user: {
      id: string;
      full_name: string;
      phone: string | null;
      email: string;
    };
  };
}

export interface GetAdminWaitlistFilters {
  search?: string;
  status?: 'all' | WaitlistStatus;
  date?: string;
}

export interface UpdateAdminWaitlistEntryInput {
  desired_date?: string;
  desired_time?: string;
  party_size?: number;
  position?: number;
  status?: WaitlistStatus;
  offered_at?: string | null;
  expires_at?: string | null;
}

function normalizeAdminWaitlistEntry(row: {
  id: string;
  customer_id: string;
  desired_date: string;
  desired_time: string;
  party_size: number;
  position: number;
  status: WaitlistStatus;
  offered_at: string | null;
  expires_at: string | null;
  created_at: string;
  customers:
    | {
        id: string;
        vip_status: boolean;
        total_visits: number;
        total_no_shows: number;
        staff_notes: string | null;
        users:
          | {
              id: string;
              full_name: string;
              phone: string | null;
              email: string;
            }
          | Array<{
              id: string;
              full_name: string;
              phone: string | null;
              email: string;
            }>;
      }
    | Array<{
        id: string;
        vip_status: boolean;
        total_visits: number;
        total_no_shows: number;
        staff_notes: string | null;
        users:
          | {
              id: string;
              full_name: string;
              phone: string | null;
              email: string;
            }
          | Array<{
              id: string;
              full_name: string;
              phone: string | null;
              email: string;
            }>;
      }>;
}): AdminWaitlistEntry {
  const customerField = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  const userField = Array.isArray(customerField.users) ? customerField.users[0] : customerField.users;

  return {
    id: row.id,
    customer_id: row.customer_id,
    desired_date: row.desired_date,
    desired_time: row.desired_time,
    party_size: row.party_size,
    position: row.position,
    status: row.status,
    offered_at: row.offered_at,
    expires_at: row.expires_at,
    created_at: row.created_at,
    customer: {
      id: customerField.id,
      vip_status: customerField.vip_status,
      total_visits: customerField.total_visits,
      total_no_shows: customerField.total_no_shows,
      staff_notes: customerField.staff_notes,
      user: userField,
    },
  };
}

class WaitlistService {
  private get supabase() {
    return createServiceSupabaseClient();
  }

  /**
   * Join the waitlist (QDR-41.1: FR-5)
   * Inserts a new waitlist entry and calculates queue position
   */
  async joinWaitlist(
    customerId: string,
    desiredDate: string,
    desiredTime: string,
    partySize: number
  ): Promise<WaitlistEntry> {
    try {
      // Calculate position: count existing waiting entries for same date/time/party_size
      const { data: existingCount, error: countError } = await this.supabase
        .from('waitlist')
        .select('id', { count: 'exact', head: true })
        .eq('desired_date', desiredDate)
        .eq('party_size', partySize)
        .eq('status', 'waiting');

      if (countError) {
        throw new Error(`Failed to calculate queue position: ${countError.message}`);
      }

      const position = (existingCount?.length || 0) + 1;

      // Insert new waitlist entry
      const { data, error } = await this.supabase
        .from('waitlist')
        .insert({
          customer_id: customerId,
          desired_date: desiredDate,
          desired_time: desiredTime,
          party_size: partySize,
          position: position,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to join waitlist: ${error.message}`);
      }

      return data as WaitlistEntry;
    } catch (err) {
      console.error('Error joining waitlist:', err);
      throw err;
    }
  }

  /**
   * Get customer's waitlist entries
   */
  async getCustomerWaitlistEntries(customerId: string): Promise<WaitlistEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('waitlist')
        .select('*')
        .eq('customer_id', customerId)
        .in('status', ['waiting', 'offered'])
        .order('position', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch waitlist entries: ${error.message}`);
      }

      return (data || []) as WaitlistEntry[];
    } catch (err) {
      console.error('Error fetching waitlist entries:', err);
      throw err;
    }
  }

  /**
   * Get all waitlist entries for the admin queue view.
   */
  async getAdminWaitlistEntries(filters?: GetAdminWaitlistFilters): Promise<AdminWaitlistEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('waitlist')
        .select(
          'id, customer_id, desired_date, desired_time, party_size, position, status, offered_at, expires_at, created_at, customers!inner(id, vip_status, total_visits, total_no_shows, staff_notes, users!inner(id, full_name, phone, email))'
        )
        .order('desired_date', { ascending: true })
        .order('desired_time', { ascending: true })
        .order('position', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch admin waitlist entries: ${error.message}`);
      }

      const normalized = (data || []).map((row) => normalizeAdminWaitlistEntry(row as Parameters<typeof normalizeAdminWaitlistEntry>[0]));
      const search = filters?.search?.trim().toLowerCase();
      const status = filters?.status ?? 'all';

      return normalized.filter((entry) => {
        if (filters?.date && entry.desired_date !== filters.date) {
          return false;
        }

        if (status !== 'all' && entry.status !== status) {
          return false;
        }

        if (!search) {
          return true;
        }

        const searchableText = [
          entry.customer.user.full_name,
          entry.customer.user.email,
          entry.customer.user.phone ?? '',
          entry.customer.staff_notes ?? '',
          entry.desired_date,
          entry.desired_time,
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(search);
      });
    } catch (err) {
      console.error('Error fetching admin waitlist entries:', err);
      throw err;
    }
  }

  /**
   * Accept a waitlist offer (convert to confirmed reservation)
   * QDR-41.3: FR-5 - Customer accepts 10-minute offer window
   */
  async acceptWaitlistOffer(waitlistId: string, customerId: string): Promise<void> {
    try {
      // Verify the waitlist entry belongs to the customer and is offered
      const { data: entry, error: selectError } = await this.supabase
        .from('waitlist')
        .select('*')
        .eq('id', waitlistId)
        .eq('customer_id', customerId)
        .eq('status', 'offered')
        .single();

      if (selectError || !entry) {
        throw new Error('Waitlist offer not found or expired');
      }

      // Check if offer is still within 10-minute window
      if (entry.expires_at && new Date() > new Date(entry.expires_at)) {
        throw new Error('Waitlist offer has expired');
      }

      // Update status to 'accepted'
      const { error: updateError } = await this.supabase
        .from('waitlist')
        .update({ status: 'accepted' })
        .eq('id', waitlistId);

      if (updateError) {
        throw new Error(`Failed to accept waitlist offer: ${updateError.message}`);
      }
    } catch (err) {
      console.error('Error accepting waitlist offer:', err);
      throw err;
    }
  }

  /**
   * Decline a waitlist offer
   */
  async declineWaitlistOffer(waitlistId: string, customerId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('waitlist')
        .update({ status: 'cancelled' })
        .eq('id', waitlistId)
        .eq('customer_id', customerId);

      if (error) {
        throw new Error(`Failed to decline waitlist offer: ${error.message}`);
      }
    } catch (err) {
      console.error('Error declining waitlist offer:', err);
      throw err;
    }
  }

  /**
   * Get next customer to offer a table (used by cancellation trigger)
   * Returns the highest-priority (lowest position) waiting entry for the given timeslot
   */
  async getNextWaitlistOffer(
    desiredDate: string,
    desiredTime: string,
    partySize: number
  ): Promise<WaitlistEntry | null> {
    try {
      const { data, error } = await this.supabase
        .from('waitlist')
        .select('*')
        .eq('desired_date', desiredDate)
        .eq('party_size', partySize)
        .eq('status', 'waiting')
        .order('position', { ascending: true })
        .limit(1)
        .single();

      if (error?.code === 'PGRST116') {
        // No rows found - not an error
        return null;
      }

      if (error) {
        throw new Error(`Failed to get next waitlist offer: ${error.message}`);
      }

      return (data || null) as WaitlistEntry | null;
    } catch (err) {
      console.error('Error getting next waitlist offer:', err);
      throw err;
    }
  }

  /**
   * Auto-offer a table to the next customer in the waitlist
   * Called by the reservation cancellation trigger
   */
  async autoOfferWaitlistTable(
    desiredDate: string,
    desiredTime: string,
    partySize: number
  ): Promise<WaitlistEntry | null> {
    try {
      const nextEntry = await this.getNextWaitlistOffer(desiredDate, desiredTime, partySize);

      if (!nextEntry) {
        console.log('No waiting customers to offer table to');
        return null;
      }

      // Update the entry to 'offered' and set expiry window (10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // now + 10 minutes

      const { data, error } = await this.supabase
        .from('waitlist')
        .update({
          status: 'offered',
          offered_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', nextEntry.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to offer waitlist table: ${error.message}`);
      }

      return (data || null) as WaitlistEntry | null;
    } catch (err) {
      console.error('Error auto-offering waitlist table:', err);
      throw err;
    }
  }

  /**
   * Clean up expired offers (cron job - runs via pg_cron or Phase 5 API)
   * QDR-66: Implement 10-min offer window timeout
   */
  async cleanupExpiredOffers(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('waitlist')
        .update({ status: 'expired' })
        .eq('status', 'offered')
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) {
        throw new Error(`Failed to cleanup expired offers: ${error.message}`);
      }

      return (data || []).length;
    } catch (err) {
      console.error('Error cleaning up expired offers:', err);
      throw err;
    }
  }

  /**
   * Update admin-editable waitlist fields.
   */
  async updateAdminWaitlistEntry(
    waitlistId: string,
    input: UpdateAdminWaitlistEntryInput
  ): Promise<AdminWaitlistEntry> {
    try {
      const payload: {
        desired_date?: string;
        desired_time?: string;
        party_size?: number;
        position?: number;
        status?: WaitlistStatus;
        offered_at?: string | null;
        expires_at?: string | null;
      } = {};

      if (input.desired_date !== undefined) payload.desired_date = input.desired_date.trim();
      if (input.desired_time !== undefined) payload.desired_time = input.desired_time.trim();
      if (input.party_size !== undefined) payload.party_size = input.party_size;
      if (input.position !== undefined) payload.position = input.position;

      if (input.status !== undefined) {
        payload.status = input.status;

        if (input.status === 'offered') {
          payload.offered_at = input.offered_at ?? new Date().toISOString();
          payload.expires_at = input.expires_at ?? new Date(Date.now() + 10 * 60 * 1000).toISOString();
        } else {
          payload.offered_at = input.offered_at ?? null;
          payload.expires_at = input.expires_at ?? null;
        }
      }

      const { error } = await this.supabase
        .from('waitlist')
        .update(payload)
        .eq('id', waitlistId);

      if (error) {
        throw new Error(`Failed to update waitlist entry: ${error.message}`);
      }

      const refreshed = await this.getAdminWaitlistEntries();
      const updated = refreshed.find((entry) => entry.id === waitlistId);

      if (!updated) {
        throw new Error('[Waitlist Service] Updated waitlist entry could not be reloaded.');
      }

      return updated;
    } catch (err) {
      console.error('Error updating waitlist entry:', err);
      throw err;
    }
  }

  /**
   * Delete a waitlist entry from the admin queue.
   */
  async deleteAdminWaitlistEntry(waitlistId: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('waitlist').delete().eq('id', waitlistId);

      if (error) {
        throw new Error(`Failed to delete waitlist entry: ${error.message}`);
      }
    } catch (err) {
      console.error('Error deleting waitlist entry:', err);
      throw err;
    }
  }
}

const waitlistService = new WaitlistService();
export default waitlistService;

export async function getAdminWaitlistEntries(filters?: GetAdminWaitlistFilters): Promise<AdminWaitlistEntry[]> {
  return waitlistService.getAdminWaitlistEntries(filters);
}

export async function updateAdminWaitlistEntry(
  waitlistId: string,
  input: UpdateAdminWaitlistEntryInput
): Promise<AdminWaitlistEntry> {
  return waitlistService.updateAdminWaitlistEntry(waitlistId, input);
}

export async function deleteAdminWaitlistEntry(waitlistId: string): Promise<void> {
  return waitlistService.deleteAdminWaitlistEntry(waitlistId);
}
