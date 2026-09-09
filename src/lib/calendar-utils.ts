/** Shared calendar / slot helpers for buffers, closed days, and bookings. */

/**
 * Returns current Date adjusted to Sri Lanka Time (Asia/Colombo, UTC+5:30).
 * Reliable regardless of host server clock (Vercel UTC, local, etc).
 */
export function getSriLankaNow(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const p: Record<string, string> = {};
  for (const item of parts) p[item.type] = item.value;
  const hour = p.hour === "24" ? "00" : p.hour;
  return new Date(`${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}`);
}

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
  const interval = Math.max(options?.intervalMinutes ?? 15, 1);
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
    /** Extra minutes after each confirmed booking (cleanup padding). */
    bookingPaddingMinutes?: number;
    buffers: Array<{ dateKey: string; startTime: string; endTime: string }>;
    bookings: Array<{
      dateKey?: string;
      selectedDate: string;
      selectedTime: string;
      duration: number;
      status: string;
    }>;
    /** When omitted, uses the current time to drop past slots for today. */
    now?: Date;
  },
): string[] {
  const dayBuffers = options.buffers.filter(
    (b) => b.dateKey === options.dateKey,
  );
  const dayBookings = options.bookings.filter(
    (b) =>
      b.status === "confirmed" && bookingDateKey(b) === options.dateKey,
  );
  const bookingPadding = Math.max(0, options.bookingPaddingMinutes ?? 0);

  return slots.filter((slot) => {
    const slotStart = parseSlotMinutes(slot);
    if (Number.isNaN(slotStart)) return false;

    const now = options.now ?? getSriLankaNow();
    if (options.dateKey === toDateKey(now)) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      // Drop any time that has already passed today + 10 mins arrival buffer
      if (slotStart <= nowMinutes + 10) return false;
    }

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

    const slotEnd = slotStart + Math.max(options.durationMinutes, 1);

    for (const booking of dayBookings) {
      const bookingStart = parseSlotMinutes(booking.selectedTime);
      if (Number.isNaN(bookingStart)) continue;
      const bookingEnd =
        bookingStart + Math.max(booking.duration, 1) + bookingPadding;
      if (rangesOverlap(slotStart, slotEnd, bookingStart, bookingEnd)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Parses user-typed natural time expressions (e.g. "5pm", "5:30", "10.30 AM", "4 PM")
 * into normalized slot format "H:MM AM/PM".
 */
export function parseNaturalTime(raw: string): string | null {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, " ");

  // Match e.g. "5:30 pm", "5.30pm", "10:00 am", "11 am", "4pm", "12.30"
  const match = clean.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let hour = parseInt(match[1]!, 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  let ampm = match[3] ? match[3].toUpperCase() : null;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  // Infer AM/PM for salon hours (9:00 AM – 7:00 PM) if not specified
  if (!ampm) {
    if (hour >= 9 && hour <= 11) {
      ampm = "AM";
    } else if (hour === 12) {
      ampm = "PM";
    } else if (hour >= 1 && hour <= 7) {
      ampm = "PM";
    } else if (hour >= 13 && hour <= 19) {
      hour -= 12;
      ampm = "PM";
    } else {
      return null;
    }
  }

  const paddedMin = String(minute).padStart(2, "0");
  return `${hour}:${paddedMin} ${ampm}`;
}

