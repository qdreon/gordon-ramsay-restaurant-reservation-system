/**
 * supabaseClient.ts
 * ------------------
 * Supabase Client Configuration (Browser-Side)
 *
 * Purpose:
 *   Creates and exports a singleton Supabase client instance for use
 *   in client-side React components. This client uses the public
 *   anonymous key and respects Row Level Security (RLS) policies.
 *
 * Security Note:
 *   - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are
 *     safe to expose to the browser. RLS policies enforce data access.
 *   - NEVER expose the service_role key on the client side.
 *
 * Usage:
 *   import { supabase } from '@/lib/supabaseClient';
 *   const { data, error } = await supabase.from('tables').select('*');
 */

import { createClient } from '@supabase/supabase-js';

// Guard clause: Validate environment variables exist at initialization time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    '[Supabase Init Error] Missing NEXT_PUBLIC_SUPABASE_URL in .env.local. ' +
    'Please configure your environment variables before running the app.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    '[Supabase Init Error] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. ' +
    'Please configure your environment variables before running the app.'
  );
}

/**
 * Singleton Supabase client for browser-side usage.
 * Uses the anonymous (public) key -- all queries are subject to RLS.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
