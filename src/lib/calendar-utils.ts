/** Shared calendar / slot helpers for buffers, closed days, and bookings. */

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseSlotMinutes(slot: string): number {
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return NaN;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function formatMinutesAsSlot(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  let hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Build bookable start times from open → close (service must finish by closeTime).
 * Defaults to 30-minute steps.
 */
export function generateTimeSlots(
  openTime: string,
  closeTime: string,
  options?: { intervalMinutes?: number; durationMinutes?: number },
): string[] {
  const interval = Math.max(options?.intervalMinutes ?? 30, 1);
  const duration = Math.max(options?.durationMinutes ?? interval, 1);
  const open = parseSlotMinutes(openTime);
  const close = parseSlotMinutes(closeTime);
  if ([open, close].some((n) => Number.isNaN(n)) || !(open < close)) {
    return [];
  }

  const slots: string[] = [];
  for (let t = open; t + duration <= close; t += interval) {
    slots.push(formatMinutesAsSlot(t));
  }
  return slots;
}

/** Candidate times for admin pickers (e.g. 6:00 AM – 11:30 PM). */
export function generateDayTimeOptions(intervalMinutes = 30): string[] {
  const interval = Math.max(intervalMinutes, 1);
  const open = parseSlotMinutes("06:00 AM");
  const last = parseSlotMinutes("11:30 PM");
  if (Number.isNaN(open) || Number.isNaN(last)) return [];

  const slots: string[] = [];
  for (let t = open; t <= last; t += interval) {
    slots.push(formatMinutesAsSlot(t));
  }
  return slots;
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** True if a booking slot of `durationMinutes` starting at `slot` overlaps [startTime, endTime). */
export function slotOverlapsWindow(
  slot: string,
  durationMinutes: number,
  startTime: string,
  endTime: string,
): boolean {
  const slotStart = parseSlotMinutes(slot);
  const windowStart = parseSlotMinutes(startTime);
  const windowEnd = parseSlotMinutes(endTime);
  if ([slotStart, windowStart, windowEnd].some((n) => Number.isNaN(n))) {
    return false;
  }
  const slotEnd = slotStart + Math.max(durationMinutes, 1);
  return rangesOverlap(slotStart, slotEnd, windowStart, windowEnd);
}

export function dateKeyFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return toDateKey(date);
}

export function bookingDateKey(booking: {
  dateKey?: string;
  selectedDate: string;
}): string {
  if (booking.dateKey) return booking.dateKey;
  return dateKeyFromIso(booking.selectedDate);
}

/** Drop slots that overlap buffers or existing bookings for the day. */
export function filterAvailableSlots(
  slots: readonly string[],
  options: {
    dateKey: string;
    durationMinutes: number;
    buffers: Array<{ dateKey: string; startTime: string; endTime: string }>;
    bookings: Array<{
      dateKey?: string;
      selectedDate: string;
      selectedTime: string;
      duration: number;
      status: string;
    }>;
  },
): string[] {
  const dayBuffers = options.buffers.filter(
    (b) => b.dateKey === options.dateKey,
  );
  const dayBookings = options.bookings.filter(
    (b) =>
      b.status === "confirmed" && bookingDateKey(b) === options.dateKey,
  );

  return slots.filter((slot) => {
    for (const buffer of dayBuffers) {
      if (
        slotOverlapsWindow(
          slot,
          options.durationMinutes,
          buffer.startTime,
          buffer.endTime,
        )
      ) {
        return false;
      }
    }

    const slotStart = parseSlotMinutes(slot);
    if (Number.isNaN(slotStart)) return false;
    const slotEnd = slotStart + Math.max(options.durationMinutes, 1);

    for (const booking of dayBookings) {
      const bookingStart = parseSlotMinutes(booking.selectedTime);
      if (Number.isNaN(bookingStart)) continue;
      const bookingEnd = bookingStart + Math.max(booking.duration, 1);
      if (rangesOverlap(slotStart, slotEnd, bookingStart, bookingEnd)) {
        return false;
      }
    }

    return true;
  });
}
