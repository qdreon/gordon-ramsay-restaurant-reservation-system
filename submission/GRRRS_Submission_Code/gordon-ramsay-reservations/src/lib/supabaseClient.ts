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
 * Fix (DEF-002):
 *   I switched from bare createClient (@supabase/supabase-js) to
 *   createBrowserClient (@supabase/ssr). createBrowserClient enforces
 *   a module-level singleton and prevents the "Multiple GoTrueClient
 *   instances" warning that caused sign-out requests to abort.
 *
 * Usage:
 *   import { supabase } from '@/lib/supabaseClient';
 *   const { data, error } = await supabase.from('tables').select('*');
 */

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Singleton Supabase client for browser-side usage.
 * createBrowserClient from @supabase/ssr guarantees only one GoTrueClient
 * instance exists per browser context, preventing auth state corruption.
 * All queries are subject to RLS.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
