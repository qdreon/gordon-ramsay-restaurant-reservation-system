/**
 * supabaseServer.ts
 * ------------------
 * Supabase Client Configuration (Server-Side)
 *
 * Purpose:
 *   Creates a Supabase client instance for use in Next.js Server Components,
 *   API Routes, and Server Actions. This client uses cookie-based session
 *   management via @supabase/ssr to maintain authenticated user context
 *   across server-rendered requests.
 *
 * Security Note:
 *   - This client reads cookies to determine the authenticated user.
 *   - For admin-only operations requiring elevated privileges (e.g.,
 *     cascade delete for Right to Erasure), use createClient with the
 *     service_role key in a dedicated, secured API route.
 *
 * Usage:
 *   import { createServerSupabaseClient } from '@/lib/supabaseServer';
 *   const supabase = await createServerSupabaseClient();
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates an authenticated Supabase client for server-side usage.
 * Reads the user session from Next.js cookies automatically.
 *
 * @returns {Promise<ReturnType<typeof createServerClient>>} Authenticated Supabase client.
 * @throws {Error} If required environment variables are missing.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "[Supabase Server Init Error] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method is called from a Server Component where
          // cookies cannot be set. This is safe to ignore if middleware
          // is refreshing user sessions.
        }
      },
    },
  });
}
