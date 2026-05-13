import { NextResponse } from 'next/server';
import {
  deleteAdminWaitlistEntry,
  updateAdminWaitlistEntry,
  type WaitlistStatus,
} from '@/services/waitlistService';

interface UpdateWaitlistBody {
  desired_date?: string;
  desired_time?: string;
  party_size?: number;
  position?: number;
  status?: WaitlistStatus;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ waitlistId: string }> }
) {
  try {
    const { waitlistId } = await params;
    if (!waitlistId) {
      return NextResponse.json({ error: 'waitlistId is required' }, { status: 400 });
    }

    const body = (await request.json()) as UpdateWaitlistBody;

    if (body.position !== undefined && (!Number.isFinite(body.position) || body.position < 1)) {
      return NextResponse.json({ error: 'position must be a positive number' }, { status: 400 });
    }

    if (body.party_size !== undefined && (!Number.isFinite(body.party_size) || body.party_size < 1)) {
      return NextResponse.json({ error: 'party_size must be a positive number' }, { status: 400 });
    }

    const updatedEntry = await updateAdminWaitlistEntry(waitlistId, {
      desired_date: body.desired_date,
      desired_time: body.desired_time,
      party_size: body.party_size,
      position: body.position,
      status: body.status,
    });

    return NextResponse.json({ waitlistEntry: updatedEntry }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update waitlist entry';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ waitlistId: string }> }
) {
  try {
    const { waitlistId } = await params;
    if (!waitlistId) {
      return NextResponse.json({ error: 'waitlistId is required' }, { status: 400 });
    }

    await deleteAdminWaitlistEntry(waitlistId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete waitlist entry';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}