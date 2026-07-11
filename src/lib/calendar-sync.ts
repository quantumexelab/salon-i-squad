import "server-only";

import { google } from "googleapis";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { SavedBooking } from "@/lib/bookings";
import { getBookingStartDate } from "@/lib/booking-policy";
import { formatLkr } from "@/lib/booking/dummy-services";
import { CALENDAR_SETTINGS_DOC_ID } from "@/lib/calendar-settings";
import type { CalendarSyncAction } from "@/lib/calendar-settings";
import { COLLECTIONS } from "@/lib/firebase/collections";
export type CalendarSyncResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  eventId?: string | null;
};

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

type ResolvedCalendarConfig = {
  calendarId: string;
  credentials: ServiceAccountKey;
};

const SALON_TIME_ZONE = "Asia/Colombo";

function parseServiceAccountJson(raw: string): ServiceAccountKey | null {
  try {
    const parsed = JSON.parse(raw) as ServiceAccountKey;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      ...parsed,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

function getFirebaseAdminApp(): App | null {
  if (getApps().length > 0) return getApps()[0]!;

  const fromEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const key = fromEnv ? parseServiceAccountJson(fromEnv) : null;
  if (!key) return null;

  return initializeApp({
    credential: cert({
      projectId:
        key.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: key.client_email,
      privateKey: key.private_key,
    }),
  });
}

async function loadCalendarConfig(): Promise<ResolvedCalendarConfig | null> {
  const envCalendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
  const envSa = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const envCredentials = envSa ? parseServiceAccountJson(envSa) : null;

  try {
    const app = getFirebaseAdminApp();
    if (app) {
      const snap = await getFirestore(app)
        .collection(COLLECTIONS.settings)
        .doc(CALENDAR_SETTINGS_DOC_ID)
        .get();
      if (snap.exists) {
        const data = snap.data() ?? {};
        if (data.enabled === false) {
          return null;
        }
        const calendarId = String(
          data.calendarId ?? envCalendarId ?? "",
        ).trim();
        const saRaw = String(data.serviceAccountJson ?? envSa ?? "").trim();
        const credentials = parseServiceAccountJson(saRaw);
        if (calendarId && credentials) {
          return { calendarId, credentials };
        }
      }
    }
  } catch {
    // Fall through to env-only config.
  }

  if (envCalendarId && envCredentials) {
    return { calendarId: envCalendarId, credentials: envCredentials };
  }

  return null;
}

function buildEventPayload(booking: SavedBooking) {
  const start = getBookingStartDate(booking);
  if (!start) {
    throw new Error("Booking is missing a valid date/time.");
  }
  const duration = Math.max(booking.duration || 30, 1);
  const end = new Date(start.getTime() + duration * 60_000);

  const clientName = booking.customerName?.trim() || "Client";
  const title = `${booking.serviceName} - ${clientName}`;
  const description = [
    `Phone: ${booking.phoneNumber?.trim() || "—"}`,
    `Price: ${formatLkr(booking.price || 0)}`,
    booking.notes ? `Notes: ${booking.notes}` : null,
    `Booking ID: ${booking.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  const toLocalParts = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
  };

  return {
    summary: title,
    description,
    start: {
      dateTime: toLocalParts(start),
      timeZone: SALON_TIME_ZONE,
    },
    end: {
      dateTime: toLocalParts(end),
      timeZone: SALON_TIME_ZONE,
    },
  };
}

async function getCalendarClient(credentials: ServiceAccountKey) {
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth });
}

async function persistEventIdOnBooking(
  bookingId: string,
  eventId: string | null,
): Promise<void> {
  try {
    const app = getFirebaseAdminApp();
    if (!app) return;
    await getFirestore(app)
      .collection(COLLECTIONS.bookings)
      .doc(bookingId)
      .set(
        {
          googleCalendarEventId: eventId,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
  } catch {
    // Client-side applyBookingCalendarSync is the fallback.
  }
}

/**
 * Push a booking change to Google Calendar.
 * No-ops when credentials are not configured (structure ready for GCP setup).
 */
export async function syncBookingToGoogleCalendar(
  action: CalendarSyncAction,
  booking: SavedBooking,
): Promise<CalendarSyncResult> {
  const config = await loadCalendarConfig();
  if (!config) {
    return {
      ok: true,
      skipped: true,
      reason:
        "Google Calendar sync is not configured yet (set Master → Calendar or env vars).",
    };
  }

  try {
    const calendar = await getCalendarClient(config.credentials);
    const eventId = booking.googleCalendarEventId?.trim() || undefined;

    if (action === "delete") {
      if (!eventId) {
        return { ok: true, skipped: true, reason: "No calendar event to delete." };
      }
      await calendar.events.delete({
        calendarId: config.calendarId,
        eventId,
      });
      await persistEventIdOnBooking(booking.id, null);
      return { ok: true, eventId: null };
    }

    const body = buildEventPayload(booking);

    if ((action === "update" || action === "create") && eventId) {
      const updated = await calendar.events.patch({
        calendarId: config.calendarId,
        eventId,
        requestBody: body,
      });
      const id = updated.data.id ?? eventId;
      await persistEventIdOnBooking(booking.id, id);
      return { ok: true, eventId: id };
    }

    const created = await calendar.events.insert({
      calendarId: config.calendarId,
      requestBody: body,
    });
    const id = created.data.id ?? null;
    if (id) await persistEventIdOnBooking(booking.id, id);
    return { ok: true, eventId: id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Google Calendar sync failed.";
    return { ok: false, reason: message };
  }
}
