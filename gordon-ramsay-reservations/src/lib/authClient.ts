/**
 * authClient.ts
 * ---------------
 * Browser-side authentication helper for client-side auth flows.
 *
 * Purpose:
 *   Provides utility functions for sign-up, sign-in, sign-out, and session management.
 *   Uses the Supabase browser client configured with RLS enforcement.
 *
 * Constraint (LEG-1):
 *   RA 10173 (Data Privacy Act) - registration must capture explicit consent.
 *   Raw consent data is not stored; `users.consent_given` is set to true.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[Auth Client] Missing Supabase environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  consentGiven: boolean;
}

export interface SignInInput {
  email: string;
  password: string;
}

/**
 * Register a new customer with email, password, and profile data.

 * Constraint (LEG-1):
 *   `consentGiven` must be true; otherwise an error is thrown.
 *   A user record is created in `auth.users` and a corresponding `public.users` row.
 */
export async function signUp(input: SignUpInput) {
  if (!input.consentGiven) {
    throw new Error('[Auth Client] You must consent to RA 10173 Data Privacy Act terms.');
  }

  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      phone: input.phone || null,
      consentGiven: true,
    }),
  });

  const payload = (await response.json()) as
    | { user?: { id: string; email?: string }; error?: string }
    | { error?: string };

  if (!response.ok) {
    throw new Error(`[Auth Client] Sign-up failed: ${payload.error || 'Unknown registration error.'}`);
  }

  if (!('user' in payload) || !payload.user) {
    throw new Error('[Auth Client] Sign-up succeeded but no user was returned.');
  }

  return payload.user;
}

/**
 * Sign in an existing customer with email and password.
 */
export async function signIn(input: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw new Error(`[Auth Client] Sign-in failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('[Auth Client] Sign-in succeeded but no user was returned.');
  }

  return data.user;
}

/**
 * Sign out the current user and clear the session.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`[Auth Client] Sign-out failed: ${error.message}`);
  }
}

/**
 * Get the current authenticated user session.
 * Returns null if no session exists.
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`[Auth Client] Failed to get session: ${error.message}`);
  }

  return data.session;
}

/**
 * Get the current authenticated user.
 * Returns null if no user is authenticated.
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    // If the error is just that they aren't logged in, return null gracefully
    if (error.message.includes('Auth session missing')) {
      return null;
    }
    throw new Error(`[Auth Client] Failed to get user: ${error.message}`);
  }

  return data.user;
}

export default supabase;
