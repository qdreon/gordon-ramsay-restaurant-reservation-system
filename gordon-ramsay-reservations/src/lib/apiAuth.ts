import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseAdmin";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export type AppRole = "admin" | "customer";

export type ApiAuthSuccess = {
  ok: true;
  user: {
    id: string;
    email: string | null;
  };
  role: AppRole;
};

export type ApiAuthFailure = {
  ok: false;
  response: NextResponse;
};

export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

function bearerTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function getApiAuthContext(request: Request): Promise<ApiAuthResult> {
  const supabase = await createServerSupabaseClient();
  const accessToken = bearerTokenFromRequest(request);

  const {
    data: { user },
    error: authError,
  } = accessToken
    ? await supabase.auth.getUser(accessToken)
    : await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  const adminClient = createServiceSupabaseClient();
  const { data: userRow, error: roleError } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (roleError || !userRow?.role) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "User profile or role is missing." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    role: userRow.role === "admin" ? "admin" : "customer",
  };
}

export async function requireAdminApi(request: Request): Promise<ApiAuthResult> {
  const auth = await getApiAuthContext(request);

  if (!auth.ok) return auth;

  if (auth.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 },
      ),
    };
  }

  return auth;
}

export async function requireCustomerApi(request: Request): Promise<ApiAuthResult> {
  const auth = await getApiAuthContext(request);

  if (!auth.ok) return auth;

  if (auth.role !== "customer") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Customer access required." },
        { status: 403 },
      ),
    };
  }

  return auth;
}
