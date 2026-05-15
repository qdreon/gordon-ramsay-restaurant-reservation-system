import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Minimal Supabase schema typings for Playwright global setup only.
 * (App `database.types.ts` is not generated yet; untyped createClient()
 * makes `.from("users")` resolve to `never` and breaks `next build` tsc.)
 */
type E2EDatabase = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          role: "customer" | "admin";
          consent_given: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          role: "customer" | "admin";
          consent_given?: boolean;
        };
        Update: Partial<{
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          role: "customer" | "admin";
          consent_given: boolean;
        }>;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          user_id: string;
          dietary_restrictions: string | null;
          allergies: string | null;
          vip_status: boolean;
          total_visits: number;
          total_no_shows: number;
          staff_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
        };
        Update: Partial<{ user_id: string }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "customer" | "admin";
    };
    CompositeTypes: Record<string, never>;
  };
};

type E2EClient = SupabaseClient<E2EDatabase>;

type TestAccount = {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "customer";
};

const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: "test-admin@example.com",
    password: "TestPassword123!",
    fullName: "QA Test Admin",
    role: "admin",
  },
  {
    email: "test-customer@example.com",
    password: "TestPassword123!",
    fullName: "QA Test Customer",
    role: "customer",
  },
  {
    email: "qa-admin@example.com",
    password: "Test@123Pass",
    fullName: "QA Demo Admin",
    role: "admin",
  },
  {
    email: "qa-customer-1@example.com",
    password: "Test@123Pass",
    fullName: "QA Demo Customer",
    role: "customer",
  },
];

async function findAuthUserByEmail(supabase: E2EClient, email: string) {
  const perPage = 1000;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Unable to list Supabase auth users: ${error.message}`);
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    if (match) return match;
    if (data.users.length < perPage) return null;
  }

  return null;
}

async function ensureAccount(supabase: E2EClient, account: TestAccount) {
  const existing = await findAuthUserByEmail(supabase, account.email);

  const { data, error } = existing
    ? await supabase.auth.admin.updateUserById(existing.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.fullName,
          consent_given: true,
        },
      })
    : await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.fullName,
          consent_given: true,
        },
      });

  if (error || !data.user) {
    throw new Error(
      `Unable to prepare ${account.email}: ${error?.message ?? "No user returned"}`,
    );
  }

  const userId = data.user.id;

  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: userId,
      email: account.email,
      full_name: account.fullName,
      phone: "",
      role: account.role,
      consent_given: true,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw new Error(
      `Unable to prepare public.users row for ${account.email}: ${profileError.message}`,
    );
  }

  if (account.role === "customer") {
    const { error: customerError } = await supabase.from("customers").upsert(
      { user_id: userId },
      { onConflict: "user_id" },
    );

    if (customerError) {
      throw new Error(
        `Unable to prepare customer row for ${account.email}: ${customerError.message}`,
      );
    }
  }
}

export default async function globalSetup() {
  loadEnvConfig(process.cwd());

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Phase 7 E2E setup requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const supabase = createClient<E2EDatabase>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  for (const account of TEST_ACCOUNTS) {
    await ensureAccount(supabase, account);
  }
}
