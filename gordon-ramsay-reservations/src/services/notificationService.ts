/**
 * notificationService.ts
 * -----------------------
 * Notification service for reservation and waitlist emails.
 *
 * Delivery:
 * 1. If `SMTP_HOST` is set — send via Nodemailer (SMTP) first.
 * 2. If SMTP fails but `MAILTRAP_API_TOKEN` is set — fall back to Mailtrap HTTP API.
 * 3. If only Mailtrap is configured — use Mailtrap API.
 */

import fs from "fs";
import path from "path";
import type { Transporter } from "nodemailer";

type MailtrapPayload = Record<string, unknown>;

type MailtrapClientLike = {
  send(payload: MailtrapPayload): Promise<unknown>;
};

type MailtrapModule = {
  MailtrapClient: new (config: {
    token: string;
    sandbox?: boolean;
    testInboxId?: number;
  }) => MailtrapClientLike;
};

let mailtrapClient: MailtrapClientLike | null = null;
let mailtrapClientInitialized = false;

let smtpTransporter: Transporter | null = null;
let smtpInitialized = false;

function parseOptionalPositiveInt(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

function isMailtrapTokenConfigured(): boolean {
  return Boolean(process.env.MAILTRAP_API_TOKEN?.trim());
}

async function initMailtrapApi(): Promise<void> {
  if (mailtrapClientInitialized) return;
  mailtrapClientInitialized = true;

  try {
    if (process.env.MAILTRAP_API_TOKEN) {
      const { MailtrapClient } = (await import("mailtrap")) as MailtrapModule;
      const useSandbox =
        process.env.MAILTRAP_USE_SANDBOX === "true" ||
        process.env.MAILTRAP_SANDBOX === "true";
      const testInboxId =
        parseOptionalPositiveInt(process.env.MAILTRAP_INBOX_ID) ??
        parseOptionalPositiveInt(process.env.MAILTRAP_TEST_INBOX_ID);

      mailtrapClient = new MailtrapClient({
        token: process.env.MAILTRAP_API_TOKEN,
        sandbox: useSandbox,
        ...(useSandbox && testInboxId != null ? { testInboxId } : {}),
      });
      if (useSandbox && testInboxId == null) {
        console.warn(
          "[Notification] MAILTRAP_USE_SANDBOX is true but MAILTRAP_INBOX_ID is not set; Mailtrap testing sends will fail until you add the inbox ID from the Mailtrap dashboard.",
        );
      }
      console.log(
        `[Notification] Mailtrap API initialized (${useSandbox ? "sandbox/testing inbox" : "transactional send"})`,
      );
    } else {
      console.log("[Notification] MAILTRAP_API_TOKEN not found");
    }
  } catch (err) {
    console.error("[Notification] Failed to initialize Mailtrap API:", err);
    mailtrapClient = null;
  }
}

async function initSmtpTransporter(): Promise<void> {
  if (smtpInitialized) return;
  smtpInitialized = true;

  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    return;
  }

  try {
    const nodemailer = await import("nodemailer");
    const portRaw = process.env.SMTP_PORT?.trim();
    const port = portRaw ? Number.parseInt(portRaw, 10) : 587;
    const secureEnv = process.env.SMTP_SECURE === "true";
    const secure = secureEnv || port === 465;
    const user =
      process.env.SMTP_USER?.trim() ||
      process.env.SMTP_USERNAME?.trim() ||
      undefined;
    const pass =
      process.env.SMTP_PASSWORD?.trim() ||
      process.env.SMTP_PASS?.trim() ||
      undefined;

    smtpTransporter = nodemailer.createTransport({
      host,
      port: Number.isFinite(port) ? port : 587,
      secure,
      auth:
        user && pass
          ? { user, pass }
          : user
            ? { user, pass: pass ?? "" }
            : undefined,
      requireTLS: process.env.SMTP_REQUIRE_TLS === "true",
    });
    console.log("[Notification] SMTP transporter initialized for host:", host);
  } catch (err) {
    console.error("[Notification] Failed to initialize SMTP:", err);
    smtpTransporter = null;
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

async function sendViaSmtp(
  recipients: { email: string }[],
  subject: string,
  html: string,
  text: string,
  attachments?: Array<{ content: string; filename: string; type: string }>,
): Promise<void> {
  await initSmtpTransporter();

  if (!smtpTransporter) {
    throw new Error("SMTP transporter is not configured.");
  }

  const sender = getMailtrapSender();
  if (!sender) {
    throw new Error("Missing MAILTRAP_FROM/EMAIL_FROM sender address.");
  }

  const from =
    sender.name != null && sender.name.length > 0
      ? { name: sender.name, address: sender.email }
      : sender.email;

  await smtpTransporter.sendMail({
    from,
    to: recipients.map((r) => r.email),
    subject,
    text,
    html,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "base64"),
      contentType: a.type,
    })),
  });
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

async function deliverMail(
  recipients: { email: string }[],
  subject: string,
  html: string,
  text: string,
  category: string,
  attachments?: Array<{ content: string; filename: string; type: string }>,
): Promise<void> {
  if (isSmtpConfigured()) {
    try {
      await sendViaSmtp(recipients, subject, html, text, attachments);
      console.log("[Notification] Delivered via SMTP");
      return;
    } catch (smtpErr) {
      console.error(
        "[Notification] SMTP send failed:",
        smtpErr instanceof Error ? smtpErr.stack ?? smtpErr.message : smtpErr,
      );
      if (!isMailtrapTokenConfigured()) {
        throw smtpErr instanceof Error
          ? smtpErr
          : new Error(String(smtpErr));
      }
      console.warn(
        "[Notification] Retrying via Mailtrap API (SMTP failed but MAILTRAP_API_TOKEN is set).",
      );
    }
  }

  await sendViaMailtrapApi(
    recipients,
    subject,
    html,
    text,
    category,
    attachments,
  );
  console.log("[Notification] Delivered via Mailtrap API");
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
    .replace("{{ reservationDate }}", reservation.reservationDate)
    .replace("{{ reservationTime }}", reservation.reservationTime)
    .replace("{{ partySize }}", reservation.partySize.toString())
    .replace("{{ restaurantAddress }}", reservation.restaurantAddress)
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

  const channelHint = isSmtpConfigured()
    ? "SMTP (Mailtrap fallback if SMTP fails)"
    : "Mailtrap API";

  try {
    console.log(
      "[Notification] Attempting send to:",
      reservation.guestEmail,
      "from:",
      fromAddress.email,
      `via ${channelHint}`,
    );
    await deliverMail(
      [{ email: reservation.guestEmail }],
      "Your Booking Confirmation",
      htmlTemplate,
      `Booking confirmation for ${reservation.guestName}`,
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
      "[Notification] Send successful for:",
      reservation.guestEmail,
    );
  } catch (err) {
    console.error("[Notification] sendBookingConfirmation failed:", err);
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

  const channelHint = isSmtpConfigured()
    ? "SMTP (Mailtrap fallback if SMTP fails)"
    : "Mailtrap API";

  try {
    console.log(
      "[Notification] Attempting send to:",
      invite.guestEmail,
      "from:",
      fromAddress.email,
      `via ${channelHint}`,
    );
    await deliverMail(
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
    console.log("[Notification] Send successful for:", invite.guestEmail);
  } catch (err) {
    console.error("[Notification] sendWaitlistInvite failed:", err);
  }
}
