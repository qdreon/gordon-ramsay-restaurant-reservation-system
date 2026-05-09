-- ============================================================
-- MIGRATION 0: Clean Slate -- Drop Existing Schema
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Run this FIRST in: Supabase Dashboard -> SQL Editor -> New Query
--
-- Purpose:
--   A groupmate previously created tables with a different schema
--   design. Those tables are empty (0 records) and do not conform
--   to our 3NF design, TIMESTAMPTZ requirements (DB-3), or
--   Supabase Auth integration. This migration drops all existing
--   objects so we can start clean with Migrations 001-004.
--
-- What gets dropped:
--   - Tables: auditlogs, crm, customers, menu, reservations,
--             roles, tables, waitlist
--   - Functions: rls_auto_enable, apply_concurrency_lock
-- ============================================================

-- Drop tables in dependency order (children first, parents last)
-- CASCADE ensures dependent objects (FKs, policies) are also removed.
DROP TABLE IF EXISTS public.auditlogs CASCADE;
DROP TABLE IF EXISTS public.crm CASCADE;
DROP TABLE IF EXISTS public.waitlist CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.menu CASCADE;
DROP TABLE IF EXISTS public.tables CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- Drop any existing functions from the old schema
DROP FUNCTION IF EXISTS public.rls_auto_enable() CASCADE;
DROP FUNCTION IF EXISTS public.apply_concurrency_lock() CASCADE;

-- Drop any existing enum types that might conflict
DROP TYPE IF EXISTS public.table_status CASCADE;
DROP TYPE IF EXISTS public.reservation_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.waitlist_status CASCADE;
DROP TYPE IF EXISTS public.menu_category CASCADE;

-- ============================================================
-- END OF MIGRATION 0
-- Proceed to run Migration 001 next.
-- ============================================================
