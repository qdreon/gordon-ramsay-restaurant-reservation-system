/**
 * notificationService.ts
 * -----------------------
 * Notification service for reservation and waitlist emails.
 * Uses Mailtrap API only.
 */

import fs from "fs";
import path from "path";

type MailtrapPayload = Record<string, unknown>;

type MailtrapClientLike = {
  send(payload: MailtrapPayload): Promise<unknown>;
};

type MailtrapModule = {
  MailtrapClient: new (config: { token: string }) => MailtrapClientLike;
};

let mailtrapClient: MailtrapClientLike | null = null;
let mailtrapClientInitialized = false;

async function initMailtrapApi(): Promise<void> {
  if (mailtrapClientInitialized) return;
  mailtrapClientInitialized = true;

  try {
    if (process.env.MAILTRAP_API_TOKEN) {
      const { MailtrapClient } = (await import("mailtrap")) as MailtrapModule;
      mailtrapClient = new MailtrapClient({
        token: process.env.MAILTRAP_API_TOKEN,
      });
      console.log("[Notification] Mailtrap API initialized successfully");
    } else {
      console.log("[Notification] MAILTRAP_API_TOKEN not found");
    }
  } catch (err) {
    console.error("[Notification] Failed to initialize Mailtrap API:", err);
    mailtrapClient = null;
  }
}

function getMailtrapSender(): { email: string; name?: string } | null {
  const fromAddress = process.env.MAILTRAP_FROM ?? process.env.EMAIL_FROM;

  if (!fromAddress) {
    return null;
  }

  const match = fromAddress.match(
    /^\s*(?:(.*?)\s*<)?([^<>\s]+@[^<>\s]+)>?\s*$/,
  );
  if (!match) {
    return { email: fromAddress };
  }

  const name = match[1]?.trim().replace(/^"|"$/g, "");
  const email = match[2].trim();

  return name ? { email, name } : { email };
}

async function sendViaMailtrapApi(
  recipients: { email: string }[],
  subject: string,
  html: string,
  text: string,
  category: string,
  attachments?: Array<{ content: string; filename: string; type: string }>,
): Promise<void> {
  await initMailtrapApi();

  if (!mailtrapClient) {
    throw new Error("Mailtrap API client is not configured.");
  }

  const sender = getMailtrapSender();
  if (!sender) {
    throw new Error("Missing MAILTRAP_FROM/EMAIL_FROM sender address.");
  }

  const payload: MailtrapPayload = {
    from: sender,
    to: recipients,
    subject,
    html,
    text,
    category,
  };

  if (attachments && attachments.length > 0) {
    payload.attachments = attachments;
  }

  await mailtrapClient.send(payload);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReservationNotification {
  reservationId: string;
  guestName: string;
  guestEmail: string;
  partySize: number;
  reservationDate: string; // YYYY-MM-DD
  reservationTime: string; // HH:mm
  reservationEndTime: string; // HH:mm
  restaurantName: string;
  restaurantAddress: string;
  restaurantLocation?: string;
  operatingHours?: string;
  specialRequests?: string | null;
  confirmationURL: string;
}

export interface WaitlistNotification {
  inviteId: string;
  guestName: string;
  guestEmail: string;
  partySize: number;
  requestedDate: string; // YYYY-MM-DD
  requestedTime: string; // HH:mm
  restaurantName: string;
  restaurantAddress: string;
  waitlistPosition: number;
  confirmationURL: string;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function generateICS(reservation: ReservationNotification): string {
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Gordon Ramsay Reservation System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${reservation.reservationId}@example.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:${reservation.reservationDate.replace(/-/g, "")}T${reservation.reservationTime.replace(":", "")}00Z
DTEND:${reservation.reservationDate.replace(/-/g, "")}T${reservation.reservationEndTime.replace(":", "")}00Z
SUMMARY:Reservation at ${reservation.restaurantName}
DESCRIPTION:Booking confirmation for ${reservation.guestName} (Party of ${reservation.partySize})
LOCATION:${reservation.restaurantAddress}
STATUS:CONFIRMED
ORGANIZER;CN=${reservation.restaurantName}:mailto:reservations@example.com
ATTENDEE;CN=${reservation.guestName};RSVP=TRUE:mailto:${reservation.guestEmail}
END:VEVENT
END:VCALENDAR`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const date = new Date();
  date.setUTCHours(hours, mins + minutes, 0, 0);
  return date.toISOString().slice(11, 16);
}

function loadTemplate(templateName: string): string {
  try {
    const templatePath = path.join(
      process.cwd(),
      "src",
      "emails",
      templateName,
    );
    return fs.readFileSync(templatePath, "utf8");
  } catch (err) {
    console.error(`[Notification] Template ${templateName} not found:`, err);
    return `<p>Template ${templateName} missing</p>`;
  }
}

// ---------------------------------------------------------------------------
// Notification Functions
// ---------------------------------------------------------------------------

/**
 * Sends a booking confirmation email with .ics calendar invite attached.
 */
export async function sendBookingConfirmation(
  reservation: ReservationNotification,
): Promise<void> {
  console.log(
    "[Notification] sendBookingConfirmation invoked for:",
    reservation.guestEmail,
  );

  const htmlTemplate = loadTemplate("bookingConfirmation.html")
    .replace("{{ guestName }}", reservation.guestName)
    .replace("{{ restaurantName }}", reservation.restaurantName)
    .replace("{{ reservationId }}", reservation.reservationId)
    .replace("{{ reservationDate }}", reservation.reservationDate)
    .replace("{{ reservationTime }}", reservation.reservationTime)
    .replace("{{ partySize }}", reservation.partySize.toString())
    .replace("{{ restaurantAddress }}", reservation.restaurantAddress)
    .replace(
      "{{ restaurantLocation }}",
      reservation.restaurantLocation ?? reservation.restaurantAddress,
    )
    .replace(
      "{{ operatingHours }}",
      reservation.operatingHours ?? "Open daily from 11:00 to 23:00",
    )
    .replace("{{ specialRequests }}", reservation.specialRequests ?? "None")
    .replace("{{ confirmationURL }}", reservation.confirmationURL);

  const icsContent = generateICS(reservation);
  const fromAddress = getMailtrapSender();

  if (!fromAddress) {
    console.error(
      "[Notification] Missing MAILTRAP_FROM/EMAIL_FROM sender address.",
    );
    return;
  }

  try {
    console.log(
      "[Notification] Attempting Mailtrap API send to:",
      reservation.guestEmail,
      "from:",
      fromAddress.email,
    );
    await sendViaMailtrapApi(
      [{ email: reservation.guestEmail }],
      "Your Booking Confirmation",
      htmlTemplate,
      `Booking confirmation for ${reservation.guestName}
Reservation reference: ${reservation.reservationId}
Date: ${reservation.reservationDate}
Time: ${reservation.reservationTime}
Party size: ${reservation.partySize}
Restaurant: ${reservation.restaurantName}
Location: ${reservation.restaurantLocation ?? reservation.restaurantAddress}
Operating hours: ${reservation.operatingHours ?? "11:00-23:00"}`,
      "Booking Confirmation",
      [
        {
          filename: "reservation.ics",
          content: Buffer.from(icsContent).toString("base64"),
          type: "text/calendar",
        },
      ],
    );
    console.log(
      "[Notification] Mailtrap API send successful for:",
      reservation.guestEmail,
    );
  } catch (err) {
    console.error(
      "[Notification] Mailtrap API sendBookingConfirmation failed:",
      err,
    );
    throw err;
  }
}

/**
 * Sends a waitlist invitation email with tentative .ics calendar invite attached.
 */
export async function sendWaitlistInvite(
  invite: WaitlistNotification,
): Promise<void> {
  console.log(
    "[Notification] sendWaitlistInvite invoked for:",
    invite.guestEmail,
  );

  const htmlTemplate = loadTemplate("waitlistInvite.html")
    .replace("{{ guestName }}", invite.guestName)
    .replace("{{ restaurantName }}", invite.restaurantName)
    .replace("{{ requestedDate }}", invite.requestedDate)
    .replace("{{ requestedTime }}", invite.requestedTime)
    .replace("{{ partySize }}", invite.partySize.toString())
    .replace("{{ waitlistPosition }}", invite.waitlistPosition.toString())
    .replace("{{ confirmationURL }}", invite.confirmationURL);

  const offerExpiresTime = addMinutesToTime(invite.requestedTime, 10);
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Gordon Ramsay Reservation System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${invite.inviteId}@example.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:${invite.requestedDate.replace(/-/g, "")}T${invite.requestedTime.replace(":", "")}00Z
DTEND:${invite.requestedDate.replace(/-/g, "")}T${offerExpiresTime.replace(":", "")}00Z
SUMMARY:Waitlist Invitation - ${invite.restaurantName}
DESCRIPTION:You are invited from the waitlist for ${invite.guestName} (Party of ${invite.partySize})
LOCATION:${invite.restaurantAddress}
STATUS:TENTATIVE
ORGANIZER;CN=${invite.restaurantName}:mailto:reservations@example.com
ATTENDEE;CN=${invite.guestName};RSVP=TRUE:mailto:${invite.guestEmail}
END:VEVENT
END:VCALENDAR`;

  const fromAddress = getMailtrapSender();
  if (!fromAddress) {
    console.error(
      "[Notification] Missing MAILTRAP_FROM/EMAIL_FROM sender address.",
    );
    return;
  }

  try {
    console.log(
      "[Notification] Attempting Mailtrap API send to:",
      invite.guestEmail,
      "from:",
      fromAddress.email,
    );
    await sendViaMailtrapApi(
      [{ email: invite.guestEmail }],
      "Your Waitlist Spot Is Available",
      htmlTemplate,
      `Waitlist invitation for ${invite.guestName}`,
      "Waitlist Invitation",
      [
        {
          filename: "waitlist.ics",
          content: Buffer.from(icsContent).toString("base64"),
          type: "text/calendar",
        },
      ],
    );
    console.log(
      "[Notification] Mailtrap API send successful for:",
      invite.guestEmail,
    );
  } catch (err) {
    console.error(
      "[Notification] Mailtrap API sendWaitlistInvite failed:",
      err,
    );
    throw err;
  }
}
