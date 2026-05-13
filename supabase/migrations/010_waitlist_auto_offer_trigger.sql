-- ============================================================
-- MIGRATION 10: Phase 5 - Waitlist Auto-Offer Trigger
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Purpose: When a reservation is cancelled, automatically offer
-- the next waiting customer from the waitlist (FR-5 / QDR-41.3).
-- ============================================================

-- Create a function that handles waitlist auto-offer on reservation cancellation
CREATE OR REPLACE FUNCTION public.handle_waitlist_offer_on_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_waitlist_id UUID;
  v_offer_expiry TIMESTAMPTZ;
BEGIN
  -- Only process if reservation is transitioning TO 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    -- Get the first waiting customer from the waitlist for this date/time/party_size
    -- Note: This is simplified. In production, might want to match on date range, not exact time.
    
    SELECT id INTO v_next_waitlist_id
    FROM public.waitlist
    WHERE status = 'waiting'
      AND desired_date = NEW.reservation_date
      AND party_size = NEW.party_size
    ORDER BY position ASC
    LIMIT 1;

    -- If a waiting customer exists, offer them the table
    IF v_next_waitlist_id IS NOT NULL THEN
      v_offer_expiry := now() + INTERVAL '10 minutes';
      
      UPDATE public.waitlist
      SET 
        status = 'offered',
        offered_at = now(),
        expires_at = v_offer_expiry
      WHERE id = v_next_waitlist_id;

      -- Log the offer event (optional - for debugging)
      RAISE NOTICE 'Waitlist offer sent. Waitlist ID: %, Expiry: %', v_next_waitlist_id, v_offer_expiry;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the cancellation
    RAISE WARNING 'Error in handle_waitlist_offer_on_cancellation: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if present (safe idempotency)
DROP TRIGGER IF EXISTS handle_waitlist_offer_on_cancellation_trigger ON public.reservations;

-- Create the trigger
CREATE TRIGGER handle_waitlist_offer_on_cancellation_trigger
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.handle_waitlist_offer_on_cancellation();

-- ============================================================
-- MIGRATION 10B: Phase 5 - Waitlist Offer Expiry Cleanup
-- ============================================================
-- Purpose: Create a pg_cron scheduled job to clean up expired
-- waitlist offers (QDR-66: 10-minute offer window timeout).
-- ============================================================

-- Schedule a job to cleanup expired offers every 5 minutes
SELECT cron.schedule(
  'cleanup-expired-waitlist-offers',  -- Job name
  '*/5 * * * *',                      -- Every 5 minutes
  'UPDATE public.waitlist SET status = ''expired'' WHERE status = ''offered'' AND expires_at < now();'
);

