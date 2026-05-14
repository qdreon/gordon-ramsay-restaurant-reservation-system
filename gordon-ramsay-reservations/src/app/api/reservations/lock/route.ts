import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/apiAuth";
import { getCustomerByUserId } from "@/services/customerService";
import { createPendingReservationLock } from "@/services/reservationService";
import { sendBookingConfirmation } from "@/services/notificationService";

interface LockReservationRequestBody {
  tableIds?: string[];
  reservationDate?: string;
  startTime?: string;
  endTime?: string;
  partySize?: number;
  paymentToken?: string;
  specialRequests?: string;
}

function formatTimeFromIso(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16);
}

export async function POST(req: Request) {
  try {
    const auth = await requireCustomerApi(req);
    if (!auth.ok) {
      return auth.response;
    }

    const body = (await req.json()) as LockReservationRequestBody;
    const { tableIds, reservationDate, startTime, endTime, partySize } = body;

    if (
      !tableIds ||
      tableIds.length === 0 ||
      !reservationDate ||
      !startTime ||
      !endTime ||
      !partySize
    ) {
      return NextResponse.json(
        {
          error:
            "tableIds, reservationDate, startTime, endTime, and partySize are required.",
        },
        { status: 400 },
      );
    }

    const customer = await getCustomerByUserId(auth.user.id);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer profile was not found for the signed-in user." },
        { status: 403 },
      );
    }

    const lockResult = await createPendingReservationLock({
      customerId: customer.id,
      tableIds,
      reservationDate,
      startTime,
      endTime,
      partySize,
      paymentToken: body.paymentToken,
      specialRequests: body.specialRequests,
      createdBy: auth.user.id,
    });

    try {
      if (!auth.user.email) {
        throw new Error(
          "Unable to resolve authenticated user for booking notification.",
        );
      }

      const guestName = auth.user.email;
      const guestEmail = auth.user.email;

      void sendBookingConfirmation({
        reservationId: lockResult.reservation_id,
        guestName,
        guestEmail,
        partySize,
        reservationDate,
        reservationTime: formatTimeFromIso(startTime),
        reservationEndTime: formatTimeFromIso(endTime),
        restaurantName:
          process.env.RESTAURANT_NAME ?? "Gordon Ramsay Restaurant",
        restaurantAddress:
          process.env.RESTAURANT_ADDRESS ??
          "Gordon Ramsay Restaurant, Cebu City, Philippines",
        specialRequests: body.specialRequests ?? null,
        confirmationURL: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/customer/dashboard?booking=confirmed`,
      }).catch((emailError) => {
        console.error(
          "[Reservation Notification] Failed to send booking confirmation:",
          emailError,
        );
      });
    } catch (emailError) {
      console.error(
        "[Reservation Notification] Failed to send booking confirmation:",
        emailError,
      );
    }

    return NextResponse.json({ reservation: lockResult }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while creating reservation lock.";
    console.error("[Lock API] Error:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
