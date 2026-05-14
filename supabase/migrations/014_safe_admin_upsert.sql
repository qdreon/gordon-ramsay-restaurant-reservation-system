-- ============================================================
-- MIGRATION 14: Safe admin upsert (non-destructive)
-- Purpose: Ensure the demo admin exists in `public.users` and `auth.identities`
-- without touching `auth.users.encrypted_password` to avoid overwriting passwords
-- when migrations are replayed. This migration is safe to run in all environments.
-- ============================================================

DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-4000-8000-000000000001';
  v_admin_email TEXT := 'test-admin@example.com';
BEGIN
  -- Ensure a public.users row exists and has role = 'admin'.
  -- Do NOT modify auth.users.encrypted_password here.
  INSERT INTO public.users (id, email, full_name, phone, role, consent_given, created_at, updated_at)
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
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        role = 'admin',
        consent_given = true,
        updated_at = now();

  -- Ensure an auth.identities entry exists for email provider (helps email login)
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_admin_id,
    v_admin_id,
    v_admin_email,
    jsonb_build_object('sub', v_admin_id::text, 'email', v_admin_email, 'email_verified', true, 'phone_verified', false),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        identity_data = EXCLUDED.identity_data,
        updated_at = now();
END $$;

-- Verification hint:
-- SELECT au.email, pu.role FROM auth.users au JOIN public.users pu ON pu.id = au.id WHERE au.email = 'test-admin@example.com';

-- ============================================================
-- END MIGRATION 14
-- ============================================================
