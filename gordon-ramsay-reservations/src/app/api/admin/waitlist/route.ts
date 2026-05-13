import { NextResponse } from 'next/server';
import {
  getAdminWaitlistEntries,
  type WaitlistStatus,
} from '@/services/waitlistService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? undefined;
    const date = searchParams.get('date') ?? undefined;
    const statusParam = searchParams.get('status') ?? 'all';

    const status = ['all', 'waiting', 'offered', 'accepted', 'expired', 'cancelled'].includes(
      statusParam
    )
      ? (statusParam as 'all' | WaitlistStatus)
      : 'all';

    const waitlistEntries = await getAdminWaitlistEntries({ search, status, date });

    return NextResponse.json({ waitlistEntries }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch waitlist entries';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}