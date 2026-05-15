-- ============================================================
-- MIGRATION 3.1: Grant Table Permissions to Supabase Roles
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Run this in Supabase SQL Editor AFTER Migration 003.
--
-- WHY: When tables are created via raw SQL (not the Supabase UI),
-- PostgreSQL does not automatically grant SELECT/INSERT/UPDATE/DELETE
-- permissions to the anon, authenticated, and service_role roles.
-- Without these grants, the REST API (PostgREST) returns
-- "permission denied" even with valid API keys.
-- ============================================================

-- Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions to service_role (bypasses RLS, used for admin ops)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Grant permissions to authenticated (subject to RLS policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant limited permissions to anon (subject to RLS policies)
-- Only menu is publicly readable; RLS policies handle the rest
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Ensure future tables also get these grants automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE ON SEQUENCES TO authenticated, service_role;

-- ============================================================
-- END OF MIGRATION 3.1
-- ============================================================
