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
 *     mailtrap: 'ok' | 'error',
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

function hasSenderAddress(): boolean {
  return Boolean(process.env.MAILTRAP_FROM?.trim() || process.env.EMAIL_FROM?.trim());
}

/**
 * SMTP path: host + From header (auth optional for local catchers like Mailpit).
 */
function checkSmtpConfigured(): 'ok' | 'error' {
  const host = process.env.SMTP_HOST?.trim();
  if (!host || !hasSenderAddress()) return 'error';
  return 'ok';
}

/**
 * Mailtrap HTTP API path: token + From header.
 */
function checkMailtrapConfigured(): 'ok' | 'error' {
  const token = process.env.MAILTRAP_API_TOKEN?.trim();
  if (!token || !hasSenderAddress()) return 'error';
  return 'ok';
}

/**
 * Email delivery is OK if at least one provider is fully configured.
 */
async function checkEmailService(): Promise<'ok' | 'error'> {
  try {
    return checkSmtpConfigured() === 'ok' || checkMailtrapConfigured() === 'ok'
      ? 'ok'
      : 'error';
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
    const [supabase, emailService, paymentGateway] = await Promise.all([
      checkSupabase(),
      checkEmailService(),
      checkPaymentGateway(),
    ]);

    // Determine overall status
    const allOk =
      supabase === 'ok' && emailService === 'ok' && paymentGateway === 'ok';
    const anyError =
      supabase === 'error' ||
      emailService === 'error' ||
      paymentGateway === 'error';
    const status = allOk ? 'ok' : anyError ? 'error' : 'degraded';

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(), // Always UTC (DB-3)
      services: {
        supabase,
        smtp: emailService,
        mailtrap: emailService,
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
          smtp: 'error',
          mailtrap: 'error',
          paymentGateway: 'error',
        },
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 }
    );
  }
}

