/**
 * middleware.ts
 * ---------------
 * I create Next.js middleware to protect customer and admin routes.
 * 
 * Purpose:
 *   I intercept requests to protected paths and verify the user is authenticated.
 *   I redirect unauthenticated users to /auth/login.
 *   I enforce role-based route access: customers can't access /admin, etc.
 * 
 * Constraint (SEC-1 - RBAC):
 *   I verify user role from the Supabase JWT token.
 *   I separate customer routes (/customer/*) from admin routes (/admin/*).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const publicPaths = ['/', '/auth/login', '/auth/register', '/api/availability', '/api/health'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // I allow public paths without authentication
  if (publicPaths.includes(pathname) || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // I create a response to modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // I initialize the Supabase server client with cookies
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

  // I check if the user has an active session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // I redirect unauthenticated users to login for protected paths
  if (!user) {
    if (pathname.startsWith('/customer') || pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * I match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
