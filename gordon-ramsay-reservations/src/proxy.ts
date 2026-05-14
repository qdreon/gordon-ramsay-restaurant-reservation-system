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

  if (publicPaths.includes(pathname) || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

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
      },
    );

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

      const row = userRow as { role: string } | null;
      if (!userError && row?.role) {
        role = row.role;
      }
    }

    if (!user) {
      if (pathname.startsWith("/customer") || pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
    }

    if (pathname.startsWith("/admin")) {
      if (!user || role !== "admin") {
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
    }

    return response;
  } catch (error) {
    console.error("[Proxy Error]", error);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};