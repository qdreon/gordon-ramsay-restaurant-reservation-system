-- ============================================================
-- MIGRATION 11: Phase 6 - Automated No-Show Cron Job
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Purpose:
--   1) Mark overdue confirmed reservations as no_show
--      when now() > start_time + 15 minutes (FR-9 / QDR-76)
--   2) Increment customers.total_no_shows
--   3) Release reservation tables back to available when safe
--   4) Schedule the job to run every 5 minutes via pg_cron
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_overdue_reservations_no_show()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_marked_count INTEGER := 0;
  v_reservation RECORD;
BEGIN
  FOR v_reservation IN
    UPDATE public.reservations r
    SET status = 'no_show'
    WHERE r.status = 'confirmed'
      AND now() > (r.start_time + interval '15 minutes')
    RETURNING r.id, r.customer_id
  LOOP
    v_marked_count := v_marked_count + 1;

    UPDATE public.customers c
    SET total_no_shows = c.total_no_shows + 1
    WHERE c.id = v_reservation.customer_id;

    UPDATE public.tables t
    SET status = 'available'
    WHERE t.id IN (
      SELECT rt.table_id
      FROM public.reservation_tables rt
      WHERE rt.reservation_id = v_reservation.id
    )
      AND NOT EXISTS (
        SELECT 1
        FROM public.reservation_tables rt2
        JOIN public.reservations r2 ON r2.id = rt2.reservation_id
        WHERE rt2.table_id = t.id
          AND r2.status IN ('pending_payment', 'confirmed', 'seated')
          AND (
            r2.status <> 'pending_payment'
            OR (r2.locked_until IS NOT NULL AND r2.locked_until > now())
          )
      );
  END LOOP;

  RETURN v_marked_count;
END;
$$;

COMMENT ON FUNCTION public.mark_overdue_reservations_no_show()
IS 'Marks confirmed reservations older than 15 minutes past start_time as no_show, increments customer no-show counters, and releases tables when safe.';

REVOKE ALL ON FUNCTION public.mark_overdue_reservations_no_show() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_overdue_reservations_no_show() TO authenticated, service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  v_existing_job_id BIGINT;
BEGIN
  SELECT jobid
  INTO v_existing_job_id
  FROM cron.job
  WHERE jobname = 'mark-overdue-no-shows'
  LIMIT 1;

  IF v_existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_job_id);
  END IF;
END;
$$;

SELECT cron.schedule(
  'mark-overdue-no-shows',
  '*/5 * * * *',
  'SELECT public.mark_overdue_reservations_no_show();'
);
