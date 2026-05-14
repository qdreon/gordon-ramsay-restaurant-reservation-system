-- ============================================================
-- MIGRATION 13: Seed Demo Admin Account
-- Gordon Ramsay Restaurant Reservation System
-- ============================================================
-- Purpose:
--   Creates one deterministic demo admin account for local testing,
--   Vercel demos, and instructor review.
--
-- Demo credentials:
--   Email:    test-admin@example.com
--   Password: TestPassword123!
--
-- SECURITY NOTE:
--   This is for academic/demo environments only. Rotate or remove this
--   account before any real production use.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-4000-8000-000000000001';
  v_existing_admin_id UUID;
  v_admin_email TEXT := 'test-admin@example.com';
  v_admin_password TEXT := 'TestPassword123!';
BEGIN
  -- If this email already exists in Supabase Auth, reuse that real auth user ID.
  -- This avoids duplicate-email failures on projects where the admin was created manually.
  SELECT id
  INTO v_existing_admin_id
  FROM auth.users
  WHERE email = v_admin_email
  LIMIT 1;

  IF v_existing_admin_id IS NOT NULL THEN
    v_admin_id := v_existing_admin_id;
  END IF;

  -- Create or update the Supabase Auth user.
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated',
    'authenticated',
    v_admin_email,
    extensions.crypt(v_admin_password, extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', 'GRRRS Demo Admin',
      'phone', '',
      'consent_given', true
    ),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  -- Ensure the email identity exists for password login.
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_admin_id,
    v_admin_id,
    v_admin_email,
    jsonb_build_object(
      'sub', v_admin_id::text,
      'email', v_admin_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  -- Remove any stale public.users row that has the admin email but a different
  -- auth UUID. This can happen if the Auth user was recreated manually.
  DELETE FROM public.users
  WHERE email = v_admin_email
    AND id <> v_admin_id;

  -- The auth trigger normally creates this row. This upsert guarantees
  -- the user is an admin even if the trigger did not run in a reset/import.
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    role,
    consent_given,
    created_at,
    updated_at
  )
  VALUES (
    v_admin_id,
    v_admin_email,
    'GRRRS Demo Admin',
    '',
    'admin',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = 'admin',
    consent_given = true,
    updated_at = now();
END $$;

-- Verification query:
-- SELECT au.email, pu.role
-- FROM auth.users au
-- JOIN public.users pu ON pu.id = au.id
-- WHERE au.email = 'test-admin@example.com';

-- ============================================================
-- END MIGRATION 13
-- ============================================================
