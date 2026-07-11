import { normalizeMobile } from "@/lib/users";
import { siteConfig } from "@/lib/site";
import type { SavedBooking } from "@/lib/bookings";

/**
 * Digits-only international number for wa.me (e.g. 94771234567).
 * Strips spaces/symbols; defaults local Sri Lankan numbers to +94.
 */
export function toWhatsAppDigits(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const normalized = normalizeMobile(trimmed);
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits;
}

export function buildWhatsAppUrl(
  phone: string,
  message: string,
): string | null {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return null;
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}

export function customerGreetingMessage(name: string): string {
  const display = name.trim() || "there";
  return `Hi ${display}, this is from ${siteConfig.name}.`;
}

export function bookingStatusMessage(booking: SavedBooking): string {
  const name = booking.customerName?.trim() || "there";
  const service = booking.serviceName || "your service";
  const date = formatWhatsAppDate(booking.selectedDate);
  const time = booking.selectedTime || "the scheduled time";
  const status = (booking.status || "confirmed").toLowerCase();

  return `Hi ${name}, your booking for ${service} on ${date} at ${time} is currently ${status}. Thank you for choosing ${siteConfig.name}!`;
}

function formatWhatsAppDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso || "the scheduled date";
  return date.toLocaleDateString("en-LK", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
