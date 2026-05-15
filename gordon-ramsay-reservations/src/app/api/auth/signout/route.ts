/**
 * /api/auth/signout
 * ------------------
 * Server-side sign-out handler.
 *
 * Purpose:
 *   Performs the Supabase session invalidation on the server and clears the
 *   session cookie, then redirects the browser to "/".
 *
 * Fix (DEF-002):
 *   The original client-side signOut() called supabase.auth.signOut() from
 *   the browser, which fires a fetch POST to /auth/v1/logout. Any client-side
 *   navigation (router.push, router.replace, window.location.href) that
 *   executes before the response returns causes the browser to abort that
 *   fetch mid-flight (net::ERR_ABORTED). Moving the logout to a server-side
 *   POST route means the fetch to Supabase happens on the server; the browser
 *   only navigates once it receives a redirect response from this route --
 *   so there is no in-flight browser fetch to cancel.
 *
 * Flow:
 *   1. Client POSTs to /api/auth/signout (no body required).
 *   2. Server calls supabase.auth.signOut() using the server-side client,
 *      which reads and clears the session cookie.
 *   3. Server responds with a 303 redirect to "/".
 *   4. Browser follows the redirect -- session is already gone.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    // I use the server-side Supabase client so the session cookie is read
    // and cleared correctly within the server context.
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // I do not fail the redirect if sign-out errors -- the cookie will expire
    // naturally and the user should still be sent to the home page.
  }

  // Redirect the browser to home. A 303 See Other is correct after a POST
  // that performs a state-changing action; the browser follows with a GET.
  return NextResponse.redirect(new URL('/', req.url), {
    status: 303,
  });
}
