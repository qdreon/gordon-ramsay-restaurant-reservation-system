/**
 * Restaurant Configuration & Constants
 * 
 * Centralized configuration for operating hours, business rules, etc.
 * Used across frontend and backend for consistency.
 */

/**
 * Operating Hours (24-hour format)
 * Opens at 11:00 AM, closes at 11:00 PM (23:00)
 * These hours apply to all customer bookings and admin validations.
 */
export const OPERATING_HOURS = {
  OPENING_HOUR: 11,        // 11:00 AM
  CLOSING_HOUR: 23,        // 11:00 PM
  MIN_PARTY_SIZE: 1,
  MAX_PARTY_SIZE: 12,
  DEFAULT_RESERVATION_DURATION_HOURS: 2,
} as const;

/**
 * Validates if a given hour is within operating hours
 * @param hour - Hour in 24-hour format (0-23)
 * @returns true if hour is within operating hours
 */
export function isWithinOperatingHours(hour: number): boolean {
  return hour >= OPERATING_HOURS.OPENING_HOUR && hour < OPERATING_HOURS.CLOSING_HOUR;
}

/**
 * Validates if a reservation start time is bookable
 * Ensures:
 * 1. Start time is within operating hours
 * 2. End time would be before closing (allows bookings up to 2 hours before close)
 * 
 * @param startHour - Hour of reservation start (24-hour format)
 * @param durationHours - Expected reservation duration
 * @returns { valid: boolean, error?: string }
 */
export function validateReservationTime(
  startHour: number,
  durationHours: number = OPERATING_HOURS.DEFAULT_RESERVATION_DURATION_HOURS
): { valid: boolean; error?: string } {
  // Check if start time is within opening hours
  if (!isWithinOperatingHours(startHour)) {
    const openTime = `${OPERATING_HOURS.OPENING_HOUR.toString().padStart(2, "0")}:00`;
    const closeTime = `${OPERATING_HOURS.CLOSING_HOUR.toString().padStart(2, "0")}:00`;
    return {
      valid: false,
      error: `Restaurant is only open from ${openTime} to ${closeTime}.`,
    };
  }

  // Check if reservation can complete before closing
  const endHour = startHour + durationHours;
  if (endHour > OPERATING_HOURS.CLOSING_HOUR) {
    return {
      valid: false,
      error: `Reservation would extend beyond closing time (${OPERATING_HOURS.CLOSING_HOUR}:00). Please choose an earlier time.`,
    };
  }

  return { valid: true };
}

/**
 * Validates admin-entered operating hours
 * Prevents closing time from being before opening time
 * 
 * @param openingHour - Hour restaurant opens (0-23)
 * @param closingHour - Hour restaurant closes (0-23)
 * @returns { valid: boolean, error?: string }
 */
export function validateOperatingHours(
  openingHour: number,
  closingHour: number
): { valid: boolean; error?: string } {
  if (openingHour >= closingHour) {
    return {
      valid: false,
      error: "Closing time must be after opening time.",
    };
  }

  if (openingHour < 0 || openingHour > 23 || closingHour < 0 || closingHour > 23) {
    return {
      valid: false,
      error: "Operating hours must be between 0 and 23.",
    };
  }

  return { valid: true };
}
