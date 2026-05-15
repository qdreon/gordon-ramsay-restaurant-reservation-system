import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createServiceSupabaseClient } from "@/lib/supabaseAdmin";

export type AppRole = "customer" | "admin";

export interface AppProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
}

export interface ServerAuthContext {
  user: User | null;
  profile: AppProfile | null;
}

export async function getServerAuthContext(): Promise<ServerAuthContext> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, profile: null };
  }

  const admin = createServiceSupabaseClient();
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id, email, full_name, phone, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { user, profile: null };
  }

  return {
    user,
    profile: profile as AppProfile,
  };
}

export async function getBearerAuthContext(
  request: Request,
): Promise<ServerAuthContext> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return { user: null, profile: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { user: null, profile: null };
  }

  const admin = createServiceSupabaseClient();
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id, email, full_name, phone, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { user, profile: null };
  }

  return {
    user,
    profile: profile as AppProfile,
  };
}

export async function requireAdminApi(request?: Request) {
  const bearerAuth = request ? await getBearerAuthContext(request) : null;
  const auth = bearerAuth?.user ? bearerAuth : await getServerAuthContext();

  if (!auth.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  if (auth.profile?.role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    user: auth.user,
    profile: auth.profile,
  };
}

export async function requireCustomerApi() {
  const auth = await getServerAuthContext();

  if (!auth.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  if (auth.profile?.role !== "customer") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    user: auth.user,
    profile: auth.profile,
  };
}
