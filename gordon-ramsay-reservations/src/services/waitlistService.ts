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

export interface WaitlistEntry {
  id: string;
  customer_id: string;
  desired_date: string; // Date as string (YYYY-MM-DD)
  desired_time: string; // Time as TIMESTAMPTZ
  party_size: number;
  position: number;
  status: 'waiting' | 'offered' | 'accepted' | 'expired' | 'cancelled';
  offered_at: string | null;
  expires_at: string | null;
  created_at: string;
}

class WaitlistService {
  private supabase = createServiceSupabaseClient();

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
}

export default new WaitlistService();
