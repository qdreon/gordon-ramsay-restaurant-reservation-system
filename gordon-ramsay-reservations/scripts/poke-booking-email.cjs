/**
 * Local smoke test: POST /api/notifications/send with a fake booking payload.
 * Requires: `npm run dev` in another terminal, and `.env.local` with email vars.
 *
 * Usage:
 *   node scripts/poke-booking-email.cjs
 *   node scripts/poke-booking-email.cjs you@example.com
 *
 * Optional: BASE_URL=http://localhost:3000 (default)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const guestEmail =
  process.argv[2] || process.env.TEST_NOTIFY_EMAIL || "test-customer@example.com";

const reservation = {
  reservationId: `poke-${Date.now()}`,
  guestName: "Email smoke test",
  guestEmail,
  partySize: 2,
  reservationDate: "2026-12-20",
  reservationTime: "19:00",
  reservationEndTime: "21:00",
  restaurantName: process.env.RESTAURANT_NAME || "Gordon Ramsay Restaurant",
  restaurantAddress:
    process.env.RESTAURANT_ADDRESS || "Cebu City, Philippines",
  specialRequests: null,
  confirmationURL: `${baseUrl.replace(/\/$/, "")}/customer/dashboard?booking=confirmed`,
};

async function main() {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/notifications/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "booking-confirmation",
      reservation,
    }),
  });

  const text = await res.text();
  console.log(`HTTP ${res.status}`);
  console.log(text);
  if (!res.ok) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
