import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client using the service role key for server-side admin operations.
 * This must only be used in trusted server contexts and requires
 * `SUPABASE_SERVICE_ROLE_KEY` to be set in the environment.
 */
export function createServiceSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '[Supabase Admin Init Error] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
