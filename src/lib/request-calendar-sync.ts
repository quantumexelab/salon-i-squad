import type { SavedBooking } from "@/lib/bookings";
import { setBookingCalendarEventId } from "@/lib/bookings";
import type { CalendarSyncAction } from "@/lib/calendar-settings";

export type { CalendarSyncAction };
/**
 * Fire-and-forget friendly client helper. Booking UX should not fail if sync is down.
 */
export async function requestCalendarSync(
  action: CalendarSyncAction,
  booking: SavedBooking,
): Promise<{ eventId?: string | null; skipped?: boolean; reason?: string }> {
  try {
    const res = await fetch("/api/calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, booking }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      eventId?: string | null;
      skipped?: boolean;
      reason?: string;
    };
    return {
      eventId: data.eventId,
      skipped: data.skipped,
      reason: data.reason,
    };
  } catch (error) {
    return {
      skipped: true,
      reason:
        error instanceof Error ? error.message : "Calendar sync request failed.",
    };
  }
}

/** Sync then persist Google event id on the booking (best-effort). */
export async function applyBookingCalendarSync(
  action: CalendarSyncAction,
  booking: SavedBooking,
): Promise<void> {
  const result = await requestCalendarSync(action, booking);
  try {
    if (action === "delete") {
      if (booking.googleCalendarEventId) {
        await setBookingCalendarEventId(booking.id, null);
      }
      return;
    }
    if (result.eventId) {
      await setBookingCalendarEventId(booking.id, result.eventId);
    }
  } catch {
    // Booking already saved; event id persistence is best-effort.
  }
}
