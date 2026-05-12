/**
 * notificationService.ts
 * -----------------------
 * Repository Pattern: Integration Layer
 *
 * Purpose:
 *   Handles all outbound notifications related to reservations:
 *   - Booking Confirmations (FR-6)
 *   - Waitlist Invites (FR-5)
 *   - Calendar (.ics) attachments
 *
 * Design Pattern: Repository Pattern (Data Access Layer)
 * Principle: Single Responsibility -- this file ONLY handles notification logic.
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
  reservationDate: string;   // YYYY-MM-DD
  reservationTime: string;   // HH:mm
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
  requestedDate: string;   // YYYY-MM-DD
  requestedTime: string;   // HH:mm
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

function loadTemplate(templateName: string): string {
  const templatePath = path.join(process.cwd(), "src", "emails", templateName);
  return fs.readFileSync(templatePath, "utf8");
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

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

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

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Gordon Ramsay Reservation System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${invite.inviteId}@example.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:${invite.requestedDate.replace(/-/g, "")}T${invite.requestedTime.replace(":", "")}00Z
DTEND:${invite.requestedDate.replace(/-/g, "")}T${invite.requestedTime.replace(":", "")}00Z
SUMMARY:Waitlist Invitation - ${invite.restaurantName}
DESCRIPTION:You are invited from the waitlist for ${invite.guestName} (Party of ${invite.partySize})
LOCATION:${invite.restaurantAddress}
STATUS:TENTATIVE
ORGANIZER;CN=${invite.restaurantName}:mailto:reservations@example.com
ATTENDEE;CN=${invite.guestName};RSVP=TRUE:mailto:${invite.guestEmail}
END:VEVENT
END:VCALENDAR`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Gordon Ramsay Reservations" <${process.env.EMAIL_USER}>`,
    to: invite.guestEmail,
    subject: "Your Waitlist Invitation",
    html: htmlTemplate,
    attachments: [
      {
        filename: "waitlist.ics",
        content: icsContent,
        contentType: "text/calendar",
      },
    ],
  });
}
