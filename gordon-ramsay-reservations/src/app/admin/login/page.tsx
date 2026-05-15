"use client";

import { FormEvent, useState } from "react";
import { signIn, signOut } from "@/lib/authClient";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const user = await signIn({ email, password });
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        await signOut();
        setError("This account is not authorized for administrator access.");
        return;
      }

      window.location.assign("/admin/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Admin sign-in failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md items-center px-6 py-10">
      <div className="w-full space-y-6 rounded-lg border bg-white p-8 shadow-md dark:border-slate-700 dark:bg-slate-800">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Admin Sign In</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Restaurant operations dashboard
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              placeholder="admin@example.com"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              placeholder="Password"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:bg-slate-400"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
