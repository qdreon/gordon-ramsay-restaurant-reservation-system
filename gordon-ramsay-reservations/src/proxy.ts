import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const publicPaths = [
  "/",
  "/auth/login",
  "/auth/register",
  "/api/availability",
  "/api/health",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminApiRoute = pathname.startsWith("/api/admin");
  const isAdminPageRoute = pathname.startsWith("/admin");
  const isCustomerPageRoute = pathname.startsWith("/customer");
  const isProtectedPageRoute = isAdminPageRoute || isCustomerPageRoute;

  // Public pages and non-admin APIs are allowed through. Customer-specific APIs
  // still perform their own auth checks inside the route handlers.
  if (
    publicPaths.includes(pathname) ||
    (pathname.startsWith("/api/") && !isAdminApiRoute)
  ) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Proxy Error] Missing Supabase environment variables.");

    if (isAdminApiRoute) {
      return NextResponse.json(
        { error: "Server auth configuration is missing." },
        { status: 500 },
      );
    }

    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.delete({
            name,
            ...options,
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let role: string | null = null;

    if (user) {
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!userError && userRow?.role) {
        role = userRow.role;
      }
    }

    if (!user && (isProtectedPageRoute || isAdminApiRoute)) {
      if (isAdminApiRoute) {
        return NextResponse.json(
          { error: "Authentication required." },
          { status: 401 },
        );
      }

      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Admin users should never land on the customer dashboard/account area.
    if (isCustomerPageRoute && role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    // Customer users should never access admin pages or admin APIs.
    if ((isAdminPageRoute || isAdminApiRoute) && role !== "admin") {
      if (isAdminApiRoute) {
        return NextResponse.json(
          { error: "Admin access required." },
          { status: 403 },
        );
      }

      return NextResponse.redirect(new URL("/customer/dashboard", request.url));
    }

    return response;
  } catch (error) {
    console.error("[Proxy Error]", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
