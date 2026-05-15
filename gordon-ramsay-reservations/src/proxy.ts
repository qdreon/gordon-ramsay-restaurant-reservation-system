import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const publicPagePaths = new Set([
  "/",
  "/auth/login",
  "/auth/register",
  "/admin/login",
]);

function getCustomerLoginUrl(request: NextRequest) {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return loginUrl;
}

function getAdminLoginUrl(request: NextRequest) {
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return loginUrl;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Proxy Error] Missing Supabase environment variables.");
    return NextResponse.next();
  }

  let response = NextResponse.next({
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

    let role: "customer" | "admin" | null = null;

    if (user) {
      const { data: userRow } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      role = userRow?.role ?? null;
    }

    if (publicPagePaths.has(pathname)) {
      if (user && role === "admin" && pathname.startsWith("/auth")) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }

      if (user && role === "customer" && pathname.startsWith("/auth")) {
        return NextResponse.redirect(new URL("/customer/dashboard", request.url));
      }

      if (user && role === "admin" && pathname === "/admin/login") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }

      if (user && role === "customer" && pathname === "/admin/login") {
        return NextResponse.redirect(new URL("/customer/dashboard", request.url));
      }

      return response;
    }

    if (pathname.startsWith("/admin")) {
      if (!user) {
        return NextResponse.redirect(getAdminLoginUrl(request));
      }

      if (role !== "admin") {
        return NextResponse.redirect(new URL("/customer/dashboard", request.url));
      }
    }

    if (pathname.startsWith("/customer")) {
      if (!user) {
        return NextResponse.redirect(getCustomerLoginUrl(request));
      }

      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
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
