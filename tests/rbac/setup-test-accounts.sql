-- RBAC Test Setup Script (QDR-55)
-- ====================================
-- 
-- Purpose: Create test user accounts for RBAC verification
--
-- Instructions:
--   1. Open Supabase Dashboard > SQL Editor
--   2. Copy and paste this entire script
--   3. Click "Run"
--   4. Verify output shows 2 new users in public.users table
--
-- Test Credentials:
--   Customer Account:
--     Email:    test-customer@example.com
--     Password: TestPassword123!
--     Role:     customer
--
--   Admin Account:
--     Email:    test-admin@example.com
--     Password: TestPassword123!
--     Role:     admin
--
-- WARNING: This script assumes auth.users records are created first.
-- If creating users via Supabase UI Auth tab, the auth trigger will auto-create public.users rows.
-- For programmatic testing, manually insert records here.

-- ============================================================================
-- OPTION 1: Manual public.users inserts (if auth.users records already exist)
-- ============================================================================

-- Note: Replace UUIDs with actual auth.users IDs from your Supabase project
-- You can find these in Supabase Dashboard > Authentication > Users tab

-- Example: Update these UUIDs to match your actual auth.users IDs
-- INSERT INTO public.users (id, email, full_name, phone, role, consent_given)
-- VALUES (
--   'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid,  -- Replace with real UUID
--   'test-customer@example.com',
--   'Test Customer',
--   '+1-555-1234',
--   'customer'::user_role,
--   true
-- );

-- ============================================================================
-- OPTION 2: Verification Query (Safe to Run)
-- ============================================================================

-- List all users in public.users table (read-only verification)
SELECT
  id,
  email,
  full_name,
  role,
  consent_given,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- OPTION 3: Cleanup (Remove test accounts)
-- ============================================================================

-- WARNING: Uncomment only if you want to DELETE test accounts
-- This will cascade delete all related data (reservations, waitlist, etc.)

-- DELETE FROM public.users
-- WHERE email IN ('test-customer@example.com', 'test-admin@example.com');

-- ============================================================================
-- Manual Steps for Creating Test Accounts
-- ============================================================================

-- 1. Go to Supabase Dashboard > Authentication > Users tab
-- 2. Click "Create New User"
-- 3. Create Test Customer:
--    - Email: test-customer@example.com
--    - Password: TestPassword123!
--    - Auto confirm email: YES
-- 4. Create Test Admin:
--    - Email: test-admin@example.com
--    - Password: TestPassword123!
--    - Auto confirm email: YES
-- 5. Copy each user's UUID
-- 6. In SQL Editor, insert custom metadata (role):
--    UPDATE public.users SET role = 'admin' WHERE email = 'test-admin@example.com';

-- After step 6, both users should appear in the verification query output above.
