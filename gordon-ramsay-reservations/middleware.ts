/**
 * middleware.ts
 * ---------------
 * Next.js middleware to protect customer and admin routes.
 *
 * Purpose:
 *   Intercepts requests to protected paths and verifies the user is authenticated.
 *   Redirects unauthenticated users to /auth/login.
 *   Enforces role-based route access: customers cannot access /admin, etc.
 *
 * Constraint (SEC-1 - RBAC):
 *   Verifies user role from the Supabase JWT token.
 *   Separates customer routes (/customer/*) from admin routes (/admin/*).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const publicPaths = ['/', '/auth/login', '/auth/register', '/api/availability', '/api/health'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without authentication
  if (publicPaths.includes(pathname) || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Create a response object to modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Initialize the Supabase server client with cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next();
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next();
          response.cookies.delete({
            name,
            ...options,
          });
        },
      },
    }
  );

  // Check if the user has an active session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the user's role from the `users` table (RBAC - SEC-1)
  let role: string | null = null;
  if (user) {
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const row = userRow as { role: string } | null;
    if (!userError && row?.role) {
      role = row.role;
    }
  }

  // Redirect unauthenticated users to login for protected paths
  if (!user) {
    if (pathname.startsWith('/customer') || pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Enforce admin-only access for /admin paths
  if (pathname.startsWith('/admin')) {
    if (!user || role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
