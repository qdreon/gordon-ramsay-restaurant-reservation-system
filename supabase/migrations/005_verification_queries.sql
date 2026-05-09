-- ============================================================
-- VERIFICATION QUERIES: Run after all migrations (000-004)
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Run in: Supabase Dashboard -> SQL Editor -> New Query
-- These do NOT modify anything; they only SELECT/verify.
-- ============================================================

-- 1. Verify all 8 tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- Expected: blocked_dates, customers, menu, reservation_tables,
--           reservations, tables, users, waitlist

-- 2. Verify all 5 enum types exist
SELECT typname
FROM pg_type
WHERE typtype = 'e'
  AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY typname;
-- Expected: menu_category, reservation_status, table_status,
--           user_role, waitlist_status

-- 3. Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: All rows should show rowsecurity = true

-- 4. Verify all RLS policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Verify foreign key constraints
SELECT
    tc.table_name AS child_table,
    kcu.column_name AS fk_column,
    ccu.table_name AS parent_table,
    ccu.column_name AS parent_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 6. Verify seed data: 15 tables with correct capacities
SELECT table_number, capacity, status, position_x, position_y
FROM public.tables
ORDER BY table_number;
-- Expected: 15 rows, all status = 'available'

-- 7. Verify helper functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
-- Expected: get_customer_id, handle_new_user, handle_updated_at, is_admin

-- 8. Verify auth trigger exists
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'auth' OR event_object_schema = 'auth';
-- Expected: on_auth_user_created on auth.users
