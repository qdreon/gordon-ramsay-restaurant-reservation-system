import { NextResponse } from 'next/server';
import { sendBookingConfirmation, sendWaitlistInvite } from '@/services/notificationService';

type BookingNotificationBody = {
  type: 'booking-confirmation';
  reservation: Parameters<typeof sendBookingConfirmation>[0];
};

type WaitlistNotificationBody = {
  type: 'waitlist-invite';
  invite: Parameters<typeof sendWaitlistInvite>[0];
};

type NotificationBody = BookingNotificationBody | WaitlistNotificationBody;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as NotificationBody;

    if (!body || typeof body !== 'object' || !('type' in body)) {
      return NextResponse.json({ error: 'type is required.' }, { status: 400 });
    }

    if (body.type === 'booking-confirmation') {
      if (!body.reservation) {
        return NextResponse.json({ error: 'reservation is required.' }, { status: 400 });
      }

      void sendBookingConfirmation(body.reservation);
      return NextResponse.json({ success: true, type: body.type }, { status: 200 });
    }

    if (body.type === 'waitlist-invite') {
      if (!body.invite) {
        return NextResponse.json({ error: 'invite is required.' }, { status: 400 });
      }

      void sendWaitlistInvite(body.invite);
      return NextResponse.json({ success: true, type: body.type }, { status: 200 });
    }

    return NextResponse.json({ error: 'Unsupported notification type.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send notification.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}