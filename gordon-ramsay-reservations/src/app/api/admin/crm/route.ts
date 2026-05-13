import { NextResponse } from 'next/server';
import { getAdminCrmCustomers } from '@/services/customerService';

/**
 * GET /api/admin/crm?search=...&status=all|VIP|Regular|Blacklisted
 * Returns customer CRM rows for Admin Guest CRM UI.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? undefined;
    const statusParam = searchParams.get('status') ?? 'all';

    const status = ['all', 'VIP', 'Regular', 'Blacklisted'].includes(statusParam)
      ? (statusParam as 'all' | 'VIP' | 'Regular' | 'Blacklisted')
      : 'all';

    const customers = await getAdminCrmCustomers({ search, status });

    return NextResponse.json({ customers }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch CRM customers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}