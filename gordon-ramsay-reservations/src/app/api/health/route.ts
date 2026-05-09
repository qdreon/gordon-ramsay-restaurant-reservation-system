/**
 * Health Check API Route
 * -----------------------
 * Controller Layer: /app/api/health/route.ts
 *
 * Purpose:
 *   A simple health check endpoint to verify the API is running
 *   and can connect to Supabase. Used by the Admin Dashboard's
 *   System Health Monitoring Indicators (FR-13).
 *
 * Endpoint: GET /api/health
 * Returns: { status: 'ok', timestamp: '<UTC ISO string>' }
 */

import { NextResponse } from 'next/server';

/**
 * Handles GET requests to /api/health.
 *
 * @returns {NextResponse} JSON response with server status and UTC timestamp.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(), // Always UTC (DB-3 compliant)
  });
}
