/**
 * authClient.ts
 * ---------------
 * I am creating a browser-side authentication helper for client-side auth flows.
 * 
 * Purpose:
 *   Provides utility functions for sign-up, sign-in, sign-out, and session management.
 *   Uses the Supabase browser client configured with RLS enforcement.
 * 
 * Constraint (LEG-1):
 *   RA 10173 (Data Privacy Act) - I must ensure that registration captures consent.
 *   I do NOT store raw consent data; instead, I set the users.consent_given column to true.
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
 * I register a new customer with email, password, and profile data.
 * 
 * Constraint (LEG-1):
 *   I enforce that consentGiven must be true; otherwise, I throw an error.
 *   I create a user record in auth.users and a corresponding public.users row.
 */
export async function signUp(input: SignUpInput) {
  if (!input.consentGiven) {
    throw new Error('[Auth Client] You must consent to RA 10173 Data Privacy Act terms.');
  }

  const { data, error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        phone: input.phone || null,
        consent_given: true,
      },
    },
  });

  if (signUpError) {
    throw new Error(`[Auth Client] Sign-up failed: ${signUpError.message}`);
  }

  if (!data.user) {
    throw new Error('[Auth Client] Sign-up succeeded but no user was returned.');
  }

  return data.user;
}

/**
 * I sign in an existing customer with email and password.
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
 * I sign out the current user and clear the session.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`[Auth Client] Sign-out failed: ${error.message}`);
  }
}

/**
 * I get the current authenticated user session.
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
 * I get the current authenticated user.
 * Returns null if no user is authenticated.
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`[Auth Client] Failed to get user: ${error.message}`);
  }

  return data.user;
}

export default supabase;
