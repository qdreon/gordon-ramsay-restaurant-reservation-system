-- ============================================================
-- MIGRATION 7: Phase 2 pg_cron Scheduler
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Purpose: Deploy a scheduled job to automatically release
-- expired checkout locks (5-minute timeout) every 2 minutes.
-- ============================================================

-- Enable the pg_cron extension (manages scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the release_expired_pending_reservations() RPC
-- to run every 2 minutes, clearing locks older than 5 minutes.
--
-- Cron schedule: '*/2 * * * *' = every 2 minutes
-- See: https://github.com/citusdata/pg_cron
SELECT cron.schedule(
  'release-expired-reservations',  -- Job name
  '*/2 * * * *',                   -- Every 2 minutes
  'SELECT public.release_expired_pending_reservations();'
);

COMMENT ON FUNCTION cron.schedule(text, text, text)
IS 'Scheduled job that runs every 2 minutes to automatically release expired checkout locks (QDR-65).';
