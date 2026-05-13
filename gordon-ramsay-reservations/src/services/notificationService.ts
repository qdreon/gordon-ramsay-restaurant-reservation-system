/**
 * notificationService.ts
 * -----------------------
 * Hardened notification service:
 * - Uses SMTP environment variables when available
 * - Falls back to `EMAIL_SERVICE` (e.g., Gmail) if provided
 * - Provides template fallback when file missing
 */

import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

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
  const [hours, mins] = time.split(':').map(Number);
  const date = new Date();
  date.setUTCHours(hours, mins + minutes, 0, 0);
  return date.toISOString().slice(11, 16);
}

function loadTemplate(templateName: string): string {
  try {
    const templatePath = path.join(process.cwd(), "src", "emails", templateName);
    return fs.readFileSync(templatePath, "utf8");
  } catch (err) {
    console.error(`[Notification] Template ${templateName} not found:`, err);
    return `<p>Template ${templateName} missing</p>`;
  }
}

function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const service = process.env.EMAIL_SERVICE;
  const secure = process.env.EMAIL_SECURE === "true";

  if (host && port) {
    return nodemailer.createTransport({
      host,
      port,
      secure: secure ?? port === 465,
      auth: user ? { user, pass } : undefined,
    });
  }

  if (service && user) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  }

  throw new Error(
    "SMTP configuration missing: set EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASS or EMAIL_SERVICE"
  );
}

// ---------------------------------------------------------------------------
// Notification Functions
// ---------------------------------------------------------------------------

/**
 * Sends a booking confirmation email with .ics calendar invite attached.
 */
export async function sendBookingConfirmation(reservation: ReservationNotification): Promise<void> {
  let htmlTemplate = loadTemplate("bookingConfirmation.html");

  htmlTemplate = htmlTemplate
    .replace("{{ guestName }}", reservation.guestName)
    .replace("{{ restaurantName }}", reservation.restaurantName)
    .replace("{{ reservationDate }}", reservation.reservationDate)
    .replace("{{ reservationTime }}", reservation.reservationTime)
    .replace("{{ partySize }}", reservation.partySize.toString())
    .replace("{{ specialRequests }}", reservation.specialRequests ?? "None")
    .replace("{{ confirmationURL }}", reservation.confirmationURL);

  const icsContent = generateICS(reservation);

  let transporter;
  try {
    transporter = createTransporter();
  } catch (err) {
    console.error("[Notification] Transporter creation failed:", err);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Gordon Ramsay Reservations" <${process.env.EMAIL_USER}>`,
      to: reservation.guestEmail,
      subject: "Your Booking Confirmation",
      html: htmlTemplate,
      attachments: [
        {
          filename: "reservation.ics",
          content: icsContent,
          contentType: "text/calendar",
        },
      ],
    });
  } catch (err) {
    console.error("[Notification] sendBookingConfirmation failed:", err);
  }
}

/**
 * Sends a waitlist invitation email with tentative .ics calendar invite attached.
 */
export async function sendWaitlistInvite(invite: WaitlistNotification): Promise<void> {
  let htmlTemplate = loadTemplate("waitlistInvite.html");

  htmlTemplate = htmlTemplate
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

  let transporter;
  try {
    transporter = createTransporter();
  } catch (err) {
    console.error("[Notification] Transporter creation failed:", err);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Gordon Ramsay Reservations" <${process.env.EMAIL_USER}>`,
      to: invite.guestEmail,
      subject: "Your Waitlist Spot Is Available",
      html: htmlTemplate,
      attachments: [
        {
          filename: "waitlist.ics",
          content: icsContent,
          contentType: "text/calendar",
        },
      ],
    });
  } catch (err) {
    console.error("[Notification] sendWaitlistInvite failed:", err);
  }
}
