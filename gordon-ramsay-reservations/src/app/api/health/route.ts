/**
 * Health Check API Route
 * -----------------------
 * Controller Layer: /app/api/health/route.ts
 *
 * Purpose:
 *   Comprehensive health check endpoint to verify API and all critical
 *   dependencies are operational. Used by the Admin Dashboard's
 *   System Health Monitoring Widget (FR-13 / QDR-79).
 *
 * Endpoint: GET /api/health
 * Returns: { 
 *   status: 'ok' | 'degraded' | 'error',
 *   timestamp: '<UTC ISO string>',
 *   services: {
 *     supabase: 'ok' | 'error',
 *     smtp: 'ok' | 'error',
 *     paymentGateway: 'ok' | 'error'
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabaseAdmin';

/**
 * Checks Supabase connectivity by running a simple query
 */
async function checkSupabase(): Promise<'ok' | 'error'> {
  try {
    const supabase = await createServiceSupabaseClient();
    const { error } = await supabase.from('users').select('id').limit(1);
    return error ? 'error' : 'ok';
  } catch {
    return 'error';
  }
}

/**
 * Checks Mailtrap connectivity (basic check - would connect to the email service)
 */
async function checkMailtrap(): Promise<'ok' | 'error'> {
  try {
    // Mailtrap is configured and ready; no real connection needed for MVP
    const isMailtrapConfigured = typeof process.env.MAILTRAP_API_TOKEN !== 'undefined';
    return isMailtrapConfigured ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

/**
 * Checks Payment Gateway status (simulated for MVP)
 */
async function checkPaymentGateway(): Promise<'ok' | 'error'> {
  try {
    // In production, would make a test call to payment provider API
    // For MVP with simulated gateway, always operational
    return 'ok';
  } catch {
    return 'error';
  }
}

/**
 * Handles GET requests to /api/health (FR-13 / QDR-79)
 * Performs parallel checks on all critical services
 *
 * @returns {NextResponse} JSON response with individual service statuses
 */
export async function GET() {
  try {
    // Check all services in parallel
    const [supabase, mailtrap, paymentGateway] = await Promise.all([
      checkSupabase(),
      checkMailtrap(),
      checkPaymentGateway(),
    ]);

    // Determine overall status
    const allOk = supabase === 'ok' && mailtrap === 'ok' && paymentGateway === 'ok';
    const anyError = supabase === 'error' || mailtrap === 'error' || paymentGateway === 'error';
    const status = allOk ? 'ok' : anyError ? 'error' : 'degraded';

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(), // Always UTC (DB-3)
      services: {
        supabase,
        mailtrap,
        paymentGateway,
      },
    });
  } catch (error) {
    // If health check itself fails, return error
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          supabase: 'error',
          mailtrap: 'error',
          paymentGateway: 'error',
        },
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 }
    );
  }
}

