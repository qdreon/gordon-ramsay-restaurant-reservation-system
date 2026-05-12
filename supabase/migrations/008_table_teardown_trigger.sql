-- ============================================================
-- MIGRATION 8: Phase 2.1 Table Teardown Trigger
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Purpose: When a reservation is marked 'Completed' or 'Cancelled',
-- automatically dissolve table combinations and revert tables to
-- 'available' status (FR-4 full requirement).
-- ============================================================

-- Create a trigger function that handles table teardown on reservation completion/cancellation
CREATE OR REPLACE FUNCTION public.teardown_reservation_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the reservation is transitioning to 'Completed' or 'Cancelled',
  -- revert all linked tables to 'available'
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status <> NEW.status THEN
    UPDATE public.tables
    SET status = 'available'
    WHERE id IN (
      SELECT table_id
      FROM public.reservation_tables
      WHERE reservation_id = NEW.id
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the reservation update
    RAISE WARNING 'Error in teardown_reservation_tables: %', SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.teardown_reservation_tables()
IS 'Automatically reverts tables to available status when a reservation is completed or cancelled (FR-4 / QDR-63).';

-- Drop existing trigger if present (safe idempotency)
DROP TRIGGER IF EXISTS teardown_reservation_tables_trigger ON public.reservations;

-- Create the trigger
CREATE TRIGGER teardown_reservation_tables_trigger
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.teardown_reservation_tables();

COMMENT ON TRIGGER teardown_reservation_tables_trigger ON public.reservations
IS 'Trigger to handle table cleanup when reservations are completed or cancelled.';
