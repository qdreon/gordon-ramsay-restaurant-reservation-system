import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";

const CUSTOMER_EMAIL = "test-customer@example.com";
const CUSTOMER_PASSWORD = "TestPassword123!";
const ADMIN_EMAIL = "test-admin@example.com";
const ADMIN_PASSWORD = "TestPassword123!";

function loadDotEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const fileText = readFileSync(envPath, "utf8");
  for (const line of fileText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (process.env[key]) continue;
    let value = rest.join("=");
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing Supabase public environment variables for SEC-1 RBAC tests.");
}

const authSupabase = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});

async function getAccessToken(email: string, password: string): Promise<string> {
  const { data, error } = await authSupabase.auth.signInWithPassword({ email, password });

  if (error || !data.session?.access_token) {
    throw new Error(`Unable to sign in ${email} for SEC-1 RBAC tests: ${error?.message ?? "no token"}`);
  }

  return data.session.access_token;
}

test.describe("SEC-1 API RBAC guards", () => {
  test("/api/admin/menu returns 401 while logged out", async ({ request }) => {
    const response = await request.get("/api/admin/menu");
    expect(response.status()).toBe(401);
  });

  test("/api/admin/menu returns 403 for customer role", async ({ request }) => {
    const token = await getAccessToken(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

    const response = await request.get("/api/admin/menu", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(403);
  });

  test("/api/admin/menu returns 200 for admin role", async ({ request }) => {
    const token = await getAccessToken(ADMIN_EMAIL, ADMIN_PASSWORD);

    const response = await request.get("/api/admin/menu", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);
  });
});
