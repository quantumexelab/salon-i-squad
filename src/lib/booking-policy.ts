import { dateKeyFromIso, parseSlotMinutes } from "@/lib/calendar-utils";
import type { SavedBooking } from "@/lib/bookings";

export const CLIENT_MODIFY_CUTOFF_HOURS = 12;

/** Local appointment start from dateKey (preferred) + selectedTime. */
export function getBookingStartDate(booking: SavedBooking): Date | null {
  const key =
    booking.dateKey ||
    (booking.selectedDate ? dateKeyFromIso(booking.selectedDate) : "");
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;

  const [y, m, d] = key.split("-").map(Number);
  const mins = parseSlotMinutes(booking.selectedTime);
  if (Number.isNaN(mins)) return null;

  return new Date(y, m - 1, d, Math.floor(mins / 60), mins % 60, 0, 0);
}

export function getHoursUntilAppointment(
  booking: SavedBooking,
  now = new Date(),
): number | null {
  const start = getBookingStartDate(booking);
  if (!start) return null;
  return (start.getTime() - now.getTime()) / (1000 * 60 * 60);
}

/** Confirmed bookings more than 12 hours away can be cancelled/rescheduled. */
export function canClientModifyBooking(
  booking: SavedBooking,
  now = new Date(),
  cutoffHours = CLIENT_MODIFY_CUTOFF_HOURS,
): boolean {
  if (booking.status !== "confirmed") return false;
  const hours = getHoursUntilAppointment(booking, now);
  if (hours === null) return false;
  return hours >= cutoffHours;
}

export function isUpcomingBooking(
  booking: SavedBooking,
  now = new Date(),
): boolean {
  if (booking.status === "cancelled" || booking.status === "completed") {
    return false;
  }
  const start = getBookingStartDate(booking);
  if (!start) return booking.status === "confirmed";
  return start.getTime() >= now.getTime();
}
